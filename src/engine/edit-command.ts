import { z } from 'zod'

import type { TemplateDocument } from '../model/document'
import { editSourceSchema, isoDateTimeSchema, type EditSource } from '../model/history'
import { commandIdSchema, elementIdSchema, type CommandId, type ElementId } from '../model/ids'
import {
  editablePropertyPatchSchema,
  FORBIDDEN_PROPERTY_KEYS,
  type EditablePropertyPatch,
} from '../model/properties'
import { editScopeSchema, type EditScope } from '../model/viewport'

/**
 * The edit command.
 *
 * This is the single durable edit path. Canvas controls, the structured code
 * surface, accepted AI proposals, and restore all build one of these and send
 * it through `validateEditCommand` -> `applyEditCommand`. Nothing else is
 * allowed to write to the canonical document.
 *
 * A multi-target command is ATOMIC: every target is validated before any target
 * is applied, and one bad target rejects the whole command. Independent
 * per-element outcomes for AI proposals are achieved by emitting one command
 * per accepted proposal (Step 11), not by partially applying one command.
 */

export interface EditCommand {
  readonly id: CommandId
  readonly source: EditSource
  readonly targetIds: readonly ElementId[]
  readonly scope: EditScope
  readonly baseRevision: number
  readonly changes: Readonly<Record<ElementId, EditablePropertyPatch>>
  readonly createdAt: string
}

export const editCommandSchema = z.strictObject({
  id: commandIdSchema,
  source: editSourceSchema,
  targetIds: z.array(elementIdSchema).max(200),
  scope: editScopeSchema,
  baseRevision: z.number().int().min(0),
  changes: z.record(elementIdSchema, editablePropertyPatchSchema),
  createdAt: isoDateTimeSchema,
})

/**
 * Context the validator needs but the command does not durably carry.
 * `selectionSnapshot` is required for AI commands: an AI edit may only touch
 * elements the user had selected when the proposal was generated.
 */
export interface EditCommandContext {
  readonly selectionSnapshot?: readonly ElementId[] | undefined
}

/* -------------------------------------------------------------------------- */
/* Typed errors                                                                */
/* -------------------------------------------------------------------------- */

export const EDIT_COMMAND_ERROR_CODES = [
  'invalid-command',
  'empty-targets',
  'duplicate-targets',
  'unknown-target',
  'missing-selection-snapshot',
  'target-not-selected',
  'missing-change',
  'unexpected-change',
  'empty-change',
  'forbidden-field',
  'invalid-value',
  'stale-revision',
  'invalid-result',
] as const
export type EditCommandErrorCode = (typeof EDIT_COMMAND_ERROR_CODES)[number]

export interface EditCommandError {
  readonly code: EditCommandErrorCode
  readonly message: string
  readonly elementId?: ElementId | undefined
  readonly path?: readonly (string | number)[] | undefined
}

export type EditCommandValidation =
  | { readonly ok: true; readonly command: EditCommand }
  | { readonly ok: false; readonly errors: readonly EditCommandError[] }

function error(
  code: EditCommandErrorCode,
  message: string,
  extra: { elementId?: ElementId; path?: readonly (string | number)[] } = {},
): EditCommandError {
  return { code, message, elementId: extra.elementId, path: extra.path }
}

const FORBIDDEN_KEY_SET: ReadonlySet<string> = new Set(FORBIDDEN_PROPERTY_KEYS)

/**
 * Turns schema issues into command errors, separating "you tried to write a
 * protected field" from "that value is not allowed" so the UI can say which.
 */
function fromSchemaIssues(issues: readonly z.core.$ZodIssue[]): EditCommandError[] {
  return issues.map((issue) => {
    const path = issue.path.map((segment) =>
      typeof segment === 'number' ? segment : String(segment),
    )

    if (issue.code === 'unrecognized_keys') {
      const forbidden = issue.keys.filter((key) => FORBIDDEN_KEY_SET.has(key))
      if (forbidden.length > 0) {
        return error(
          'forbidden-field',
          `Protected field(s) ${forbidden.join(', ')} cannot be changed by an edit.`,
          { path },
        )
      }
      return error(
        'forbidden-field',
        `Field(s) ${issue.keys.join(', ')} are outside the editable property allowlist.`,
        { path },
      )
    }

    const isPatchIssue = path[0] === 'changes'
    return error(isPatchIssue ? 'invalid-value' : 'invalid-command', issue.message, { path })
  })
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

function hasAnyProperty(patch: EditablePropertyPatch): boolean {
  return Object.values(patch).some((group) => group !== undefined)
}

/**
 * Validates a command against the current document. Never throws and never
 * touches the document; expected invalid input comes back as typed errors.
 *
 * Order mirrors ARCHITECTURE.md: shape, targets, selection authority, change
 * map, field allowlist and values, then revision freshness.
 */
export function validateEditCommand(
  document: TemplateDocument,
  input: unknown,
  context: EditCommandContext = {},
): EditCommandValidation {
  // 1. Shape, field allowlist, and value ranges.
  const parsed = editCommandSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, errors: fromSchemaIssues(parsed.error.issues) }
  }
  const command: EditCommand = parsed.data
  const errors: EditCommandError[] = []

  // 2. Targets must be non-empty, unique, and known.
  if (command.targetIds.length === 0) {
    errors.push(error('empty-targets', 'An edit command must name at least one target element.'))
  }

  const seen = new Set<string>()
  for (const targetId of command.targetIds) {
    if (seen.has(targetId)) {
      errors.push(
        error('duplicate-targets', `Target "${targetId}" is listed more than once.`, {
          elementId: targetId,
        }),
      )
    }
    seen.add(targetId)

    if (document.elements[targetId] === undefined) {
      errors.push(
        error('unknown-target', `Element "${targetId}" does not exist in the document.`, {
          elementId: targetId,
        }),
      )
    }
  }

  // 3. Selection authority for AI commands.
  if (command.source === 'ai') {
    const snapshot = context.selectionSnapshot
    if (snapshot === undefined) {
      errors.push(
        error(
          'missing-selection-snapshot',
          'An AI command requires the selection snapshot it was generated from.',
        ),
      )
    } else {
      const selected = new Set<string>(snapshot)
      for (const targetId of command.targetIds) {
        if (!selected.has(targetId)) {
          errors.push(
            error(
              'target-not-selected',
              `AI edits may only target selected elements; "${targetId}" was not selected.`,
              { elementId: targetId },
            ),
          )
        }
      }
    }
  }

  // 4. The change map must correspond exactly to the target list.
  for (const targetId of command.targetIds) {
    const patch = command.changes[targetId]
    if (patch === undefined) {
      errors.push(
        error('missing-change', `No change was supplied for target "${targetId}".`, {
          elementId: targetId,
        }),
      )
      continue
    }
    if (!hasAnyProperty(patch)) {
      errors.push(
        error('empty-change', `The change for "${targetId}" does not set any property.`, {
          elementId: targetId,
        }),
      )
    }
  }

  for (const changedId of Object.keys(command.changes)) {
    if (!seen.has(changedId)) {
      errors.push(
        error(
          'unexpected-change',
          `A change was supplied for "${changedId}", which is not one of the command targets.`,
          { path: ['changes', changedId] },
        ),
      )
    }
  }

  // 5. Revision freshness. Checked last so the caller sees concrete problems
  //    first, but enforced just as strictly.
  if (command.baseRevision !== document.revision) {
    errors.push(
      error(
        'stale-revision',
        `This edit was prepared against revision ${command.baseRevision}, but the document is now at revision ${document.revision}.`,
      ),
    )
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }
  return { ok: true, command }
}

/**
 * Builds a command. `id` and `createdAt` are caller-supplied on purpose: the
 * engine reads no clock and no random source, which keeps it deterministic and
 * testable.
 */
export function createEditCommand(input: {
  readonly id: CommandId
  readonly source: EditSource
  readonly targetIds: readonly ElementId[]
  readonly scope: EditScope
  readonly baseRevision: number
  readonly changes: Readonly<Record<ElementId, EditablePropertyPatch>>
  readonly createdAt: string
}): EditCommand {
  return {
    id: input.id,
    source: input.source,
    targetIds: [...input.targetIds],
    scope: input.scope,
    baseRevision: input.baseRevision,
    changes: { ...input.changes },
    createdAt: input.createdAt,
  }
}

import { parseTemplateDocument, type TemplateDocument } from '../model/document'
import type { TemplateElement } from '../model/element'
import type { ElementRevision } from '../model/history'
import type { ElementId, RevisionEntryId } from '../model/ids'
import type { EditablePropertyPatch } from '../model/properties'
import type { Viewport } from '../model/viewport'
import {
  validateEditCommand,
  type EditCommand,
  type EditCommandContext,
  type EditCommandError,
  type EditMode,
} from './edit-command'
import {
  appendElementRevision,
  captureScopeSnapshot,
  createElementRevision,
  deriveRevisionEntryId,
} from './history'
import { mergeEditableProperties } from './responsive-resolver'

/**
 * Immutable apply.
 *
 * `applyEditCommand` is the only function in the codebase that produces a new
 * canonical document. It validates first, builds a new document without
 * touching the old one, appends per-element/scope history, then re-validates
 * the result. If anything fails, the caller gets typed errors and the document
 * it passed in - unchanged, and identical by reference.
 *
 * Scope routing:
 *   scope 'all'      -> `element.base`
 *   scope <viewport> -> `element.overrides[viewport]` only
 *
 * Mode routing:
 *   'merge'   -> patch fields win, unnamed fields survive
 *   'replace' -> the scope's property set becomes exactly the patch
 *                (an empty patch removes the viewport override entirely)
 */

export type CommitResult =
  | {
      readonly ok: true
      readonly document: TemplateDocument
      readonly command: EditCommand
      readonly changedElementIds: readonly ElementId[]
      readonly revisionEntryIds: readonly RevisionEntryId[]
    }
  | { readonly ok: false; readonly errors: readonly EditCommandError[] }

function hasAnyProperty(patch: EditablePropertyPatch): boolean {
  return Object.values(patch).some((group) => group !== undefined)
}

function applyPatchToElement(
  element: TemplateElement,
  patch: EditablePropertyPatch,
  scope: EditCommand['scope'],
  mode: EditMode,
): TemplateElement {
  if (scope === 'all') {
    return {
      ...element,
      base: mode === 'replace' ? patch : mergeEditableProperties(element.base, patch),
      revision: element.revision + 1,
    }
  }

  const viewport: Viewport = scope
  const overrides = { ...element.overrides }

  if (mode === 'replace') {
    if (hasAnyProperty(patch)) {
      overrides[viewport] = patch
    } else {
      // Restoring to "this viewport had no override" removes the slot.
      delete overrides[viewport]
    }
  } else {
    overrides[viewport] = mergeEditableProperties(element.overrides[viewport] ?? {}, patch)
  }

  return { ...element, overrides, revision: element.revision + 1 }
}

export function applyEditCommand(
  document: TemplateDocument,
  input: unknown,
  context: EditCommandContext = {},
): CommitResult {
  const validation = validateEditCommand(document, input, context)
  if (!validation.ok) {
    return { ok: false, errors: validation.errors }
  }
  const { command } = validation

  // Untargeted elements keep their identity, so unrelated state is provably
  // untouched rather than merely deep-equal.
  const elements: Record<ElementId, TemplateElement> = { ...document.elements }
  const nextRevision = document.revision + 1
  const changedElementIds: ElementId[] = []
  const entries: ElementRevision[] = []

  for (const targetId of command.targetIds) {
    const element = elements[targetId]
    const patch = command.changes[targetId]
    // Both are guaranteed by validation; the guard keeps this total.
    if (element === undefined || patch === undefined) continue

    const before = captureScopeSnapshot(element, command.scope)
    const updated = applyPatchToElement(element, patch, command.scope, command.mode)
    const after = captureScopeSnapshot(updated, command.scope)

    elements[targetId] = updated
    changedElementIds.push(targetId)
    entries.push(
      createElementRevision({
        id: deriveRevisionEntryId(command.id, targetId),
        elementId: targetId,
        scope: command.scope,
        source: command.source,
        documentRevision: nextRevision,
        before,
        after,
        createdAt: command.createdAt,
      }),
    )
  }

  // Each target gets its own independent entry; existing entries are never
  // rewritten or removed, including by a restore.
  let history = document.history
  for (const entry of entries) {
    history = appendElementRevision(history, entry)
  }

  const next: TemplateDocument = { ...document, revision: nextRevision, elements, history }

  // A patch that is individually valid can still produce an invalid element
  // (for example a restore that clears required base content). Re-validating
  // here is what guarantees invalid state can never become current state.
  const verified = parseTemplateDocument(next)
  if (!verified.ok) {
    return {
      ok: false,
      errors: verified.issues.map((issue) => ({
        code: 'invalid-result' as const,
        message: issue.message,
        elementId: undefined,
        path: issue.path,
      })),
    }
  }

  // `next` is returned rather than the re-parsed copy, so untargeted elements
  // keep their original object identity. The parse above is a gate, not a
  // transformation.
  return {
    ok: true,
    document: next,
    command,
    changedElementIds,
    revisionEntryIds: entries.map((entry) => entry.id),
  }
}

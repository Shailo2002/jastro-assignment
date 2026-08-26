import { parseTemplateDocument, type TemplateDocument } from '../model/document'
import type { TemplateElement } from '../model/element'
import type { ElementId } from '../model/ids'
import type { EditablePropertyPatch } from '../model/properties'
import type { Viewport } from '../model/viewport'
import {
  validateEditCommand,
  type EditCommand,
  type EditCommandContext,
  type EditCommandError,
} from './edit-command'
import { mergeEditableProperties } from './responsive-resolver'

/**
 * Immutable apply.
 *
 * `applyEditCommand` is the only function in the codebase that produces a new
 * canonical document. It validates first, builds a new document without
 * touching the old one, then re-validates the result. If anything fails, the
 * caller gets typed errors and the document it passed in - unchanged, and
 * identical by reference.
 *
 * Scope routing:
 *   scope 'all'      -> merged into `element.base`
 *   scope <viewport> -> merged into `element.overrides[viewport]` only
 *
 * History is appended in Step 4; this step deliberately leaves `history` alone.
 */

export type CommitResult =
  | {
      readonly ok: true
      readonly document: TemplateDocument
      readonly command: EditCommand
      readonly changedElementIds: readonly ElementId[]
    }
  | { readonly ok: false; readonly errors: readonly EditCommandError[] }

function applyPatchToElement(
  element: TemplateElement,
  patch: EditablePropertyPatch,
  scope: EditCommand['scope'],
): TemplateElement {
  if (scope === 'all') {
    return {
      ...element,
      base: mergeEditableProperties(element.base, patch),
      revision: element.revision + 1,
    }
  }

  const viewport: Viewport = scope
  const existing = element.overrides[viewport] ?? {}
  return {
    ...element,
    overrides: { ...element.overrides, [viewport]: mergeEditableProperties(existing, patch) },
    revision: element.revision + 1,
  }
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
  const changedElementIds: ElementId[] = []

  for (const targetId of command.targetIds) {
    const element = elements[targetId]
    const patch = command.changes[targetId]
    // Both are guaranteed by validation; the guard keeps this total.
    if (element === undefined || patch === undefined) continue

    elements[targetId] = applyPatchToElement(element, patch, command.scope)
    changedElementIds.push(targetId)
  }

  const next: TemplateDocument = {
    ...document,
    revision: document.revision + 1,
    elements,
  }

  // A patch that is individually valid can still produce an invalid element
  // (for example clearing required base content). Re-validating here is what
  // guarantees invalid state can never become current state.
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
  return { ok: true, document: next, command, changedElementIds }
}

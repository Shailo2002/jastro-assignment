import type { TemplateDocument } from '../model/document'
import type { CommandId, ElementId, RevisionEntryId } from '../model/ids'
import { applyEditCommand, type CommitResult } from './apply-edit-command'
import { createEditCommand, type EditCommand, type EditCommandError } from './edit-command'
import { findElementRevision } from './history'

/**
 * Restore.
 *
 * Restore is not a snapshot swap and not a document rewind. It builds an
 * ordinary `EditCommand` for exactly one element and one scope and sends it
 * through the same validation and apply pipeline as every other edit, which
 * means it is validated, it bumps revisions, and it appends its own history
 * entry with `source: 'restore'`.
 *
 * Semantics: restoring revision R returns the element/scope to the state
 * recorded in `R.before` - the state immediately before that commit. The oldest
 * entry for an element/scope therefore reaches its original template state.
 * Later entries are never deleted; the restore is itself a new entry.
 */

export type RestoreResult =
  | { readonly ok: true; readonly command: EditCommand }
  | { readonly ok: false; readonly errors: readonly EditCommandError[] }

export function createRestoreCommand(input: {
  readonly document: TemplateDocument
  readonly elementId: ElementId
  readonly revisionId: RevisionEntryId
  readonly id: CommandId
  readonly createdAt: string
}): RestoreResult {
  const entry = findElementRevision(input.document, input.elementId, input.revisionId)
  if (entry === undefined) {
    return {
      ok: false,
      errors: [
        {
          code: 'unknown-target',
          message: `No revision "${input.revisionId}" is recorded for element "${input.elementId}".`,
          elementId: input.elementId,
          path: ['history', input.elementId],
        },
      ],
    }
  }

  return {
    ok: true,
    command: createEditCommand({
      id: input.id,
      source: 'restore',
      targetIds: [input.elementId],
      scope: entry.scope,
      // Replace, not merge: a restore must also remove fields added after the
      // revision being restored.
      mode: 'replace',
      baseRevision: input.document.revision,
      changes: { [input.elementId]: entry.before },
      createdAt: input.createdAt,
    }),
  }
}

/** Convenience: build the restore command and commit it in one call. */
export function restoreElementRevision(input: {
  readonly document: TemplateDocument
  readonly elementId: ElementId
  readonly revisionId: RevisionEntryId
  readonly id: CommandId
  readonly createdAt: string
}): CommitResult {
  const prepared = createRestoreCommand(input)
  if (!prepared.ok) {
    return { ok: false, errors: prepared.errors }
  }
  return applyEditCommand(input.document, prepared.command)
}

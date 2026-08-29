import { applyEditCommand } from '../engine/apply-edit-command'
import { createEditCommand } from '../engine/edit-command'
import type { TemplateDocument } from '../model/document'
import { commandId, type ElementId } from '../model/ids'
import { describeProposalReview, toAiEditDraft, type ProposalReviewState } from './proposal-review'

/**
 * The canvas preview of a run that has not been decided yet.
 *
 * A pending proposal is a suggestion, and the document must not know it exists
 * until someone accepts it. But a reviewer cannot judge "set the background to
 * green" from a hex pair in a table: the question the card asks is a question
 * about the rendered template, so the answer belongs on the canvas.
 *
 * This builds a THROWAWAY document: the canonical one, plus every pending
 * proposal that could be accepted right now, applied through the same
 * `applyEditCommand` pipeline an acceptance uses. Nothing here reaches the
 * store, so:
 *
 * - the canonical document, its revision, and its history are untouched, and
 *   the panels that read them (inspector, code, history, persistence) keep
 *   showing what is actually committed;
 * - rejecting simply stops including the proposal, so the preview reverts by
 *   not being built rather than by an undo that would have to be written;
 * - accepting changes nothing on screen, because the pipeline has already been
 *   run against these exact values - which is the whole point of previewing
 *   through it rather than through a second, parallel merge.
 *
 * A proposal is previewed exactly when its card says it can be accepted, so the
 * canvas and the card can never disagree about what is on offer. Applying is
 * sequential, and a proposal the pipeline refuses is skipped: a preview may
 * show less than was proposed, never more.
 */

/** Fixed, because a preview document is discarded and never recorded. */
const PREVIEW_CREATED_AT = '1970-01-01T00:00:00.000Z'

export interface ProposalPreview {
  /** The document to RENDER. Never commit it, never persist it. */
  readonly document: TemplateDocument
  /** The elements the preview is showing uncommitted values for. */
  readonly previewedIds: readonly ElementId[]
}

export function previewPendingProposals(input: {
  readonly document: TemplateDocument
  readonly state: ProposalReviewState | undefined
  readonly selectedIds: readonly ElementId[]
}): ProposalPreview {
  const { document, state, selectedIds } = input
  if (state === undefined) return { document, previewedIds: [] }

  const view = describeProposalReview({ document, state, selectedIds })
  const previewedIds: ElementId[] = []
  let previewed = document

  for (const card of view.cards) {
    if (!card.canAccept) continue

    // The draft is prepared against the document being built up, so a run of
    // several proposals stacks instead of each one failing the revision check.
    const draft = toAiEditDraft(card.proposal, previewed)
    const result = applyEditCommand(
      previewed,
      createEditCommand({
        id: commandId(`preview.${card.proposal.id}`),
        source: draft.source,
        targetIds: draft.targetIds,
        scope: draft.scope,
        changes: draft.changes,
        baseRevision: draft.baseRevision,
        createdAt: PREVIEW_CREATED_AT,
      }),
      { selectionSnapshot: selectedIds },
    )
    if (!result.ok) continue

    previewed = result.document
    previewedIds.push(card.proposal.elementId)
  }

  return { document: previewed, previewedIds }
}

/** The canvas note, or nothing when there is no uncommitted value on screen. */
export function describeProposalPreview(preview: ProposalPreview): string | undefined {
  const count = preview.previewedIds.length
  if (count === 0) return undefined
  return `Previewing ${count} suggested change${count === 1 ? '' : 's'}. Accept to keep ${count === 1 ? 'it' : 'them'}.`
}

import type { TemplateDocument } from '../model/document'
import type {
  ProposalRun,
  ProposalRunFailure,
  ProposalSkip,
} from '../engine/generate-proposals'
import {
  proposalFreshness,
  validateProposal,
  type Proposal,
  type ProposalError,
} from '../engine/proposal'
import { resolveElementProperties } from '../engine/responsive-resolver'
import type { ElementId } from '../model/ids'
import type { EditableProperties, EditablePropertyPatch } from '../model/properties'
import type { EditScope } from '../model/viewport'
import { describeScopeLock, EDIT_SCOPE_LABELS, type ScopeLockDescription } from './edit-scope'
import { describeElement } from './element-names'

/**
 * Proposal review, as pure functions.
 *
 * A generated run is transient UI state: it is a list of suggestions, and the
 * document does not know it exists. This module owns two things and nothing
 * else:
 *
 * - the per-proposal OUTCOME the reviewer chose (pending / accepted /
 *   rejected), which is the only thing a click changes;
 * - the per-proposal STATUS shown on screen, which is derived on every render
 *   by re-validating the proposal against the CURRENT document and the CURRENT
 *   selection.
 *
 * Deriving status rather than storing it is what makes staleness honest: a
 * proposal generated at revision 3 does not need to be told that revision 4
 * happened, and no code path can forget to mark it.
 *
 * Staleness is measured per element and per field (`proposalFreshness`), not by
 * the document revision counter. Under a whole-document counter a run would
 * poison itself: accepting the first card would stale every sibling, and
 * independent per-element outcomes would be impossible. Instead a card is stale
 * exactly when the fields it names no longer hold the values it reported as
 * `before` - which is a stronger check for that element, and correctly
 * indifferent to an edit somewhere else.
 *
 * Nothing here writes to the document. `toAiEditDraft` builds the input for the
 * store's existing commit path; the shared command pipeline still validates it.
 */

/** What the reviewer decided. Only a click changes this. */
export const PROPOSAL_OUTCOMES = ['pending', 'accepted', 'rejected'] as const
export type ProposalOutcome = (typeof PROPOSAL_OUTCOMES)[number]

/** What the card shows. `stale` and `invalid` are derived, never stored. */
export type ProposalStatus = ProposalOutcome | 'stale' | 'invalid'

export interface ProposalReviewState {
  readonly run: ProposalRun
  /** Keyed by proposal id; absent means pending. */
  readonly outcomes: Readonly<Record<string, ProposalOutcome>>
}

export function startReview(run: ProposalRun): ProposalReviewState {
  return { run, outcomes: {} }
}

export function setProposalOutcome(
  state: ProposalReviewState,
  proposalId: string,
  outcome: ProposalOutcome,
): ProposalReviewState {
  return { ...state, outcomes: { ...state.outcomes, [proposalId]: outcome } }
}

export function outcomeFor(state: ProposalReviewState, proposalId: string): ProposalOutcome {
  return state.outcomes[proposalId] ?? 'pending'
}

/**
 * Everything the AI panel holds between renders. It is transient UI state: no
 * part of it is persisted, and the document does not know a run exists.
 */
export interface AiPanelState {
  readonly instruction: string
  readonly review: ProposalReviewState | undefined
  readonly failure: ProposalRunFailure | undefined
  /** Errors from the shared pipeline when an acceptance was rejected. */
  readonly commitErrors: readonly string[]
}

export const EMPTY_AI_PANEL_STATE: AiPanelState = {
  instruction: '',
  review: undefined,
  failure: undefined,
  commitErrors: [],
}

/* -------------------------------------------------------------------------- */
/* Before/after formatting                                                     */
/* -------------------------------------------------------------------------- */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `{ value, unit }` reads as `880px`, so it is a leaf rather than two rows. */
function isDimensionValue(value: unknown): value is { value: number; unit: string } {
  return (
    isPlainObject(value) &&
    typeof value['value'] === 'number' &&
    typeof value['unit'] === 'string' &&
    Object.keys(value).length === 2
  )
}

/** Dotted leaf paths, so a one-side padding change shows as one row. */
function collectLeaves(value: unknown, prefix: string, into: Map<string, unknown>): void {
  if (isPlainObject(value) && !isDimensionValue(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectLeaves(child, prefix === '' ? key : `${prefix}.${key}`, into)
    }
    return
  }
  if (value !== undefined) into.set(prefix, value)
}

export function formatPropertyValue(value: unknown): string {
  if (value === undefined) return 'not set'
  if (typeof value === 'string') return value === '' ? '(empty)' : `“${value}”`
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (isDimensionValue(value)) return `${value.value}${value.unit}`
  return JSON.stringify(value)
}

export interface ProposalFieldChange {
  /** e.g. `typography.fontWeight`, `spacing.padding.top`. */
  readonly path: string
  readonly before: string
  readonly after: string
}

/**
 * The rows a review card shows. Only fields the patch actually names appear,
 * and a field the element did not set reads as `not set` rather than being
 * hidden - "unset to 500" is a change a reviewer should see.
 */
export function describeProposalChanges(
  before: EditablePropertyPatch,
  after: EditablePropertyPatch,
): readonly ProposalFieldChange[] {
  const beforeLeaves = new Map<string, unknown>()
  const afterLeaves = new Map<string, unknown>()
  collectLeaves(before, '', beforeLeaves)
  collectLeaves(after, '', afterLeaves)

  const paths = [...new Set([...beforeLeaves.keys(), ...afterLeaves.keys()])].sort()
  return paths.flatMap((path) => {
    const from = beforeLeaves.get(path)
    const to = afterLeaves.get(path)
    if (JSON.stringify(from) === JSON.stringify(to)) return []
    return [{ path, before: formatPropertyValue(from), after: formatPropertyValue(to) }]
  })
}

/* -------------------------------------------------------------------------- */
/* Card and run description                                                    */
/* -------------------------------------------------------------------------- */

export interface ProposalCardView {
  readonly proposal: Proposal
  readonly status: ProposalStatus
  /** e.g. `Heading: Ship a landing page ...`. */
  readonly targetName: string
  readonly scopeText: string
  readonly changes: readonly ProposalFieldChange[]
  /** Plain text, never colour alone. */
  readonly statusText: string
  readonly canAccept: boolean
  readonly canReject: boolean
  readonly errors: readonly ProposalError[]
}

export interface ProposalReviewView {
  readonly scenarioTitle: string
  readonly scopeText: string
  readonly scopeLock: ScopeLockDescription
  readonly cards: readonly ProposalCardView[]
  readonly skipped: readonly ProposalSkip[]
  readonly counts: Readonly<Record<ProposalStatus, number>>
  /** One sentence for the live region, e.g. after generation or acceptance. */
  readonly summary: string
}

/** The name is read from the same values the scope edits, so it matches. */
function targetNameFor(document: TemplateDocument, proposal: Proposal): string {
  const element = document.elements[proposal.elementId]
  if (element === undefined) return String(proposal.elementId)
  const properties: EditableProperties =
    proposal.scope === 'all'
      ? element.base
      : resolveElementProperties(element, proposal.scope)
  return describeElement({ id: element.id, type: element.type, properties }).accessibleName
}

function statusTextFor(input: {
  status: ProposalStatus
  document: TemplateDocument
  proposal: Proposal
  errors: readonly ProposalError[]
}): string {
  switch (input.status) {
    case 'accepted':
      return 'Accepted. This change was committed on its own.'
    case 'rejected':
      return 'Rejected. Nothing was changed.'
    case 'stale':
      return `Stale. These fields changed after this proposal was generated at revision ${input.proposal.baseRevision}; the template is now at revision ${input.document.revision}. Run the instruction again to work from current values.`
    case 'invalid':
      return `Cannot be applied. ${input.errors.map((error) => error.message).join(' ')}`
    case 'pending':
      return 'Pending review. Nothing has changed yet.'
  }
}

function countStatuses(cards: readonly ProposalCardView[]): Record<ProposalStatus, number> {
  const counts: Record<ProposalStatus, number> = {
    pending: 0,
    accepted: 0,
    rejected: 0,
    stale: 0,
    invalid: 0,
  }
  for (const card of cards) counts[card.status] += 1
  return counts
}

function summarize(input: {
  counts: Record<ProposalStatus, number>
  total: number
  skipped: number
}): string {
  const parts: string[] = []
  if (input.counts.pending > 0) parts.push(`${input.counts.pending} awaiting review`)
  if (input.counts.accepted > 0) parts.push(`${input.counts.accepted} accepted`)
  if (input.counts.rejected > 0) parts.push(`${input.counts.rejected} rejected`)
  if (input.counts.stale > 0) parts.push(`${input.counts.stale} stale`)
  if (input.counts.invalid > 0) parts.push(`${input.counts.invalid} not applicable`)

  const skipped =
    input.skipped === 0
      ? ''
      : ` ${input.skipped} selected element${input.skipped === 1 ? ' was' : 's were'} left alone.`

  return `${input.total} proposal${input.total === 1 ? '' : 's'}: ${parts.join(', ')}.${skipped}`
}

/**
 * The whole review surface, recomputed from the current document and selection.
 *
 * `selectedIds` is passed in rather than read from the proposal's own snapshot
 * on purpose: an AI edit may only touch what is selected NOW, so deselecting an
 * element makes its proposal unacceptable while leaving it visible and
 * explained.
 */
export function describeProposalReview(input: {
  readonly document: TemplateDocument
  readonly state: ProposalReviewState
  readonly selectedIds: readonly ElementId[]
}): ProposalReviewView {
  const { document, state, selectedIds } = input
  const { run } = state

  const cards: ProposalCardView[] = run.proposals.map((proposal) => {
    const outcome = outcomeFor(state, proposal.id)
    const validation = validateProposal(document, proposal, { selectionSnapshot: selectedIds })
    const fresh = proposalFreshness(document, proposal).fresh

    // `validateProposal` compares the document revision, which is the right
    // gate for an untrusted proposal but too coarse for a review card: an edit
    // to another element must not disqualify this one. The field-level check
    // above replaces that single error, and every other error still stands.
    const errors = (validation.ok ? [] : validation.errors).filter(
      (error) => !(error.code === 'stale-revision' && fresh),
    )

    // A decided card keeps its decision: an accepted proposal is necessarily
    // "stale" afterwards, and reporting that instead of "accepted" would be a
    // lie about what happened.
    const status: ProposalStatus =
      outcome !== 'pending'
        ? outcome
        : errors.some((error) => error.code !== 'stale-revision')
          ? 'invalid'
          : errors.length > 0 || !fresh
            ? 'stale'
            : 'pending'

    return {
      proposal,
      status,
      targetName: targetNameFor(document, proposal),
      scopeText: EDIT_SCOPE_LABELS[proposal.scope],
      changes: describeProposalChanges(proposal.before, proposal.after),
      statusText: statusTextFor({ status, document, proposal, errors }),
      canAccept: status === 'pending',
      canReject: outcome === 'pending',
      errors,
    }
  })

  const counts = countStatuses(cards)

  return {
    scenarioTitle: run.scenarioTitle,
    scopeText: EDIT_SCOPE_LABELS[run.scope],
    scopeLock: describeScopeLock({
      scope: run.scope,
      targetNames: cards.map((card) => card.targetName),
    }),
    cards,
    skipped: run.skipped,
    counts,
    summary: summarize({ counts, total: cards.length, skipped: run.skipped.length }),
  }
}

/* -------------------------------------------------------------------------- */
/* Acceptance                                                                  */
/* -------------------------------------------------------------------------- */

export interface AiEditDraft {
  readonly source: 'ai'
  readonly targetIds: readonly ElementId[]
  readonly scope: EditScope
  readonly changes: Readonly<Record<ElementId, EditablePropertyPatch>>
  /** The revision the resulting command is prepared against. */
  readonly baseRevision: number
}

/**
 * One accepted proposal becomes one single-target command. Acceptance is never
 * batched: that is what makes per-element outcomes independent, and it means a
 * rejected sibling cannot ride along inside someone else's commit.
 *
 * The command is prepared against the revision it is being applied to, because
 * the caller has already established - through `canAccept`, which requires
 * field-level freshness - that this element's values have not moved since the
 * proposal was generated. The scope comes from the proposal, never from the
 * current scope switcher, so a change of scope after generation cannot redirect
 * an accepted change to another viewport.
 */
export function toAiEditDraft(
  proposal: Proposal,
  current: { readonly revision: number },
): AiEditDraft {
  return {
    source: 'ai',
    targetIds: [proposal.elementId],
    scope: proposal.scope,
    changes: { [proposal.elementId]: proposal.after },
    baseRevision: current.revision,
  }
}

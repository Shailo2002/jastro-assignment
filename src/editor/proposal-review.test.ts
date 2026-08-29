import { describe, expect, it } from 'vitest'

import type { TemplateDocument } from '../model/document'
import { applyEditCommand } from '../engine/apply-edit-command'
import { createEditCommand } from '../engine/edit-command'
import {
  generateProposals,
  PROPOSAL_RUN_FAILURE_CODES,
  type ProposalRun,
} from '../engine/generate-proposals'
import { commandId, elementId } from '../model/ids'
import { createInitialTemplateDocument } from '../model/initial-template'
import type { EditablePropertyPatch } from '../model/properties'
import type { EditScope } from '../model/viewport'
import {
  describeProposalChanges,
  describeProposalReview,
  describeRunFailure,
  describeSkipped,
  formatPropertyValue,
  outcomeFor,
  setProposalOutcome,
  startReview,
  toAiEditDraft,
} from './proposal-review'

/**
 * Review state, as pure functions.
 *
 * The interesting property here is that status is DERIVED: nothing tells a card
 * that the document moved on, and nothing has to remember to.
 */

const HEADING = elementId('hero.heading')
const FEATURES_HEADING = elementId('features.heading')

function runFor(
  document: TemplateDocument,
  ids: readonly ReturnType<typeof elementId>[],
  instruction = 'Align the selected elements to center',
  scope: EditScope = 'all',
): ProposalRun {
  const result = generateProposals({ document, instruction, selectedIds: ids, scope })
  if (!result.ok) throw new Error(`run failed: ${result.failure.code}`)
  return result.run
}

function commitTo(
  document: TemplateDocument,
  targetId: ReturnType<typeof elementId>,
  changes: EditablePropertyPatch,
): TemplateDocument {
  const result = applyEditCommand(
    document,
    createEditCommand({
      id: commandId(`cmd.${document.revision + 1}`),
      source: 'canvas',
      targetIds: [targetId],
      scope: 'all',
      baseRevision: document.revision,
      changes: { [targetId]: changes },
      createdAt: '2026-08-26T10:00:00.000Z',
    }),
  )
  if (!result.ok) throw new Error('setup commit failed')
  return result.document
}

describe('outcome state', () => {
  it('starts every proposal pending and records one decision at a time', () => {
    const document = createInitialTemplateDocument()
    const run = runFor(document, [HEADING, FEATURES_HEADING])
    const first = run.proposals[0]
    const second = run.proposals[1]
    if (first === undefined || second === undefined) throw new Error('expected two proposals')

    const initial = startReview(run)
    expect(outcomeFor(initial, first.id)).toBe('pending')

    const decided = setProposalOutcome(initial, first.id, 'accepted')
    expect(outcomeFor(decided, first.id)).toBe('accepted')
    expect(outcomeFor(decided, second.id)).toBe('pending')
    // The previous state object is untouched, so rendering cannot see a
    // half-applied decision.
    expect(outcomeFor(initial, first.id)).toBe('pending')
  })
})

describe('before and after rows', () => {
  it('formats an unset field as "not set" rather than hiding it', () => {
    const rows = describeProposalChanges({}, { typography: { fontWeight: 500 } })

    expect(rows).toEqual([
      { path: 'typography.fontWeight', before: 'not set', after: '500' },
    ])
  })

  it('keeps a dimension as one readable row', () => {
    const rows = describeProposalChanges(
      { size: { width: { value: 100, unit: '%' } } },
      { size: { width: { value: 125, unit: '%' } } },
    )

    expect(rows).toEqual([{ path: 'size.width', before: '100%', after: '125%' }])
  })

  it('reports one padding side without the untouched sides', () => {
    const rows = describeProposalChanges(
      { spacing: { padding: { top: 48, left: 20 } } },
      { spacing: { padding: { top: 36, left: 20 } } },
    )

    expect(rows).toEqual([{ path: 'spacing.padding.top', before: '48', after: '36' }])
  })

  it('quotes text so an empty or padded value is visible', () => {
    expect(formatPropertyValue('Ship it')).toBe('“Ship it”')
    expect(formatPropertyValue('')).toBe('(empty)')
    expect(formatPropertyValue(undefined)).toBe('not set')
  })
})

describe('derived status', () => {
  it('is pending for a fresh proposal whose target is still selected', () => {
    const document = createInitialTemplateDocument()
    const run = runFor(document, [HEADING, FEATURES_HEADING])
    const view = describeProposalReview({
      document,
      state: startReview(run),
      selectedIds: [HEADING, FEATURES_HEADING],
    })

    expect(view.cards.map((card) => card.status)).toEqual(['pending', 'pending'])
    expect(view.cards.every((card) => card.canAccept)).toBe(true)
    expect(view.summary).toBe('2 proposals: 2 awaiting review.')
  })

  it('becomes stale when the fields it names change underneath it', () => {
    const document = createInitialTemplateDocument()
    const run = runFor(document, [HEADING, FEATURES_HEADING])
    const later = commitTo(document, HEADING, { typography: { textAlign: 'left' } })

    const view = describeProposalReview({
      document: later,
      state: startReview(run),
      selectedIds: [HEADING, FEATURES_HEADING],
    })

    expect(view.cards[0]?.status).toBe('stale')
    expect(view.cards[0]?.canAccept).toBe(false)
    expect(view.cards[0]?.statusText).toContain('revision 1')
  })

  it('survives an edit that does not touch the fields it names', () => {
    const document = createInitialTemplateDocument()
    const run = runFor(document, [HEADING, FEATURES_HEADING])

    // A different field on the same element, and a different element entirely.
    // Neither invalidates a proposal about `typography.textAlign` on this one.
    const later = commitTo(
      commitTo(document, HEADING, { typography: { fontSize: 40 } }),
      elementId('cta.heading'),
      { typography: { fontSize: 30 } },
    )

    const view = describeProposalReview({
      document: later,
      state: startReview(run),
      selectedIds: [HEADING, FEATURES_HEADING],
    })

    expect(view.cards.map((card) => card.status)).toEqual(['pending', 'pending'])
    expect(view.cards.every((card) => card.canAccept)).toBe(true)
  })

  it('becomes not applicable when its target leaves the selection', () => {
    const document = createInitialTemplateDocument()
    const run = runFor(document, [HEADING, FEATURES_HEADING])

    const view = describeProposalReview({
      document,
      state: startReview(run),
      selectedIds: [FEATURES_HEADING],
    })

    expect(view.cards[0]?.status).toBe('invalid')
    expect(view.cards[0]?.statusText).toContain('only target selected elements')
    expect(view.cards[1]?.status).toBe('pending')
  })

  it('reports a decision rather than the state that decision produced', () => {
    const document = createInitialTemplateDocument()
    const run = runFor(document, [HEADING, FEATURES_HEADING])
    const first = run.proposals[0]
    if (first === undefined) throw new Error('expected a proposal')

    // This is what accepting the first card looks like: its own values have
    // moved, and its sibling is untouched and still acceptable.
    const later = commitTo(document, HEADING, { typography: { textAlign: 'center' } })
    const view = describeProposalReview({
      document: later,
      state: setProposalOutcome(startReview(run), first.id, 'accepted'),
      selectedIds: [HEADING, FEATURES_HEADING],
    })

    expect(view.cards[0]?.status).toBe('accepted')
    expect(view.cards[1]?.status).toBe('pending')
    expect(view.summary).toBe('2 proposals: 1 awaiting review, 1 accepted.')
  })

  it('repeats the Scope Lock statement for the run', () => {
    const document = createInitialTemplateDocument()
    const run = runFor(
      document,
      [elementId('hero.section')],
      'Make the mobile spacing more compact',
      'mobile',
    )
    const view = describeProposalReview({
      document,
      state: startReview(run),
      selectedIds: [elementId('hero.section')],
    })

    expect(view.scopeText).toBe('Mobile only')
    expect(view.scopeLock.protectionText).toBe('Desktop and Tablet keep their current values.')
  })

  it('lists elements the scenario left alone', () => {
    const document = createInitialTemplateDocument()
    const run = runFor(
      document,
      [HEADING, elementId('hero.section')],
      'Make the heading bolder',
    )
    const view = describeProposalReview({
      document,
      state: startReview(run),
      selectedIds: [HEADING, elementId('hero.section')],
    })

    expect(view.cards).toHaveLength(1)
    expect(view.skipped).toHaveLength(1)
    expect(view.summary).toContain('1 selected element was left alone.')
  })
})

describe('acceptance draft', () => {
  it('carries one target, the proposal’s own scope, and its base revision', () => {
    const document = createInitialTemplateDocument()
    const run = runFor(
      document,
      [elementId('hero.section')],
      'Make the mobile spacing more compact',
      'mobile',
    )
    const proposal = run.proposals[0]
    if (proposal === undefined) throw new Error('expected a proposal')

    expect(toAiEditDraft(proposal, { revision: 0 })).toEqual({
      source: 'ai',
      targetIds: [elementId('hero.section')],
      scope: 'mobile',
      changes: { [elementId('hero.section')]: proposal.after },
      baseRevision: 0,
    })
  })

  it('prepares the command against the revision it is applied to', () => {
    const document = createInitialTemplateDocument()
    const run = runFor(document, [HEADING, FEATURES_HEADING])
    const proposal = run.proposals[0]
    if (proposal === undefined) throw new Error('expected a proposal')

    // Freshness has already been established per field by `canAccept`; the
    // command itself must be current or the pipeline rejects it outright.
    expect(toAiEditDraft(proposal, { revision: 4 }).baseRevision).toBe(4)
  })

  it('never batches two proposals into one command', () => {
    const document = createInitialTemplateDocument()
    const run = runFor(document, [HEADING, FEATURES_HEADING])

    for (const proposal of run.proposals) {
      expect(toAiEditDraft(proposal, { revision: 0 }).targetIds).toHaveLength(1)
    }
  })
})

describe('what a failed run says', () => {
  it('answers every failure code with one short sentence', () => {
    for (const code of PROPOSAL_RUN_FAILURE_CODES) {
      const line = describeRunFailure({ code, message: 'engine prose' })

      expect(line.length).toBeLessThanOrEqual(90)
      expect(line.split('. ').length).toBeLessThanOrEqual(2)
      // Never the engine's own wording, which names scenarios and types.
      expect(line).not.toContain('engine prose')
    }
  })

  it('tells the reviewer what they can do about an unsupported instruction', () => {
    const document = createInitialTemplateDocument()
    const result = generateProposals({
      document,
      instruction: 'Add a pricing table with three plans',
      selectedIds: [HEADING],
      scope: 'all',
    })
    if (result.ok) throw new Error('expected a failure')

    expect(describeRunFailure(result.failure)).toBe(
      'That is not one of the supported instructions. Try an example below.',
    )
  })

  it('names what a run left alone in one line, and says nothing when it left nothing', () => {
    expect(describeSkipped([])).toBeUndefined()
    expect(
      describeSkipped([
        { elementId: elementId('hero.section'), reason: 'incompatible-type', message: 'x' },
        { elementId: elementId('hero.image'), reason: 'incompatible-type', message: 'y' },
      ]),
    ).toBe('Left alone: hero.section, hero.image.')
  })
})

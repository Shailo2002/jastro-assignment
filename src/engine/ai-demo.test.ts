import { describe, expect, it } from 'vitest'

import type { TemplateDocument } from '../model/document'
import { commandId, elementId } from '../model/ids'
import { createInitialTemplateDocument } from '../model/initial-template'
import type { EditablePropertyPatch } from '../model/properties'
import type { EditScope } from '../model/viewport'
import { applyEditCommand } from './apply-edit-command'
import { createEditCommand } from './edit-command'
import { generateProposals, type ProposalRun } from './generate-proposals'
import { condenseText, normalizeInstruction, SCENARIOS } from './scenario-catalog'

const HEADING = elementId('hero.heading')
const SUBHEADING = elementId('hero.subheading')
const SECTION = elementId('hero.section')
const IMAGE = elementId('hero.image')
const SECONDARY = elementId('hero.cta.secondary')
const FEATURES_HEADING = elementId('features.heading')

function run(input: {
  document?: TemplateDocument
  instruction: string
  selectedIds: readonly ReturnType<typeof elementId>[]
  scope?: EditScope
}): ProposalRun {
  const result = generateProposals({
    document: input.document ?? createInitialTemplateDocument(),
    instruction: input.instruction,
    selectedIds: input.selectedIds,
    scope: input.scope ?? 'all',
  })
  if (!result.ok) {
    throw new Error(`expected a successful run, got ${result.failure.code}: ${result.failure.message}`)
  }
  return result.run
}

function expectFailure(input: {
  document?: TemplateDocument
  instruction: string
  selectedIds: readonly ReturnType<typeof elementId>[]
  scope?: EditScope
}) {
  const result = generateProposals({
    document: input.document ?? createInitialTemplateDocument(),
    instruction: input.instruction,
    selectedIds: input.selectedIds,
    scope: input.scope ?? 'all',
  })
  if (result.ok) {
    throw new Error('expected the run to fail')
  }
  return result.failure
}

/** Commits one ordinary canvas edit so a test can change "current values". */
function commit(
  document: TemplateDocument,
  targetId: ReturnType<typeof elementId>,
  changes: EditablePropertyPatch,
  scope: EditScope = 'all',
): TemplateDocument {
  const result = applyEditCommand(
    document,
    createEditCommand({
      id: commandId('cmd.setup'),
      source: 'canvas',
      targetIds: [targetId],
      scope,
      baseRevision: document.revision,
      changes: { [targetId]: changes },
      createdAt: '2026-08-26T10:00:00.000Z',
    }),
  )
  if (!result.ok) {
    throw new Error(`setup commit failed: ${result.errors.map((e) => e.message).join('; ')}`)
  }
  return result.document
}

describe('instruction normalisation', () => {
  it('ignores case, punctuation, and spacing', () => {
    expect(normalizeInstruction('  Make the HERO heading BIGGER!! ')).toEqual({
      text: 'make the hero heading bigger',
      words: ['make', 'the', 'hero', 'heading', 'bigger'],
    })
  })

  it('treats an instruction with no words as empty', () => {
    expect(normalizeInstruction('  ...  ').words).toEqual([])
  })
})

describe('content rewrite scenario', () => {
  it('condenses only by removing text', () => {
    expect(
      condenseText(
        'Aster Labs helps small teams edit content, style, and layout per breakpoint, with every change reviewable before it ships.',
      ),
    ).toBe('Aster Labs helps small teams edit content, style, and layout per breakpoint.')
  })

  it('keeps the first sentence', () => {
    expect(condenseText('One canonical document. No surface owns its own truth.')).toBe(
      'One canonical document.',
    )
  })

  it('proposes the condensed text for a long selected element', () => {
    const result = run({ instruction: 'Rewrite the copy to be shorter', selectedIds: [SUBHEADING] })

    expect(result.scenarioId).toBe('content-tighten')
    expect(result.proposals).toHaveLength(1)
    expect(result.proposals[0]?.after).toEqual({
      content: {
        text: 'Aster Labs helps small teams edit content, style, and layout per breakpoint.',
      },
    })
    expect(result.proposals[0]?.before).toEqual({
      content: {
        text: 'Aster Labs helps small teams edit content, style, and layout per breakpoint, with every change reviewable before it ships.',
      },
    })
    expect(result.proposals[0]?.changedPaths).toEqual(['content.text'])
  })

  it('reports an already-short element as a skip instead of inventing a change', () => {
    const result = run({
      instruction: 'Rewrite the copy to be shorter',
      selectedIds: [SUBHEADING, HEADING],
    })

    expect(result.proposals.map((proposal) => proposal.elementId)).toEqual([SUBHEADING])
    expect(result.skipped).toEqual([
      {
        elementId: HEADING,
        reason: 'no-change',
        message: '"hero.heading" is already one short sentence.',
      },
    ])
  })

  it('skips an element that carries no text', () => {
    const failure = expectFailure({
      instruction: 'Rewrite the copy to be shorter',
      selectedIds: [SECTION],
    })

    expect(failure.code).toBe('no-applicable-target')
    expect(failure.skipped?.[0]?.reason).toBe('incompatible-type')
  })
})

describe('style scenario', () => {
  it('raises font weight one step from the current value', () => {
    const result = run({ instruction: 'Make the heading bolder', selectedIds: [HEADING] })

    expect(result.scenarioId).toBe('style-emphasis')
    expect(result.proposals[0]?.before).toEqual({ typography: { fontWeight: 700 } })
    expect(result.proposals[0]?.after).toEqual({ typography: { fontWeight: 800 } })
  })

  it('treats an unset weight as the rendered default', () => {
    const result = run({ instruction: 'Make the text bolder', selectedIds: [SUBHEADING] })

    expect(result.proposals[0]?.before).toEqual({})
    expect(result.proposals[0]?.after).toEqual({ typography: { fontWeight: 500 } })
  })

  it('targets compatible types only', () => {
    const result = run({
      instruction: 'Make the heading bolder',
      selectedIds: [HEADING, SECTION],
    })

    expect(result.proposals.map((proposal) => proposal.elementId)).toEqual([HEADING])
    expect(result.skipped).toEqual([
      {
        elementId: SECTION,
        reason: 'incompatible-type',
        message: 'Font weight applies to text elements; "hero.section" is a section.',
      },
    ])
  })
})

describe('resize and reorder scenarios', () => {
  it('scales the current font size for a text element', () => {
    const result = run({ instruction: 'Make this bigger', selectedIds: [HEADING] })

    expect(result.scenarioId).toBe('size-grow')
    expect(result.proposals[0]?.after).toEqual({ typography: { fontSize: 70 } })
  })

  it('scales the current fixed width for a box element', () => {
    const result = run({ instruction: 'Make this bigger', selectedIds: [IMAGE] })

    expect(result.proposals[0]?.before).toEqual({ size: { width: { value: 100, unit: '%' } } })
    expect(result.proposals[0]?.after).toEqual({ size: { width: { value: 125, unit: '%' } } })
  })

  it('moves an element one step forward through layout order', () => {
    const result = run({ instruction: 'Move this to the front', selectedIds: [SECONDARY] })

    expect(result.scenarioId).toBe('order-front')
    expect(result.proposals[0]?.after).toEqual({ layout: { order: -1 } })
    expect(result.proposals[0]?.changedPaths).toEqual(['layout.order'])
  })
})

describe('shrink scenario', () => {
  it('scales the current font size down for a text element', () => {
    const result = run({ instruction: 'Decrease the font size', selectedIds: [HEADING] })

    expect(result.scenarioId).toBe('size-shrink')
    expect(result.proposals[0]?.before).toEqual({ typography: { fontSize: 56 } })
    expect(result.proposals[0]?.after).toEqual({ typography: { fontSize: 45 } })
  })

  it('scales the current fixed width down for a box element', () => {
    const result = run({ instruction: 'Make this smaller', selectedIds: [IMAGE] })

    expect(result.proposals[0]?.after).toEqual({ size: { width: { value: 80, unit: '%' } } })
  })
})

describe('colour scenarios', () => {
  it('sets the background to the colour named in the instruction', () => {
    const result = run({
      instruction: 'Change the background to green',
      selectedIds: [SECTION],
    })

    expect(result.scenarioId).toBe('color-background')
    expect(result.proposals[0]?.after).toEqual({ surface: { background: '#22c55e' } })
    expect(result.proposals[0]?.changedPaths).toEqual(['surface.background'])
  })

  it('sets the text colour without touching the background', () => {
    const result = run({ instruction: 'Make the text blue', selectedIds: [HEADING] })

    expect(result.scenarioId).toBe('color-text')
    expect(result.proposals[0]?.after).toEqual({ typography: { color: '#3b82f6' } })
  })

  it('skips an element the colour does not apply to', () => {
    const result = run({
      instruction: 'Change the background to white',
      selectedIds: [SECTION, HEADING],
    })

    expect(result.proposals.map((proposal) => proposal.elementId)).toEqual([SECTION])
    expect(result.skipped).toEqual([
      {
        elementId: HEADING,
        reason: 'incompatible-type',
        message:
          'A background applies to boxes, badges, and buttons; "hero.heading" is a heading.',
      },
    ])
  })

  it('needs a colour it knows, not just the word background', () => {
    const failure = expectFailure({
      instruction: 'Change the background to chartreuse',
      selectedIds: [SECTION],
    })

    expect(failure.code).toBe('unsupported-instruction')
  })
})

describe('single-viewport scenario', () => {
  it('reads the chosen viewport and proposes only for that scope', () => {
    const result = run({
      instruction: 'Make the mobile spacing more compact',
      selectedIds: [SECTION],
      scope: 'mobile',
    })

    expect(result.scenarioId).toBe('viewport-compact')
    expect(result.scope).toBe('mobile')
    // The mobile override resolves to 48/20/48/20 with a 16 gap.
    expect(result.proposals[0]?.after).toEqual({
      spacing: { padding: { top: 36, right: 15, bottom: 36, left: 15 }, gap: 12 },
    })
  })

  it('uses each viewport’s own resolved values', () => {
    const mobile = run({
      instruction: 'Make the mobile spacing more compact',
      selectedIds: [SECTION],
      scope: 'mobile',
    })
    const tablet = run({
      instruction: 'Make the tablet spacing more compact',
      selectedIds: [SECTION],
      scope: 'tablet',
    })

    expect(tablet.proposals[0]?.after).not.toEqual(mobile.proposals[0]?.after)
    // Tablet overrides padding only, so the gap comes from the shared base 24.
    expect(tablet.proposals[0]?.after).toEqual({
      spacing: { padding: { top: 54, right: 30, bottom: 54, left: 30 }, gap: 18 },
    })
  })

  it('refuses to run at scope "all"', () => {
    const failure = expectFailure({
      instruction: 'Make the mobile spacing more compact',
      selectedIds: [SECTION],
      scope: 'all',
    })

    expect(failure.code).toBe('scope-not-allowed')
    expect(failure.message).toContain('Desktop, Tablet, or Mobile')
  })
})

describe('multi-element scenario', () => {
  it('returns one independent proposal per selected element', () => {
    const result = run({
      instruction: 'Align the selected elements to center',
      selectedIds: [HEADING, FEATURES_HEADING],
    })

    expect(result.scenarioId).toBe('multi-center')
    expect(result.proposals).toHaveLength(2)
    expect(result.proposals.map((proposal) => proposal.elementId)).toEqual([
      HEADING,
      FEATURES_HEADING,
    ])
    expect(new Set(result.proposals.map((proposal) => proposal.id)).size).toBe(2)
    for (const proposal of result.proposals) {
      expect(proposal.after).toEqual({ typography: { textAlign: 'center' } })
      expect(proposal.selectionSnapshot).toEqual([HEADING, FEATURES_HEADING])
    }
  })

  it('requires more than one target', () => {
    const failure = expectFailure({
      instruction: 'Align the selected elements to center',
      selectedIds: [HEADING],
    })

    expect(failure.code).toBe('not-enough-targets')
  })
})

describe('safe failures', () => {
  it('rejects an unsupported instruction and offers the supported phrases', () => {
    const failure = expectFailure({
      instruction: 'Add a pricing table with three plans',
      selectedIds: [HEADING],
    })

    expect(failure.code).toBe('unsupported-instruction')
    expect(failure.examples).toEqual(SCENARIOS.map((scenario) => scenario.example))
  })

  it('rejects an empty instruction', () => {
    expect(expectFailure({ instruction: '   ', selectedIds: [HEADING] }).code).toBe(
      'empty-instruction',
    )
  })

  it('rejects a run with nothing selected', () => {
    expect(expectFailure({ instruction: 'Make this bigger', selectedIds: [] }).code).toBe(
      'no-selection',
    )
  })

  it('rejects an unknown element id before proposing anything', () => {
    const failure = expectFailure({
      instruction: 'Make this bigger',
      selectedIds: [HEADING, elementId('hero.ghost')],
    })

    expect(failure.code).toBe('unknown-target')
    expect(failure.elementId).toBe('hero.ghost')
  })
})

describe('engine guarantees', () => {
  it('is deterministic for the same instruction, selection, values, and scope', () => {
    const document = createInitialTemplateDocument()
    const first = generateProposals({
      document,
      instruction: 'Make the heading bolder',
      selectedIds: [HEADING, FEATURES_HEADING],
      scope: 'all',
    })
    const second = generateProposals({
      document: createInitialTemplateDocument(),
      instruction: 'MAKE THE HEADING BOLDER.',
      selectedIds: [HEADING, FEATURES_HEADING],
      scope: 'all',
    })

    expect(second).toEqual(first)
  })

  it('follows the current value when the element changes', () => {
    const document = commit(createInitialTemplateDocument(), HEADING, {
      typography: { fontSize: 40 },
    })

    const before = run({ instruction: 'Make this bigger', selectedIds: [HEADING] })
    const after = run({ document, instruction: 'Make this bigger', selectedIds: [HEADING] })

    expect(before.proposals[0]?.after).toEqual({ typography: { fontSize: 70 } })
    expect(after.proposals[0]?.before).toEqual({ typography: { fontSize: 40 } })
    expect(after.proposals[0]?.after).toEqual({ typography: { fontSize: 50 } })
  })

  it('carries the selection snapshot and the base revision it was generated against', () => {
    const document = commit(createInitialTemplateDocument(), HEADING, {
      typography: { fontSize: 40 },
    })
    const result = run({ document, instruction: 'Make this bigger', selectedIds: [HEADING] })

    expect(result.baseRevision).toBe(document.revision)
    expect(result.proposals[0]?.baseRevision).toBe(document.revision)
    expect(result.proposals[0]?.selectionSnapshot).toEqual([HEADING])
  })

  it('changes neither the document nor its history', () => {
    const document = createInitialTemplateDocument()
    const snapshot = JSON.stringify(document)

    generateProposals({
      document,
      instruction: 'Make the heading bolder',
      selectedIds: [HEADING],
      scope: 'all',
    })
    generateProposals({
      document,
      instruction: 'Make the mobile spacing more compact',
      selectedIds: [SECTION],
      scope: 'mobile',
    })
    generateProposals({
      document,
      instruction: 'Add a pricing table',
      selectedIds: [HEADING],
      scope: 'all',
    })

    expect(JSON.stringify(document)).toBe(snapshot)
    expect(document.revision).toBe(0)
    expect(Object.keys(document.history)).toHaveLength(0)
  })

  it('never mutates the document even when the caller freezes it', () => {
    const document = Object.freeze(createInitialTemplateDocument())

    expect(() =>
      generateProposals({
        document,
        instruction: 'Make this bigger',
        selectedIds: [HEADING, IMAGE],
        scope: 'all',
      }),
    ).not.toThrow()
  })

  it('exposes one reviewer-visible example per scenario', () => {
    const examples = SCENARIOS.map((scenario) => scenario.example)

    expect(new Set(examples).size).toBe(SCENARIOS.length)
    for (const scenario of SCENARIOS) {
      const matched = generateProposals({
        document: createInitialTemplateDocument(),
        instruction: scenario.example,
        // Everything the catalog can act on, so requirement checks are the
        // only thing that can stop a documented example from matching.
        selectedIds: [HEADING, SUBHEADING, SECTION, IMAGE],
        scope: scenario.requirements.viewportScope === true ? 'mobile' : 'all',
      })

      if (!matched.ok) {
        throw new Error(`example "${scenario.example}" failed: ${matched.failure.code}`)
      }
      expect(matched.run.scenarioId).toBe(scenario.id)
    }
  })
})

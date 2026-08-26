import { describe, expect, it } from 'vitest'

import type { TemplateDocument } from '../model/document'
import { commandId, elementId, proposalId } from '../model/ids'
import { createInitialTemplateDocument } from '../model/initial-template'
import { applyEditCommand } from './apply-edit-command'
import { createEditCommand } from './edit-command'
import { generateProposals } from './generate-proposals'
import {
  isProposalStale,
  validateProposal,
  validateProposals,
  type Proposal,
} from './proposal'

const HEADING = elementId('hero.heading')
const SUBHEADING = elementId('hero.subheading')

function baseProposal(document: TemplateDocument): Proposal {
  return {
    id: proposalId('style-emphasis.hero.heading'),
    scenarioId: 'style-emphasis',
    elementId: HEADING,
    scope: 'all',
    baseRevision: document.revision,
    selectionSnapshot: [HEADING],
    before: { typography: { fontWeight: 700 } },
    after: { typography: { fontWeight: 800 } },
    changedPaths: ['typography.fontWeight'],
    summary: 'Raises font weight from 700 to 800.',
  }
}

function codes(result: ReturnType<typeof validateProposal>): readonly string[] {
  return result.ok ? [] : result.errors.map((error) => error.code)
}

function commitFontSize(document: TemplateDocument, fontSize: number): TemplateDocument {
  const result = applyEditCommand(
    document,
    createEditCommand({
      id: commandId('cmd.1'),
      source: 'canvas',
      targetIds: [HEADING],
      scope: 'all',
      baseRevision: document.revision,
      changes: { [HEADING]: { typography: { fontSize } } },
      createdAt: '2026-08-26T10:00:00.000Z',
    }),
  )
  if (!result.ok) throw new Error('setup commit failed')
  return result.document
}

describe('proposal validation', () => {
  it('accepts a well-formed proposal for a selected element', () => {
    const document = createInitialTemplateDocument()
    const result = validateProposal(document, baseProposal(document), {
      selectionSnapshot: [HEADING],
    })

    expect(result.ok).toBe(true)
  })

  it('rejects an unknown element id', () => {
    const document = createInitialTemplateDocument()
    const ghost = elementId('hero.ghost')
    const result = validateProposal(
      document,
      { ...baseProposal(document), elementId: ghost, selectionSnapshot: [ghost] },
      { selectionSnapshot: [ghost] },
    )

    expect(codes(result)).toContain('unknown-target')
  })

  it('rejects a target outside the current selection', () => {
    const document = createInitialTemplateDocument()
    const result = validateProposal(document, baseProposal(document), {
      selectionSnapshot: [SUBHEADING],
    })

    expect(codes(result)).toEqual(['target-not-selected'])
  })

  it('rejects a target outside the proposal’s own snapshot', () => {
    const document = createInitialTemplateDocument()
    const result = validateProposal(document, {
      ...baseProposal(document),
      selectionSnapshot: [SUBHEADING],
    })

    expect(codes(result)).toContain('target-not-selected')
  })

  it('rejects a forbidden field in the patch', () => {
    const document = createInitialTemplateDocument()
    const result = validateProposal(document, {
      ...baseProposal(document),
      after: { id: 'hero.impostor', typography: { fontWeight: 800 } },
    })

    expect(codes(result)).toEqual(['forbidden-field'])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.message).toContain('id')
    }
  })

  it('rejects revision metadata smuggled into the patch', () => {
    const document = createInitialTemplateDocument()
    const result = validateProposal(document, {
      ...baseProposal(document),
      after: { revision: 99 },
    })

    expect(codes(result)).toEqual(['forbidden-field'])
  })

  it('rejects a value outside the property schema', () => {
    const document = createInitialTemplateDocument()
    const result = validateProposal(document, {
      ...baseProposal(document),
      after: { typography: { fontSize: 9000 } },
    })

    expect(codes(result)).toEqual(['invalid-value'])
  })

  it('rejects an invented scope', () => {
    const document = createInitialTemplateDocument()
    const result = validateProposal(document, { ...baseProposal(document), scope: 'watch' })

    expect(codes(result)).toEqual(['invalid-proposal'])
  })

  it('rejects an unknown scenario id', () => {
    const document = createInitialTemplateDocument()
    const result = validateProposal(document, {
      ...baseProposal(document),
      scenarioId: 'rewrite-everything',
    })

    expect(codes(result)).toEqual(['unknown-scenario'])
  })

  it('rejects a patch that changes nothing', () => {
    const document = createInitialTemplateDocument()
    const result = validateProposal(document, { ...baseProposal(document), after: {} })

    expect(codes(result)).toContain('empty-change')
  })

  it('rejects a stale proposal after a later commit', () => {
    const document = createInitialTemplateDocument()
    const proposal = baseProposal(document)
    const later = commitFontSize(document, 40)

    expect(validateProposal(document, proposal).ok).toBe(true)
    expect(codes(validateProposal(later, proposal))).toContain('stale-revision')
    expect(isProposalStale(later, proposal)).toBe(true)
  })

  it('rejects input that is not a proposal at all', () => {
    const document = createInitialTemplateDocument()

    expect(validateProposal(document, null).ok).toBe(false)
    expect(validateProposal(document, 'style-emphasis').ok).toBe(false)
    expect(validateProposal(document, { id: 'x' }).ok).toBe(false)
  })
})

describe('batch validation', () => {
  it('judges each proposal independently', () => {
    const document = createInitialTemplateDocument()
    const good = baseProposal(document)
    const bad = { ...good, id: proposalId('style-emphasis.hero.subheading'), after: {} }

    const result = validateProposals(document, [good, bad], { selectionSnapshot: [HEADING] })

    expect(result.valid).toHaveLength(1)
    expect(result.valid[0]?.id).toBe(good.id)
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]?.index).toBe(1)
  })
})

describe('engine output is validated', () => {
  it('produces proposals that pass validation against the same document', () => {
    const document = createInitialTemplateDocument()
    const result = generateProposals({
      document,
      instruction: 'Align the selected elements to center',
      selectedIds: [HEADING, SUBHEADING],
      scope: 'mobile',
    })

    if (!result.ok) throw new Error(`run failed: ${result.failure.code}`)
    const validated = validateProposals(document, result.run.proposals, {
      selectionSnapshot: [HEADING, SUBHEADING],
    })

    expect(validated.rejected).toEqual([])
    expect(validated.valid).toHaveLength(result.run.proposals.length)
  })

  it('produces proposals that become stale once the document moves on', () => {
    const document = createInitialTemplateDocument()
    const result = generateProposals({
      document,
      instruction: 'Make the heading bolder',
      selectedIds: [HEADING],
      scope: 'all',
    })
    if (!result.ok) throw new Error('run failed')

    const later = commitFontSize(document, 40)
    const validated = validateProposals(later, result.run.proposals, {
      selectionSnapshot: [HEADING],
    })

    expect(validated.valid).toEqual([])
    expect(validated.rejected[0]?.errors.map((error) => error.code)).toContain('stale-revision')
  })
})

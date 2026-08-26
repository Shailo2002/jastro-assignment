import { describe, expect, it } from 'vitest'

import type { TemplateDocument } from '../model/document'
import { commandId, elementId, revisionEntryId } from '../model/ids'
import { createInitialTemplateDocument } from '../model/initial-template'
import { VIEWPORTS } from '../model/viewport'
import { applyEditCommand } from './apply-edit-command'
import { createEditCommand, type EditCommand } from './edit-command'
import { countHistoryEntries, listElementHistory } from './history'
import { createRestoreCommand, restoreElementRevision } from './restore'
import { resolveAllViewports } from './responsive-resolver'

const HEADING = elementId('hero.heading')
const BUTTON = elementId('hero.cta.primary')

function commit(document: TemplateDocument, overrides: Partial<EditCommand>, sequence: number) {
  const input = createEditCommand({
    id: commandId(`cmd.${sequence}`),
    source: 'canvas',
    targetIds: [HEADING],
    scope: 'all',
    baseRevision: document.revision,
    changes: { [HEADING]: { typography: { fontSize: 40 } } },
    createdAt: `2026-08-26T10:0${sequence}:00.000Z`,
    ...overrides,
  })
  const result = applyEditCommand(document, input)
  if (!result.ok) {
    throw new Error(`commit ${sequence} failed: ${result.errors.map((e) => e.message).join('; ')}`)
  }
  return result
}

describe('restore command construction', () => {
  it('targets exactly one element and the scope recorded on the revision', () => {
    const edited = commit(createInitialTemplateDocument(), { scope: 'mobile' }, 1)
    const revision = listElementHistory(edited.document, HEADING)[0]
    if (!revision) throw new Error('expected a history entry')

    const prepared = createRestoreCommand({
      document: edited.document,
      elementId: HEADING,
      revisionId: revision.id,
      id: commandId('cmd.restore'),
      createdAt: '2026-08-26T11:00:00.000Z',
    })

    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return
    expect(prepared.command.source).toBe('restore')
    expect(prepared.command.mode).toBe('replace')
    expect(prepared.command.scope).toBe('mobile')
    expect(prepared.command.targetIds).toEqual([HEADING])
    expect(prepared.command.baseRevision).toBe(edited.document.revision)
    expect(prepared.command.changes[HEADING]).toEqual(revision.before)
  })

  it('rejects an unknown revision id without touching the document', () => {
    const document = createInitialTemplateDocument()
    const prepared = createRestoreCommand({
      document,
      elementId: HEADING,
      revisionId: revisionEntryId('rev.ghost'),
      id: commandId('cmd.restore'),
      createdAt: '2026-08-26T11:00:00.000Z',
    })

    expect(prepared.ok).toBe(false)
    expect(countHistoryEntries(document)).toBe(0)
  })
})

describe('restore goes through the normal pipeline', () => {
  it('returns the element to its pre-edit values', () => {
    const document = createInitialTemplateDocument()
    const originalSize = document.elements[HEADING]?.base.typography?.fontSize
    const edited = commit(document, {}, 1)
    const revision = listElementHistory(edited.document, HEADING)[0]
    if (!revision) throw new Error('expected a history entry')

    const restored = restoreElementRevision({
      document: edited.document,
      elementId: HEADING,
      revisionId: revision.id,
      id: commandId('cmd.restore'),
      createdAt: '2026-08-26T11:00:00.000Z',
    })

    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.document.elements[HEADING]?.base.typography?.fontSize).toBe(originalSize)
    expect(restored.document.elements[HEADING]?.base).toEqual(document.elements[HEADING]?.base)
  })

  it('increments the document and element revisions rather than rewinding them', () => {
    const edited = commit(createInitialTemplateDocument(), {}, 1)
    const revision = listElementHistory(edited.document, HEADING)[0]
    if (!revision) throw new Error('expected a history entry')

    const restored = restoreElementRevision({
      document: edited.document,
      elementId: HEADING,
      revisionId: revision.id,
      id: commandId('cmd.restore'),
      createdAt: '2026-08-26T11:00:00.000Z',
    })

    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.document.revision).toBe(2)
    expect(restored.document.elements[HEADING]?.revision).toBe(2)
  })

  it('adds a new history entry and keeps the entry it restored', () => {
    const edited = commit(createInitialTemplateDocument(), {}, 1)
    const revision = listElementHistory(edited.document, HEADING)[0]
    if (!revision) throw new Error('expected a history entry')

    const restored = restoreElementRevision({
      document: edited.document,
      elementId: HEADING,
      revisionId: revision.id,
      id: commandId('cmd.restore'),
      createdAt: '2026-08-26T11:00:00.000Z',
    })

    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    const entries = listElementHistory(restored.document, HEADING)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual(revision)
    expect(entries[1]?.source).toBe('restore')
    expect(entries[1]?.documentRevision).toBe(2)
  })

  it('removes a field that was added after the restored revision', () => {
    const document = createInitialTemplateDocument()
    const first = commit(document, { scope: 'mobile' }, 1)
    const revision = listElementHistory(first.document, HEADING, 'mobile')[0]
    if (!revision) throw new Error('expected a history entry')

    // A later edit adds a field the restored revision never had.
    const second = commit(
      first.document,
      { scope: 'mobile', changes: { [HEADING]: { typography: { letterSpacing: 2 } } } },
      2,
    )
    expect(second.document.elements[HEADING]?.overrides.mobile?.typography?.letterSpacing).toBe(2)

    const restored = restoreElementRevision({
      document: second.document,
      elementId: HEADING,
      revisionId: revision.id,
      id: commandId('cmd.restore'),
      createdAt: '2026-08-26T11:00:00.000Z',
    })

    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    const mobile = restored.document.elements[HEADING]?.overrides.mobile
    expect(mobile?.typography?.letterSpacing).toBeUndefined()
    expect(mobile).toEqual(document.elements[HEADING]?.overrides.mobile)
  })

  it('removes the override entirely when restoring to "no override"', () => {
    const document = createInitialTemplateDocument()
    expect(document.elements[HEADING]?.overrides.desktop).toBeUndefined()

    const edited = commit(document, { scope: 'desktop' }, 1)
    const revision = listElementHistory(edited.document, HEADING, 'desktop')[0]
    if (!revision) throw new Error('expected a history entry')

    const restored = restoreElementRevision({
      document: edited.document,
      elementId: HEADING,
      revisionId: revision.id,
      id: commandId('cmd.restore'),
      createdAt: '2026-08-26T11:00:00.000Z',
    })

    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    expect(restored.document.elements[HEADING]?.overrides.desktop).toBeUndefined()
  })
})

describe('restore isolation', () => {
  it('restoring the heading leaves the button untouched', () => {
    const document = createInitialTemplateDocument()
    const buttonBefore = document.elements[BUTTON]

    const edited = commit(
      document,
      {
        targetIds: [HEADING, BUTTON],
        changes: {
          [HEADING]: { typography: { fontSize: 40 } },
          [BUTTON]: { typography: { fontSize: 12 } },
        },
      },
      1,
    )
    const revision = listElementHistory(edited.document, HEADING)[0]
    if (!revision) throw new Error('expected a history entry')

    const restored = restoreElementRevision({
      document: edited.document,
      elementId: HEADING,
      revisionId: revision.id,
      id: commandId('cmd.restore'),
      createdAt: '2026-08-26T11:00:00.000Z',
    })

    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    // Heading is back; the button keeps the edit and its own history.
    expect(restored.document.elements[HEADING]?.base.typography?.fontSize).toBe(56)
    expect(restored.document.elements[BUTTON]?.base.typography?.fontSize).toBe(12)
    expect(restored.document.elements[BUTTON]).toBe(edited.document.elements[BUTTON])
    expect(restored.document.elements[BUTTON]).not.toBe(buttonBefore)
    expect(listElementHistory(restored.document, BUTTON)).toHaveLength(1)
  })

  it('restoring heading/mobile leaves heading desktop and tablet unchanged', () => {
    const document = createInitialTemplateDocument()
    const original = resolveAllViewports(document.elements[HEADING] ?? never())

    const mobileEdit = commit(
      document,
      { scope: 'mobile', changes: { [HEADING]: { typography: { fontSize: 21 } } } },
      1,
    )
    const tabletEdit = commit(
      mobileEdit.document,
      { scope: 'tablet', changes: { [HEADING]: { typography: { fontSize: 44 } } } },
      2,
    )
    const revision = listElementHistory(tabletEdit.document, HEADING, 'mobile')[0]
    if (!revision) throw new Error('expected a mobile history entry')

    const restored = restoreElementRevision({
      document: tabletEdit.document,
      elementId: HEADING,
      revisionId: revision.id,
      id: commandId('cmd.restore'),
      createdAt: '2026-08-26T11:00:00.000Z',
    })

    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    const after = resolveAllViewports(restored.document.elements[HEADING] ?? never())

    // Mobile is back to its original resolved values...
    expect(JSON.stringify(after.mobile)).toBe(JSON.stringify(original.mobile))
    // ...desktop is untouched, and the unrelated tablet edit survives.
    expect(JSON.stringify(after.desktop)).toBe(JSON.stringify(original.desktop))
    expect(after.tablet.typography?.fontSize).toBe(44)
  })

  it.each(VIEWPORTS)('a %s restore does not disturb the other viewports', (viewport) => {
    const document = createInitialTemplateDocument()
    let current = document
    // Give every viewport its own edit so each has something to protect.
    for (const [index, target] of VIEWPORTS.entries()) {
      current = commit(
        current,
        { scope: target, changes: { [HEADING]: { typography: { fontSize: 20 + index } } } },
        index + 1,
      ).document
    }
    const before = resolveAllViewports(current.elements[HEADING] ?? never())
    const revision = listElementHistory(current, HEADING, viewport)[0]
    if (!revision) throw new Error('expected a history entry')

    const restored = restoreElementRevision({
      document: current,
      elementId: HEADING,
      revisionId: revision.id,
      id: commandId('cmd.restore'),
      createdAt: '2026-08-26T11:00:00.000Z',
    })

    expect(restored.ok).toBe(true)
    if (!restored.ok) return
    const after = resolveAllViewports(restored.document.elements[HEADING] ?? never())

    for (const other of VIEWPORTS.filter((candidate) => candidate !== viewport)) {
      expect(JSON.stringify(after[other]), other).toBe(JSON.stringify(before[other]))
    }
  })

  it('leaves the document unchanged when the restore command is stale', () => {
    const edited = commit(createInitialTemplateDocument(), {}, 1)
    const revision = listElementHistory(edited.document, HEADING)[0]
    if (!revision) throw new Error('expected a history entry')

    const prepared = createRestoreCommand({
      document: edited.document,
      elementId: HEADING,
      revisionId: revision.id,
      id: commandId('cmd.restore'),
      createdAt: '2026-08-26T11:00:00.000Z',
    })
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return

    // Someone else commits first, so the prepared restore is now stale.
    const moved = commit(edited.document, { id: commandId('cmd.9') }, 2)
    const snapshot = JSON.stringify(moved.document)

    const result = applyEditCommand(moved.document, prepared.command)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((issue) => issue.code)).toContain('stale-revision')
    expect(JSON.stringify(moved.document)).toBe(snapshot)
  })
})

describe('replace mode is restricted', () => {
  it.each(['canvas', 'code', 'ai'] as const)('rejects a %s command that uses replace', (source) => {
    const document = createInitialTemplateDocument()
    const input = createEditCommand({
      id: commandId('cmd.1'),
      source,
      targetIds: [HEADING],
      scope: 'mobile',
      mode: 'replace',
      baseRevision: 0,
      changes: { [HEADING]: { typography: { fontSize: 21 } } },
      createdAt: '2026-08-26T10:00:00.000Z',
    })

    const result = applyEditCommand(document, input, { selectionSnapshot: [HEADING] })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((issue) => issue.code)).toContain('mode-not-allowed')
  })

  it('refuses a restore that would clear a required base field', () => {
    const document = createInitialTemplateDocument()
    const snapshot = JSON.stringify(document)
    const input = createEditCommand({
      id: commandId('cmd.1'),
      source: 'restore',
      targetIds: [HEADING],
      scope: 'all',
      mode: 'replace',
      baseRevision: 0,
      changes: { [HEADING]: { typography: { fontSize: 40 } } },
      createdAt: '2026-08-26T10:00:00.000Z',
    })

    const result = applyEditCommand(document, input)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((issue) => issue.code)).toContain('invalid-result')
    expect(JSON.stringify(document)).toBe(snapshot)
  })
})

function never(): never {
  throw new Error('expected element to exist in the fixture')
}

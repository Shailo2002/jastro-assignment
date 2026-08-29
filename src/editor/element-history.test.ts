import { describe, expect, it } from 'vitest'

import { applyEditCommand } from '../engine/apply-edit-command'
import { createEditCommand, type EditCommand } from '../engine/edit-command'
import { listElementHistory } from '../engine/history'
import { restoreElementRevision } from '../engine/restore'
import type { TemplateDocument } from '../model/document'
import { commandId, elementId } from '../model/ids'
import { createInitialTemplateDocument } from '../model/initial-template'
import {
  describeElementHistory,
  describeHistoryTimeline,
  describeRestorePreview,
  describeSelectedHistory,
  formatRevisionTime,
} from './element-history'

/**
 * The history view model.
 *
 * These are the sentences and rows the panel puts on screen. They are asserted
 * here, away from the DOM, because they are the reviewer's only account of what
 * a restore is about to do: the exact element, the exact scope, and the exact
 * fields that would move.
 */

const HEADING = elementId('hero.heading')
const BUTTON = elementId('hero.cta.primary')

function commit(
  document: TemplateDocument,
  overrides: Partial<EditCommand>,
  sequence: number,
): TemplateDocument {
  const command = createEditCommand({
    id: commandId(`cmd.${sequence}`),
    source: 'canvas',
    targetIds: [HEADING],
    scope: 'all',
    baseRevision: document.revision,
    changes: { [HEADING]: { typography: { fontSize: 40 } } },
    createdAt: `2026-08-26T1${sequence}:05:00.000Z`,
    ...overrides,
  })
  // An AI command must carry the selection it was generated from; every other
  // source ignores the snapshot.
  const result = applyEditCommand(document, command, { selectionSnapshot: [HEADING] })
  if (!result.ok) {
    throw new Error(`commit ${sequence} failed: ${result.errors.map((e) => e.message).join('; ')}`)
  }
  return result.document
}

describe('formatRevisionTime', () => {
  it('formats an instant in UTC, so every reviewer reads the same string', () => {
    expect(formatRevisionTime('2026-08-26T10:00:00.000Z')).toBe('26 Aug 2026, 10:00 UTC')
  })

  it('returns an unparseable value unchanged rather than inventing a date', () => {
    expect(formatRevisionTime('not-a-date')).toBe('not-a-date')
  })
})

describe('element history view', () => {
  it('describes source, time, scope, and changed fields for each commit', () => {
    const document = commit(createInitialTemplateDocument(), {}, 1)
    const view = describeElementHistory(document, HEADING)

    expect(view?.totalEntries).toBe(1)
    const entry = view?.groups[0]?.entries[0]
    expect(view?.groups[0]?.scope).toBe('all')
    expect(entry?.sourceLabel).toBe('Manual edit')
    expect(entry?.scopeText).toBe('All views')
    expect(entry?.timeText).toBe('26 Aug 2026, 11:05 UTC')
    expect(entry?.changedFieldsText).toBe('Changed typography.fontSize.')
    expect(entry?.changes).toEqual([{ path: 'typography.fontSize', current: '56', restored: '40' }])
  })

  it('labels each surface that can commit', () => {
    let document = commit(createInitialTemplateDocument(), { source: 'code' }, 1)
    document = commit(document, { source: 'ai', changes: { [HEADING]: { typography: { fontSize: 41 } } } }, 2)

    const first = listElementHistory(document, HEADING)[0]
    if (first === undefined) throw new Error('expected an entry')
    const restored = restoreElementRevision({
      document,
      elementId: HEADING,
      revisionId: first.id,
      id: commandId('cmd.restore'),
      createdAt: '2026-08-26T13:05:00.000Z',
    })
    if (!restored.ok) throw new Error('expected the restore to apply')

    const labels = describeElementHistory(restored.document, HEADING)?.groups[0]?.entries.map(
      (entry) => entry.sourceLabel,
    )
    // Newest first.
    expect(labels).toEqual(['Restore', 'AI edit', 'Code edit'])
  })

  it('groups entries by scope and orders each group newest first', () => {
    let document = commit(createInitialTemplateDocument(), {}, 1)
    document = commit(document, { scope: 'mobile' }, 2)
    document = commit(
      document,
      { scope: 'mobile', changes: { [HEADING]: { typography: { fontSize: 30 } } } },
      3,
    )

    const view = describeElementHistory(document, HEADING)
    expect(view?.groups.map((group) => group.scope)).toEqual(['all', 'mobile'])
    expect(view?.summary).toBe('3 revisions across 2 scopes.')
    expect(
      view?.groups.find((group) => group.scope === 'mobile')?.entries.map(
        (entry) => entry.entry.documentRevision,
      ),
    ).toEqual([3, 2])
  })

  it('states the exact target and the views a restore cannot touch', () => {
    const document = commit(createInitialTemplateDocument(), { scope: 'mobile' }, 1)
    const entry = describeElementHistory(document, HEADING)?.groups[0]?.entries[0]

    expect(entry?.restoreText).toContain('Mobile only')
    expect(entry?.restoreText).toContain(entry?.elementName ?? 'missing')
    expect(entry?.protectionText).toBe('Desktop and Tablet keep their current values.')
  })

  it('previews current values against the state the entry would restore', () => {
    let document = commit(createInitialTemplateDocument(), {}, 1)
    document = commit(document, { changes: { [HEADING]: { typography: { fontSize: 30 } } } }, 2)

    const oldest = listElementHistory(document, HEADING)[0]
    if (oldest === undefined) throw new Error('expected an entry')

    // Current is 30; the oldest entry restores the original 56, not its own 40.
    expect(describeRestorePreview(document, oldest)).toEqual([
      { path: 'typography.fontSize', current: '30', restored: '56' },
    ])
  })

  it('cannot restore an entry whose values already match current state', () => {
    const document = commit(createInitialTemplateDocument(), {}, 1)
    const entry = describeElementHistory(document, HEADING)?.groups[0]?.entries[0]

    // The newest entry's `after` IS current state, so restoring its `before`
    // moves something; a second, undoing commit is what produces a no-op.
    expect(entry?.canRestore).toBe(true)

    const undone = commit(document, { changes: { [HEADING]: { typography: { fontSize: 56 } } } }, 2)
    const oldest = describeElementHistory(undone, HEADING)?.groups[0]?.entries.at(-1)
    expect(oldest?.canRestore).toBe(false)
    expect(oldest?.restoreHint).toContain('nothing to restore')
  })
})

describe('selected history', () => {
  it('returns one view per selected element, in selection order', () => {
    const document = commit(createInitialTemplateDocument(), {}, 1)
    const views = describeSelectedHistory({ document, selectedIds: [BUTTON, HEADING] })

    expect(views.map((view) => view.elementId)).toEqual([BUTTON, HEADING])
    expect(views[0]?.totalEntries).toBe(0)
    expect(views[0]?.summary).toBe('No changes recorded yet.')
    expect(views[1]?.totalEntries).toBe(1)
  })

  it('ignores an id that is not in the document rather than inventing a view', () => {
    const document = createInitialTemplateDocument()
    expect(
      describeSelectedHistory({ document, selectedIds: [elementId('nope.missing')] }),
    ).toEqual([])
  })
})

describe('history timeline', () => {
  /** One commit against the heading, one against the button, in that order. */
  function twoElements(): TemplateDocument {
    const first = commit(createInitialTemplateDocument(), {}, 1)
    return commit(
      first,
      { targetIds: [BUTTON], changes: { [BUTTON]: { typography: { fontSize: 20 } } } },
      2,
    )
  }

  it('reads as the whole layout when nothing is selected', () => {
    const view = describeHistoryTimeline({ document: twoElements(), selectedIds: [] })

    expect(view.mode).toBe('document')
    expect(view.title).toBe('Whole layout')
    expect(view.summary).toBe('2 changes across 2 elements.')
    expect(view.entries.map((entry) => entry.entry.elementId)).toEqual([HEADING, BUTTON])
  })

  it('orders every element together, oldest first, so the newest is last', () => {
    let document = twoElements()
    document = commit(document, { changes: { [HEADING]: { typography: { fontSize: 41 } } } }, 3)

    const view = describeHistoryTimeline({ document, selectedIds: [] })
    // Document revision, not the element it belongs to, decides the order.
    expect(view.entries.map((entry) => entry.entry.documentRevision)).toEqual([1, 2, 3])
    expect(view.entries.at(-1)?.entry.elementId).toBe(HEADING)
  })

  it('narrows to the selection without changing shape', () => {
    const view = describeHistoryTimeline({ document: twoElements(), selectedIds: [BUTTON] })

    expect(view.mode).toBe('selection')
    expect(view.title).toBe(describeElementHistory(twoElements(), BUTTON)?.elementName)
    expect(view.summary).toBe('1 change across 1 element.')
    expect(view.entries.map((entry) => entry.entry.elementId)).toEqual([BUTTON])
  })

  it('names how many elements a multi-selection covers', () => {
    const view = describeHistoryTimeline({
      document: twoElements(),
      selectedIds: [HEADING, BUTTON],
    })

    expect(view.title).toBe('2 selected elements')
    expect(view.entries).toHaveLength(2)
  })

  it('explains what would produce content rather than showing an empty list', () => {
    const empty = describeHistoryTimeline({
      document: createInitialTemplateDocument(),
      selectedIds: [],
    })

    expect(empty.entries).toHaveLength(0)
    expect(empty.summary).toBe('No changes recorded yet.')
    expect(empty.emptyText).toBe('No changes made yet')
  })

  it('keeps every entry restorable in its own right, whatever is selected', () => {
    const document = twoElements()
    const fromDocument = describeHistoryTimeline({ document, selectedIds: [] })
    const fromSelection = describeHistoryTimeline({ document, selectedIds: [BUTTON] })

    // The wider view describes the same entry the narrow one does: a restore
    // is addressed by the entry, never by what happens to be selected.
    const wide = fromDocument.entries.find((entry) => entry.entry.elementId === BUTTON)
    expect(wide?.restoreText).toBe(fromSelection.entries[0]?.restoreText)
    expect(wide?.canRestore).toBe(true)
  })
})

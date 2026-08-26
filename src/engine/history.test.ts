import { describe, expect, it } from 'vitest'

import { commandId, elementId } from '../model/ids'
import { createInitialTemplateDocument } from '../model/initial-template'
import { elementRevisionSchema } from '../model/history'
import { VIEWPORTS } from '../model/viewport'
import { applyEditCommand } from './apply-edit-command'
import { createEditCommand, type EditCommand } from './edit-command'
import {
  captureScopeSnapshot,
  countHistoryEntries,
  diffChangedPaths,
  listElementHistory,
} from './history'

const HEADING = elementId('hero.heading')
const SUBHEADING = elementId('hero.subheading')
const BUTTON = elementId('hero.cta.primary')
const CREATED_AT = '2026-08-26T10:00:00.000Z'

function command(overrides: Partial<EditCommand> = {}): EditCommand {
  return createEditCommand({
    id: commandId('cmd.1'),
    source: 'canvas',
    targetIds: [HEADING],
    scope: 'all',
    baseRevision: 0,
    changes: { [HEADING]: { typography: { fontSize: 40 } } },
    createdAt: CREATED_AT,
    ...overrides,
  })
}

function commitOrThrow(document = createInitialTemplateDocument(), input: unknown = command()) {
  const result = applyEditCommand(document, input, { selectionSnapshot: [HEADING, SUBHEADING] })
  if (!result.ok) {
    throw new Error(`expected commit to succeed: ${result.errors.map((e) => e.message).join('; ')}`)
  }
  return result
}

describe('scope snapshots', () => {
  it('reads base for an "all" scope and the override for a viewport scope', () => {
    const heading = createInitialTemplateDocument().elements[HEADING]
    if (!heading) throw new Error('missing fixture element')

    expect(captureScopeSnapshot(heading, 'all')).toBe(heading.base)
    expect(captureScopeSnapshot(heading, 'mobile')).toBe(heading.overrides.mobile)
    // Desktop has no override yet, so the snapshot is "nothing is overridden".
    expect(captureScopeSnapshot(heading, 'desktop')).toEqual({})
  })
})

describe('changed-path diff', () => {
  it('reports nested paths that differ', () => {
    expect(
      diffChangedPaths(
        { typography: { fontSize: 56, color: '#fafafa' }, spacing: { padding: { top: 96 } } },
        { typography: { fontSize: 40, color: '#fafafa' }, spacing: { padding: { top: 8 } } },
      ),
    ).toEqual(['spacing.padding.top', 'typography.fontSize'])
  })

  it('reports an added and a removed field', () => {
    expect(diffChangedPaths({}, { typography: { fontSize: 40 } })).toEqual([
      'typography.fontSize',
    ])
    expect(diffChangedPaths({ typography: { fontSize: 40 } }, {})).toEqual([
      'typography.fontSize',
    ])
  })

  it('reports nothing when the two sides match', () => {
    const value = { surface: { opacity: 0 }, content: { text: '' } }
    expect(diffChangedPaths(value, { ...value })).toEqual([])
  })

  it('does not treat falsy values as missing', () => {
    expect(diffChangedPaths({ surface: { opacity: 1 } }, { surface: { opacity: 0 } })).toEqual([
      'surface.opacity',
    ])
  })
})

describe('history is appended on commit', () => {
  it('records a schema-valid entry with everything needed to explain the change', () => {
    const document = createInitialTemplateDocument()
    const result = commitOrThrow(document)
    const [entry] = listElementHistory(result.document, HEADING)

    expect(entry).toBeDefined()
    expect(elementRevisionSchema.safeParse(entry).success).toBe(true)
    expect(entry?.elementId).toBe(HEADING)
    expect(entry?.scope).toBe('all')
    expect(entry?.source).toBe('canvas')
    expect(entry?.documentRevision).toBe(1)
    expect(entry?.createdAt).toBe(CREATED_AT)
    expect(entry?.changedPaths).toEqual(['typography.fontSize'])
    expect(entry?.before.typography?.fontSize).toBe(56)
    expect(entry?.after.typography?.fontSize).toBe(40)
  })

  it('derives a traceable entry id from the command', () => {
    const result = commitOrThrow()
    expect(result.revisionEntryIds).toEqual(['cmd.1.hero.heading'])
  })

  it.each(['canvas', 'code', 'ai', 'restore'] as const)(
    'records the %s source on the entry',
    (source) => {
      // Restore is the only source allowed to replace a whole scope, and it
      // targets a viewport override here so no required base field is cleared.
      const input =
        source === 'restore'
          ? command({
              source,
              mode: 'replace',
              scope: 'mobile',
              changes: { [HEADING]: { typography: { fontSize: 21 } } },
            })
          : command({ source })
      const scope = source === 'restore' ? 'mobile' : 'all'
      const result = commitOrThrow(createInitialTemplateDocument(), input)
      const entry = listElementHistory(result.document, HEADING)[0]
      expect(entry?.source).toBe(source)
      expect(entry?.scope).toBe(scope)
    },
  )

  it('creates independent entries for a multi-target commit', () => {
    const result = commitOrThrow(
      createInitialTemplateDocument(),
      command({
        targetIds: [HEADING, SUBHEADING],
        changes: {
          [HEADING]: { typography: { fontSize: 40 } },
          [SUBHEADING]: { typography: { color: '#8ab4ff' } },
        },
      }),
    )

    expect(countHistoryEntries(result.document)).toBe(2)
    expect(listElementHistory(result.document, HEADING)).toHaveLength(1)
    expect(listElementHistory(result.document, SUBHEADING)).toHaveLength(1)
    expect(listElementHistory(result.document, HEADING)[0]?.changedPaths).toEqual([
      'typography.fontSize',
    ])
    expect(listElementHistory(result.document, SUBHEADING)[0]?.changedPaths).toEqual([
      'typography.color',
    ])
  })

  it('records the scope so viewport entries stay separable', () => {
    const first = commitOrThrow(
      createInitialTemplateDocument(),
      command({ scope: 'mobile', changes: { [HEADING]: { typography: { fontSize: 21 } } } }),
    )
    const second = commitOrThrow(
      first.document,
      command({ id: commandId('cmd.2'), scope: 'all', baseRevision: 1 }),
    )

    expect(listElementHistory(second.document, HEADING, 'mobile')).toHaveLength(1)
    expect(listElementHistory(second.document, HEADING, 'all')).toHaveLength(1)
    expect(listElementHistory(second.document, HEADING)).toHaveLength(2)
  })

  it('captures a viewport entry against the override, not the base', () => {
    const result = commitOrThrow(
      createInitialTemplateDocument(),
      command({ scope: 'mobile', changes: { [HEADING]: { typography: { fontSize: 21 } } } }),
    )
    const entry = listElementHistory(result.document, HEADING, 'mobile')[0]

    expect(entry?.before.typography?.fontSize).toBe(32)
    expect(entry?.after.typography?.fontSize).toBe(21)
    // The base value is untouched and is not what the entry describes.
    expect(result.document.elements[HEADING]?.base.typography?.fontSize).toBe(56)
  })

  it('accumulates entries in commit order and never rewrites an earlier one', () => {
    const first = commitOrThrow()
    const firstEntry = listElementHistory(first.document, HEADING)[0]
    const second = commitOrThrow(
      first.document,
      command({ id: commandId('cmd.2'), baseRevision: 1, changes: { [HEADING]: { typography: { fontSize: 30 } } } }),
    )
    const entries = listElementHistory(second.document, HEADING)

    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual(firstEntry)
    expect(entries[0]?.documentRevision).toBe(1)
    expect(entries[1]?.documentRevision).toBe(2)
    expect(entries[1]?.before.typography?.fontSize).toBe(40)
  })

  it('writes no history for an untargeted element', () => {
    const result = commitOrThrow()
    expect(listElementHistory(result.document, BUTTON)).toEqual([])
  })

  it('writes no history when the command is rejected', () => {
    const document = createInitialTemplateDocument()
    const result = applyEditCommand(document, command({ baseRevision: 9 }))

    expect(result.ok).toBe(false)
    expect(countHistoryEntries(document)).toBe(0)
  })

  it.each(VIEWPORTS)('keeps %s history separate from the other viewports', (viewport) => {
    const result = commitOrThrow(
      createInitialTemplateDocument(),
      command({ scope: viewport, changes: { [HEADING]: { typography: { fontSize: 21 } } } }),
    )

    expect(listElementHistory(result.document, HEADING, viewport)).toHaveLength(1)
    for (const other of VIEWPORTS.filter((candidate) => candidate !== viewport)) {
      expect(listElementHistory(result.document, HEADING, other)).toEqual([])
    }
  })
})

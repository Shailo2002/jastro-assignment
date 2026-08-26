import { describe, expect, it } from 'vitest'

import type { TemplateDocument } from '../model/document'
import { commandId, elementId } from '../model/ids'
import { createInitialTemplateDocument } from '../model/initial-template'
import { VIEWPORTS } from '../model/viewport'
import { applyEditCommand } from './apply-edit-command'
import { createEditCommand, type EditCommand } from './edit-command'
import { resolveAllViewports, resolveElementProperties } from './responsive-resolver'

const HEADING = elementId('hero.heading')
const SUBHEADING = elementId('hero.subheading')
const FOOTER = elementId('footer.note')
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

/** Asserts the caller's document is byte-for-byte unchanged. */
function expectUntouched(document: TemplateDocument, snapshot: string): void {
  expect(JSON.stringify(document)).toBe(snapshot)
}

describe('successful commit', () => {
  it('returns a new document and leaves the original untouched', () => {
    const document = createInitialTemplateDocument()
    const snapshot = JSON.stringify(document)

    const result = applyEditCommand(document, command())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document).not.toBe(document)
    expectUntouched(document, snapshot)
  })

  it('increments the document revision and only the targeted element revision', () => {
    const document = createInitialTemplateDocument()
    const result = applyEditCommand(document, command())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.revision).toBe(1)
    expect(result.document.elements[HEADING]?.revision).toBe(1)
    expect(result.document.elements[SUBHEADING]?.revision).toBe(0)
    expect(result.changedElementIds).toEqual([HEADING])
  })

  it('keeps untargeted elements identical by reference', () => {
    const document = createInitialTemplateDocument()
    const result = applyEditCommand(document, command())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.elements[FOOTER]).toBe(document.elements[FOOTER])
    expect(result.document.elements[HEADING]).not.toBe(document.elements[HEADING])
  })

  it('does not touch history in this step', () => {
    const document = createInitialTemplateDocument()
    const result = applyEditCommand(document, command())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.history).toEqual({})
  })

  it('gives each target only its own patch', () => {
    const document = createInitialTemplateDocument()
    const result = applyEditCommand(
      document,
      command({
        targetIds: [HEADING, SUBHEADING],
        changes: {
          [HEADING]: { typography: { fontSize: 40 } },
          [SUBHEADING]: { typography: { fontSize: 15 } },
        },
      }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.elements[HEADING]?.base.typography?.fontSize).toBe(40)
    expect(result.document.elements[SUBHEADING]?.base.typography?.fontSize).toBe(15)
  })

  it('supports a second commit against the new revision', () => {
    const first = applyEditCommand(createInitialTemplateDocument(), command())
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const second = applyEditCommand(
      first.document,
      command({ id: commandId('cmd.2'), baseRevision: 1 }),
    )
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.document.revision).toBe(2)
    expect(second.document.elements[HEADING]?.revision).toBe(2)
  })
})

describe('scope routing', () => {
  it('writes an "all" edit to base and leaves overrides alone', () => {
    const document = createInitialTemplateDocument()
    const result = applyEditCommand(document, command({ scope: 'all' }))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const heading = result.document.elements[HEADING]
    expect(heading?.base.typography?.fontSize).toBe(40)
    expect(heading?.overrides).toEqual(document.elements[HEADING]?.overrides)
  })

  it.each(VIEWPORTS)('writes a %s edit only to that viewport override', (viewport) => {
    const document = createInitialTemplateDocument()
    const before = resolveAllViewports(document.elements[HEADING] ?? never())

    const result = applyEditCommand(
      document,
      command({ scope: viewport, changes: { [HEADING]: { typography: { fontSize: 21 } } } }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const heading = result.document.elements[HEADING]
    if (!heading) throw new Error('missing heading')

    // Base is untouched, so a later shared edit still behaves normally.
    expect(heading.base).toEqual(document.elements[HEADING]?.base)
    expect(heading.overrides[viewport]?.typography?.fontSize).toBe(21)

    const after = resolveAllViewports(heading)
    expect(after[viewport].typography?.fontSize).toBe(21)
    for (const other of VIEWPORTS.filter((candidate) => candidate !== viewport)) {
      expect(JSON.stringify(after[other])).toBe(JSON.stringify(before[other]))
    }
  })

  it('merges into an existing override instead of replacing it', () => {
    const document = createInitialTemplateDocument()
    // hero.heading already overrides mobile fontSize and lineHeight.
    const result = applyEditCommand(
      document,
      command({ scope: 'mobile', changes: { [HEADING]: { typography: { color: '#8ab4ff' } } } }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const mobile = result.document.elements[HEADING]?.overrides.mobile
    expect(mobile?.typography?.color).toBe('#8ab4ff')
    expect(mobile?.typography?.fontSize).toBe(32)
  })

  it('creates an override slot that did not exist yet', () => {
    const document = createInitialTemplateDocument()
    expect(document.elements[HEADING]?.overrides.desktop).toBeUndefined()

    const result = applyEditCommand(
      document,
      command({ scope: 'desktop', changes: { [HEADING]: { typography: { fontSize: 64 } } } }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.elements[HEADING]?.overrides.desktop?.typography?.fontSize).toBe(64)
    expect(
      resolveElementProperties(result.document.elements[HEADING] ?? never(), 'tablet').typography
        ?.fontSize,
    ).toBe(42)
  })

  it('lets a shared edit reach viewports that do not override the field', () => {
    const document = createInitialTemplateDocument()
    const result = applyEditCommand(
      document,
      command({ scope: 'all', changes: { [HEADING]: { typography: { color: '#34d399' } } } }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const resolved = resolveAllViewports(result.document.elements[HEADING] ?? never())
    for (const viewport of VIEWPORTS) {
      expect(resolved[viewport].typography?.color).toBe('#34d399')
    }
  })
})

describe('rejections never reach current state', () => {
  const rejected: readonly [string, unknown][] = [
    [
      'unknown target',
      command({
        targetIds: [elementId('ghost.one')],
        changes: { [elementId('ghost.one')]: { typography: { fontSize: 20 } } },
      }),
    ],
    ['empty targets', command({ targetIds: [], changes: {} })],
    ['duplicate targets', command({ targetIds: [HEADING, HEADING] })],
    ['forbidden field', { ...command(), changes: { [HEADING]: { parentId: 'hero.section' } } }],
    ['invalid value', { ...command(), changes: { [HEADING]: { typography: { fontSize: 900 } } } }],
    ['empty change', command({ changes: { [HEADING]: {} } })],
    ['stale revision', command({ baseRevision: 7 })],
    ['unparseable input', 'not a command'],
    ['null input', null],
  ]

  it.each(rejected)('leaves the document identical after rejecting %s', (_label, input) => {
    const document = createInitialTemplateDocument()
    const snapshot = JSON.stringify(document)

    const result = applyEditCommand(document, input)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.length).toBeGreaterThan(0)
    expectUntouched(document, snapshot)
    expect(document.revision).toBe(0)
    expect(document.elements[HEADING]?.revision).toBe(0)
  })

  it('rejects an AI command whose target was not selected and changes nothing', () => {
    const document = createInitialTemplateDocument()
    const snapshot = JSON.stringify(document)

    const result = applyEditCommand(document, command({ source: 'ai' }), {
      selectionSnapshot: [SUBHEADING],
    })

    expect(result.ok).toBe(false)
    expectUntouched(document, snapshot)
  })

  it('rejects a stale command even when it is otherwise valid', () => {
    const first = applyEditCommand(createInitialTemplateDocument(), command())
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const snapshot = JSON.stringify(first.document)
    // Same command replayed against the already-advanced document.
    const replay = applyEditCommand(first.document, command())

    expect(replay.ok).toBe(false)
    if (replay.ok) return
    expect(replay.errors.map((issue) => issue.code)).toContain('stale-revision')
    expectUntouched(first.document, snapshot)
  })

  it('refuses to commit into a document that would not be valid afterwards', () => {
    const document = createInitialTemplateDocument()
    // Structurally typed but integrity-broken: a root id with no element.
    const broken: TemplateDocument = {
      ...document,
      rootElementIds: [...document.rootElementIds, elementId('missing.section')],
    }
    const snapshot = JSON.stringify(broken)

    const result = applyEditCommand(broken, command())

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((issue) => issue.code)).toContain('invalid-result')
    expectUntouched(broken, snapshot)
  })
})

function never(): never {
  throw new Error('expected element to exist in the fixture')
}

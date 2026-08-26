import { describe, expect, it } from 'vitest'

import { createInitialTemplateDocument } from '../model/initial-template'
import { commandId, elementId } from '../model/ids'
import type { EditCommand } from './edit-command'
import { createEditCommand, validateEditCommand } from './edit-command'

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

/** Builds a deliberately invalid patch without lying to the type system. */
function withPatch(patch: unknown): unknown {
  return { ...command(), changes: { [HEADING]: patch } }
}

function codesOf(input: unknown, context = {}): string[] {
  const result = validateEditCommand(createInitialTemplateDocument(), input, context)
  return result.ok ? [] : result.errors.map((issue) => issue.code)
}

describe('command shape', () => {
  it('accepts a well-formed command', () => {
    const result = validateEditCommand(createInitialTemplateDocument(), command())
    expect(result.ok).toBe(true)
  })

  it('rejects a non-object input without throwing', () => {
    expect(codesOf(null)).toContain('invalid-command')
    expect(codesOf('{}')).toContain('invalid-command')
    expect(codesOf(undefined)).toContain('invalid-command')
  })

  it('rejects unknown top-level command keys', () => {
    expect(codesOf({ ...command(), appliedBy: 'canvas' })).toContain('forbidden-field')
  })

  it('rejects an unknown source and an unknown scope', () => {
    expect(codesOf({ ...command(), source: 'plugin' })).toContain('invalid-command')
    expect(codesOf({ ...command(), scope: 'watch' })).toContain('invalid-command')
  })

  it('rejects a malformed id or timestamp', () => {
    expect(codesOf({ ...command(), id: 'Command One' })).toContain('invalid-command')
    expect(codesOf({ ...command(), createdAt: 'yesterday' })).toContain('invalid-command')
  })
})

describe('target validation', () => {
  it('rejects an empty target list', () => {
    expect(codesOf(command({ targetIds: [], changes: {} }))).toContain('empty-targets')
  })

  it('rejects a duplicated target', () => {
    expect(codesOf(command({ targetIds: [HEADING, HEADING] }))).toContain('duplicate-targets')
  })

  it('rejects an unknown target', () => {
    const ghost = elementId('ghost.element')
    const codes = codesOf(
      command({ targetIds: [ghost], changes: { [ghost]: { typography: { fontSize: 20 } } } }),
    )
    expect(codes).toContain('unknown-target')
  })

  it('accepts a multi-target command when every target is valid', () => {
    const result = validateEditCommand(
      createInitialTemplateDocument(),
      command({
        targetIds: [HEADING, SUBHEADING],
        changes: {
          [HEADING]: { typography: { color: '#8ab4ff' } },
          [SUBHEADING]: { typography: { color: '#8ab4ff' } },
        },
      }),
    )
    expect(result.ok).toBe(true)
  })

  it('rejects the whole multi-target command when one target is unknown', () => {
    const ghost = elementId('ghost.element')
    const codes = codesOf(
      command({
        targetIds: [HEADING, ghost],
        changes: {
          [HEADING]: { typography: { color: '#8ab4ff' } },
          [ghost]: { typography: { color: '#8ab4ff' } },
        },
      }),
    )
    expect(codes).toContain('unknown-target')
  })
})

describe('change map validation', () => {
  it('rejects a target with no change', () => {
    expect(codesOf(command({ targetIds: [HEADING, SUBHEADING] }))).toContain('missing-change')
  })

  it('rejects a change for an element that is not a target', () => {
    expect(
      codesOf(
        command({
          changes: {
            [HEADING]: { typography: { fontSize: 40 } },
            [SUBHEADING]: { typography: { fontSize: 20 } },
          },
        }),
      ),
    ).toContain('unexpected-change')
  })

  it('rejects a patch that sets nothing', () => {
    expect(codesOf(command({ changes: { [HEADING]: {} } }))).toContain('empty-change')
  })
})

describe('field allowlist', () => {
  it.each(['id', 'parentId', 'childIds', 'revision', 'schemaVersion', 'history', 'type'])(
    'rejects a patch that writes the protected field %s',
    (field) => {
      const codes = codesOf(withPatch({ [field]: 'x' }))
      expect(codes).toContain('forbidden-field')
    },
  )

  it('rejects an unknown field inside a known group', () => {
    expect(
      codesOf(withPatch({ typography: { fontFamily: 'Comic Sans' } })),
    ).toContain('forbidden-field')
  })

  it('reports a protected field with a message naming it', () => {
    const result = validateEditCommand(
      createInitialTemplateDocument(),
      withPatch({ parentId: 'hero.section' }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.message).toMatch(/parentId/)
  })
})

describe('value validation', () => {
  it.each([
    ['out-of-range font size', { typography: { fontSize: 900 } }],
    ['unsupported alignment', { typography: { textAlign: 'justify' } }],
    ['invalid color', { typography: { color: 'red' } }],
    ['unsafe link', { content: { href: 'javascript:alert(1)' } }],
    ['bad dimension unit', { size: { width: { value: 10, unit: 'vw' } } }],
    ['wrong value type', { surface: { opacity: 'half' } }],
  ])('rejects %s', (_label, patch) => {
    expect(codesOf(withPatch(patch))).toContain('invalid-value')
  })
})

describe('selection authority', () => {
  const aiCommand = command({ source: 'ai', targetIds: [HEADING] })

  it('rejects an AI command with no selection snapshot', () => {
    expect(codesOf(aiCommand)).toContain('missing-selection-snapshot')
  })

  it('rejects an AI command targeting an element outside the selection', () => {
    expect(codesOf(aiCommand, { selectionSnapshot: [BUTTON] })).toContain('target-not-selected')
  })

  it('accepts an AI command whose targets are all selected', () => {
    const result = validateEditCommand(createInitialTemplateDocument(), aiCommand, {
      selectionSnapshot: [HEADING, BUTTON],
    })
    expect(result.ok).toBe(true)
  })

  it('does not require a selection snapshot for canvas, code, or restore', () => {
    for (const source of ['canvas', 'code', 'restore'] as const) {
      const result = validateEditCommand(createInitialTemplateDocument(), command({ source }))
      expect(result.ok, source).toBe(true)
    }
  })
})

describe('revision freshness', () => {
  it('rejects a stale base revision', () => {
    expect(codesOf(command({ baseRevision: 5 }))).toContain('stale-revision')
  })

  it('rejects a base revision from before another edit landed', () => {
    const document = { ...createInitialTemplateDocument(), revision: 3 }
    const result = validateEditCommand(document, command({ baseRevision: 2 }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.some((issue) => issue.code === 'stale-revision')).toBe(true)
  })
})

describe('error reporting', () => {
  it('reports every problem, not only the first', () => {
    const ghost = elementId('ghost.element')
    const result = validateEditCommand(
      createInitialTemplateDocument(),
      command({ targetIds: [ghost, ghost], changes: { [ghost]: { typography: {} } }, baseRevision: 9 }),
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    const codes = result.errors.map((issue) => issue.code)
    expect(codes).toContain('duplicate-targets')
    expect(codes).toContain('unknown-target')
    expect(codes).toContain('stale-revision')
  })

  it('attaches the offending element id where one exists', () => {
    const ghost = elementId('ghost.element')
    const result = validateEditCommand(
      createInitialTemplateDocument(),
      command({ targetIds: [ghost], changes: { [ghost]: { typography: { fontSize: 20 } } } }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.elementId).toBe(ghost)
  })
})

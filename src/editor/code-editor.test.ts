import { describe, expect, it } from 'vitest'

import { elementId } from '../model/ids'
import type { EditableProperties } from '../model/properties'
import { prepareCodeEdit, serializeCodeDraft, type CodeTarget } from './code-document'

/**
 * The structured code surface.
 *
 * These are the translation rules between draft text and a property patch. The
 * command pipeline validates again afterwards; what matters here is that a
 * draft is never half-understood - either it produces a complete change map or
 * it produces errors that name a location.
 */

const HEADING = elementId('hero.heading')
const PRIMARY = elementId('hero.cta.primary')

const headingProperties: EditableProperties = {
  content: { text: 'Build faster' },
  typography: { fontSize: 44, fontWeight: 700 },
  spacing: { padding: { top: 8, bottom: 8 } },
  size: { width: { value: 320, unit: 'px' } },
}

const buttonProperties: EditableProperties = {
  content: { text: 'Start free' },
  surface: { background: '#2563eb', borderRadius: 8 },
}

function target(id: typeof HEADING, displayed: EditableProperties): CodeTarget {
  return { id, displayed }
}

const headingTarget = target(HEADING, headingProperties)
const buttonTarget = target(PRIMARY, buttonProperties)

/** Serializes a selection, then applies `edit` to the parsed draft object. */
function draftWith(
  targets: readonly CodeTarget[],
  edit: (draft: Record<string, unknown>) => void,
): string {
  const parsed = JSON.parse(serializeCodeDraft(targets)) as Record<string, unknown>
  edit(parsed)
  return JSON.stringify(parsed, null, 2)
}

describe('serializeCodeDraft', () => {
  it('formats the selection as JSON keyed by stable element id', () => {
    const text = serializeCodeDraft([headingTarget, buttonTarget])

    expect(JSON.parse(text)).toEqual({
      [HEADING]: headingProperties,
      [PRIMARY]: buttonProperties,
    })
    expect(text).toContain('\n  "hero.heading"')
  })

  it('never serializes identity, revision, or history fields', () => {
    const text = serializeCodeDraft([headingTarget])

    for (const forbidden of ['"id"', '"revision"', '"history"', '"overrides"', '"parentId"']) {
      expect(text).not.toContain(forbidden)
    }
  })
})

describe('prepareCodeEdit', () => {
  it('emits a patch containing only the changed field', () => {
    const text = draftWith([headingTarget], (draft) => {
      const properties = draft[HEADING] as EditableProperties
      properties.typography = { ...properties.typography, fontSize: 52 }
    })

    const result = prepareCodeEdit({ text, targets: [headingTarget] })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetIds).toEqual([HEADING])
    expect(result.changes[HEADING]).toEqual({ typography: { fontSize: 52 } })
  })

  it('drops targets that did not change from a multi-element draft', () => {
    const targets = [headingTarget, buttonTarget]
    const text = draftWith(targets, (draft) => {
      const properties = draft[PRIMARY] as EditableProperties
      properties.surface = { ...properties.surface, borderRadius: 20 }
    })

    const result = prepareCodeEdit({ text, targets })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetIds).toEqual([PRIMARY])
    expect(Object.keys(result.changes)).toEqual([PRIMARY])
  })

  it('patches one spacing side without restating the others', () => {
    const text = draftWith([headingTarget], (draft) => {
      const properties = draft[HEADING] as EditableProperties
      properties.spacing = { padding: { top: 24, bottom: 8 } }
    })

    const result = prepareCodeEdit({ text, targets: [headingTarget] })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.changes[HEADING]).toEqual({ spacing: { padding: { top: 24 } } })
  })

  it('keeps a dimension whole so the patch stays schema-valid', () => {
    const text = draftWith([headingTarget], (draft) => {
      const properties = draft[HEADING] as EditableProperties
      properties.size = { width: { value: 480, unit: 'px' } }
    })

    const result = prepareCodeEdit({ text, targets: [headingTarget] })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.changes[HEADING]).toEqual({ size: { width: { value: 480, unit: 'px' } } })
  })

  it('reports an unchanged draft rather than committing an empty edit', () => {
    const result = prepareCodeEdit({
      text: serializeCodeDraft([headingTarget]),
      targets: [headingTarget],
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((error) => error.code)).toEqual(['no-change'])
  })

  it('locates a syntax error by line and column', () => {
    const result = prepareCodeEdit({
      text: '{\n  "hero.heading": {\n    "typography": { "fontSize": 44 "fontWeight": 700 }\n  }\n}',
      targets: [headingTarget],
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    const [error] = result.errors
    expect(error?.code).toBe('syntax')
    expect(error?.line).toBe(3)
    expect(error?.column).toBeGreaterThan(1)
    expect(error?.message).toContain('line 3')
  })

  it('still reports a syntax error when the runtime gives no location', () => {
    const result = prepareCodeEdit({ text: 'not json', targets: [headingTarget] })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.code).toBe('syntax')
    expect(result.errors[0]?.message).toContain('not valid JSON')
  })

  it('rejects a draft that is not an object keyed by element id', () => {
    const result = prepareCodeEdit({ text: '[]', targets: [headingTarget] })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.code).toBe('shape')
  })

  it('rejects a protected field with the field path', () => {
    const text = draftWith([headingTarget], (draft) => {
      draft[HEADING] = { ...(draft[HEADING] as object), id: 'hero.other', revision: 99 }
    })

    const result = prepareCodeEdit({ text, targets: [headingTarget] })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.code).toBe('forbidden-field')
    expect(result.errors[0]?.message).toContain('id')
    expect(result.errors[0]?.path).toBe(HEADING)
  })

  it('rejects a property outside the editable allowlist', () => {
    const text = draftWith([headingTarget], (draft) => {
      const properties = draft[HEADING] as Record<string, unknown>
      properties['typography'] = { fontSize: 44, fontWeight: 700, zIndex: 10 }
    })

    const result = prepareCodeEdit({ text, targets: [headingTarget] })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.code).toBe('forbidden-field')
    expect(result.errors[0]?.path).toBe(`${HEADING}.typography`)
  })

  it('rejects an out-of-range value with the field path', () => {
    const text = draftWith([headingTarget], (draft) => {
      const properties = draft[HEADING] as EditableProperties
      properties.typography = { ...properties.typography, fontSize: 5000 }
    })

    const result = prepareCodeEdit({ text, targets: [headingTarget] })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.code).toBe('invalid-value')
    expect(result.errors[0]?.path).toBe(`${HEADING}.typography.fontSize`)
  })

  it('rejects an element that is not part of the selection', () => {
    const text = draftWith([headingTarget], (draft) => {
      draft['footer.note'] = { content: { text: 'sneaky' } }
    })

    const result = prepareCodeEdit({ text, targets: [headingTarget] })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.code).toBe('unknown-target')
    expect(result.errors[0]?.message).toContain('footer.note')
  })

  it('rejects a draft that dropped a selected element', () => {
    const text = draftWith([headingTarget, buttonTarget], (draft) => {
      delete draft[PRIMARY]
    })

    const result = prepareCodeEdit({ text, targets: [headingTarget, buttonTarget] })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.code).toBe('missing-target')
    expect(result.errors[0]?.path).toBe(PRIMARY)
  })

  it('reports a removed field instead of silently ignoring it', () => {
    const text = draftWith([headingTarget], (draft) => {
      const properties = draft[HEADING] as EditableProperties
      properties.typography = { fontSize: 44 }
    })

    const result = prepareCodeEdit({ text, targets: [headingTarget] })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors[0]?.code).toBe('field-removal')
    expect(result.errors[0]?.path).toBe(`${HEADING}.typography.fontWeight`)
  })

  it('reports a removed spacing side and a removed group', () => {
    const text = draftWith([headingTarget], (draft) => {
      const properties = draft[HEADING] as EditableProperties
      properties.spacing = { padding: { top: 8 } }
      delete properties.content
    })

    const result = prepareCodeEdit({ text, targets: [headingTarget] })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((error) => error.path)).toEqual([
      `${HEADING}.content.text`,
      `${HEADING}.spacing.padding.bottom`,
    ])
  })
})

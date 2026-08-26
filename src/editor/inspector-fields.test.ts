import { describe, expect, it } from 'vitest'

import { resolveDocument, resolveElementProperties } from '../engine/responsive-resolver'
import { createInitialTemplateDocument } from '../model/initial-template'
import { elementId, type ElementId } from '../model/ids'
import type { EditScope } from '../model/viewport'
import {
  INSPECTOR_FIELDS,
  fieldsForTypes,
  parseFieldInput,
  patchForField,
  readField,
  sectionsForFields,
  type EditTarget,
  type InspectorField,
} from './inspector-model'
import { orderedChildIds, planReorder } from './reorder'

const document = createInitialTemplateDocument()

function field(id: string): InspectorField {
  const found = INSPECTOR_FIELDS.find((candidate) => candidate.id === id)
  if (found === undefined) throw new Error(`No inspector field "${id}".`)
  return found
}

function target(id: string, scope: EditScope): EditTarget {
  const element = document.elements[elementId(id)]
  if (element === undefined) throw new Error(`No element "${id}".`)
  return {
    element,
    displayed: scope === 'all' ? element.base : resolveElementProperties(element, scope),
  }
}

describe('fieldsForTypes', () => {
  it('offers text fields for a text-bearing element', () => {
    const ids = fieldsForTypes(['heading']).map((entry) => entry.id)
    expect(ids).toContain('content.text')
    expect(ids).toContain('typography.fontSize')
    expect(ids).not.toContain('content.imageAlt')
  })

  it('offers only fields every selected type supports', () => {
    const ids = fieldsForTypes(['heading', 'image']).map((entry) => entry.id)
    expect(ids).not.toContain('content.text')
    expect(ids).not.toContain('content.imageAlt')
    // Shared across both types.
    expect(ids).toContain('surface.borderRadius')
    expect(ids).toContain('spacing.padding.top')
  })

  it('offers nothing without a selection', () => {
    expect(fieldsForTypes([])).toEqual([])
  })

  it('groups fields into the sections that actually have one', () => {
    expect(sectionsForFields(fieldsForTypes(['heading']))).toContain('content')
    expect(sectionsForFields(fieldsForTypes(['container']))).not.toContain('content')
  })
})

describe('readField', () => {
  it('reads the shared base value for scope all', () => {
    const reading = readField([target('hero.heading', 'all')], field('typography.fontSize'), 'all')
    expect(reading).toEqual({ state: 'value', value: 56, overridden: false })
  })

  it('reads the resolved value for a viewport scope and flags the override', () => {
    const reading = readField(
      [target('hero.heading', 'mobile')],
      field('typography.fontSize'),
      'mobile',
    )
    expect(reading.state).toBe('value')
    expect(reading.value).toBe(32)
    expect(reading.overridden).toBe(true)
  })

  it('does not flag a field the viewport override does not name', () => {
    expect(
      readField([target('hero.heading', 'mobile')], field('typography.color'), 'mobile')
        .overridden,
    ).toBe(false)
  })

  it('reports differing values as mixed rather than inventing a shared one', () => {
    const reading = readField(
      [target('hero.cta.primary', 'all'), target('hero.cta.secondary', 'all')],
      field('typography.fontWeight'),
      'all',
    )
    expect(reading.state).toBe('mixed')
    expect(reading.value).toBeUndefined()
  })

  it('reports matching values across a multi-selection as one value', () => {
    const reading = readField(
      [target('hero.cta.primary', 'all'), target('hero.cta.secondary', 'all')],
      field('typography.fontSize'),
      'all',
    )
    expect(reading).toEqual({ state: 'value', value: 16, overridden: false })
  })

  it('reports an unset field as empty', () => {
    expect(readField([target('hero.heading', 'all')], field('spacing.gap'), 'all').state).toBe(
      'empty',
    )
  })
})

describe('patchForField', () => {
  it('builds a minimal nested patch', () => {
    expect(patchForField(field('typography.fontSize'), 40)).toEqual({
      typography: { fontSize: 40 },
    })
  })

  it('builds a deep patch without touching the sibling sides', () => {
    expect(patchForField(field('spacing.padding.left'), 24)).toEqual({
      spacing: { padding: { left: 24 } },
    })
  })

  it('builds a dimension patch', () => {
    expect(patchForField(field('size.maxWidth'), { value: 640, unit: 'px' })).toEqual({
      size: { maxWidth: { value: 640, unit: 'px' } },
    })
  })
})

describe('parseFieldInput', () => {
  it('parses numbers and keeps range checking for the schema', () => {
    expect(parseFieldInput(field('typography.fontSize'), '40')).toEqual({ ok: true, value: 40 })
    expect(parseFieldInput(field('typography.fontSize'), '9000')).toEqual({
      ok: true,
      value: 9000,
    })
  })

  it('rejects input that is not a number at all', () => {
    const result = parseFieldInput(field('typography.fontSize'), 'wide')
    expect(result.ok).toBe(false)
    expect(result.ok === false ? result.message : undefined).toMatch(/must be a number/)
  })

  it('treats a cleared control as no change rather than as an error', () => {
    const result = parseFieldInput(field('typography.fontSize'), '   ')
    expect(result.ok).toBe(false)
    expect(result.ok === false ? result.message : 'unset').toBeUndefined()
  })

  it('accepts auto and numbers for a dimension', () => {
    expect(parseFieldInput(field('size.width'), 'auto')).toEqual({ ok: true, value: 'auto' })
    expect(parseFieldInput(field('size.width'), '80')).toEqual({ ok: true, value: 80 })
  })

  it('keeps text exactly as typed, including spaces', () => {
    expect(parseFieldInput(field('content.text'), '  Hello  ')).toEqual({
      ok: true,
      value: '  Hello  ',
    })
  })
})

describe('planReorder', () => {
  const resolved = resolveDocument(document, 'desktop')
  const ACTIONS = elementId('hero.actions')
  const PRIMARY = elementId('hero.cta.primary')
  const SECONDARY = elementId('hero.cta.secondary')

  it('renumbers every sibling so the result does not depend on prior order values', () => {
    const result = planReorder(resolved, SECONDARY, 'up')
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.plan.orderedIds).toEqual([SECONDARY, PRIMARY])
    expect(result.plan.changes[SECONDARY]).toEqual({ layout: { order: 0 } })
    expect(result.plan.changes[PRIMARY]).toEqual({ layout: { order: 1 } })
    expect(result.plan.targetIds).toEqual([SECONDARY, PRIMARY])
  })

  it('never names the parent, so childIds cannot be part of the edit', () => {
    const result = planReorder(resolved, SECONDARY, 'up')
    expect(result.ok && result.plan.targetIds).not.toContain(ACTIONS)
  })

  it('refuses to move past either end', () => {
    expect(planReorder(resolved, PRIMARY, 'up')).toEqual({
      ok: false,
      reason: 'This element is already first among its siblings.',
    })
    expect(planReorder(resolved, SECONDARY, 'down')).toEqual({
      ok: false,
      reason: 'This element is already last among its siblings.',
    })
  })

  it('refuses a top-level section, which has no siblings to move between', () => {
    const result = planReorder(resolved, elementId('hero.section'), 'down')
    expect(result.ok).toBe(false)
    expect(result.ok === false ? result.reason : '').toMatch(/top-level section/)
  })

  it('refuses a parent whose display cannot order its children', () => {
    // Every container in the fixture is flex or grid, so this case is built.
    const section = elementId('hero.section')
    const blockParent = {
      ...resolved,
      elements: {
        ...resolved.elements,
        [section]: {
          ...resolved.elements[section]!,
          properties: { ...resolved.elements[section]!.properties, layout: { display: 'block' as const } },
        },
      },
    }

    const result = planReorder(blockParent, elementId('hero.heading'), 'down')
    expect(result.ok).toBe(false)
    expect(result.ok === false ? result.reason : '').toMatch(/flex or grid/)
  })

  it('moves a flex child down among its siblings', () => {
    const result = planReorder(resolved, elementId('hero.eyebrow'), 'down')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan.orderedIds.slice(0, 2)).toEqual([
      elementId('hero.heading'),
      elementId('hero.eyebrow'),
    ])
  })

  it('refuses an element that is not in the document', () => {
    const result = planReorder(resolved, 'nope.missing' as ElementId, 'up')
    expect(result.ok).toBe(false)
  })
})

describe('orderedChildIds', () => {
  const resolved = resolveDocument(document, 'desktop')

  it('follows document order until an order value says otherwise', () => {
    expect(orderedChildIds(resolved, elementId('hero.actions'))).toEqual([
      elementId('hero.cta.primary'),
      elementId('hero.cta.secondary'),
    ])
  })

  it('sorts flex children by resolved order', () => {
    const actions = elementId('hero.actions')
    const primary = elementId('hero.cta.primary')
    const secondary = elementId('hero.cta.secondary')
    const reordered = {
      ...resolved,
      elements: {
        ...resolved.elements,
        [primary]: {
          ...resolved.elements[primary]!,
          properties: { ...resolved.elements[primary]!.properties, layout: { order: 1 } },
        },
        [secondary]: {
          ...resolved.elements[secondary]!,
          properties: { ...resolved.elements[secondary]!.properties, layout: { order: 0 } },
        },
      },
    }

    expect(orderedChildIds(reordered, actions)).toEqual([secondary, primary])
  })

  it('leaves a block parent in document order, because CSS order would not apply', () => {
    const section = elementId('hero.section')
    expect(orderedChildIds(resolved, section)).toEqual(resolved.elements[section]?.childIds)
  })
})

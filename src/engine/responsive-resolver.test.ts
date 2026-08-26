import { describe, expect, it } from 'vitest'

import type { TemplateElement } from '../model/element'
import { elementId } from '../model/ids'
import { createInitialTemplateDocument } from '../model/initial-template'
import type { EditableProperties } from '../model/properties'
import { VIEWPORTS, type Viewport } from '../model/viewport'
import {
  hasViewportOverride,
  mergeEditableProperties,
  overriddenViewports,
  resolveAllViewports,
  resolveDocument,
  resolveElement,
  resolveElementProperties,
} from './responsive-resolver'

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function deepFreeze<T extends object>(value: T): T {
  for (const child of Object.values(value)) {
    if (typeof child === 'object' && child !== null) deepFreeze(child)
  }
  return Object.freeze(value)
}

function makeElement(
  base: EditableProperties,
  overrides: TemplateElement['overrides'] = {},
): TemplateElement {
  return {
    id: elementId('hero.heading'),
    type: 'heading',
    parentId: elementId('hero.section'),
    childIds: [],
    base,
    overrides,
    revision: 0,
  }
}

/** Base used by the isolation table: every group is populated. */
function richBase(): EditableProperties {
  return {
    content: { text: 'Original heading', accessibleLabel: 'Original heading' },
    typography: { fontSize: 56, fontWeight: 700, lineHeight: 1.1, color: '#fafafa' },
    surface: { background: '#050506', borderWidth: 1, borderRadius: 12, opacity: 1 },
    spacing: { padding: { top: 96, right: 64, bottom: 96, left: 64 }, gap: 24 },
    size: { maxWidth: { value: 760, unit: 'px' } },
    layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  }
}

const otherViewports = (viewport: Viewport): Viewport[] =>
  VIEWPORTS.filter((candidate) => candidate !== viewport)

/* -------------------------------------------------------------------------- */
/* Base-only resolution                                                        */
/* -------------------------------------------------------------------------- */

describe('base-only resolution', () => {
  it('resolves identically in all three viewports', () => {
    const element = makeElement(richBase())
    const resolved = resolveAllViewports(element)

    expect(resolved.desktop).toEqual(richBase())
    expect(resolved.tablet).toEqual(resolved.desktop)
    expect(resolved.mobile).toEqual(resolved.desktop)
  })

  it('resolves an element with no properties at all', () => {
    const element = makeElement({})
    for (const viewport of VIEWPORTS) {
      expect(resolveElementProperties(element, viewport)).toEqual({})
    }
  })

  it('is deterministic across repeated calls', () => {
    const element = makeElement(richBase(), { mobile: { typography: { fontSize: 32 } } })

    expect(resolveElementProperties(element, 'mobile')).toEqual(
      resolveElementProperties(element, 'mobile'),
    )
  })
})

/* -------------------------------------------------------------------------- */
/* Viewport isolation - the core regression table                              */
/* -------------------------------------------------------------------------- */

describe('viewport isolation', () => {
  it.each(VIEWPORTS)(
    'a %s-only typography override changes that viewport and protects the others',
    (viewport) => {
      const element = makeElement(richBase(), { [viewport]: { typography: { fontSize: 18 } } })
      const resolved = resolveAllViewports(element)

      expect(resolved[viewport].typography?.fontSize).toBe(18)

      for (const protectedViewport of otherViewports(viewport)) {
        // Assert the protected views in full, not only the field that moved.
        expect(resolved[protectedViewport]).toEqual(richBase())
        expect(resolved[protectedViewport].typography?.fontSize).toBe(56)
      }
    },
  )

  it.each(VIEWPORTS)(
    'a %s-only nested spacing override protects the other viewports byte for byte',
    (viewport) => {
      const element = makeElement(richBase(), {
        [viewport]: { spacing: { padding: { top: 8 } } },
      })
      const resolved = resolveAllViewports(element)

      expect(resolved[viewport].spacing?.padding).toEqual({
        top: 8,
        right: 64,
        bottom: 96,
        left: 64,
      })

      for (const protectedViewport of otherViewports(viewport)) {
        expect(JSON.stringify(resolved[protectedViewport])).toBe(JSON.stringify(richBase()))
      }
    },
  )

  it.each(VIEWPORTS)(
    'a %s-only content rewrite leaves the other viewports on the original copy',
    (viewport) => {
      const element = makeElement(richBase(), {
        [viewport]: { content: { text: 'Shorter heading' } },
      })
      const resolved = resolveAllViewports(element)

      expect(resolved[viewport].content?.text).toBe('Shorter heading')
      expect(resolved[viewport].content?.accessibleLabel).toBe('Original heading')

      for (const protectedViewport of otherViewports(viewport)) {
        expect(resolved[protectedViewport].content?.text).toBe('Original heading')
      }
    },
  )

  it('never copies one viewport override into another', () => {
    const element = makeElement(richBase(), {
      desktop: { typography: { fontSize: 60 } },
      mobile: { typography: { fontSize: 32 } },
    })
    const resolved = resolveAllViewports(element)

    expect(resolved.desktop.typography?.fontSize).toBe(60)
    expect(resolved.tablet.typography?.fontSize).toBe(56)
    expect(resolved.mobile.typography?.fontSize).toBe(32)
  })

  it('lets a base value reach the viewports that do not override that field', () => {
    const element = makeElement(
      { typography: { fontSize: 56, color: '#fafafa' } },
      { mobile: { typography: { fontSize: 32 } } },
    )
    const resolved = resolveAllViewports(element)

    // Overridden field: only mobile moves.
    expect(resolved.mobile.typography?.fontSize).toBe(32)
    expect(resolved.desktop.typography?.fontSize).toBe(56)
    // Untouched field: the shared base value is visible everywhere.
    for (const viewport of VIEWPORTS) {
      expect(resolved[viewport].typography?.color).toBe('#fafafa')
    }
  })
})

/* -------------------------------------------------------------------------- */
/* Nested merge semantics                                                      */
/* -------------------------------------------------------------------------- */

describe('merge semantics', () => {
  it('preserves untouched sibling fields inside a group', () => {
    const merged = mergeEditableProperties(richBase(), { typography: { fontSize: 20 } })

    expect(merged.typography).toEqual({
      fontSize: 20,
      fontWeight: 700,
      lineHeight: 1.1,
      color: '#fafafa',
    })
  })

  it('preserves untouched groups entirely', () => {
    const merged = mergeEditableProperties(richBase(), { typography: { fontSize: 20 } })

    expect(merged.surface).toEqual(richBase().surface)
    expect(merged.spacing).toEqual(richBase().spacing)
    expect(merged.layout).toEqual(richBase().layout)
    expect(merged.size).toEqual(richBase().size)
    expect(merged.content).toEqual(richBase().content)
  })

  it('merges padding and margin one level deeper', () => {
    const merged = mergeEditableProperties(
      { spacing: { padding: { top: 96, right: 64, bottom: 96, left: 64 }, margin: { top: 24 } } },
      { spacing: { padding: { left: 20 } } },
    )

    expect(merged.spacing?.padding).toEqual({ top: 96, right: 64, bottom: 96, left: 20 })
    expect(merged.spacing?.margin).toEqual({ top: 24 })
  })

  it('treats a dimension as atomic rather than blending two dimensions', () => {
    const merged = mergeEditableProperties(
      { size: { width: { value: 760, unit: 'px' }, height: 'auto' } },
      { size: { width: { value: 100, unit: '%' } } },
    )

    expect(merged.size?.width).toEqual({ value: 100, unit: '%' })
    expect(merged.size?.height).toBe('auto')
  })

  it('adds a group that only the override defines', () => {
    const merged = mergeEditableProperties(
      { typography: { fontSize: 16 } },
      { layout: { display: 'grid', gridColumns: 2 } },
    )

    expect(merged.layout).toEqual({ display: 'grid', gridColumns: 2 })
    expect(merged.typography).toEqual({ fontSize: 16 })
  })

  it('returns the base unchanged when there is no override', () => {
    expect(mergeEditableProperties(richBase(), undefined)).toEqual(richBase())
  })
})

/* -------------------------------------------------------------------------- */
/* Falsy-but-valid values                                                      */
/* -------------------------------------------------------------------------- */

describe('falsy but valid values', () => {
  it('lets an override set 0 over a non-zero base', () => {
    const merged = mergeEditableProperties(
      { surface: { opacity: 1, borderWidth: 4, borderRadius: 12 }, spacing: { gap: 24 } },
      { surface: { opacity: 0, borderWidth: 0 }, spacing: { gap: 0 } },
    )

    expect(merged.surface?.opacity).toBe(0)
    expect(merged.surface?.borderWidth).toBe(0)
    expect(merged.surface?.borderRadius).toBe(12)
    expect(merged.spacing?.gap).toBe(0)
  })

  it('lets an override set an empty string over non-empty text', () => {
    const merged = mergeEditableProperties(
      { content: { text: 'Heading', accessibleLabel: 'Heading' } },
      { content: { text: '' } },
    )

    expect(merged.content?.text).toBe('')
    expect(merged.content?.accessibleLabel).toBe('Heading')
  })

  it('keeps a zero base value that the override does not mention', () => {
    const merged = mergeEditableProperties(
      { spacing: { gap: 0, padding: { top: 0, left: 0 } } },
      { spacing: { padding: { left: 16 } } },
    )

    expect(merged.spacing?.gap).toBe(0)
    expect(merged.spacing?.padding).toEqual({ top: 0, left: 16 })
  })

  it('treats an explicitly undefined override field as "not specified"', () => {
    const merged = mergeEditableProperties(
      { typography: { fontSize: 56, color: '#fafafa' } },
      { typography: { fontSize: undefined, color: '#8ab4ff' } },
    )

    expect(merged.typography?.fontSize).toBe(56)
    expect(merged.typography?.color).toBe('#8ab4ff')
  })
})

/* -------------------------------------------------------------------------- */
/* Purity                                                                      */
/* -------------------------------------------------------------------------- */

describe('purity', () => {
  it('does not mutate a deeply frozen element', () => {
    const element = deepFreeze(
      makeElement(richBase(), { mobile: { spacing: { padding: { top: 8 } } } }),
    )

    expect(() => resolveAllViewports(element)).not.toThrow()
    expect(element.base).toEqual(richBase())
    expect(element.overrides.mobile).toEqual({ spacing: { padding: { top: 8 } } })
  })

  it('does not mutate a deeply frozen document', () => {
    const document = deepFreeze(createInitialTemplateDocument())
    const before = JSON.stringify(document)

    resolveDocument(document, 'mobile')
    resolveDocument(document, 'tablet')

    expect(JSON.stringify(document)).toBe(before)
  })

  it('returns objects that do not alias the source element', () => {
    const element = makeElement(richBase(), { mobile: { typography: { fontSize: 32 } } })
    const resolved = resolveElementProperties(element, 'mobile')

    expect(resolved.typography).not.toBe(element.base.typography)
    expect(resolved.typography).not.toBe(element.overrides.mobile?.typography)
    expect(resolved.spacing?.padding).not.toBe(element.base.spacing?.padding)
  })

  it('returns independent results for two viewports', () => {
    const element = makeElement(richBase())
    const desktop = resolveElementProperties(element, 'desktop')
    const mobile = resolveElementProperties(element, 'mobile')

    expect(desktop).not.toBe(mobile)
    expect(desktop.spacing).not.toBe(mobile.spacing)
  })
})

/* -------------------------------------------------------------------------- */
/* Document-level resolution                                                   */
/* -------------------------------------------------------------------------- */

describe('document resolution', () => {
  it('resolves every element and preserves structure', () => {
    const document = createInitialTemplateDocument()
    const resolved = resolveDocument(document, 'tablet')

    expect(resolved.viewport).toBe('tablet')
    expect(resolved.rootElementIds).toEqual(document.rootElementIds)
    expect(Object.keys(resolved.elements)).toHaveLength(Object.keys(document.elements).length)

    const grid = resolved.elements[elementId('features.grid')]
    expect(grid?.parentId).toBe(elementId('features.section'))
    expect(grid?.childIds).toEqual(document.elements[elementId('features.grid')]?.childIds)
  })

  it('resolves the shipped template to the documented per-viewport values', () => {
    const document = createInitialTemplateDocument()

    const columns = (viewport: Viewport): number | undefined =>
      resolveDocument(document, viewport).elements[elementId('features.grid')]?.properties.layout
        ?.gridColumns

    expect(columns('desktop')).toBe(3)
    expect(columns('tablet')).toBe(2)
    expect(columns('mobile')).toBe(1)
  })

  it('falls back to the base value where the viewport has no override', () => {
    const document = createInitialTemplateDocument()

    const headingSize = (viewport: Viewport): number | undefined =>
      resolveDocument(document, viewport).elements[elementId('hero.heading')]?.properties.typography
        ?.fontSize

    // hero.heading overrides tablet and mobile only; desktop keeps the base.
    expect(headingSize('desktop')).toBe(56)
    expect(headingSize('tablet')).toBe(42)
    expect(headingSize('mobile')).toBe(32)
  })

  it('leaves unrelated elements identical across viewports', () => {
    const document = createInitialTemplateDocument()
    const target = elementId('cta.body')

    const desktop = resolveDocument(document, 'desktop').elements[target]
    const mobile = resolveDocument(document, 'mobile').elements[target]

    // cta.body has no overrides, so only the reported viewport differs.
    expect(mobile?.properties).toEqual(desktop?.properties)
    expect(mobile?.viewport).toBe('mobile')
    expect(desktop?.viewport).toBe('desktop')
  })

  it('resolves the same document twice to deep-equal results', () => {
    const document = createInitialTemplateDocument()

    expect(resolveDocument(document, 'mobile')).toEqual(resolveDocument(document, 'mobile'))
  })
})

/* -------------------------------------------------------------------------- */
/* Override reporting                                                          */
/* -------------------------------------------------------------------------- */

describe('override reporting', () => {
  it('reports which viewports carry an override', () => {
    const element = makeElement(richBase(), {
      tablet: { typography: { fontSize: 42 } },
      mobile: { typography: { fontSize: 32 } },
    })

    expect(overriddenViewports(element)).toEqual(['tablet', 'mobile'])
    expect(hasViewportOverride(element, 'desktop')).toBe(false)
    expect(hasViewportOverride(element, 'mobile')).toBe(true)
  })

  it('reports no overrides for a base-only element', () => {
    expect(overriddenViewports(makeElement(richBase()))).toEqual([])
  })

  it('treats an empty override object as an override that changes nothing', () => {
    const element = makeElement(richBase(), { mobile: {} })

    expect(hasViewportOverride(element, 'mobile')).toBe(true)
    expect(resolveElementProperties(element, 'mobile')).toEqual(richBase())
  })
})

describe('resolveElement', () => {
  it('carries identity through without exposing overrides', () => {
    const element = makeElement(richBase(), { mobile: { typography: { fontSize: 32 } } })
    const resolved = resolveElement(element, 'mobile')

    expect(resolved.id).toBe(element.id)
    expect(resolved.type).toBe('heading')
    expect(resolved.parentId).toBe(element.parentId)
    expect(resolved.viewport).toBe('mobile')
    expect(resolved.properties.typography?.fontSize).toBe(32)
    expect(resolved).not.toHaveProperty('overrides')
    expect(resolved).not.toHaveProperty('base')
  })
})

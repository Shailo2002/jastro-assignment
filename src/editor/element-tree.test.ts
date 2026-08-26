import { describe, expect, it } from 'vitest'

import { resolveDocument } from '../engine/responsive-resolver'
import { createInitialTemplateDocument } from '../model/initial-template'
import { elementId } from '../model/ids'
import { collectElementIds, flattenResolvedDocument } from './element-tree'

const resolved = resolveDocument(createInitialTemplateDocument(), 'desktop')
const rows = flattenResolvedDocument(resolved)

describe('flattenResolvedDocument', () => {
  it('lists every rendered element exactly once', () => {
    const ids = rows.map((row) => row.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(ids)).toEqual(new Set(Object.keys(resolved.elements)))
  })

  it('walks depth first so focus order follows visual order', () => {
    const ids = rows.map((row) => row.id)
    expect(ids.indexOf(elementId('hero.section'))).toBeLessThan(
      ids.indexOf(elementId('hero.heading')),
    )
    expect(ids.indexOf(elementId('hero.heading'))).toBeLessThan(
      ids.indexOf(elementId('features.section')),
    )
  })

  it('reports a 1-based level and a 0-based depth', () => {
    const section = rows.find((row) => row.id === elementId('hero.section'))
    const heading = rows.find((row) => row.id === elementId('hero.heading'))
    expect(section?.level).toBe(1)
    expect(section?.depth).toBe(0)
    expect(heading?.level).toBe(2)
    expect(heading?.depth).toBe(1)
  })

  it('skips dangling child ids instead of inventing a layer', () => {
    const ghost = elementId('hero.ghost')
    const broken = {
      ...resolved,
      elements: {
        ...resolved.elements,
        [elementId('hero.section')]: {
          ...resolved.elements[elementId('hero.section')]!,
          childIds: [elementId('hero.heading'), ghost],
        },
      },
    }

    expect(flattenResolvedDocument(broken).map((row) => row.id)).not.toContain(ghost)
  })

  it('breaks a reference cycle rather than recursing forever', () => {
    const section = elementId('hero.section')
    const heading = elementId('hero.heading')
    const cyclic = {
      ...resolved,
      elements: {
        ...resolved.elements,
        [section]: { ...resolved.elements[section]!, childIds: [heading] },
        [heading]: { ...resolved.elements[heading]!, childIds: [section] },
      },
    }

    const cyclicRows = flattenResolvedDocument(cyclic)
    expect(cyclicRows.filter((row) => row.id === section)).toHaveLength(1)
  })
})

describe('collectElementIds', () => {
  it('returns the set of selectable ids', () => {
    expect(collectElementIds(rows).has(elementId('hero.heading'))).toBe(true)
    expect(collectElementIds(rows).has(elementId('nope.missing'))).toBe(false)
  })
})

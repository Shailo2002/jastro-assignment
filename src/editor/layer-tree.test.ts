import { describe, expect, it } from 'vitest'

import { elementId, type ElementId } from '../model/ids'
import type { ElementTreeRow } from './element-tree'
import {
  ancestorIdsOf,
  branchIds,
  buildLayerRows,
  parentRowIndex,
} from './layer-tree'

/**
 * Layers-tree shaping.
 *
 * The fixture is hand-built rather than resolved from the real template: these
 * are statements about depth-first shape - sibling runs, last-of-group, which
 * rails a column carries - and a fixture spells that shape out where a template
 * would hide it behind content.
 *
 *   a                 level 1, first of two roots
 *     a1              level 2, has children
 *       a1x           level 3
 *       a1y           level 3, last
 *     a2              level 2, last
 *   b                 level 1, last
 */
const SHAPE: readonly (readonly [string, number])[] = [
  ['a', 1],
  ['a.one', 2],
  ['a.one.x', 3],
  ['a.one.y', 3],
  ['a.two', 2],
  ['b', 1],
]

const rows: readonly ElementTreeRow[] = SHAPE.map(([id, level]) => ({
  id: elementId(id),
  descriptor: {
    id: elementId(id),
    typeLabel: 'Section',
    name: id,
    accessibleName: `Section: ${id}`,
  },
  level,
  childCount: 0,
  depth: level - 1,
}))

const NOTHING_COLLAPSED: ReadonlySet<ElementId> = new Set()

function visibleIds(collapsed: ReadonlySet<ElementId>): string[] {
  return buildLayerRows(rows, collapsed).map((row) => row.element.id)
}

function rowFor(id: string, collapsed = NOTHING_COLLAPSED) {
  const found = buildLayerRows(rows, collapsed).find((row) => row.element.id === id)
  if (found === undefined) throw new Error(`No visible row for "${id}".`)
  return found
}

describe('buildLayerRows visibility', () => {
  it('shows every row when nothing is collapsed', () => {
    expect(visibleIds(NOTHING_COLLAPSED)).toEqual([
      'a',
      'a.one',
      'a.one.x',
      'a.one.y',
      'a.two',
      'b',
    ])
  })

  it('hides only the descendants of a collapsed row', () => {
    expect(visibleIds(new Set([elementId('a.one')]))).toEqual([
      'a',
      'a.one',
      'a.two',
      'b',
    ])
  })

  it('hides a whole subtree when an outer row collapses, however its inside is folded', () => {
    const collapsed = new Set([elementId('a'), elementId('a.one')])
    expect(visibleIds(collapsed)).toEqual(['a', 'b'])
  })

  it('remembers the inner fold, so re-expanding restores what was folded', () => {
    const collapsed = new Set([elementId('a'), elementId('a.one')])
    expect(visibleIds(collapsed)).toEqual(['a', 'b'])
    expect(visibleIds(new Set([elementId('a.one')]))).toEqual([
      'a',
      'a.one',
      'a.two',
      'b',
    ])
  })

  it('ignores a collapsed id that has no children', () => {
    expect(visibleIds(new Set([elementId('b')]))).toEqual(visibleIds(NOTHING_COLLAPSED))
  })

  it('returns nothing for an empty tree', () => {
    expect(buildLayerRows([], NOTHING_COLLAPSED)).toEqual([])
  })
})

describe('buildLayerRows row facts', () => {
  it('marks a row as a branch only when the tree really yields children', () => {
    expect(rowFor('a').hasChildren).toBe(true)
    expect(rowFor('a.one').hasChildren).toBe(true)
    expect(rowFor('a.two').hasChildren).toBe(false)
    expect(rowFor('b').hasChildren).toBe(false)
  })

  it('reports a leaf as neither expanded nor collapsed', () => {
    expect(rowFor('b').expanded).toBe(false)
    expect(rowFor('b', new Set([elementId('b')])).expanded).toBe(false)
  })

  it('reports expansion for a branch', () => {
    expect(rowFor('a.one').expanded).toBe(true)
    expect(rowFor('a.one', new Set([elementId('a.one')])).expanded).toBe(false)
  })

  it('numbers each sibling group independently', () => {
    expect([rowFor('a').positionInSet, rowFor('a').setSize]).toEqual([1, 2])
    expect([rowFor('b').positionInSet, rowFor('b').setSize]).toEqual([2, 2])
    expect([rowFor('a.one').positionInSet, rowFor('a.one').setSize]).toEqual([1, 2])
    expect([rowFor('a.two').positionInSet, rowFor('a.two').setSize]).toEqual([2, 2])
    expect([rowFor('a.one.x').positionInSet, rowFor('a.one.x').setSize]).toEqual([1, 2])
    expect([rowFor('a.one.y').positionInSet, rowFor('a.one.y').setSize]).toEqual([2, 2])
  })

  it('marks the last member of every sibling group', () => {
    expect(rowFor('a').isLastSibling).toBe(false)
    expect(rowFor('b').isLastSibling).toBe(true)
    expect(rowFor('a.one').isLastSibling).toBe(false)
    expect(rowFor('a.two').isLastSibling).toBe(true)
    expect(rowFor('a.one.y').isLastSibling).toBe(true)
  })

  it('keeps sibling facts unchanged when a branch elsewhere is folded', () => {
    const folded = new Set([elementId('a.one')])
    expect(rowFor('a.two', folded).positionInSet).toBe(2)
    expect(rowFor('a.two', folded).isLastSibling).toBe(true)
  })
})

describe('buildLayerRows guide rails', () => {
  it('gives a top-level row no rails', () => {
    expect(rowFor('a').guides).toEqual([])
    expect(rowFor('b').guides).toEqual([])
  })

  it('gives a second-level row only its own elbow column', () => {
    expect(rowFor('a.one').guides).toEqual([])
    expect(rowFor('a.two').guides).toEqual([])
  })

  it('carries the parent sibling chain past a nested subtree', () => {
    // `a.one` has `a.two` after it, so the column left of its children must
    // draw a full-height line down to that next sibling.
    expect(rowFor('a.one.x').guides).toEqual([true])
    expect(rowFor('a.one.y').guides).toEqual([true])
  })

  it('stops the rail where the parent is the last of its group', () => {
    const deep: readonly ElementTreeRow[] = [
      { ...rows[0]!, id: elementId('r'), level: 1 },
      { ...rows[0]!, id: elementId('r.last'), level: 2 },
      { ...rows[0]!, id: elementId('r.last.kid'), level: 3 },
    ]
    const built = buildLayerRows(deep, NOTHING_COLLAPSED)
    expect(built[2]?.guides).toEqual([false])
  })
})

describe('branchIds', () => {
  it('lists exactly the rows that can be folded', () => {
    expect(branchIds(rows)).toEqual([elementId('a'), elementId('a.one')])
  })

  it('is empty for a flat tree', () => {
    expect(branchIds([rows[0]!, { ...rows[5]! }])).toEqual([])
  })
})

describe('ancestorIdsOf', () => {
  it('collects the whole path above a target', () => {
    expect(ancestorIdsOf(rows, new Set([elementId('a.one.y')]))).toEqual(
      new Set([elementId('a'), elementId('a.one')]),
    )
  })

  it('collects nothing for a root or for an empty selection', () => {
    expect(ancestorIdsOf(rows, new Set([elementId('a')])).size).toBe(0)
    expect(ancestorIdsOf(rows, new Set()).size).toBe(0)
  })

  it('unions the paths of several targets', () => {
    const targets = new Set([elementId('a.one.x'), elementId('a.two')])
    expect(ancestorIdsOf(rows, targets)).toEqual(new Set([elementId('a'), elementId('a.one')]))
  })
})

describe('parentRowIndex', () => {
  it('finds the owner of a nested row', () => {
    const built = buildLayerRows(rows, NOTHING_COLLAPSED)
    expect(parentRowIndex(built, 3)).toBe(1)
    expect(parentRowIndex(built, 1)).toBe(0)
  })

  it('has no answer at the top level or off the end', () => {
    const built = buildLayerRows(rows, NOTHING_COLLAPSED)
    expect(parentRowIndex(built, 0)).toBeUndefined()
    expect(parentRowIndex(built, 99)).toBeUndefined()
  })
})

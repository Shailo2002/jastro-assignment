import type { ElementId } from '../model/ids'
import type { ElementTreeRow } from './element-tree'

/**
 * Layers-tree shaping.
 *
 * `flattenResolvedDocument` answers WHAT is in the tree; this module answers
 * how one panel draws it. Both the canvas overlay and the layers panel read the
 * same flattened rows, so collapsing a branch must never reach the flattening
 * itself - a collapsed layer is still a selectable target on the canvas, and an
 * id that stopped being offered in one surface but not the other is exactly the
 * drift the shared traversal exists to prevent. Everything here is therefore a
 * pure function of `(rows, collapsed)` and lives beside the view, not the model.
 *
 * The guide rails are computed rather than nested markup: the tree is rendered
 * as a flat list with `aria-level`, which keeps roving focus a single index and
 * keeps a deep branch from stacking a dozen scroll containers. What nesting
 * would have drawn for free - the vertical line that carries a sibling chain
 * past a subtree - each row instead carries as `guides`.
 */

export interface LayerRow {
  readonly element: ElementTreeRow
  /**
   * Ancestor rails, outermost first, one per indent column before this row's
   * own elbow. `true` where that ancestor's sibling chain continues below this
   * row and the column must draw a full-height line.
   */
  readonly guides: readonly boolean[]
  /** Last of its sibling group: the elbow is `└`, not `├`. */
  readonly isLastSibling: boolean
  /** True when the flattened tree actually yields children for this row. */
  readonly hasChildren: boolean
  readonly expanded: boolean
  /** 1-based index within the sibling group, for `aria-posinset`. */
  readonly positionInSet: number
  /** Size of the sibling group, for `aria-setsize`. */
  readonly setSize: number
}

interface SiblingFacts {
  readonly isLastSibling: readonly boolean[]
  readonly positionInSet: readonly number[]
  readonly setSize: readonly number[]
}

/**
 * Sibling position, group size, and last-of-group, in two linear passes.
 *
 * The flattened rows are depth-first, so a sibling group at level L is every
 * row at level L reachable before the next row above level L. Truncating the
 * per-level scratch arrays at each row is what closes a group: descending past
 * level L discards everything recorded deeper, which is precisely the subtree
 * that has just ended.
 */
function siblingFacts(rows: readonly ElementTreeRow[]): SiblingFacts {
  const positionInSet: number[] = []
  const counters: number[] = []

  for (const [index, row] of rows.entries()) {
    counters.length = row.level
    counters[row.level - 1] = (counters[row.level - 1] ?? 0) + 1
    positionInSet[index] = counters[row.level - 1] ?? 1
  }

  const isLastSibling: boolean[] = []
  const setSize: number[] = []
  const seen: boolean[] = []
  const sizes: number[] = []

  // Backwards, so the last member of a group - the one that knows the group's
  // size - is always met before the members that need to be told it.
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const level = rows[index]?.level ?? 1
    seen.length = level
    sizes.length = level

    const last = seen[level - 1] !== true
    isLastSibling[index] = last
    seen[level - 1] = true
    if (last) sizes[level - 1] = positionInSet[index] ?? 1
    setSize[index] = sizes[level - 1] ?? positionInSet[index] ?? 1
  }

  return { isLastSibling, positionInSet, setSize }
}

/**
 * The rows a collapsed tree shows, in order, each carrying what it needs to
 * draw itself. Rows inside a collapsed branch are dropped; nothing else about
 * the tree changes, so a row's depth, sibling position, and rails stay the same
 * whether or not something elsewhere is folded away.
 */
export function buildLayerRows(
  rows: readonly ElementTreeRow[],
  collapsed: ReadonlySet<ElementId>,
): readonly LayerRow[] {
  const facts = siblingFacts(rows)
  const visible: LayerRow[] = []

  /** `chain[level - 2]` - does the current ancestor at `level` continue below? */
  const chain: boolean[] = []
  /** Set while inside a collapsed branch: skip anything deeper than this. */
  let hiddenBelowLevel: number | undefined

  for (const [index, row] of rows.entries()) {
    const isLastSibling = facts.isLastSibling[index] ?? true
    const next = rows[index + 1]
    const hasChildren = next !== undefined && next.level > row.level

    // The row's own elbow occupies the last indent column, so the rails it
    // inherits are its ancestors' - one column short of its own depth.
    const guides = row.level >= 2 ? chain.slice(0, row.level - 2) : []

    if (row.level >= 2) {
      chain.length = row.level - 1
      chain[row.level - 2] = !isLastSibling
    } else {
      chain.length = 0
    }

    if (hiddenBelowLevel !== undefined && row.level > hiddenBelowLevel) continue
    hiddenBelowLevel = undefined

    const expanded = hasChildren && !collapsed.has(row.id)
    if (hasChildren && !expanded) hiddenBelowLevel = row.level

    visible.push({
      element: row,
      guides,
      isLastSibling,
      hasChildren,
      expanded,
      positionInSet: facts.positionInSet[index] ?? 1,
      setSize: facts.setSize[index] ?? 1,
    })
  }

  return visible
}

/** Ids that have children, i.e. everything an expand-all or collapse-all acts on. */
export function branchIds(rows: readonly ElementTreeRow[]): readonly ElementId[] {
  return rows
    .filter((row, index) => {
      const next = rows[index + 1]
      return next !== undefined && next.level > row.level
    })
    .map((row) => row.id)
}

/**
 * Every ancestor of every id in `targets`.
 *
 * Used to reveal a selection made somewhere else: selecting on the canvas must
 * not leave the layers tree showing a folded branch with no sign of what is
 * now selected inside it.
 */
export function ancestorIdsOf(
  rows: readonly ElementTreeRow[],
  targets: ReadonlySet<ElementId>,
): ReadonlySet<ElementId> {
  const found = new Set<ElementId>()
  if (targets.size === 0) return found

  // Sparse where a malformed row skips a level - depth-first flattening never
  // does, but the type stays honest about the hole rather than asserting it away.
  const path: (ElementId | undefined)[] = []
  for (const row of rows) {
    path.length = row.level - 1
    if (targets.has(row.id)) {
      for (const id of path) {
        if (id !== undefined) found.add(id)
      }
    }
    path[row.level - 1] = row.id
  }

  return found
}

/** Index of the row that owns `index`, or `undefined` at the top level. */
export function parentRowIndex(rows: readonly LayerRow[], index: number): number | undefined {
  const level = rows[index]?.element.level
  if (level === undefined || level <= 1) return undefined

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = rows[cursor]
    if (candidate !== undefined && candidate.element.level < level) return cursor
  }
  return undefined
}

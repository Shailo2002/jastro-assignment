import type { ResolvedDocument } from '../engine/responsive-resolver'
import type { ElementId } from '../model/ids'
import { describeElement, type ElementDescriptor } from './element-names'
import { orderedChildIds } from './reorder'

/**
 * Flattened element tree.
 *
 * Canvas overlay and layers tree must offer the same targets in the same order,
 * so both read this one traversal of the resolved document. Traversal is depth
 * first in visual order - `childIds` resorted by resolved `layout.order` inside
 * a flex or grid parent, exactly as the browser lays it out - so keyboard focus
 * order keeps following what a reviewer actually sees after a reorder.
 *
 * Dangling ids and reference cycles are skipped exactly as the renderer skips
 * them, so a layer can never exist for something the canvas does not draw.
 */

/** Matches the renderer's guard so the two traversals cannot disagree. */
const MAX_DEPTH = 24

export interface ElementTreeRow {
  readonly id: ElementId
  readonly descriptor: ElementDescriptor
  /** 1-based, for `aria-level`. */
  readonly level: number
  readonly childCount: number
  /** Depth-ordered stacking hint: deeper targets sit above their ancestors. */
  readonly depth: number
}

export function flattenResolvedDocument(
  document: ResolvedDocument,
): readonly ElementTreeRow[] {
  const rows: ElementTreeRow[] = []

  const visit = (id: ElementId, level: number, ancestors: ReadonlySet<ElementId>): void => {
    if (level > MAX_DEPTH || ancestors.has(id)) return
    const element = document.elements[id]
    if (element === undefined) return

    rows.push({
      id,
      descriptor: describeElement(element),
      level,
      childCount: element.childIds.length,
      depth: level - 1,
    })

    const nested = new Set([...ancestors, id])
    for (const childId of orderedChildIds(document, id)) {
      visit(childId, level + 1, nested)
    }
  }

  for (const rootId of document.rootElementIds) {
    visit(rootId, 1, new Set<ElementId>())
  }

  return rows
}

export function collectElementIds(rows: readonly ElementTreeRow[]): ReadonlySet<ElementId> {
  return new Set(rows.map((row) => row.id))
}

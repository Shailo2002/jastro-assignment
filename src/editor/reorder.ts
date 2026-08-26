import type { ResolvedDocument } from '../engine/responsive-resolver'
import type { ElementId } from '../model/ids'
import type { EditablePropertyPatch } from '../model/properties'

/**
 * Sibling reordering.
 *
 * Order is expressed as the `layout.order` property, never as a rewrite of the
 * parent's `childIds`. That choice keeps reordering inside the one edit
 * pipeline - validated, versioned, restorable, and scopeable per viewport -
 * and it makes tree integrity a structural guarantee rather than something the
 * reorder code has to be careful about.
 *
 * A move renumbers every sibling in the new visual order, so the result is
 * fully determined by the plan and does not depend on which siblings happened
 * to carry an explicit order already.
 */

export type ReorderDirection = 'up' | 'down'

/** Parents whose children CSS `order` actually reorders. */
const ORDERABLE_DISPLAYS: readonly string[] = ['flex', 'grid']

export interface ReorderPlan {
  readonly targetIds: readonly ElementId[]
  readonly changes: Readonly<Record<ElementId, EditablePropertyPatch>>
  /** Sibling ids in the order the plan produces, for tests and messages. */
  readonly orderedIds: readonly ElementId[]
}

export type ReorderResult =
  | { readonly ok: true; readonly plan: ReorderPlan }
  | { readonly ok: false; readonly reason: string }

/**
 * Visual order of an element's children: `childIds` sorted by resolved
 * `layout.order`, which is exactly how the browser lays a flex/grid container
 * out. `Array.prototype.sort` is stable, so siblings sharing an order value
 * keep their document order, matching CSS.
 */
export function orderedChildIds(
  document: ResolvedDocument,
  parentId: ElementId,
): readonly ElementId[] {
  const parent = document.elements[parentId]
  if (parent === undefined) return []
  if (!ORDERABLE_DISPLAYS.includes(parent.properties.layout?.display ?? 'block')) {
    return parent.childIds
  }

  return [...parent.childIds].sort((left, right) => {
    const leftOrder = document.elements[left]?.properties.layout?.order ?? 0
    const rightOrder = document.elements[right]?.properties.layout?.order ?? 0
    return leftOrder - rightOrder
  })
}

export function planReorder(
  document: ResolvedDocument,
  elementId: ElementId,
  direction: ReorderDirection,
): ReorderResult {
  const element = document.elements[elementId]
  if (element === undefined) {
    return { ok: false, reason: 'That element is not part of the current template.' }
  }

  const parentId = element.parentId
  if (parentId === null) {
    return { ok: false, reason: 'A top-level section has no siblings to move between.' }
  }

  const parent = document.elements[parentId]
  if (parent === undefined) {
    return { ok: false, reason: 'That element has no reachable parent.' }
  }

  const display = parent.properties.layout?.display ?? 'block'
  if (!ORDERABLE_DISPLAYS.includes(display)) {
    return {
      ok: false,
      reason: `Order applies to children of a flex or grid container; this parent uses "${display}".`,
    }
  }

  const siblings = orderedChildIds(document, parentId)
  const index = siblings.indexOf(elementId)
  if (index < 0) {
    return { ok: false, reason: 'That element is not listed among its parent’s children.' }
  }

  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= siblings.length) {
    return {
      ok: false,
      reason:
        direction === 'up'
          ? 'This element is already first among its siblings.'
          : 'This element is already last among its siblings.',
    }
  }

  const orderedIds = [...siblings]
  const moved = orderedIds[index]
  const displaced = orderedIds[swapWith]
  if (moved === undefined || displaced === undefined) {
    return { ok: false, reason: 'That element has no sibling in this direction.' }
  }
  orderedIds[index] = displaced
  orderedIds[swapWith] = moved

  const changes: Record<ElementId, EditablePropertyPatch> = {}
  for (const [position, siblingId] of orderedIds.entries()) {
    changes[siblingId] = { layout: { order: position } }
  }

  return { ok: true, plan: { targetIds: orderedIds, changes, orderedIds } }
}

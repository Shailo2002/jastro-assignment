import { useEffect, useState, type RefObject } from 'react'

import { isElementId, type ElementId } from '../model/ids'

/**
 * Measured geometry of the rendered template, keyed by stable element ID.
 *
 * The selection overlay needs to know where each element ended up, but it must
 * not learn WHICH element that is from the DOM: the identity always comes from
 * the `data-element-id` attribute the renderer already writes, and anything
 * that is not a valid element id is ignored.
 *
 * Rectangles are returned in the frame's own untransformed coordinate space, so
 * the overlay can live inside the scaled frame and share its transform.
 */

export interface OverlayRect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

function sameRects(
  a: ReadonlyMap<ElementId, OverlayRect>,
  b: ReadonlyMap<ElementId, OverlayRect>,
): boolean {
  if (a.size !== b.size) return false
  for (const [id, rect] of a) {
    const other = b.get(id)
    if (other === undefined) return false
    if (
      rect.left !== other.left ||
      rect.top !== other.top ||
      rect.width !== other.width ||
      rect.height !== other.height
    ) {
      return false
    }
  }
  return true
}

const EMPTY_RECTS: ReadonlyMap<ElementId, OverlayRect> = new Map()

/**
 * @param frameRef the scaled preview frame that contains the rendered template
 * @param scale the CSS transform scale currently applied to that frame
 * @param changeKey re-measure whenever this changes (document, viewport, fit)
 */
export function useElementRects(
  frameRef: RefObject<HTMLElement | null>,
  scale: number,
  changeKey: string,
): ReadonlyMap<ElementId, OverlayRect> {
  const [rects, setRects] = useState<ReadonlyMap<ElementId, OverlayRect>>(EMPTY_RECTS)

  useEffect(() => {
    const frame = frameRef.current
    if (frame === null || scale <= 0) return undefined

    const measure = (): void => {
      const frameBox = frame.getBoundingClientRect()
      const next = new Map<ElementId, OverlayRect>()

      for (const node of frame.querySelectorAll('[data-element-id]')) {
        const id = node.getAttribute('data-element-id')
        if (!isElementId(id)) continue
        const box = node.getBoundingClientRect()
        // Undo the frame's scale so overlay coordinates match the layout the
        // template was rendered at, not the pixels it currently occupies.
        next.set(id, {
          left: (box.left - frameBox.left) / scale,
          top: (box.top - frameBox.top) / scale,
          width: box.width / scale,
          height: box.height / scale,
        })
      }

      setRects((current) => (sameRects(current, next) ? current : next))
    }

    measure()

    // jsdom and older browsers have no ResizeObserver; the overlay must still
    // render its targets, just without geometry.
    if (typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(() => {
      measure()
    })
    observer.observe(frame)

    return () => {
      observer.disconnect()
    }
  }, [frameRef, scale, changeKey])

  return rects
}

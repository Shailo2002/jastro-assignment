import { useEffect, useState, type RefObject } from 'react'

export interface ElementSize {
  readonly width: number
  readonly height: number
}

/**
 * Observed border-box size of an element.
 *
 * Returns `undefined` when measurement is unavailable - server render, jsdom,
 * or a browser without `ResizeObserver` - so callers must render sensibly
 * without a measurement rather than depending on one.
 */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize | undefined {
  const [size, setSize] = useState<ElementSize | undefined>(undefined)

  useEffect(() => {
    const element = ref.current
    if (element === null || typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry === undefined) return
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    setSize({ width: element.clientWidth, height: element.clientHeight })

    return () => {
      observer.disconnect()
    }
  }, [ref])

  return size
}

/**
 * Scale needed to fit a virtual viewport inside the available width.
 *
 * A 1440 px preview must be inspectable inside a narrower canvas without the
 * editor shell scrolling sideways, so the frame is scaled down rather than
 * clipped. Scaling up is never done: 1 is the maximum.
 */
export function fitScale(
  availableWidth: number | undefined,
  virtualWidth: number,
  enabled: boolean,
): number {
  if (!enabled || availableWidth === undefined || availableWidth <= 0) return 1
  return Math.min(1, availableWidth / virtualWidth)
}

/**
 * Roving-tabindex arithmetic.
 *
 * Shared by the canvas overlay and the layers tree so arrow navigation behaves
 * identically on both. Pure: it maps a key to an index, and the component owns
 * the DOM focus call.
 */

export type RovingKey = 'ArrowDown' | 'ArrowUp' | 'ArrowRight' | 'ArrowLeft' | 'Home' | 'End'

const FORWARD_KEYS: readonly string[] = ['ArrowDown', 'ArrowRight']
const BACKWARD_KEYS: readonly string[] = ['ArrowUp', 'ArrowLeft']

/**
 * Next index for a navigation key, or `undefined` when the key is not a
 * navigation key or the list is empty. Movement clamps at both ends rather than
 * wrapping, so holding an arrow key cannot silently cycle past the last target.
 */
export function nextRovingIndex(
  count: number,
  currentIndex: number,
  key: string,
): number | undefined {
  if (count <= 0) return undefined
  const from = currentIndex < 0 || currentIndex >= count ? 0 : currentIndex

  if (FORWARD_KEYS.includes(key)) return Math.min(count - 1, from + 1)
  if (BACKWARD_KEYS.includes(key)) return Math.max(0, from - 1)
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return undefined
}

/** True for the modifiers that mean "add to / remove from selection". */
export function isAdditiveEvent(event: {
  readonly shiftKey: boolean
  readonly ctrlKey: boolean
  readonly metaKey: boolean
}): boolean {
  return event.shiftKey || event.ctrlKey || event.metaKey
}

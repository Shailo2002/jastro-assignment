import { useCallback, useRef, useState, type KeyboardEvent } from 'react'

import { nextRovingIndex } from './roving-focus'

/**
 * Roving tabindex for a list of buttons.
 *
 * One item is tabbable at a time, so Tab moves past the whole group and arrow
 * keys move within it. The group never traps focus.
 */
export interface RovingFocusApi {
  /** `tabIndex` value for the item at `index`. */
  tabIndexFor(index: number): 0 | -1
  /** Ref callback that lets the hook move real DOM focus. */
  register(index: number): (node: HTMLButtonElement | null) => void
  /** Handles arrow/Home/End; returns true when the key was consumed. */
  handleNavigationKey(event: KeyboardEvent<HTMLElement>): boolean
  /** Keeps the tabbable item in step with whatever the user focused. */
  onItemFocus(index: number): void
}

export function useRovingFocus(count: number): RovingFocusApi {
  const [focusIndex, setFocusIndex] = useState(0)
  const nodesRef = useRef<(HTMLButtonElement | null)[]>([])

  // The list can shrink; falling back to the first item keeps exactly one
  // tabbable target instead of leaving the group unreachable by Tab.
  const activeIndex = focusIndex >= 0 && focusIndex < count ? focusIndex : 0

  const register = useCallback(
    (index: number) =>
      (node: HTMLButtonElement | null): void => {
        nodesRef.current[index] = node
      },
    [],
  )

  const handleNavigationKey = useCallback(
    (event: KeyboardEvent<HTMLElement>): boolean => {
      const target = nextRovingIndex(count, activeIndex, event.key)
      if (target === undefined) return false

      event.preventDefault()
      setFocusIndex(target)
      nodesRef.current[target]?.focus()
      return true
    },
    [count, activeIndex],
  )

  const onItemFocus = useCallback((index: number): void => {
    setFocusIndex(index)
  }, [])

  return {
    tabIndexFor: (index) => (index === activeIndex ? 0 : -1),
    register,
    handleNavigationKey,
    onItemFocus,
  }
}

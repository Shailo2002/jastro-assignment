import { describe, expect, it } from 'vitest'

import { isAdditiveEvent, nextRovingIndex } from './roving-focus'

describe('nextRovingIndex', () => {
  it('moves forward and backward through the list', () => {
    expect(nextRovingIndex(4, 1, 'ArrowDown')).toBe(2)
    expect(nextRovingIndex(4, 1, 'ArrowUp')).toBe(0)
    expect(nextRovingIndex(4, 1, 'ArrowRight')).toBe(2)
    expect(nextRovingIndex(4, 1, 'ArrowLeft')).toBe(0)
  })

  it('clamps at both ends instead of wrapping', () => {
    expect(nextRovingIndex(4, 3, 'ArrowDown')).toBe(3)
    expect(nextRovingIndex(4, 0, 'ArrowUp')).toBe(0)
  })

  it('jumps to the first and last item', () => {
    expect(nextRovingIndex(4, 2, 'Home')).toBe(0)
    expect(nextRovingIndex(4, 2, 'End')).toBe(3)
  })

  it('ignores keys that are not navigation keys', () => {
    expect(nextRovingIndex(4, 2, 'Enter')).toBeUndefined()
    expect(nextRovingIndex(4, 2, 'a')).toBeUndefined()
  })

  it('returns nothing for an empty list', () => {
    expect(nextRovingIndex(0, 0, 'ArrowDown')).toBeUndefined()
  })

  it('recovers from an out-of-range current index', () => {
    expect(nextRovingIndex(3, 99, 'ArrowDown')).toBe(1)
  })
})

describe('isAdditiveEvent', () => {
  it('treats Shift, Ctrl and Cmd as additive', () => {
    expect(isAdditiveEvent({ shiftKey: true, ctrlKey: false, metaKey: false })).toBe(true)
    expect(isAdditiveEvent({ shiftKey: false, ctrlKey: true, metaKey: false })).toBe(true)
    expect(isAdditiveEvent({ shiftKey: false, ctrlKey: false, metaKey: true })).toBe(true)
    expect(isAdditiveEvent({ shiftKey: false, ctrlKey: false, metaKey: false })).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import { elementId } from '../model/ids'
import {
  EMPTY_SELECTION,
  applySelection,
  isSelected,
  normalizeSelection,
  primarySelectionId,
  selectOnly,
  toggleSelected,
} from './selection'

const HEADING = elementId('hero.heading')
const CTA = elementId('hero.cta.primary')
const BODY = elementId('cta.body')

describe('selectOnly', () => {
  it('replaces the whole selection with one id', () => {
    expect(selectOnly(HEADING)).toEqual([HEADING])
    expect(applySelection([CTA, BODY], HEADING, false)).toEqual([HEADING])
  })

  it('keeps a single already-selected id selected', () => {
    expect(applySelection([HEADING], HEADING, false)).toEqual([HEADING])
  })
})

describe('toggleSelected', () => {
  it('adds an unselected id as the new primary target', () => {
    expect(toggleSelected([HEADING], CTA)).toEqual([HEADING, CTA])
    expect(primarySelectionId(toggleSelected([HEADING], CTA))).toBe(CTA)
  })

  it('removes an already selected id without touching the others', () => {
    expect(toggleSelected([HEADING, CTA, BODY], CTA)).toEqual([HEADING, BODY])
  })

  it('never produces duplicates', () => {
    const twice = toggleSelected(toggleSelected([HEADING], CTA), CTA)
    expect(twice).toEqual([HEADING])
  })

  it('does not mutate its input', () => {
    const original = [HEADING]
    toggleSelected(original, CTA)
    expect(original).toEqual([HEADING])
  })
})

describe('applySelection', () => {
  it('routes additive activation to a toggle and plain activation to a replace', () => {
    expect(applySelection([HEADING], CTA, true)).toEqual([HEADING, CTA])
    expect(applySelection([HEADING], CTA, false)).toEqual([CTA])
  })

  it('can empty the selection through an additive toggle', () => {
    expect(applySelection([HEADING], HEADING, true)).toEqual([])
  })
})

describe('primarySelectionId', () => {
  it('is the most recently added id', () => {
    expect(primarySelectionId(EMPTY_SELECTION)).toBeUndefined()
    expect(primarySelectionId([HEADING, CTA])).toBe(CTA)
  })
})

describe('isSelected', () => {
  it('reports membership by exact id', () => {
    expect(isSelected([HEADING], HEADING)).toBe(true)
    expect(isSelected([HEADING], CTA)).toBe(false)
  })
})

describe('normalizeSelection', () => {
  it('drops ids the document no longer contains', () => {
    expect(normalizeSelection([HEADING, CTA], new Set([HEADING]))).toEqual([HEADING])
  })

  it('returns the same reference when nothing changed', () => {
    const selection = [HEADING, CTA]
    expect(normalizeSelection(selection, new Set([HEADING, CTA]))).toBe(selection)
  })
})

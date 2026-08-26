import { describe, expect, it } from 'vitest'

import {
  elementId,
  isDocumentId,
  isElementId,
  isRevisionEntryId,
} from './ids'

describe('element ids', () => {
  it.each(['hero.section', 'hero.cta.primary', 'features.card.1', 'footer-note'])(
    'accepts the stable id %s',
    (value) => {
      expect(isElementId(value)).toBe(true)
      expect(elementId(value)).toBe(value)
    },
  )

  it.each([
    '',
    'Hero.Section',
    '1hero',
    'hero..heading',
    'hero heading',
    'hero.heading!',
    '.hero',
    'hero.',
  ])('rejects the unstable id %s', (value) => {
    expect(isElementId(value)).toBe(false)
    expect(() => elementId(value)).toThrow(/Invalid element id/)
  })

  it('rejects non-string input', () => {
    expect(isElementId(undefined)).toBe(false)
    expect(isElementId(42)).toBe(false)
    expect(isElementId({ id: 'hero.section' })).toBe(false)
  })

  it('rejects ids longer than the supported limit', () => {
    expect(isElementId(`hero.${'a'.repeat(200)}`)).toBe(false)
  })

  it('validates document and revision slugs', () => {
    expect(isDocumentId('aster-labs-onepager')).toBe(true)
    expect(isDocumentId('Aster Labs')).toBe(false)
    expect(isRevisionEntryId('rev.0001')).toBe(true)
    expect(isRevisionEntryId('')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import { elementId } from '../model/ids'
import { describeElement } from './element-names'

describe('describeElement', () => {
  it('names a text-bearing element from its canonical content', () => {
    const descriptor = describeElement({
      id: elementId('hero.heading'),
      type: 'heading',
      properties: { content: { text: 'Ship responsive pages' } },
    })

    expect(descriptor.typeLabel).toBe('Heading')
    expect(descriptor.name).toBe('Ship responsive pages')
    expect(descriptor.accessibleName).toBe('Heading: Ship responsive pages')
  })

  it('falls back to the alt text of an image', () => {
    expect(
      describeElement({
        id: elementId('hero.image'),
        type: 'image',
        properties: { content: { imageSrc: 'x.svg', imageAlt: 'Product screenshot' } },
      }).name,
    ).toBe('Product screenshot')
  })

  it('falls back to the last id segment for a structural element', () => {
    expect(
      describeElement({
        id: elementId('features.grid'),
        type: 'container',
        properties: {},
      }).name,
    ).toBe('Grid')
  })

  it('ignores blank text rather than showing an empty name', () => {
    expect(
      describeElement({
        id: elementId('footer.note'),
        type: 'text',
        properties: { content: { text: '   ' } },
      }).name,
    ).toBe('Note')
  })

  it('truncates a long name and collapses whitespace', () => {
    const descriptor = describeElement({
      id: elementId('cta.body'),
      type: 'text',
      properties: {
        content: { text: 'A  very   long piece of body copy that will not fit in a layer row' },
      },
    })

    expect(descriptor.name.length).toBeLessThanOrEqual(40)
    expect(descriptor.name.endsWith('…')).toBe(true)
    expect(descriptor.name).not.toContain('  ')
  })
})

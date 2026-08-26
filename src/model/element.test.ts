import { describe, expect, it } from 'vitest'

import { elementOverridesSchema, templateElementSchema } from './element'

function heading(overrides: Record<string, unknown> = {}) {
  return {
    id: 'hero.heading',
    type: 'heading',
    parentId: 'hero.section',
    childIds: [],
    base: { content: { text: 'Hello' } },
    overrides: {},
    revision: 0,
    ...overrides,
  }
}

describe('template element schema', () => {
  it('accepts a well-formed element', () => {
    expect(templateElementSchema.safeParse(heading()).success).toBe(true)
  })

  it('rejects an unknown element type', () => {
    expect(templateElementSchema.safeParse(heading({ type: 'iframe' })).success).toBe(false)
  })

  it('rejects identity fields that are not part of the schema', () => {
    const result = templateElementSchema.safeParse({ ...heading(), createdBy: 'me' })
    expect(result.success).toBe(false)
  })

  it('rejects a negative or fractional revision', () => {
    expect(templateElementSchema.safeParse(heading({ revision: -1 })).success).toBe(false)
    expect(templateElementSchema.safeParse(heading({ revision: 1.5 })).success).toBe(false)
  })

  it('rejects duplicate child ids', () => {
    const result = templateElementSchema.safeParse(
      heading({ type: 'container', base: {}, childIds: ['a.one', 'a.one'] }),
    )
    expect(result.success).toBe(false)
  })

  it('rejects an element that parents or contains itself', () => {
    expect(
      templateElementSchema.safeParse(heading({ parentId: 'hero.heading' })).success,
    ).toBe(false)
    expect(
      templateElementSchema.safeParse(
        heading({ type: 'container', base: {}, childIds: ['hero.heading'] }),
      ).success,
    ).toBe(false)
  })

  it('requires base content text on text-bearing elements', () => {
    const result = templateElementSchema.safeParse(heading({ base: {} }))
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.some((issue) => issue.message.includes('base content text'))).toBe(true)
  })

  it('allows an empty string as base content text', () => {
    expect(
      templateElementSchema.safeParse(heading({ base: { content: { text: '' } } })).success,
    ).toBe(true)
  })

  it('requires a source and alternative text on image elements', () => {
    const missingAlt = templateElementSchema.safeParse(
      heading({ id: 'hero.image', type: 'image', base: { content: { imageSrc: '/a.svg' } } }),
    )
    expect(missingAlt.success).toBe(false)

    const complete = templateElementSchema.safeParse(
      heading({
        id: 'hero.image',
        type: 'image',
        base: { content: { imageSrc: '/a.svg', imageAlt: 'A' } },
      }),
    )
    expect(complete.success).toBe(true)
  })
})

describe('viewport override slots', () => {
  it('represents desktop, tablet, and mobile independently', () => {
    const result = elementOverridesSchema.safeParse({
      desktop: { typography: { fontSize: 56 } },
      tablet: { typography: { fontSize: 42 } },
      mobile: { typography: { fontSize: 32 } },
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.desktop?.typography?.fontSize).toBe(56)
    expect(result.data.tablet?.typography?.fontSize).toBe(42)
    expect(result.data.mobile?.typography?.fontSize).toBe(32)
  })

  it('accepts an empty override map', () => {
    expect(elementOverridesSchema.safeParse({}).success).toBe(true)
  })

  it('rejects an invented viewport key', () => {
    expect(
      elementOverridesSchema.safeParse({ watch: { typography: { fontSize: 12 } } }).success,
    ).toBe(false)
  })

  it('rejects a forbidden field inside an override', () => {
    expect(elementOverridesSchema.safeParse({ mobile: { id: 'hero.heading' } }).success).toBe(false)
  })
})

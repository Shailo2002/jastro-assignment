import { describe, expect, it } from 'vitest'

import { parseTemplateDocument, SCHEMA_VERSION } from './document'
import {
  createInitialTemplateDocument,
  INITIAL_DOCUMENT_ID,
  INITIAL_ROOT_ELEMENT_IDS,
} from './initial-template'
import { VIEWPORTS } from './viewport'
import { elementId as id } from './ids'

describe('initial template fixture', () => {
  it('passes runtime schema validation', () => {
    expect(parseTemplateDocument(createInitialTemplateDocument()).ok).toBe(true)
  })

  it('declares a schema version and a starting document revision', () => {
    const document = createInitialTemplateDocument()
    expect(document.schemaVersion).toBe(SCHEMA_VERSION)
    expect(document.revision).toBe(0)
    expect(document.id).toBe(INITIAL_DOCUMENT_ID)
    expect(document.history).toEqual({})
  })

  it('exposes the stable human-readable ids the assignment expects', () => {
    const document = createInitialTemplateDocument()
    for (const stableId of [
      'hero.section',
      'hero.heading',
      'hero.cta.primary',
      'hero.image',
      'features.section',
      'features.grid',
      'features.card.1',
      'features.card.1.title',
      'cta.button',
      'footer.note',
    ]) {
      expect(document.elements[id(stableId)]).toBeDefined()
    }
  })

  it('lists the page sections as roots with no parent', () => {
    const document = createInitialTemplateDocument()
    expect(document.rootElementIds).toEqual(INITIAL_ROOT_ELEMENT_IDS)
    for (const rootId of document.rootElementIds) {
      expect(document.elements[rootId]?.parentId).toBeNull()
    }
  })

  it('starts every element at revision 0', () => {
    const document = createInitialTemplateDocument()
    for (const element of Object.values(document.elements)) {
      expect(element.revision).toBe(0)
    }
  })

  it('uses all three viewport override slots somewhere in the template', () => {
    const document = createInitialTemplateDocument()
    for (const viewport of VIEWPORTS) {
      const used = Object.values(document.elements).some(
        (element) => element.overrides[viewport] !== undefined,
      )
      expect(used, `expected at least one ${viewport} override`).toBe(true)
    }
  })

  it('represents base plus all three override slots on one element', () => {
    const grid = createInitialTemplateDocument().elements[id('features.grid')]
    expect(grid?.base.layout?.gridColumns).toBe(3)
    expect(grid?.overrides.desktop?.layout?.gridColumns).toBe(3)
    expect(grid?.overrides.tablet?.layout?.gridColumns).toBe(2)
    expect(grid?.overrides.mobile?.layout?.gridColumns).toBe(1)
  })

  it('keeps the only image asset local and described', () => {
    const image = createInitialTemplateDocument().elements[id('hero.image')]
    expect(image?.base.content?.imageSrc).toBe('/template/hero-preview.svg')
    expect(image?.base.content?.imageAlt).toBeTruthy()
  })

  it('returns an independent copy on every call', () => {
    const first = createInitialTemplateDocument()
    const second = createInitialTemplateDocument()

    expect(first).not.toBe(second)
    expect(first).toEqual(second)
    expect(first.elements).not.toBe(second.elements)
    expect(first.elements[id('hero.heading')]).not.toBe(second.elements[id('hero.heading')])
    expect(first.elements[id('hero.heading')]?.base).not.toBe(
      second.elements[id('hero.heading')]?.base,
    )
    expect(first.elements[id('hero.heading')]?.overrides).not.toBe(
      second.elements[id('hero.heading')]?.overrides,
    )
  })

  it('is not affected by mutating a previously returned document', () => {
    const first = createInitialTemplateDocument()
    const heading = first.elements[id('hero.heading')]
    const typography = heading?.base.typography
    if (!typography) throw new Error('fixture is missing hero.heading typography')
    Object.assign(typography, { fontSize: 8 })

    const second = createInitialTemplateDocument()
    expect(second.elements[id('hero.heading')]?.base.typography?.fontSize).toBe(56)
  })
})

import { describe, expect, it } from 'vitest'

import { elementId } from '../model/ids'
import { TEMPLATE_CATALOG } from './template-catalog'

describe('template catalog', () => {
  it('contains four distinct factories that create valid fresh documents', () => {
    expect(TEMPLATE_CATALOG).toHaveLength(4)
    expect(new Set(TEMPLATE_CATALOG.map((template) => template.id)).size).toBe(4)

    const documents = TEMPLATE_CATALOG.map((template) => template.createDocument())
    expect(new Set(documents.map((document) => document.id)).size).toBe(4)
    expect(documents.every((document) => document.revision === 0)).toBe(true)

    const secondNovaDocument = TEMPLATE_CATALOG[1]!.createDocument()
    expect(secondNovaDocument).not.toBe(documents[1])
    expect(secondNovaDocument.elements[elementId('hero.heading')]).not.toBe(
      documents[1]!.elements[elementId('hero.heading')],
    )
  })
})

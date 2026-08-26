import { describe, expect, it } from 'vitest'

import { parseTemplateDocument, SCHEMA_VERSION, type ParseResult, type TemplateDocument } from './document'
import { elementId } from './ids'

interface RawElement {
  id: string
  type: string
  parentId: string | null
  childIds: string[]
  base: Record<string, unknown>
  overrides: Record<string, unknown>
  revision: number
}

interface RawDocument {
  id: string
  schemaVersion: number
  revision: number
  rootElementIds: string[]
  elements: Record<string, RawElement>
  history: Record<string, unknown[]>
}

function section(id: string, childIds: string[] = [], parentId: string | null = null): RawElement {
  return { id, type: 'section', parentId, childIds, base: {}, overrides: {}, revision: 0 }
}

function text(id: string, parentId: string): RawElement {
  return {
    id,
    type: 'text',
    parentId,
    childIds: [],
    base: { content: { text: 'Body' } },
    overrides: {},
    revision: 0,
  }
}

/** Smallest valid document: one root section holding one text node. */
function validRawDocument(): RawDocument {
  return {
    id: 'test-doc',
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    rootElementIds: ['hero.section'],
    elements: {
      'hero.section': section('hero.section', ['hero.body']),
      'hero.body': text('hero.body', 'hero.section'),
    },
    history: {},
  }
}

function expectRejected(result: ParseResult<TemplateDocument>, matcher: RegExp): void {
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.issues.map((issue) => issue.message).join(' | ')).toMatch(matcher)
}

describe('template document schema', () => {
  it('accepts a minimal valid document', () => {
    const result = parseTemplateDocument(validRawDocument())
    expect(result.ok).toBe(true)
  })

  it('rejects a non-object input without throwing', () => {
    expect(parseTemplateDocument(null).ok).toBe(false)
    expect(parseTemplateDocument('{}').ok).toBe(false)
    expect(parseTemplateDocument(undefined).ok).toBe(false)
    expect(parseTemplateDocument([]).ok).toBe(false)
  })

  it('rejects unknown top-level keys', () => {
    const document = { ...validRawDocument(), lastEditor: 'someone' }
    expect(parseTemplateDocument(document).ok).toBe(false)
  })

  it('requires a schema version and a document revision', () => {
    const missingVersion: Record<string, unknown> = { ...validRawDocument() }
    delete missingVersion['schemaVersion']
    expect(parseTemplateDocument(missingVersion).ok).toBe(false)

    const missingRevision: Record<string, unknown> = { ...validRawDocument() }
    delete missingRevision['revision']
    expect(parseTemplateDocument(missingRevision).ok).toBe(false)
  })

  it('rejects an element stored under a mismatched key', () => {
    const document = validRawDocument()
    const moved = document.elements['hero.body']
    if (!moved) throw new Error('fixture is missing hero.body')
    delete document.elements['hero.body']
    document.elements['hero.other'] = moved
    document.elements['hero.section'] = section('hero.section', ['hero.other'])

    expectRejected(parseTemplateDocument(document), /declares id/)
  })

  it('rejects a duplicate root element id', () => {
    const document = validRawDocument()
    document.rootElementIds = ['hero.section', 'hero.section']

    expectRejected(parseTemplateDocument(document), /Duplicate root element id/)
  })

  it('rejects an unknown root element id', () => {
    const document = validRawDocument()
    document.rootElementIds = ['hero.section', 'missing.section']

    expectRejected(parseTemplateDocument(document), /Unknown root element id/)
  })

  it('rejects a missing child', () => {
    const document = validRawDocument()
    document.elements['hero.section'] = section('hero.section', ['hero.body', 'hero.ghost'])

    expectRejected(parseTemplateDocument(document), /unknown child/)
  })

  it('rejects a broken parent link', () => {
    const document = validRawDocument()
    document.elements['hero.body'] = text('hero.body', 'features.section')

    expectRejected(parseTemplateDocument(document), /unknown parent/)
  })

  it('rejects a child that does not point back at its parent', () => {
    const document = validRawDocument()
    document.elements['hero.other'] = text('hero.other', 'hero.section')
    document.elements['hero.body'] = text('hero.body', 'hero.other')

    expectRejected(parseTemplateDocument(document), /does not point back/)
  })

  it('rejects an element claimed by two parents', () => {
    const document = validRawDocument()
    document.elements['hero.second'] = section('hero.second', ['hero.body'], 'hero.section')
    document.elements['hero.section'] = section('hero.section', ['hero.body', 'hero.second'])

    expectRejected(parseTemplateDocument(document), /claimed as a child by 2 parents/)
  })

  it('rejects an element that is unreachable from the roots', () => {
    const document = validRawDocument()
    document.elements['orphan.section'] = section('orphan.section')

    expectRejected(parseTemplateDocument(document), /not reachable|not listed in rootElementIds/)
  })

  it('rejects a root element that declares a parent', () => {
    const document = validRawDocument()
    document.rootElementIds = ['hero.section', 'hero.body']

    expectRejected(parseTemplateDocument(document), /listed as a root but declares a parent/)
  })

  it('rejects history recorded for an unknown element', () => {
    const document = validRawDocument()
    document.history['ghost.element'] = []

    expectRejected(parseTemplateDocument(document), /History exists for unknown element/)
  })

  it('rejects a history entry that targets a different element', () => {
    const document = validRawDocument()
    document.history['hero.body'] = [
      {
        id: 'rev.1',
        elementId: 'hero.section',
        scope: 'mobile',
        source: 'canvas',
        documentRevision: 0,
        before: { typography: { fontSize: 16 } },
        after: { typography: { fontSize: 18 } },
        changedPaths: ['typography.fontSize'],
        createdAt: '2026-08-26T10:00:00.000Z',
      },
    ]

    expectRejected(parseTemplateDocument(document), /targets/)
  })

  it('accepts a well-formed scoped history entry', () => {
    const document = validRawDocument()
    document.revision = 2
    document.history['hero.body'] = [
      {
        id: 'rev.1',
        elementId: 'hero.body',
        scope: 'mobile',
        source: 'ai',
        documentRevision: 1,
        before: { typography: { fontSize: 16 } },
        after: { typography: { fontSize: 18 } },
        changedPaths: ['typography.fontSize'],
        createdAt: '2026-08-26T10:00:00.000Z',
      },
    ]

    const result = parseTemplateDocument(document)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.history[elementId('hero.body')]).toHaveLength(1)
  })

  it('rejects a history entry newer than the document revision', () => {
    const document = validRawDocument()
    document.history['hero.body'] = [
      {
        id: 'rev.1',
        elementId: 'hero.body',
        scope: 'all',
        source: 'code',
        documentRevision: 9,
        before: {},
        after: {},
        changedPaths: [],
        createdAt: '2026-08-26T10:00:00.000Z',
      },
    ]

    expectRejected(parseTemplateDocument(document), /newer than the document revision/)
  })

  it('rejects a history entry with a non-ISO timestamp', () => {
    const document = validRawDocument()
    document.history['hero.body'] = [
      {
        id: 'rev.1',
        elementId: 'hero.body',
        scope: 'all',
        source: 'code',
        documentRevision: 0,
        before: {},
        after: {},
        createdAt: 'yesterday',
      },
    ]

    expect(parseTemplateDocument(document).ok).toBe(false)
  })

  it('reports every problem rather than only the first', () => {
    const document = validRawDocument()
    document.rootElementIds = ['hero.section', 'hero.section', 'missing.section']

    const result = parseTemplateDocument(document)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.length).toBeGreaterThan(1)
    expect(result.issues[0]?.path).toBeDefined()
  })
})

import { elementId, documentId, type ElementId } from './ids'
import type { ElementOverrides, ElementType, TemplateElement } from './element'
import type { EditableProperties } from './properties'
import { parseTemplateDocument, SCHEMA_VERSION, type TemplateDocument } from './document'

/**
 * Shared authoring surface for the built-in template fixtures.
 *
 * Every catalog template is written as a flat list of seeds and compiled into
 * a canonical document through the same runtime validation the editor applies
 * to untrusted input. A structural mistake in a fixture therefore fails loudly
 * at construction, never silently at render time.
 */

export interface ElementSeed {
  readonly id: string
  readonly type: ElementType
  readonly parentId: string | null
  readonly childIds?: readonly string[]
  readonly base: EditableProperties
  readonly overrides?: ElementOverrides
}

function toElement(seed: ElementSeed): TemplateElement {
  return {
    id: elementId(seed.id),
    type: seed.type,
    parentId: seed.parentId === null ? null : elementId(seed.parentId),
    childIds: (seed.childIds ?? []).map(elementId),
    base: seed.base,
    overrides: seed.overrides ?? {},
    revision: 0,
  }
}

/**
 * Builds a fresh, fully validated document from seeds. Every call returns an
 * independent deep copy; nothing is shared between invocations.
 */
export function buildTemplateDocument(options: {
  readonly documentId: string
  readonly rootElementIds: readonly string[]
  readonly seeds: readonly ElementSeed[]
}): TemplateDocument {
  const elements: Record<ElementId, TemplateElement> = {}
  for (const seed of options.seeds) {
    elements[elementId(seed.id)] = toElement(seed)
  }

  const result = parseTemplateDocument({
    id: documentId(options.documentId),
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    rootElementIds: options.rootElementIds.map(elementId),
    elements,
    history: {},
  })

  if (!result.ok) {
    // A failure here is a programming error in a fixture, not user input.
    throw new Error(
      `Template fixture "${options.documentId}" is invalid: ${result.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`,
    )
  }
  return result.value
}

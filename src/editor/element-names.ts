import type { ElementType } from '../model/element'
import type { ElementId } from '../model/ids'
import type { EditableProperties } from '../model/properties'

/**
 * Readable element names.
 *
 * Selection UI must show something a human can recognise, but the stable ID
 * stays the identity: the name is derived from canonical data for display and
 * is never used to find, match, or address an element.
 */

export const ELEMENT_TYPE_LABELS: Readonly<Record<ElementType, string>> = {
  section: 'Section',
  container: 'Container',
  card: 'Card',
  heading: 'Heading',
  text: 'Text',
  badge: 'Badge',
  button: 'Button',
  image: 'Image',
}

const MAX_NAME_LENGTH = 40

/** Structural minimum a describable element must provide. */
export interface DescribableElement {
  readonly id: ElementId
  readonly type: ElementType
  readonly properties: EditableProperties
}

export interface ElementDescriptor {
  readonly id: ElementId
  readonly typeLabel: string
  /** Short human name, e.g. `Build faster with Aster Labs`. */
  readonly name: string
  /** Name shown to assistive technology, e.g. `Heading: Build faster ...`. */
  readonly accessibleName: string
}

function truncate(value: string): string {
  const collapsed = value.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= MAX_NAME_LENGTH) return collapsed
  return `${collapsed.slice(0, MAX_NAME_LENGTH - 1).trimEnd()}…`
}

/** `features.grid` -> `Grid`; used only when an element carries no text. */
function humanizeId(id: ElementId): string {
  const lastSegment = id.split('.').at(-1) ?? id
  const words = lastSegment.split('-').filter((word) => word.length > 0)
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function describeElement(element: DescribableElement): ElementDescriptor {
  const content = element.properties.content
  const typeLabel = ELEMENT_TYPE_LABELS[element.type]

  const source =
    content?.text ?? content?.accessibleLabel ?? content?.imageAlt ?? undefined
  const name =
    source === undefined || source.trim().length === 0
      ? humanizeId(element.id)
      : truncate(source)

  return { id: element.id, typeLabel, name, accessibleName: `${typeLabel}: ${name}` }
}

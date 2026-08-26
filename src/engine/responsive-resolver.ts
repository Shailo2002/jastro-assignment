import type { TemplateElement } from '../model/element'
import type { ElementId } from '../model/ids'
import type { TemplateDocument } from '../model/document'
import type {
  EditableProperties,
  EditablePropertyPatch,
  SpacingProperties,
} from '../model/properties'
import { VIEWPORTS, type Viewport } from '../model/viewport'

/**
 * Responsive resolution.
 *
 * Resolution order is exactly two layers, and never more:
 *
 *     resolved = merge(element.base, element.overrides[viewport])
 *
 * One viewport's override is never consulted while resolving another viewport,
 * so there is no desktop -> tablet -> mobile cascade. A shared (`base`) edit is
 * therefore visible in every viewport that does not override that specific
 * field, and an override wins only for the fields it actually names.
 *
 * Merge semantics:
 * - Property groups (`content`, `typography`, ...) merge field by field.
 * - `spacing.padding` and `spacing.margin` merge one level deeper, so an
 *   override of `padding.top` preserves the base `right`/`bottom`/`left`.
 * - Dimensions (`{value, unit}`) and any array value are atomic: an override
 *   replaces them wholesale rather than blending halves of two values.
 * - Presence is decided by `!== undefined`, never by truthiness, so `0`,
 *   `''`, and `false` are real values that survive resolution.
 * - An explicitly `undefined` field in an override means "not specified" and
 *   leaves the base value in place. Overrides remove fields by omitting them.
 *
 * Every function here is pure: inputs are never mutated and no state is read
 * from outside the arguments.
 */

/**
 * Copies an object without keys whose value is `undefined`, so spreading an
 * override can never erase a base value that the override did not name.
 */
function definedOnly<T extends object>(value: T): T {
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined)
  // Safe by construction: the entries are a subset of `value`'s own entries,
  // and every property of `T` is optional in the editable-property schema.
  return Object.fromEntries(entries) as T
}

/** Field-by-field overlay for a flat property group. */
function overlayFlat<T extends object>(
  base: T | undefined,
  override: T | undefined,
): T | undefined {
  if (base === undefined) {
    return override === undefined ? undefined : definedOnly(override)
  }
  if (override === undefined) {
    return definedOnly(base)
  }
  return { ...definedOnly(base), ...definedOnly(override) }
}

/** Spacing needs one extra level so a partial box edit keeps its siblings. */
function overlaySpacing(
  base: SpacingProperties | undefined,
  override: SpacingProperties | undefined,
): SpacingProperties | undefined {
  const flat = overlayFlat(base, override)
  if (flat === undefined) return undefined

  const merged: SpacingProperties = { ...flat }

  const padding = overlayFlat(base?.padding, override?.padding)
  if (padding !== undefined) merged.padding = padding

  const margin = overlayFlat(base?.margin, override?.margin)
  if (margin !== undefined) merged.margin = margin

  return merged
}

/**
 * Merges a base property set with one override patch. Neither input is
 * mutated and the result shares no mutable object with either input.
 */
export function mergeEditableProperties(
  base: EditableProperties,
  override: EditablePropertyPatch | undefined,
): EditableProperties {
  const merged: EditableProperties = {}

  const content = overlayFlat(base.content, override?.content)
  if (content !== undefined) merged.content = content

  const typography = overlayFlat(base.typography, override?.typography)
  if (typography !== undefined) merged.typography = typography

  const surface = overlayFlat(base.surface, override?.surface)
  if (surface !== undefined) merged.surface = surface

  const spacing = overlaySpacing(base.spacing, override?.spacing)
  if (spacing !== undefined) merged.spacing = spacing

  const size = overlayFlat(base.size, override?.size)
  if (size !== undefined) merged.size = size

  const layout = overlayFlat(base.layout, override?.layout)
  if (layout !== undefined) merged.layout = layout

  return merged
}

/** Resolved projection of one element for one viewport. */
export interface ResolvedElement {
  readonly id: ElementId
  readonly type: TemplateElement['type']
  readonly parentId: ElementId | null
  readonly childIds: readonly ElementId[]
  readonly viewport: Viewport
  readonly properties: EditableProperties
}

/** Resolved projection of the whole document for one viewport. */
export interface ResolvedDocument {
  readonly viewport: Viewport
  readonly rootElementIds: readonly ElementId[]
  readonly elements: Readonly<Record<ElementId, ResolvedElement>>
}

/** Base plus only the requested viewport's override. */
export function resolveElementProperties(
  element: TemplateElement,
  viewport: Viewport,
): EditableProperties {
  return mergeEditableProperties(element.base, element.overrides[viewport])
}

export function resolveElement(
  element: TemplateElement,
  viewport: Viewport,
): ResolvedElement {
  return {
    id: element.id,
    type: element.type,
    parentId: element.parentId,
    childIds: [...element.childIds],
    viewport,
    properties: resolveElementProperties(element, viewport),
  }
}

export function resolveDocument(
  document: TemplateDocument,
  viewport: Viewport,
): ResolvedDocument {
  const elements: Record<ElementId, ResolvedElement> = {}
  for (const element of Object.values(document.elements)) {
    elements[element.id] = resolveElement(element, viewport)
  }

  return {
    viewport,
    rootElementIds: [...document.rootElementIds],
    elements,
  }
}

/**
 * Convenience for tests and the scope indicator: every viewport resolved from
 * the same element, so isolation can be asserted in one comparison.
 */
export function resolveAllViewports(
  element: TemplateElement,
): Readonly<Record<Viewport, EditableProperties>> {
  return {
    desktop: resolveElementProperties(element, 'desktop'),
    tablet: resolveElementProperties(element, 'tablet'),
    mobile: resolveElementProperties(element, 'mobile'),
  }
}

/** True when the element defines an override for that viewport. */
export function hasViewportOverride(
  element: TemplateElement,
  viewport: Viewport,
): boolean {
  return element.overrides[viewport] !== undefined
}

/** Viewports that currently carry an override, in canonical order. */
export function overriddenViewports(element: TemplateElement): readonly Viewport[] {
  return VIEWPORTS.filter((viewport) => hasViewportOverride(element, viewport))
}

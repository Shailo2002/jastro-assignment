import type { TemplateElement } from '../model/element'
import type { ElementType } from '../model/element'
import {
  DIMENSION_UNITS,
  FONT_WEIGHTS,
  SHADOW_LEVELS,
  TEXT_ALIGNMENTS,
  type Dimension,
  type DimensionUnit,
  type EditableProperties,
  type EditablePropertyPatch,
} from '../model/properties'
import type { EditScope } from '../model/viewport'

/**
 * The inspector's field model.
 *
 * Fields are data, not markup: each one names a dotted path inside the
 * editable-property schema, so a control can be rendered, read, and turned into
 * a patch without any component knowing the shape of the document. Nothing here
 * validates ranges - that stays the schema's job at commit time, so the
 * inspector and the code surface are held to exactly the same limits.
 */

export const INSPECTOR_SECTIONS = [
  'content',
  'typography',
  'surface',
  'spacing',
  'size',
  'order',
] as const
export type InspectorSectionId = (typeof INSPECTOR_SECTIONS)[number]

export const INSPECTOR_SECTION_LABELS: Readonly<Record<InspectorSectionId, string>> = {
  content: 'Content',
  typography: 'Typography',
  surface: 'Colour and surface',
  spacing: 'Spacing',
  size: 'Size',
  order: 'Order',
}

export type FieldKind = 'text' | 'multiline' | 'number' | 'select' | 'color' | 'dimension'

export interface SelectOption {
  readonly value: string
  readonly label: string
}

export interface InspectorField {
  /** Dotted path, also used as the DOM id: `typography.fontSize`. */
  readonly id: string
  readonly label: string
  readonly kind: FieldKind
  readonly section: InspectorSectionId
  readonly path: readonly string[]
  readonly appliesTo: readonly ElementType[]
  readonly unit?: string
  readonly options?: readonly SelectOption[]
  readonly numeric?: boolean
  readonly min?: number
  readonly max?: number
  readonly step?: number
  readonly help?: string
}

const TEXTUAL: readonly ElementType[] = ['heading', 'text', 'badge', 'button']
const BOXES: readonly ElementType[] = ['section', 'container', 'card']
const ALL_TYPES: readonly ElementType[] = [
  'section',
  'container',
  'card',
  'heading',
  'text',
  'badge',
  'button',
  'image',
]

function options(values: readonly (string | number)[]): readonly SelectOption[] {
  return values.map((value) => ({ value: String(value), label: String(value) }))
}

const PADDING_SIDES = ['top', 'right', 'bottom', 'left'] as const

const PADDING_FIELDS: readonly InspectorField[] = PADDING_SIDES.map((side) => ({
  id: `spacing.padding.${side}`,
  label: `Padding ${side}`,
  kind: 'number' as const,
  section: 'spacing' as const,
  path: ['spacing', 'padding', side],
  appliesTo: ALL_TYPES,
  unit: 'px',
  min: -512,
  max: 512,
  step: 1,
}))

export const INSPECTOR_FIELDS: readonly InspectorField[] = [
  {
    id: 'content.text',
    label: 'Text',
    kind: 'multiline',
    section: 'content',
    path: ['content', 'text'],
    appliesTo: TEXTUAL,
  },
  {
    id: 'content.href',
    label: 'Link',
    kind: 'text',
    section: 'content',
    path: ['content', 'href'],
    appliesTo: ['button'],
    help: 'Relative path, #anchor, or https URL.',
  },
  {
    id: 'content.imageAlt',
    label: 'Alternative text',
    kind: 'text',
    section: 'content',
    path: ['content', 'imageAlt'],
    appliesTo: ['image'],
    help: 'Describes the image for screen readers.',
  },
  {
    id: 'content.accessibleLabel',
    label: 'Accessible label',
    kind: 'text',
    section: 'content',
    path: ['content', 'accessibleLabel'],
    appliesTo: ['button', 'section'],
  },
  {
    id: 'typography.fontSize',
    label: 'Font size',
    kind: 'number',
    section: 'typography',
    path: ['typography', 'fontSize'],
    appliesTo: TEXTUAL,
    unit: 'px',
    min: 8,
    max: 200,
    step: 1,
  },
  {
    id: 'typography.fontWeight',
    label: 'Font weight',
    kind: 'select',
    section: 'typography',
    path: ['typography', 'fontWeight'],
    appliesTo: TEXTUAL,
    numeric: true,
    options: options(FONT_WEIGHTS),
  },
  {
    id: 'typography.textAlign',
    label: 'Text align',
    kind: 'select',
    section: 'typography',
    path: ['typography', 'textAlign'],
    appliesTo: [...TEXTUAL, ...BOXES],
    options: options(TEXT_ALIGNMENTS),
  },
  {
    id: 'typography.color',
    label: 'Text colour',
    kind: 'color',
    section: 'typography',
    path: ['typography', 'color'],
    appliesTo: TEXTUAL,
  },
  {
    id: 'surface.background',
    label: 'Background',
    kind: 'color',
    section: 'surface',
    path: ['surface', 'background'],
    appliesTo: [...BOXES, 'badge', 'button'],
  },
  {
    id: 'surface.borderRadius',
    label: 'Corner radius',
    kind: 'number',
    section: 'surface',
    path: ['surface', 'borderRadius'],
    appliesTo: ALL_TYPES,
    unit: 'px',
    min: 0,
    max: 999,
    step: 1,
  },
  {
    id: 'surface.shadow',
    label: 'Shadow',
    kind: 'select',
    section: 'surface',
    path: ['surface', 'shadow'],
    appliesTo: [...BOXES, 'image'],
    options: options(SHADOW_LEVELS),
  },
  ...PADDING_FIELDS,
  {
    id: 'spacing.gap',
    label: 'Gap between children',
    kind: 'number',
    section: 'spacing',
    path: ['spacing', 'gap'],
    appliesTo: BOXES,
    unit: 'px',
    min: 0,
    max: 256,
    step: 1,
  },
  {
    id: 'size.width',
    label: 'Width',
    kind: 'dimension',
    section: 'size',
    path: ['size', 'width'],
    appliesTo: ALL_TYPES,
  },
  {
    id: 'size.maxWidth',
    label: 'Maximum width',
    kind: 'dimension',
    section: 'size',
    path: ['size', 'maxWidth'],
    appliesTo: ALL_TYPES,
  },
]

/**
 * Fields offered for a selection.
 *
 * A field is offered only when it applies to EVERY selected type, so a
 * multi-selection can never commit a property one of its targets does not
 * support.
 */
export function fieldsForTypes(types: readonly ElementType[]): readonly InspectorField[] {
  if (types.length === 0) return []
  return INSPECTOR_FIELDS.filter((field) =>
    types.every((type) => field.appliesTo.includes(type)),
  )
}

export function sectionsForFields(
  fields: readonly InspectorField[],
): readonly InspectorSectionId[] {
  return INSPECTOR_SECTIONS.filter((section) =>
    fields.some((field) => field.section === section),
  )
}

/* -------------------------------------------------------------------------- */
/* Reading values                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A value a control can hold. `'auto'` is covered by `string`, so the object
 * form of `Dimension` is the only part that has to be named separately.
 */
export type DimensionValue = Exclude<Dimension, string>
export type FieldValue = string | number | DimensionValue

function getAtPath(source: EditableProperties, path: readonly string[]): unknown {
  let current: unknown = source
  for (const segment of path) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export interface FieldReading {
  readonly state: 'empty' | 'value' | 'mixed'
  readonly value: FieldValue | undefined
  /** True when the current viewport scope already names this field. */
  readonly overridden: boolean
}

/** One selected element, with the properties the current scope shows. */
export interface EditTarget {
  readonly element: TemplateElement
  /** Base for scope `all`; base merged with the override for a viewport. */
  readonly displayed: EditableProperties
}

/**
 * Reads one field across the whole selection.
 *
 * Differing values report `mixed` rather than a fabricated shared value, so the
 * inspector can never imply that two elements agree when they do not.
 */
export function readField(
  targets: readonly EditTarget[],
  field: InspectorField,
  scope: EditScope,
): FieldReading {
  if (targets.length === 0) return { state: 'empty', value: undefined, overridden: false }

  const values = targets.map((target) => getAtPath(target.displayed, field.path))
  const first = values[0]
  const allEqual = values.every((value) => JSON.stringify(value) === JSON.stringify(first))

  const overridden =
    scope !== 'all' &&
    targets.every(
      (target) => getAtPath(target.element.overrides[scope] ?? {}, field.path) !== undefined,
    )

  if (!allEqual) return { state: 'mixed', value: undefined, overridden }
  if (first === undefined) return { state: 'empty', value: undefined, overridden }
  return { state: 'value', value: first as FieldValue, overridden }
}

/* -------------------------------------------------------------------------- */
/* Writing values                                                              */
/* -------------------------------------------------------------------------- */

/** Builds the minimal nested patch that sets one field. */
export function patchForField(
  field: InspectorField,
  value: FieldValue,
): EditablePropertyPatch {
  const [first, ...rest] = field.path
  if (first === undefined) return {}

  let nested: unknown = value
  for (const segment of [...rest].reverse()) {
    nested = { [segment]: nested }
  }
  // The path comes from a field definition, so the shape matches the schema;
  // the commit pipeline re-validates it either way.
  const patch: Record<string, unknown> = { [first]: nested }
  return patch
}

export type FieldInput =
  | { readonly ok: true; readonly value: FieldValue }
  | { readonly ok: false; readonly message: string }
  /** The control was cleared: nothing to commit, and nothing is changed. */
  | { readonly ok: false; readonly message: undefined }

export function isDimension(value: unknown): value is Dimension {
  if (value === 'auto') return true
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { value?: unknown }).value === 'number' &&
    typeof (value as { unit?: unknown }).unit === 'string'
  )
}

export function isDimensionUnit(value: string): value is DimensionUnit {
  return (DIMENSION_UNITS as readonly string[]).includes(value)
}

/**
 * Turns raw control input into a field value.
 *
 * Only shape problems are reported here (`"wide"` is not a number). Range and
 * format rules stay in the schema so every surface is held to the same limits.
 */
export function parseFieldInput(field: InspectorField, raw: string): FieldInput {
  const trimmed = raw.trim()

  if (field.kind === 'number' || (field.kind === 'select' && field.numeric === true)) {
    if (trimmed.length === 0) return { ok: false, message: undefined }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      return { ok: false, message: `${field.label} must be a number.` }
    }
    return { ok: true, value: parsed }
  }

  if (field.kind === 'dimension') {
    if (trimmed.length === 0) return { ok: false, message: undefined }
    if (trimmed === 'auto') return { ok: true, value: 'auto' }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      return { ok: false, message: `${field.label} must be a number or "auto".` }
    }
    return { ok: true, value: parsed }
  }

  // Text-like fields keep their whitespace; only a blank colour is meaningless.
  if (field.kind === 'color' && trimmed.length === 0) {
    return { ok: false, message: undefined }
  }
  return { ok: true, value: raw }
}

/** Combines a dimension's number and unit controls into one stored value. */
export function composeDimension(value: number | 'auto', unit: DimensionUnit): Dimension {
  if (value === 'auto') return 'auto'
  return { value, unit }
}

export function dimensionParts(value: FieldValue | undefined): {
  readonly amount: string
  readonly unit: DimensionUnit
} {
  if (value === 'auto') return { amount: 'auto', unit: 'px' }
  if (isDimension(value) && value !== 'auto') {
    return { amount: String(value.value), unit: value.unit }
  }
  return { amount: '', unit: 'px' }
}

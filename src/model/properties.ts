import { z } from 'zod'

/**
 * The editable property boundary.
 *
 * This is a constrained schema, not arbitrary CSS. Every object is strict, so
 * any key outside this file — including identity and history fields such as
 * `id`, `parentId`, `childIds`, `revision`, `schemaVersion` — is rejected at
 * runtime rather than silently written into the document.
 *
 * Every group and every field is optional, which makes `EditableProperties`
 * its own deep-partial. A viewport override therefore uses exactly the same
 * schema as a base value, and so does an edit patch.
 */

export const EDITABLE_PROPERTY_GROUPS = [
  'content',
  'typography',
  'surface',
  'spacing',
  'size',
  'layout',
] as const
export type EditablePropertyGroup = (typeof EDITABLE_PROPERTY_GROUPS)[number]

/** Never accepted inside a property patch. Documented for command validation. */
export const FORBIDDEN_PROPERTY_KEYS = [
  'id',
  'parentId',
  'childIds',
  'revision',
  'schemaVersion',
  'history',
  'type',
  'overrides',
  'base',
] as const
export type ForbiddenPropertyKey = (typeof FORBIDDEN_PROPERTY_KEYS)[number]

export function isEditablePropertyGroup(
  value: unknown,
): value is EditablePropertyGroup {
  return (
    typeof value === 'string' &&
    (EDITABLE_PROPERTY_GROUPS as readonly string[]).includes(value)
  )
}

/* -------------------------------------------------------------------------- */
/* Value primitives                                                            */
/* -------------------------------------------------------------------------- */

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const CSS_VARIABLE_PATTERN = /^var\(--[a-z0-9-]+\)$/
/** Relative paths, in-page anchors, and https only. Blocks `javascript:`. */
const SAFE_URL_PATTERN = /^(?:https:\/\/[^\s]+|\/[^\s]*|#[^\s]*)$/

export const colorValueSchema = z
  .string()
  .refine(
    (value) =>
      value === 'transparent' ||
      HEX_COLOR_PATTERN.test(value) ||
      CSS_VARIABLE_PATTERN.test(value),
    {
      error:
        'Colors must be a hex value, `transparent`, or a design token such as `var(--action-primary)`.',
    },
  )
export type ColorValue = z.infer<typeof colorValueSchema>

export const safeUrlSchema = z
  .string()
  .max(2048)
  .refine((value) => SAFE_URL_PATTERN.test(value), {
    error: 'Links must be relative, an in-page anchor, or an https URL.',
  })

export const DIMENSION_UNITS = ['px', '%', 'rem'] as const
export type DimensionUnit = (typeof DIMENSION_UNITS)[number]

export const dimensionSchema = z.union([
  z.literal('auto'),
  z.strictObject({
    value: z.number().finite().min(-4000).max(4000),
    unit: z.enum(DIMENSION_UNITS),
  }),
])
export type Dimension = z.infer<typeof dimensionSchema>

const spacingLength = z.number().finite().min(-512).max(512)

export const boxSpacingSchema = z.strictObject({
  top: spacingLength.optional(),
  right: spacingLength.optional(),
  bottom: spacingLength.optional(),
  left: spacingLength.optional(),
})
export type BoxSpacing = z.infer<typeof boxSpacingSchema>

/* -------------------------------------------------------------------------- */
/* Property groups                                                             */
/* -------------------------------------------------------------------------- */

export const contentPropertiesSchema = z.strictObject({
  text: z.string().max(2000).optional(),
  accessibleLabel: z.string().max(300).optional(),
  href: safeUrlSchema.optional(),
  imageSrc: safeUrlSchema.optional(),
  imageAlt: z.string().max(300).optional(),
})
export type ContentProperties = z.infer<typeof contentPropertiesSchema>

export const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800] as const
export const TEXT_ALIGNMENTS = ['left', 'center', 'right'] as const
export const TEXT_TRANSFORMS = ['none', 'uppercase'] as const

export const typographyPropertiesSchema = z.strictObject({
  fontSize: z.number().finite().min(8).max(200).optional(),
  fontWeight: z.union(FONT_WEIGHTS.map((weight) => z.literal(weight))).optional(),
  lineHeight: z.number().finite().min(0.8).max(3).optional(),
  letterSpacing: z.number().finite().min(-4).max(16).optional(),
  textAlign: z.enum(TEXT_ALIGNMENTS).optional(),
  textTransform: z.enum(TEXT_TRANSFORMS).optional(),
  color: colorValueSchema.optional(),
})
export type TypographyProperties = z.infer<typeof typographyPropertiesSchema>

export const SHADOW_LEVELS = ['none', 'soft', 'glow'] as const

export const surfacePropertiesSchema = z.strictObject({
  background: colorValueSchema.optional(),
  borderColor: colorValueSchema.optional(),
  borderWidth: z.number().finite().min(0).max(24).optional(),
  borderRadius: z.number().finite().min(0).max(999).optional(),
  opacity: z.number().finite().min(0).max(1).optional(),
  shadow: z.enum(SHADOW_LEVELS).optional(),
})
export type SurfaceProperties = z.infer<typeof surfacePropertiesSchema>

export const spacingPropertiesSchema = z.strictObject({
  padding: boxSpacingSchema.optional(),
  margin: boxSpacingSchema.optional(),
  gap: z.number().finite().min(0).max(256).optional(),
})
export type SpacingProperties = z.infer<typeof spacingPropertiesSchema>

export const sizePropertiesSchema = z.strictObject({
  width: dimensionSchema.optional(),
  height: dimensionSchema.optional(),
  minWidth: dimensionSchema.optional(),
  maxWidth: dimensionSchema.optional(),
  minHeight: dimensionSchema.optional(),
  maxHeight: dimensionSchema.optional(),
})
export type SizeProperties = z.infer<typeof sizePropertiesSchema>

export const DISPLAY_MODES = ['block', 'flex', 'grid'] as const
export const FLEX_DIRECTIONS = ['row', 'column'] as const
export const ALIGNMENTS = ['start', 'center', 'end', 'stretch'] as const
export const JUSTIFICATIONS = [
  'start',
  'center',
  'end',
  'space-between',
] as const

export const layoutPropertiesSchema = z.strictObject({
  display: z.enum(DISPLAY_MODES).optional(),
  flexDirection: z.enum(FLEX_DIRECTIONS).optional(),
  alignItems: z.enum(ALIGNMENTS).optional(),
  justifyContent: z.enum(JUSTIFICATIONS).optional(),
  gridColumns: z.number().int().min(1).max(6).optional(),
  /**
   * Visual order among siblings, as CSS `order`.
   *
   * Reordering is expressed as a property rather than as a rewrite of the
   * parent's `childIds`, so it travels through the ordinary edit pipeline: it
   * is validated, versioned, restorable, and scopeable per viewport, and the
   * document tree it describes stays structurally untouched.
   */
  order: z.number().int().min(-50).max(50).optional(),
  /** Bounded translation keeps "move" edits inside a safe range. */
  translateX: z.number().finite().min(-200).max(200).optional(),
  translateY: z.number().finite().min(-200).max(200).optional(),
})
export type LayoutProperties = z.infer<typeof layoutPropertiesSchema>

/* -------------------------------------------------------------------------- */
/* Editable properties                                                         */
/* -------------------------------------------------------------------------- */

export const editablePropertiesSchema = z.strictObject({
  content: contentPropertiesSchema.optional(),
  typography: typographyPropertiesSchema.optional(),
  surface: surfacePropertiesSchema.optional(),
  spacing: spacingPropertiesSchema.optional(),
  size: sizePropertiesSchema.optional(),
  layout: layoutPropertiesSchema.optional(),
})
export type EditableProperties = z.infer<typeof editablePropertiesSchema>

/**
 * A viewport override or an edit patch. Structurally identical to
 * `EditableProperties` because every field is already optional; the alias
 * exists so call sites state their intent.
 */
export const editablePropertyPatchSchema = editablePropertiesSchema
export type EditablePropertyPatch = EditableProperties

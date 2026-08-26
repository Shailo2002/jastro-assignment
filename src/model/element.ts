import { z } from 'zod'

import { elementIdSchema, type ElementId } from './ids'
import {
  editablePropertiesSchema,
  editablePropertyPatchSchema,
  type EditableProperties,
} from './properties'

/**
 * Element types the template renderer understands. Keeping this a closed set
 * is what allows structured JSON editing instead of compiling arbitrary JSX.
 */
export const ELEMENT_TYPES = [
  'section',
  'container',
  'card',
  'heading',
  'text',
  'badge',
  'button',
  'image',
] as const
export type ElementType = (typeof ELEMENT_TYPES)[number]

/** Types that must carry text, and types that must carry image content. */
export const TEXT_BEARING_ELEMENT_TYPES = [
  'heading',
  'text',
  'badge',
  'button',
] as const
export const IMAGE_ELEMENT_TYPES = ['image'] as const

function isTextBearing(type: ElementType): boolean {
  return (TEXT_BEARING_ELEMENT_TYPES as readonly ElementType[]).includes(type)
}

function isImageBearing(type: ElementType): boolean {
  return (IMAGE_ELEMENT_TYPES as readonly ElementType[]).includes(type)
}

export const elementTypeSchema = z.enum(ELEMENT_TYPES)

/**
 * All three override slots are representable; only known viewport keys are
 * accepted, so an override can never be written under an invented viewport.
 */
export const elementOverridesSchema = z.strictObject({
  desktop: editablePropertyPatchSchema.optional(),
  tablet: editablePropertyPatchSchema.optional(),
  mobile: editablePropertyPatchSchema.optional(),
})
export type ElementOverrides = z.infer<typeof elementOverridesSchema>

export interface TemplateElement {
  readonly id: ElementId
  readonly type: ElementType
  readonly parentId: ElementId | null
  readonly childIds: readonly ElementId[]
  readonly base: EditableProperties
  readonly overrides: ElementOverrides
  readonly revision: number
}

export const templateElementSchema = z
  .strictObject({
    id: elementIdSchema,
    type: elementTypeSchema,
    parentId: elementIdSchema.nullable(),
    childIds: z.array(elementIdSchema).max(200),
    base: editablePropertiesSchema,
    overrides: elementOverridesSchema,
    revision: z.number().int().min(0),
  })
  .superRefine((element, ctx) => {
    if (new Set(element.childIds).size !== element.childIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['childIds'],
        message: `Element "${element.id}" lists a duplicate child id.`,
      })
    }

    if (element.childIds.includes(element.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['childIds'],
        message: `Element "${element.id}" cannot be its own child.`,
      })
    }

    if (element.parentId === element.id) {
      ctx.addIssue({
        code: 'custom',
        path: ['parentId'],
        message: `Element "${element.id}" cannot be its own parent.`,
      })
    }

    if (isTextBearing(element.type) && typeof element.base.content?.text !== 'string') {
      ctx.addIssue({
        code: 'custom',
        path: ['base', 'content', 'text'],
        message: `Element "${element.id}" of type "${element.type}" must define base content text.`,
      })
    }

    if (isImageBearing(element.type)) {
      if (typeof element.base.content?.imageSrc !== 'string') {
        ctx.addIssue({
          code: 'custom',
          path: ['base', 'content', 'imageSrc'],
          message: `Image element "${element.id}" must define an image source.`,
        })
      }
      if (typeof element.base.content?.imageAlt !== 'string') {
        ctx.addIssue({
          code: 'custom',
          path: ['base', 'content', 'imageAlt'],
          message: `Image element "${element.id}" must define alternative text.`,
        })
      }
    }
  })

import { z } from 'zod'

import { elementIdSchema, revisionEntryIdSchema, type ElementId, type RevisionEntryId } from './ids'
import { editablePropertyPatchSchema, type EditablePropertyPatch } from './properties'
import { editScopeSchema, type EditScope } from './viewport'

/**
 * Every durable change reaches the document through one of these surfaces, and
 * each one records history the same way.
 */
export const EDIT_SOURCES = ['canvas', 'code', 'ai', 'restore'] as const
export type EditSource = (typeof EDIT_SOURCES)[number]

export const editSourceSchema = z.enum(EDIT_SOURCES)

export const isoDateTimeSchema = z.iso.datetime()

/**
 * One element-and-scope-scoped history entry. History is never a whole-document
 * snapshot, which is what makes independent per-element restore possible.
 */
export interface ElementRevision {
  readonly id: RevisionEntryId
  readonly elementId: ElementId
  readonly scope: EditScope
  readonly source: EditSource
  readonly documentRevision: number
  readonly before: EditablePropertyPatch
  readonly after: EditablePropertyPatch
  /** Dotted property paths this commit changed, e.g. `typography.fontSize`. */
  readonly changedPaths: readonly string[]
  readonly createdAt: string
}

export const elementRevisionSchema = z.strictObject({
  id: revisionEntryIdSchema,
  elementId: elementIdSchema,
  scope: editScopeSchema,
  source: editSourceSchema,
  documentRevision: z.number().int().min(0),
  before: editablePropertyPatchSchema,
  after: editablePropertyPatchSchema,
  changedPaths: z.array(z.string().max(200)).max(200),
  createdAt: isoDateTimeSchema,
})

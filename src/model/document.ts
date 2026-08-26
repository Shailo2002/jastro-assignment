import { z } from 'zod'

import { documentIdSchema, elementIdSchema, type DocumentId, type ElementId } from './ids'
import { elementRevisionSchema, type ElementRevision } from './history'
import { templateElementSchema, type TemplateElement } from './element'

/**
 * The canonical document.
 *
 * It must stay JSON-serializable: no DOM nodes, React elements, functions,
 * `Set`, `Map`, class instances, or cycles are ever stored here.
 */

/** Bump only with a migration; persisted data is validated against this. */
export const SCHEMA_VERSION = 1

export interface TemplateDocument {
  readonly id: DocumentId
  readonly schemaVersion: number
  readonly revision: number
  readonly rootElementIds: readonly ElementId[]
  readonly elements: Readonly<Record<ElementId, TemplateElement>>
  readonly history: Readonly<Record<ElementId, readonly ElementRevision[]>>
}

/** Structural shape only. Referential integrity is checked separately. */
const templateDocumentShapeSchema = z.strictObject({
  id: documentIdSchema,
  schemaVersion: z.number().int().min(1),
  revision: z.number().int().min(0),
  rootElementIds: z.array(elementIdSchema).min(1).max(200),
  elements: z.record(elementIdSchema, templateElementSchema),
  history: z.record(elementIdSchema, z.array(elementRevisionSchema).max(500)),
})

/* -------------------------------------------------------------------------- */
/* Referential integrity                                                       */
/* -------------------------------------------------------------------------- */

export interface IntegrityIssue {
  readonly path: readonly (string | number)[]
  readonly message: string
}

type ShapeDocument = z.infer<typeof templateDocumentShapeSchema>
type ShapeElement = z.infer<typeof templateElementSchema>

/**
 * Verifies that ids, parent links, child links, roots, reachability, and
 * history keys all agree. Returns every problem found rather than the first,
 * so a rejected edit can explain itself.
 */
export function collectIntegrityIssues(document: ShapeDocument): IntegrityIssue[] {
  const issues: IntegrityIssue[] = []
  // Keyed by plain string so lookups stay total and no branded cast is needed.
  const elementsById = new Map<string, ShapeElement>(Object.entries(document.elements))
  const entries = [...elementsById.entries()]
  const knownIds = new Set(elementsById.keys())

  const add = (path: readonly (string | number)[], message: string): void => {
    issues.push({ path, message })
  }

  for (const [key, element] of entries) {
    if (key !== element.id) {
      add(['elements', key, 'id'], `Element stored under "${key}" declares id "${element.id}".`)
    }

    if (element.parentId !== null && !knownIds.has(element.parentId)) {
      add(['elements', key, 'parentId'], `Element "${key}" references unknown parent "${element.parentId}".`)
    }

    for (const [index, childId] of element.childIds.entries()) {
      if (!knownIds.has(childId)) {
        add(['elements', key, 'childIds', index], `Element "${key}" references unknown child "${childId}".`)
        continue
      }
      const child = elementsById.get(childId)
      if (child && child.parentId !== element.id) {
        add(
          ['elements', key, 'childIds', index],
          `Child "${childId}" does not point back to parent "${key}".`,
        )
      }
    }
  }

  // Exactly one parent per element, derived from child lists.
  const claimedBy = new Map<string, string[]>()
  for (const [key, element] of entries) {
    for (const childId of element.childIds) {
      const claimants = claimedBy.get(childId) ?? []
      claimants.push(key)
      claimedBy.set(childId, claimants)
    }
  }
  for (const [childId, claimants] of claimedBy) {
    if (claimants.length > 1) {
      add(['elements', childId], `Element "${childId}" is claimed as a child by ${claimants.length} parents.`)
    }
  }

  // Roots.
  const seenRoots = new Set<string>()
  for (const [index, rootId] of document.rootElementIds.entries()) {
    if (seenRoots.has(rootId)) {
      add(['rootElementIds', index], `Duplicate root element id "${rootId}".`)
    }
    seenRoots.add(rootId)

    const root = elementsById.get(rootId)
    if (!root) {
      add(['rootElementIds', index], `Unknown root element id "${rootId}".`)
      continue
    }
    if (root.parentId !== null) {
      add(['rootElementIds', index], `Root element "${rootId}" must have a null parentId.`)
    }
  }

  for (const [key, element] of entries) {
    if (element.parentId === null && !seenRoots.has(key)) {
      add(['elements', key], `Element "${key}" has no parent but is not listed in rootElementIds.`)
    }
    if (element.parentId !== null && seenRoots.has(key)) {
      add(['elements', key], `Element "${key}" is listed as a root but declares a parent.`)
    }
  }

  // Reachability, which also rules out cycles among non-root elements.
  const reachable = new Set<string>()
  const queue: string[] = [...document.rootElementIds].filter((id) => knownIds.has(id))
  while (queue.length > 0) {
    const currentId = queue.pop()
    if (currentId === undefined || reachable.has(currentId)) continue
    reachable.add(currentId)
    const current = elementsById.get(currentId)
    if (!current) continue
    for (const childId of current.childIds) {
      if (!reachable.has(childId)) queue.push(childId)
    }
  }
  for (const key of knownIds) {
    if (!reachable.has(key)) {
      add(['elements', key], `Element "${key}" is not reachable from rootElementIds.`)
    }
  }

  // History keys.
  for (const [key, revisions] of Object.entries(document.history)) {
    if (!knownIds.has(key)) {
      add(['history', key], `History exists for unknown element "${key}".`)
    }
    for (const [index, revision] of revisions.entries()) {
      if (revision.elementId !== key) {
        add(
          ['history', key, index, 'elementId'],
          `History entry under "${key}" targets "${revision.elementId}".`,
        )
      }
      if (revision.documentRevision > document.revision) {
        add(
          ['history', key, index, 'documentRevision'],
          `History entry under "${key}" is newer than the document revision.`,
        )
      }
    }
  }

  return issues
}

export const templateDocumentSchema = templateDocumentShapeSchema.superRefine(
  (document, ctx) => {
    for (const issue of collectIntegrityIssues(document)) {
      ctx.addIssue({ code: 'custom', path: [...issue.path], message: issue.message })
    }
  },
)

/* -------------------------------------------------------------------------- */
/* Typed parse result                                                          */
/* -------------------------------------------------------------------------- */

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly IntegrityIssue[] }

function toIssues(error: z.ZodError): IntegrityIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map((segment) =>
      typeof segment === 'number' ? segment : String(segment),
    ),
    message: issue.message,
  }))
}

/**
 * The single validation entry point for untrusted document data (persisted
 * state, the code surface, imported JSON). Never throws; an invalid input
 * leaves the caller's current document untouched.
 */
export function parseTemplateDocument(input: unknown): ParseResult<TemplateDocument> {
  const result = templateDocumentSchema.safeParse(input)
  if (!result.success) {
    return { ok: false, issues: toIssues(result.error) }
  }
  return { ok: true, value: result.data }
}

export function isTemplateDocument(input: unknown): input is TemplateDocument {
  return templateDocumentSchema.safeParse(input).success
}

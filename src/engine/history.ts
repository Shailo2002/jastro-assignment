import type { TemplateDocument } from '../model/document'
import type { TemplateElement } from '../model/element'
import type { ElementRevision, EditSource } from '../model/history'
import { revisionEntryId, type ElementId, type RevisionEntryId } from '../model/ids'
import type { EditablePropertyPatch } from '../model/properties'
import type { EditScope } from '../model/viewport'

/**
 * Granular history.
 *
 * One entry is recorded per committed element AND scope. History is never a
 * whole-document snapshot, which is what lets a reviewer restore one element in
 * one viewport without disturbing anything else.
 *
 * An entry stores the full property set for that element/scope before and after
 * the commit, so it can both explain the change and reproduce the earlier state
 * on its own.
 */

/** The property set a commit with this scope reads from and writes to. */
export function captureScopeSnapshot(
  element: TemplateElement,
  scope: EditScope,
): EditablePropertyPatch {
  if (scope === 'all') return element.base
  return element.overrides[scope] ?? {}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Dotted paths whose value differs between two property sets. Used for the
 * "changed fields" summary in the history panel, and for nothing else.
 */
export function diffChangedPaths(
  before: EditablePropertyPatch,
  after: EditablePropertyPatch,
): string[] {
  const paths: string[] = []

  const walk = (left: unknown, right: unknown, path: string): void => {
    // A group present on one side only still reports its individual fields,
    // so "added `typography.fontSize`" is not flattened to "added `typography`".
    const leftIsBranch = isPlainObject(left) || left === undefined
    const rightIsBranch = isPlainObject(right) || right === undefined
    if (leftIsBranch && rightIsBranch && (left !== undefined || right !== undefined)) {
      const leftBranch = left ?? {}
      const rightBranch = right ?? {}
      const keys = new Set([...Object.keys(leftBranch), ...Object.keys(rightBranch)])
      for (const key of [...keys].sort()) {
        walk(leftBranch[key], rightBranch[key], path === '' ? key : `${path}.${key}`)
      }
      return
    }
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      paths.push(path)
    }
  }

  walk(before, after, '')
  return paths
}

/**
 * A revision entry id derived from the command that produced it, so history is
 * traceable and the engine still needs no random source.
 */
export function deriveRevisionEntryId(
  commandIdValue: string,
  elementIdValue: ElementId,
): RevisionEntryId {
  return revisionEntryId(`${commandIdValue}.${elementIdValue}`)
}

export function createElementRevision(input: {
  readonly id: RevisionEntryId
  readonly elementId: ElementId
  readonly scope: EditScope
  readonly source: EditSource
  readonly documentRevision: number
  readonly before: EditablePropertyPatch
  readonly after: EditablePropertyPatch
  readonly createdAt: string
}): ElementRevision {
  return {
    id: input.id,
    elementId: input.elementId,
    scope: input.scope,
    source: input.source,
    documentRevision: input.documentRevision,
    before: input.before,
    after: input.after,
    changedPaths: diffChangedPaths(input.before, input.after),
    createdAt: input.createdAt,
  }
}

/** Appends without ever rewriting or dropping an existing entry. */
export function appendElementRevision(
  history: TemplateDocument['history'],
  entry: ElementRevision,
): Record<ElementId, readonly ElementRevision[]> {
  const existing = history[entry.elementId] ?? []
  return { ...history, [entry.elementId]: [...existing, entry] }
}

/** Entries for one element, oldest first, optionally filtered by scope. */
export function listElementHistory(
  document: TemplateDocument,
  elementIdValue: ElementId,
  scope?: EditScope,
): readonly ElementRevision[] {
  const entries = document.history[elementIdValue] ?? []
  if (scope === undefined) return entries
  return entries.filter((entry) => entry.scope === scope)
}

export function findElementRevision(
  document: TemplateDocument,
  elementIdValue: ElementId,
  revisionIdValue: RevisionEntryId,
): ElementRevision | undefined {
  return listElementHistory(document, elementIdValue).find(
    (entry) => entry.id === revisionIdValue,
  )
}

/** Total entries across the document; used by tests and the history panel. */
export function countHistoryEntries(document: TemplateDocument): number {
  return Object.values(document.history).reduce((total, entries) => total + entries.length, 0)
}

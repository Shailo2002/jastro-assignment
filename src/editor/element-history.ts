import { captureScopeSnapshot, listElementHistory } from '../engine/history'
import type { TemplateDocument } from '../model/document'
import type { EditSource, ElementRevision } from '../model/history'
import type { ElementId } from '../model/ids'
import { EDIT_SCOPES, type EditScope } from '../model/viewport'
import { describeScopeLock, EDIT_SCOPE_LABELS, joinWithAnd } from './edit-scope'
import { describeElement } from './element-names'
import { describeProposalChanges } from './proposal-review'

/**
 * History description, as pure functions.
 *
 * Every entry belongs to one element AND one scope, because that pair is
 * exactly what a restore addresses. Two shapes are derived from that: the
 * per-element view, grouped by scope, and the rail's flat chronological
 * timeline, which is the same entries read as a transcript. Nothing here reads
 * or writes the document store: a view is derived from the current document on
 * every render, so an entry's restore preview always compares against live
 * values rather than against whatever was true when the panel was opened.
 *
 * Restoring an entry returns its element/scope to `entry.before`, the state
 * immediately before that commit. The preview therefore compares CURRENT values
 * with `entry.before`, not with `entry.after`: what a reviewer needs to see is
 * what the restore would change, not what the original commit changed.
 */

export const EDIT_SOURCE_LABELS: Readonly<Record<EditSource, string>> = {
  canvas: 'Manual edit',
  code: 'Code edit',
  ai: 'AI edit',
  restore: 'Restore',
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/**
 * `2026-08-26T10:00:00.000Z` -> `26 Aug 2026, 10:00 UTC`.
 *
 * Deliberately formatted in UTC from the stored instant rather than through
 * `toLocaleString`, so the same document reads the same way for every reviewer
 * and the string can be asserted in a test.
 */
export function formatRevisionTime(isoDateTime: string): string {
  const parsed = new Date(isoDateTime)
  const time = parsed.getTime()
  if (Number.isNaN(time)) return isoDateTime

  const day = parsed.getUTCDate()
  const month = MONTHS[parsed.getUTCMonth()] ?? ''
  const year = parsed.getUTCFullYear()
  const hours = String(parsed.getUTCHours()).padStart(2, '0')
  const minutes = String(parsed.getUTCMinutes()).padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${minutes} UTC`
}

/** One row of the restore preview: what this field is now, and would become. */
export interface RestorePreviewRow {
  /** Dotted path, e.g. `typography.fontSize`. */
  readonly path: string
  readonly current: string
  readonly restored: string
}

/**
 * Current values for the entry's element and scope, against the state the
 * entry would restore. An empty result means restoring would change nothing.
 */
export function describeRestorePreview(
  document: TemplateDocument,
  entry: ElementRevision,
): readonly RestorePreviewRow[] {
  const element = document.elements[entry.elementId]
  if (element === undefined) return []

  const current = captureScopeSnapshot(element, entry.scope)
  return describeProposalChanges(current, entry.before).map((change) => ({
    path: change.path,
    current: change.before,
    restored: change.after,
  }))
}

export interface RevisionEntryView {
  readonly entry: ElementRevision
  /** e.g. `Heading: Build faster with Aster Labs`. */
  readonly elementName: string
  /** e.g. `AI edit`. */
  readonly sourceLabel: string
  /** e.g. `Mobile only`. */
  readonly scopeText: string
  readonly timeText: string
  /** e.g. `Changed typography.fontSize and spacing.padding.top.` */
  readonly changedFieldsText: string
  /** What this commit itself did, oldest state on the left. */
  readonly changes: readonly RestorePreviewRow[]
  /** What restoring this entry would change, from current values. */
  readonly preview: readonly RestorePreviewRow[]
  /** One sentence naming the exact element and scope a restore would touch. */
  readonly restoreText: string
  /** e.g. `Desktop and Tablet keep their current values.` */
  readonly protectionText: string
  /** False when current values already match this entry's `before`. */
  readonly canRestore: boolean
  /** Plain-text reason, shown whether or not restore is available. */
  readonly restoreHint: string
}

export interface RevisionScopeGroupView {
  readonly scope: EditScope
  readonly scopeText: string
  /** Newest first: recovery almost always reaches for a recent state. */
  readonly entries: readonly RevisionEntryView[]
}

export interface ElementHistoryView {
  readonly elementId: ElementId
  /** e.g. `Heading: Build faster with Aster Labs`. */
  readonly elementName: string
  readonly groups: readonly RevisionScopeGroupView[]
  readonly totalEntries: number
  /** One sentence for the panel, e.g. `3 revisions across 2 scopes.` */
  readonly summary: string
}

function describeEntry(
  document: TemplateDocument,
  entry: ElementRevision,
  elementName: string,
): RevisionEntryView {
  const preview = describeRestorePreview(document, entry)
  const scopeText = EDIT_SCOPE_LABELS[entry.scope]
  const canRestore = preview.length > 0

  return {
    entry,
    elementName,
    sourceLabel: EDIT_SOURCE_LABELS[entry.source],
    scopeText,
    timeText: formatRevisionTime(entry.createdAt),
    changedFieldsText:
      entry.changedPaths.length === 0
        ? 'No field values changed.'
        : `Changed ${joinWithAnd([...entry.changedPaths])}.`,
    changes: describeProposalChanges(entry.before, entry.after).map((change) => ({
      path: change.path,
      current: change.before,
      restored: change.after,
    })),
    preview,
    restoreText: `Restores ${elementName} in ${scopeText}, and nothing else.`,
    protectionText: describeScopeLock({ scope: entry.scope, targetNames: [elementName] })
      .protectionText,
    canRestore,
    restoreHint: canRestore
      ? `Restoring returns ${preview.length} field${preview.length === 1 ? '' : 's'} to the values held before this ${EDIT_SOURCE_LABELS[entry.source].toLowerCase()}. Later revisions are kept, and the restore is recorded as its own entry.`
      : 'Current values already match this revision, so there is nothing to restore.',
  }
}

function summarize(total: number, scopes: number): string {
  if (total === 0) return 'No changes recorded yet.'
  return `${total} revision${total === 1 ? '' : 's'} across ${scopes} scope${scopes === 1 ? '' : 's'}.`
}

/** The readable name of one element, or `undefined` if it is not in the document. */
function elementNameFor(
  document: TemplateDocument,
  elementIdValue: ElementId,
): string | undefined {
  const element = document.elements[elementIdValue]
  if (element === undefined) return undefined
  return describeElement({
    id: element.id,
    type: element.type,
    properties: element.base,
  }).accessibleName
}

/** The history of one element, grouped by scope; `undefined` if it is gone. */
export function describeElementHistory(
  document: TemplateDocument,
  elementIdValue: ElementId,
): ElementHistoryView | undefined {
  const elementName = elementNameFor(document, elementIdValue)
  if (elementName === undefined) return undefined

  const entries = listElementHistory(document, elementIdValue)

  const groups: RevisionScopeGroupView[] = EDIT_SCOPES.flatMap((scope) => {
    const scoped = entries.filter((entry) => entry.scope === scope)
    if (scoped.length === 0) return []
    return [
      {
        scope,
        scopeText: EDIT_SCOPE_LABELS[scope],
        entries: [...scoped]
          .reverse()
          .map((entry) => describeEntry(document, entry, elementName)),
      },
    ]
  })

  return {
    elementId: elementIdValue,
    elementName,
    groups,
    totalEntries: entries.length,
    summary: summarize(entries.length, groups.length),
  }
}

/**
 * History for the current selection, in selection order.
 *
 * Filtering by selection is what keeps restore unambiguous: every entry on
 * screen belongs to an element the reviewer has already pointed at, so the
 * target of a restore is never inferred.
 */
export function describeSelectedHistory(input: {
  readonly document: TemplateDocument
  readonly selectedIds: readonly ElementId[]
}): readonly ElementHistoryView[] {
  return input.selectedIds.flatMap((id) => {
    const view = describeElementHistory(input.document, id)
    return view === undefined ? [] : [view]
  })
}

/* -------------------------------------------------------------------------- */
/* The rail timeline                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Whose history the rail is showing. `document` is the resting state - the
 * whole layout's change log - and a selection narrows it to those elements.
 */
export type HistoryTimelineMode = 'document' | 'selection'

export interface HistoryTimelineView {
  readonly mode: HistoryTimelineMode
  /** e.g. `Whole layout` or `Heading: Ship a landing page ...`. */
  readonly title: string
  /** e.g. `8 changes across 3 elements.` */
  readonly summary: string
  /**
   * OLDEST first. The rail reads as a transcript, so the most recent change
   * ends up next to the composer at the foot of it, the way the newest message
   * of a conversation does.
   */
  readonly entries: readonly RevisionEntryView[]
  /** What would produce content, shown when the timeline is empty. */
  readonly emptyText: string
}

const TIMELINE_EXPLAINER =
  'Edits from the inspector, the code panel, an accepted AI proposal, and a restore all appear here.'

/**
 * Chronological order across elements.
 *
 * The document revision is the primary key rather than the timestamp: it is
 * assigned by the commit pipeline, it is unique across the document, and it
 * still orders two entries correctly when a fixed clock stamps them with the
 * same instant. The remaining comparisons only exist so the sort is total.
 */
function compareEntries(left: RevisionEntryView, right: RevisionEntryView): number {
  const byRevision = left.entry.documentRevision - right.entry.documentRevision
  if (byRevision !== 0) return byRevision
  const byTime = left.entry.createdAt.localeCompare(right.entry.createdAt)
  if (byTime !== 0) return byTime
  return left.entry.id.localeCompare(right.entry.id)
}

function timelineSummary(entries: readonly RevisionEntryView[]): string {
  if (entries.length === 0) return 'No changes recorded yet.'
  const elements = new Set(entries.map((view) => view.entry.elementId)).size
  return `${entries.length} change${entries.length === 1 ? '' : 's'} across ${elements} element${elements === 1 ? '' : 's'}.`
}

/**
 * Every recorded change, as one flat transcript.
 *
 * Selection is a FILTER here, not a precondition. With nothing selected the
 * rail is the change log of the whole layout, which is what a reviewer arriving
 * at the editor wants to read; selecting elements narrows it to their entries,
 * so the surface answers "what happened to this?" without changing shape.
 *
 * A restore is still unambiguous either way, because an entry names its own
 * element and scope: the panel never has to infer a target from the selection,
 * which is exactly why widening the default view is safe.
 */
export function describeHistoryTimeline(input: {
  readonly document: TemplateDocument
  readonly selectedIds: readonly ElementId[]
}): HistoryTimelineView {
  const { document, selectedIds } = input

  if (selectedIds.length > 0) {
    const views = describeSelectedHistory(input)
    const entries = views
      .flatMap((view) => view.groups.flatMap((group) => group.entries))
      .sort(compareEntries)
    const title =
      views.length === 1
        ? (views[0]?.elementName ?? '')
        : `${views.length} selected element${views.length === 1 ? '' : 's'}`

    return {
      mode: 'selection',
      title,
      summary: timelineSummary(entries),
      entries,
      emptyText: `No changes recorded for ${title} yet. ${TIMELINE_EXPLAINER}`,
    }
  }

  // Names are resolved once per element rather than once per entry: one
  // element commonly owns many revisions.
  const names = new Map<ElementId, string | undefined>()
  const entries = Object.values(document.history)
    .flat()
    .flatMap((entry) => {
      if (!names.has(entry.elementId)) {
        names.set(entry.elementId, elementNameFor(document, entry.elementId))
      }
      const name = names.get(entry.elementId)
      return name === undefined ? [] : [describeEntry(document, entry, name)]
    })
    .sort(compareEntries)

  return {
    mode: 'document',
    title: 'Whole layout',
    summary: timelineSummary(entries),
    entries,
    emptyText: `Nothing has changed yet. ${TIMELINE_EXPLAINER} Select an element on the canvas or in Layers to narrow this to its own history.`,
  }
}

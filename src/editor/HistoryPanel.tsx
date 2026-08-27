import { useEffect, useRef, useState, type JSX } from 'react'

import type { TemplateDocument } from '../model/document'
import type { ElementId, RevisionEntryId } from '../model/ids'
import {
  describeSelectedHistory,
  type ElementHistoryView,
  type RestorePreviewRow,
  type RevisionEntryView,
} from './element-history'
import { PanelHeading, PanelHint, ToolbarButton } from './controls'

/**
 * The history panel.
 *
 * History is per element and per scope, and so is recovery: a revision card
 * restores exactly one element in exactly one scope, through the store's
 * `restore` action, which builds an ordinary command and sends it down the same
 * validated pipeline as a manual edit. There is deliberately no "undo last
 * change" and no document rewind here - a whole-document rollback would be a
 * different and much blunter promise than the one this editor makes.
 *
 * Restore is confirmed rather than immediate. The confirmation names the exact
 * target and scope, states which views provably keep their values, and shows a
 * current-versus-revision table, so the reviewer reads what will happen before
 * it happens. It is an inline confirmation region rather than a modal dialog:
 * it carries the same keyboard contract - focus moves into it, Escape cancels
 * and returns focus to the button that opened it - without taking the page
 * hostage while the reviewer looks at the canvas.
 *
 * Nothing in this component is durable. Which card is awaiting confirmation and
 * what the last restore did are transient UI state, and no code path here can
 * write to the document except through `onRestore`.
 */

export interface RestoreRequest {
  readonly elementId: ElementId
  readonly revisionId: RevisionEntryId
}

interface RestoreOutcome {
  readonly revisionId: RevisionEntryId
  readonly message: string
  readonly errors: readonly string[]
}

function PreviewTable(props: {
  rows: readonly RestorePreviewRow[]
  caption: string
  currentHeader: string
  nextHeader: string
}): JSX.Element {
  return (
    <table className="w-full border-collapse text-left text-xs [&_th]:border-b [&_th]:border-default [&_th]:px-2 [&_th]:py-1 [&_th]:align-top [&_td]:border-b [&_td]:border-default [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:text-muted [&_tbody_th]:font-medium [&_tbody_th]:text-secondary [&_tbody_td]:text-primary [&_tbody_td]:[overflow-wrap:anywhere]">
      <caption className="sr-only">{props.caption}</caption>
      <thead>
        <tr>
          <th scope="col">Field</th>
          <th scope="col">{props.currentHeader}</th>
          <th scope="col">{props.nextHeader}</th>
        </tr>
      </thead>
      <tbody>
        {props.rows.map((row) => (
          <tr key={row.path}>
            <th scope="row">
              <code>{row.path}</code>
            </th>
            <td>{row.current}</td>
            <td>{row.restored}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function HistoryPanel(props: {
  document: TemplateDocument
  selectedIds: readonly ElementId[]
  /** Restores one element/scope; returns pipeline errors, empty when applied. */
  onRestore: (request: RestoreRequest) => readonly string[]
  /**
   * Docked in the rail the panel drops its explanatory paragraph: the rail is
   * short, and a scrollable region whose only content is prose is a keyboard
   * trap by axe's reading. The rule it explains is still stated in Scope Lock,
   * above every surface.
   */
  showGuidance?: boolean
}): JSX.Element {
  const views = describeSelectedHistory({
    document: props.document,
    selectedIds: props.selectedIds,
  })

  /** The one card awaiting confirmation; at most one is open at a time. */
  const [pendingId, setPendingId] = useState<RevisionEntryId | undefined>(undefined)
  const [outcome, setOutcome] = useState<RestoreOutcome | undefined>(undefined)

  /**
   * Focus after an action, so a keyboard user is never left on a control that
   * has just been replaced: opening a confirmation lands on its heading,
   * cancelling returns to the button that opened it, and a decision lands on
   * that card's own status line.
   */
  const [focusTarget, setFocusTarget] = useState<
    { readonly kind: 'confirm' | 'trigger' | 'status'; readonly id: RevisionEntryId } | undefined
  >(undefined)
  const confirmRefs = useRef(new Map<string, HTMLParagraphElement | null>())
  const triggerRefs = useRef(new Map<string, HTMLButtonElement | null>())
  const statusRefs = useRef(new Map<string, HTMLParagraphElement | null>())

  useEffect(() => {
    if (focusTarget === undefined) return
    const map =
      focusTarget.kind === 'confirm'
        ? confirmRefs.current
        : focusTarget.kind === 'trigger'
          ? triggerRefs.current
          : statusRefs.current
    ;(map.get(focusTarget.id) ?? null)?.focus()
    setFocusTarget(undefined)
  }, [focusTarget])

  const openConfirm = (revisionId: RevisionEntryId): void => {
    setPendingId(revisionId)
    setOutcome(undefined)
    setFocusTarget({ kind: 'confirm', id: revisionId })
  }

  const cancelConfirm = (revisionId: RevisionEntryId): void => {
    setPendingId(undefined)
    setFocusTarget({ kind: 'trigger', id: revisionId })
  }

  const confirmRestore = (view: RevisionEntryView): void => {
    const { entry } = view
    const errors = props.onRestore({ elementId: entry.elementId, revisionId: entry.id })

    setPendingId(undefined)
    setOutcome({
      revisionId: entry.id,
      message:
        errors.length === 0
          ? `Restored ${view.elementName} in ${view.scopeText}. A new history entry records the restore.`
          : 'The restore was rejected and nothing was changed.',
      errors,
    })
    setFocusTarget({ kind: 'status', id: entry.id })
  }

  const renderEntry = (view: RevisionEntryView): JSX.Element => {
    const { entry } = view
    const cardId = `revision-${entry.id}`
    const confirming = pendingId === entry.id
    const cardOutcome = outcome?.revisionId === entry.id ? outcome : undefined

    return (
      <li key={entry.id}>
        {/* `revision-card` is a query hook for the tests. The source is stated
            in the card's own title; the coloured edge is a second cue. */}
        <article
          className="revision-card flex flex-col gap-2 rounded-card border border-default
            border-l-[3px] bg-surface-panel p-3 shadow-hairline
            data-[source=canvas]:border-l-action-primary
            data-[source=code]:border-l-strong
            data-[source=ai]:border-l-status-warning
            data-[source=restore]:border-l-status-success"
          aria-labelledby={`${cardId}-title`}
          data-revision-id={entry.id}
          data-target-id={entry.elementId}
          data-scope={entry.scope}
          data-source={entry.source}
        >
          <h5 className="m-0 text-[13px] font-semibold text-primary" id={`${cardId}-title`}>
            {view.sourceLabel}
          </h5>

          <p className="m-0 text-[11px] text-muted">
            <span className="font-semibold text-secondary">{view.scopeText}</span>
            <span aria-hidden="true"> &middot; </span>
            <span>{view.timeText}</span>
            <span aria-hidden="true"> &middot; </span>
            <span>Document revision {entry.documentRevision}</span>
          </p>

          <p className="m-0 text-xs leading-normal text-secondary [overflow-wrap:anywhere]">
            {view.changedFieldsText}
          </p>

          {view.changes.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xs text-secondary focus-visible:outline-2
                focus-visible:outline-offset-2 focus-visible:outline-focus-ring">
                What this change did
              </summary>
              <PreviewTable
                rows={view.changes}
                caption={`Fields this ${view.sourceLabel.toLowerCase()} changed`}
                currentHeader="Before"
                nextHeader="After"
              />
            </details>
          )}

          {confirming && (
            <div
              className="flex flex-col gap-2 rounded-control border border-strong
                bg-surface-elevated p-3"
              role="group"
              aria-labelledby={`${cardId}-confirm-title`}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return
                event.stopPropagation()
                cancelConfirm(entry.id)
              }}
            >
              <p
                className="m-0 text-xs font-semibold text-primary focus-visible:outline-2
                  focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
                id={`${cardId}-confirm-title`}
                tabIndex={-1}
                ref={(node) => {
                  confirmRefs.current.set(entry.id, node)
                }}
              >
                Restore this revision?
              </p>

              <p className="m-0 text-xs leading-normal text-secondary">
                <strong>{view.restoreText}</strong> {view.protectionText}
              </p>

              <PreviewTable
                rows={view.preview}
                caption={`Current values compared with this revision for ${view.scopeText}`}
                currentHeader="Current"
                nextHeader="After restore"
              />

              <div className="flex flex-wrap gap-2">
                <ToolbarButton
                  type="button"
                  onClick={() => {
                    confirmRestore(view)
                  }}
                >
                  Restore
                </ToolbarButton>
                <ToolbarButton
                  type="button"
                  onClick={() => {
                    cancelConfirm(entry.id)
                  }}
                >
                  Cancel
                </ToolbarButton>
              </div>
            </div>
          )}

          <p
            className="revision-card__status m-0 text-xs leading-[1.45] text-secondary
              focus-visible:outline-2 focus-visible:outline-offset-4
              focus-visible:outline-focus-ring"
            tabIndex={-1}
            ref={(node) => {
              statusRefs.current.set(entry.id, node)
            }}
          >
            {cardOutcome?.message ?? view.restoreHint}
          </p>

          {cardOutcome !== undefined && cardOutcome.errors.length > 0 && (
            <div role="alert">
              <p className="m-0 text-[11px] leading-[1.45] text-status-danger before:content-['\26A0__']">
                {cardOutcome.errors.join(' ')}
              </p>
            </div>
          )}

          {!confirming && (
            <div className="flex flex-wrap gap-2">
              <ToolbarButton
                type="button"
                disabled={!view.canRestore}
                aria-label={`Restore ${view.scopeText} for this element to the state before this ${view.sourceLabel.toLowerCase()}`}
                ref={(node) => {
                  triggerRefs.current.set(entry.id, node)
                }}
                onClick={() => {
                  openConfirm(entry.id)
                }}
              >
                Restore&hellip;
              </ToolbarButton>
            </div>
          )}
        </article>
      </li>
    )
  }

  const renderElement = (view: ElementHistoryView): JSX.Element => (
    <section
      key={view.elementId}
      className="flex flex-col gap-2 rounded-card border border-default bg-surface-panel
        p-3 shadow-hairline"
      aria-label={`History for ${view.elementName}`}
      data-target-id={view.elementId}
    >
      <h3 className="m-0 text-[13px] font-semibold text-primary">{view.elementName}</h3>
      <p className="m-0 text-[11px] text-muted">
        <code className="font-mono">{view.elementId}</code>
        <span aria-hidden="true"> &middot; </span>
        <span>{view.summary}</span>
      </p>

      {view.totalEntries === 0 ? (
        <p className="m-0 text-xs leading-normal text-secondary">
          No changes recorded for this element yet. Edits from the inspector, the code panel,
          an accepted AI proposal, and a restore all appear here.
        </p>
      ) : (
        view.groups.map((group) => (
          <section
            key={group.scope}
            className="flex flex-col gap-2"
            aria-label={`${group.scopeText} revisions for ${view.elementName}`}
            data-scope={group.scope}
          >
            <h4 className="m-0 text-xs font-semibold text-secondary">{group.scopeText}</h4>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {group.entries.map(renderEntry)}
            </ul>
          </section>
        ))
      )}
    </section>
  )

  return (
    <section className="flex flex-col gap-3" aria-labelledby="history-heading">
      <PanelHeading id="history-heading">History</PanelHeading>

      {props.showGuidance === false ? null : (
        <PanelHint>
          Every commit is recorded against one element and one scope. Restoring an entry
          returns that element, in that scope only, to the values it held before that change;
          later entries are kept and the restore is recorded as a new entry.
        </PanelHint>
      )}

      <p
        className="m-0 text-xs leading-[1.45] text-secondary empty:hidden"
        role="status"
        aria-label="Restore outcome"
      >
        {outcome?.message ?? ''}
      </p>

      {views.length === 0 ? (
        <p className="m-0 text-xs leading-normal text-secondary">
          Select an element on the canvas or in Layers to see its history.
        </p>
      ) : (
        views.map(renderElement)
      )}
    </section>
  )
}

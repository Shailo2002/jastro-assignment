import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react'

import type { TemplateDocument } from '../model/document'
import type { EditSource } from '../model/history'
import type { ElementId, RevisionEntryId } from '../model/ids'
import {
  describeHistoryTimeline,
  type RestorePreviewRow,
  type RevisionEntryView,
} from './element-history'
import { PanelHeading, ToolbarButton } from './controls'
import { Icon, type IconName } from './Icon'

/**
 * The change transcript.
 *
 * The rail reads as a conversation: committed changes are the messages, oldest
 * at the top, and the newest one sits at the foot of the list next to the
 * composer that will produce the next one. Each entry is one element in one
 * scope, so a restore card is unambiguous wherever it appears.
 *
 * Selection FILTERS the transcript, it is not a precondition for it. With
 * nothing selected the rail is the whole layout's change log - the thing a
 * reviewer arriving at the editor actually wants to read - and selecting
 * elements narrows it to their entries without changing the shape of the
 * surface. That is safe precisely because an entry names its own target: the
 * panel never infers what a restore would touch from what is selected.
 *
 * A card is deliberately terse: who changed what, on which element, in which
 * scope, and the old and new value of every field it touched. Values are on
 * the card rather than behind a disclosure - `Changed typography.fontSize`
 * alone tells a reviewer nothing they came to find out. What a RESTORE would
 * do is the part that is not printed here: that table and the sentence naming
 * its target are inside the confirmation, where the decision is made.
 *
 * A card also points at its own element: activating one selects it, so the
 * canvas, Layers, and the inspector all move to the thing the entry is about.
 * Selecting is the editor's existing way of saying "this one", it costs no
 * timer, and it narrows the transcript to that element - which is the question
 * a reviewer who just clicked one of its changes is asking.
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
 * write to the document except through `onRestore`. There is deliberately no
 * "undo last change" and no document rewind: a whole-document rollback would be
 * a different and much blunter promise than the one this editor makes.
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

/**
 * The glyph beside an entry's title. It repeats what that title already says in
 * words, so it is decorative and never the only cue.
 */
const SOURCE_ICONS: Readonly<Record<EditSource, IconName>> = {
  canvas: 'sliders',
  code: 'code',
  ai: 'sparkle',
  restore: 'clock',
}

function PreviewTable(props: {
  rows: readonly RestorePreviewRow[]
  caption: string
  currentHeader: string
  nextHeader: string
}): JSX.Element {
  return (
    // The rail is narrow and a value can be long, so the table scrolls inside
    // its own box rather than pushing the card - or the page - sideways.
    <div className="min-w-0 overflow-x-auto">
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
    </div>
  )
}

export function HistoryTimeline(props: {
  document: TemplateDocument
  selectedIds: readonly ElementId[]
  /**
   * Points at the element an entry belongs to. A card names its element in
   * words, but the transcript mixes elements, so activating one selects it -
   * the canvas outlines it, Layers marks it, and the inspector opens on it.
   * Selection is the highlight: it is the editor's existing, permanent way of
   * saying "this one", and it does not time out from under a reader.
   */
  onSelectElement: (elementId: ElementId) => void
  /** Restores one element/scope; returns pipeline errors, empty when applied. */
  onRestore: (request: RestoreRequest) => readonly string[]
  /**
   * The change that has not happened yet, drawn as the last card of the list.
   * A proposal is the next entry the transcript would have, so it belongs at
   * the end of the transcript rather than in a review surface beside it. It is
   * outside the ordered list of committed entries, and the count in the header
   * still counts only what has actually been committed.
   */
  pending?: ReactNode
}): JSX.Element {
  const view = describeHistoryTimeline({
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

  const confirmRestore = (entryView: RevisionEntryView): void => {
    const { entry } = entryView
    const errors = props.onRestore({ elementId: entry.elementId, revisionId: entry.id })

    setPendingId(undefined)
    setOutcome({
      revisionId: entry.id,
      message:
        errors.length === 0
          ? `Restored ${entryView.elementName} in ${entryView.scopeText}. A new history entry records the restore.`
          : 'The restore was rejected and nothing was changed.',
      errors,
    })
    setFocusTarget({ kind: 'status', id: entry.id })
  }

  const renderEntry = (entryView: RevisionEntryView): JSX.Element => {
    const { entry } = entryView
    const cardId = `revision-${entry.id}`
    const confirming = pendingId === entry.id
    const cardOutcome = outcome?.revisionId === entry.id ? outcome : undefined

    return (
      <li className="flex min-w-0 flex-col" key={entry.id}>
        {/* `revision-card` is a query hook for the tests. The source is stated
            in the card's own title; the glyph and the coloured edge repeat it,
            neither of them alone. The card takes the rail's full width - an
            avatar gutter would have cost every table inside it 36px.

            The card body points at its element: clicking anywhere that is not
            already a control selects it. That is a convenience for the pointer,
            never the only route - the element's name inside the card is a real
            button, so the same move is one Tab and one Enter away. Clicks are
            ignored while a restore is being confirmed, so nothing moves under a
            decision. */}
        <article
          className="revision-card flex min-w-0 flex-1 cursor-pointer flex-col gap-2 rounded-card
            border border-default border-l-[3px] bg-surface-panel p-3 shadow-hairline
            transition-colors duration-instant hover:border-strong
            data-[source=canvas]:border-l-action-primary
            data-[source=code]:border-l-strong
            data-[source=ai]:border-l-status-warning
            data-[source=restore]:border-l-status-success"
          aria-labelledby={`${cardId}-title`}
          data-revision-id={entry.id}
          data-target-id={entry.elementId}
          data-scope={entry.scope}
          data-source={entry.source}
          onClick={(event) => {
            if (confirming) return
            const origin = event.target
            if (
              origin instanceof HTMLElement &&
              origin.closest('button, a, input, select, textarea') !== null
            ) {
              return
            }
            props.onSelectElement(entry.elementId)
          }}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="grid size-6 flex-none place-items-center rounded-pill border
                border-default bg-surface-elevated text-secondary
                data-[source=ai]:text-status-warning
                data-[source=restore]:text-status-success"
              data-source={entry.source}
              aria-hidden="true"
            >
              <Icon name={SOURCE_ICONS[entry.source]} className="size-[14px]" />
            </span>
            <h3
              className="m-0 text-[13px] font-semibold text-primary"
              id={`${cardId}-title`}
            >
              {entryView.sourceLabel}
            </h3>
            <span className="ms-auto text-[11px] whitespace-nowrap text-muted">
              {entryView.timeText}
            </span>
          </div>

          {/* The element is named on every card, because the transcript mixes
              elements whenever nothing is selected - and the name is the
              control that points at it, so the card's target can be reached
              from the keyboard as well as by clicking the card. */}
          <p className="m-0 text-[11px] text-muted [overflow-wrap:anywhere]">
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-start font-[inherit]
                text-[11px] font-semibold text-secondary underline decoration-dotted
                underline-offset-2 hover:text-primary focus-visible:outline-2
                focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              aria-label={`Select ${entryView.elementName}`}
              onClick={() => {
                props.onSelectElement(entry.elementId)
              }}
            >
              {entryView.elementName}
            </button>
            <span aria-hidden="true"> &middot; </span>
            <span>{entryView.scopeText}</span>
          </p>

          {/* What actually changed, in values rather than field names alone: a
              transcript that says `Changed typography.fontSize` makes the
              reviewer open something to learn anything. One line per field,
              old on the left, so the card stays short while still being the
              answer. The names are the fallback for a commit that recorded
              paths without a derivable value change. */}
          {entryView.changes.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {entryView.changes.map((change) => (
                <li
                  className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-xs
                    leading-normal text-secondary [overflow-wrap:anywhere]"
                  key={change.path}
                >
                  <code className="font-mono text-[11px] text-muted">{change.path}</code>
                  <span className="text-muted line-through">{change.current}</span>
                  <span aria-hidden="true" className="text-muted">
                    &rarr;
                  </span>
                  <span className="sr-only">to</span>
                  <span className="font-semibold text-primary">{change.restored}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-xs leading-normal text-secondary [overflow-wrap:anywhere]">
              {entryView.changedFieldsText}
            </p>
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

              {/* One line: what moves and where. The element is named on the
                  card this is inside, and every value that would change is in
                  the table below, so the confirmation states neither twice. */}
              <p className="m-0 text-xs leading-normal text-secondary">
                {entryView.restoreText}
              </p>

              <PreviewTable
                rows={entryView.preview}
                caption={`Current values compared with this revision for ${entryView.scopeText}`}
                currentHeader="Current"
                nextHeader="After restore"
              />

              <div className="flex flex-wrap gap-2">
                <ToolbarButton
                  type="button"
                  onClick={() => {
                    confirmRestore(entryView)
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

          {/* Only the outcome of a restore, not a standing explanation of what
              one would do: that belongs in the confirmation, which is read at
              the moment it matters. The node stays mounted either way, because
              focus lands here after a decision. */}
          <p
            className="revision-card__status m-0 text-xs leading-[1.45] text-secondary
              empty:hidden focus-visible:outline-2 focus-visible:outline-offset-4
              focus-visible:outline-focus-ring"
            tabIndex={-1}
            ref={(node) => {
              statusRefs.current.set(entry.id, node)
            }}
          >
            {cardOutcome?.message ?? ''}
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
                disabled={!entryView.canRestore}
                aria-label={`Restore ${entryView.scopeText} for ${entryView.elementName} to the state before this ${entryView.sourceLabel.toLowerCase()}`}
                title={entryView.restoreHint}
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

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby="history-heading">
      {/* The label floats: it sticks to the top of the scrolling transcript
          rather than scrolling off with the oldest entries, so whose history is
          on screen is legible at any scroll position. It is one line - the
          heading, whose history, and how many changes - because it is a label
          for the column, not a report; the full sentence stays available to
          assistive technology. The negative margins cancel the scroller's own
          padding so the bar spans the rail and nothing shows above it. */}
      <div
        className="sticky top-0 z-10 -mx-3 flex min-w-0 flex-nowrap items-center gap-x-2
          bg-surface-shell px-3 pt-3 pb-2 after:pointer-events-none after:absolute
          after:inset-x-0 after:top-full after:h-3 after:bg-gradient-to-b
          after:from-surface-shell after:to-transparent"
      >
        <PanelHeading id="history-heading">History</PanelHeading>
        {/* Whose history this is, stated rather than implied by what happens to
            be listed: "Whole layout" until a selection narrows it. */}
        <span
          className="min-w-0 flex-initial truncate rounded-pill border border-default px-2
            py-0.5 text-[11px] whitespace-nowrap text-muted"
          data-history-mode={view.mode}
        >
          {view.title}
        </span>
        <span
          className="ms-auto flex-none text-[11px] whitespace-nowrap text-muted"
          aria-hidden="true"
        >
          {view.entries.length === 0
            ? 'None yet'
            : `${view.entries.length} change${view.entries.length === 1 ? '' : 's'}`}
        </span>
        <span className="sr-only">{view.summary}</span>
      </div>

      <p
        className="m-0 text-xs leading-[1.45] text-secondary empty:hidden"
        role="status"
        aria-label="Restore outcome"
      >
        {outcome?.message ?? ''}
      </p>

      {view.entries.length === 0 ? (
        /* An empty timeline says one short thing, centred under its glyph:
           the panel is already titled History, so the copy does not have to
           re-explain what a history is. It gives way to a proposal: with an
           offer on screen the list is not empty in any way a reader cares
           about. */
        props.pending === undefined && (
          <div className="flex flex-col items-center gap-2.5 px-4 py-10 text-center">
            <Icon name="clock" className="size-6 text-muted" />
            <p className="m-0 text-sm leading-normal font-medium text-secondary">
              {view.emptyText}
            </p>
          </div>
        )
      ) : (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {view.entries.map(renderEntry)}
        </ol>
      )}

      {props.pending}
    </section>
  )
}

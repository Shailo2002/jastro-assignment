import { useEffect, useRef, useState, type JSX } from 'react'

import { generateProposals } from '../engine/generate-proposals'
import type { Proposal } from '../engine/proposal'
import type { TemplateDocument } from '../model/document'
import type { ElementId } from '../model/ids'
import type { EditScope } from '../model/viewport'
import { AiComposer } from './AiComposer'
import { HistoryTimeline, type RestoreRequest } from './HistoryTimeline'
import { ProposalThread } from './ProposalThread'
import {
  describeProposalReview,
  setProposalOutcome,
  startReview,
  type AiPanelState,
  type ProposalCardView,
} from './proposal-review'

/**
 * The left rail, read as one conversation about the layout.
 *
 * Top to bottom it is a transcript with a composer under it, the shape a chat
 * has: committed changes are the history above, the AI turn that is currently
 * under review sits at the end of that transcript, and the instruction box is
 * docked at the foot where the next turn is typed. The order is not decoration
 * - the newest thing that happened is the thing nearest the control that acts
 * next.
 *
 * History is the resting content of the rail, not a surface that has to be
 * asked for. With nothing selected it is the whole layout's change log; a
 * selection narrows it to those elements. The AI turn is filtered by nothing:
 * it is the one run in flight, and it stays visible while the reviewer changes
 * selection or scope, because a proposal carries the selection and revision it
 * was generated from and is shown as no longer applicable rather than silently
 * vanishing.
 *
 * There is no title block above the transcript: the rail's subject is the
 * change log, and a banner restating what the surface is would have cost the
 * transcript a fifth of its height to say nothing that the content does not.
 *
 * The rail is a card, the same rounded, bordered surface the dock and the
 * workspace are: the three regions of the editor are three objects floating on
 * one ambient field, rather than panes divided by rules. Its own surface is
 * opaque, because a transcript has to be readable over whatever the field is
 * doing behind it.
 *
 * The rail owns the running, the per-card decisions, and the focus moves; the
 * three components under it are presentation. Nothing here is durable: the
 * instruction, the run, and the outcomes are transient UI state held by the
 * shell, and the only writes are `onAccept` and `onRestore`, both of which go
 * through the store's single validated command pipeline.
 */
export function ConversationRail(props: {
  document: TemplateDocument
  selectedIds: readonly ElementId[]
  /** Readable names of the selection, for the composer's Scope Lock. */
  selectedNames: readonly string[]
  scope: EditScope
  state: AiPanelState
  onStateChange: (state: AiPanelState) => void
  /** Points the editor at one element, from a history card. */
  onSelectElement: (elementId: ElementId) => void
  /** Commits one proposal; returns pipeline error messages, empty when applied. */
  onAccept: (proposal: Proposal) => readonly string[]
  /** Restores one element/scope; returns pipeline errors, empty when applied. */
  onRestore: (request: RestoreRequest) => readonly string[]
}): JSX.Element {
  const { document, selectedIds, scope, state } = props

  /**
   * Focus after an action, so a keyboard user is never left on a control that
   * has just disappeared: generation lands on the results heading, and a
   * decision lands on that card's own status line.
   */
  const [focusTarget, setFocusTarget] = useState<string | undefined>(undefined)
  const resultsRef = useRef<HTMLHeadingElement | null>(null)
  const statusRefs = useRef(new Map<string, HTMLParagraphElement | null>())

  useEffect(() => {
    if (focusTarget === undefined) return
    const node =
      focusTarget === 'results'
        ? resultsRef.current
        : (statusRefs.current.get(focusTarget) ?? null)
    node?.focus()
    setFocusTarget(undefined)
  }, [focusTarget])

  /**
   * The transcript is pinned to its foot whenever it grows, the way a chat is:
   * a new commit or a new run appears next to the composer rather than below
   * the fold. It is a jump rather than a smooth scroll, so it costs nothing
   * under `prefers-reduced-motion` and cannot outrun a fast sequence of edits.
   */
  const feedRef = useRef<HTMLDivElement | null>(null)
  const runKey = state.review?.run.normalizedInstruction ?? ''
  const selectionKey = selectedIds.join(',')
  useEffect(() => {
    const node = feedRef.current
    if (node === null) return
    node.scrollTop = node.scrollHeight
  }, [document.revision, runKey, selectionKey])

  const canRun = selectedIds.length > 0

  const run = (instruction: string): void => {
    if (!canRun) return
    const result = generateProposals({
      document,
      instruction,
      selectedIds,
      scope,
    })

    props.onStateChange({
      instruction,
      submittedInstruction: instruction,
      review: result.ok ? startReview(result.run) : undefined,
      failure: result.ok ? undefined : result.failure,
      commitErrors: [],
    })
    setFocusTarget('results')
  }

  const decide = (card: ProposalCardView, outcome: 'accepted' | 'rejected'): void => {
    if (state.review === undefined) return

    if (outcome === 'rejected') {
      // Rejection is a status change and nothing else; the document is not
      // consulted, let alone written.
      props.onStateChange({
        ...state,
        review: setProposalOutcome(state.review, card.proposal.id, 'rejected'),
        commitErrors: [],
      })
      setFocusTarget(card.proposal.id)
      return
    }

    const errors = props.onAccept(card.proposal)
    props.onStateChange({
      ...state,
      review:
        errors.length === 0
          ? setProposalOutcome(state.review, card.proposal.id, 'accepted')
          : state.review,
      commitErrors: errors,
    })
    setFocusTarget(card.proposal.id)
  }

  const view =
    state.review === undefined
      ? undefined
      : describeProposalReview({ document, state: state.review, selectedIds })

  const hasTurn = view !== undefined || state.failure !== undefined

  return (
    <aside
      className="m-2 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-panel
        border border-default bg-surface-shell shadow-soft"
      aria-label="History and AI"
    >
      {/* The transcript. It scrolls; the composer under it does not move.
          Capped on a stacked layout so the composer stays reachable when the
          rail sits above the canvas instead of beside it.

          It runs all the way down to the composer: no padding of its own at the
          foot, because a gap there would read as a seam between two surfaces
          when it is one conversation, and the composer's own padding is already
          the space between the last message and the field. */}
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto px-3 pt-0 pb-0
          max-[900px]:max-h-[60vh]"
        ref={feedRef}
      >
        <HistoryTimeline
          document={document}
          selectedIds={selectedIds}
          onSelectElement={props.onSelectElement}
          onRestore={props.onRestore}
        />

        {hasTurn && (
          <ProposalThread
            view={view}
            failure={state.failure}
            commitErrors={state.commitErrors}
            submittedInstruction={state.submittedInstruction}
            resultsRef={resultsRef}
            registerStatusRef={(proposalId, node) => {
              statusRefs.current.set(proposalId, node)
            }}
            onDecide={decide}
          />
        )}
      </div>

      <AiComposer
        instruction={state.instruction}
        scope={scope}
        targetNames={props.selectedNames}
        canRun={canRun}
        onInstructionChange={(instruction) => {
          props.onStateChange({ ...state, instruction })
        }}
        onRun={run}
      />
    </aside>
  )
}

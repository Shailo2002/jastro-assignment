import { useEffect, useId, useRef, useState, type JSX } from 'react'

import type { TemplateDocument } from '../model/document'
import { generateProposals } from '../engine/generate-proposals'
import type { Proposal } from '../engine/proposal'
import { scenarioExamples } from '../engine/scenario-catalog'
import type { ElementId } from '../model/ids'
import type { EditScope } from '../model/viewport'
import { PanelHeading, PanelHint, ToolbarButton } from './controls'
import { EDIT_SCOPE_LABELS } from './edit-scope'
import {
  describeProposalReview,
  setProposalOutcome,
  startReview,
  type AiPanelState,
  type ProposalCardView,
} from './proposal-review'

/**
 * The AI edit panel.
 *
 * Running an instruction produces proposals and changes nothing: the canvas,
 * the document revision, and history are all untouched until a specific card is
 * accepted. Acceptance commits exactly one proposal through the same validated
 * command pipeline the inspector and the code surface use, with `source: 'ai'`
 * and the current selection as its authority - so a proposal whose target has
 * since been deselected is rejected rather than applied. A card whose fields
 * have moved since generation is marked stale and cannot be accepted at all.
 *
 * Per-element outcomes are independent by construction: one card, one command.
 * There is no "accept all", because that would be a single multi-target command
 * and a reviewer could no longer decline one element of it.
 *
 * Panel state is transient UI state owned by the shell, so switching tabs does
 * not discard a run - and so the shell, not this component, decides when a run
 * is thrown away.
 */

function ChangeTable(props: { card: ProposalCardView }): JSX.Element {
  return (
    <table className="w-full border-collapse text-left text-xs [&_th]:border-b [&_th]:border-default [&_th]:px-2 [&_th]:py-1 [&_th]:align-top [&_td]:border-b [&_td]:border-default [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:text-muted [&_tbody_th]:font-medium [&_tbody_th]:text-secondary [&_tbody_td]:text-primary [&_tbody_td]:[overflow-wrap:anywhere]">
      <caption className="sr-only">
        Proposed changes for {props.card.targetName}
      </caption>
      <thead>
        <tr>
          <th scope="col">Field</th>
          <th scope="col">Before</th>
          <th scope="col">After</th>
        </tr>
      </thead>
      <tbody>
        {props.card.changes.map((change) => (
          <tr key={change.path}>
            <th scope="row">
              <code>{change.path}</code>
            </th>
            <td>{change.before}</td>
            <td>{change.after}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function AiPanel(props: {
  document: TemplateDocument
  selectedIds: readonly ElementId[]
  scope: EditScope
  state: AiPanelState
  onStateChange: (state: AiPanelState) => void
  /** Commits one proposal; returns pipeline error messages, empty when applied. */
  onAccept: (proposal: Proposal) => readonly string[]
}): JSX.Element {
  const { document, selectedIds, scope, state } = props
  const fieldId = useId()
  const hintId = `${fieldId}-hint`

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
      focusTarget === 'results' ? resultsRef.current : (statusRefs.current.get(focusTarget) ?? null)
    node?.focus()
    setFocusTarget(undefined)
  }, [focusTarget])

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

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-3"
      aria-labelledby="ai-heading"
    >
      <PanelHeading id="ai-heading" className="text-primary">
        AI edits
      </PanelHeading>

      {state.failure !== undefined && (
        <div role="alert">
          <p className="m-0 text-[11px] leading-[1.45] text-status-danger before:content-['\26A0__']">{state.failure.message}</p>
          {state.failure.skipped !== undefined && state.failure.skipped.length > 0 && (
            <ul className="m-0 flex list-disc flex-col gap-1 rounded-control border-l-[3px] border-strong bg-surface-panel py-3 pe-3 ps-6 text-xs leading-[1.45] text-secondary">
              {state.failure.skipped.map((skip) => (
                <li key={skip.elementId}>{skip.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* The run scrolls; the composer below it does not move. The floor keeps
          a proposal readable even when the composer is expanded. */}
      {view !== undefined && (
        <div className="flex min-h-[120px] min-w-0 flex-[1_1_auto] flex-col gap-3 overflow-auto">
          <h3
            className="m-0 text-sm font-semibold text-primary focus-visible:outline-2
              focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
            ref={resultsRef}
            tabIndex={-1}
          >
            {view.scenarioTitle}
          </h3>

          {/* The Scope Lock statement is repeated here so the reviewer reads
              what an acceptance will touch at the moment of accepting it. */}
          <p className="m-0 text-xs leading-normal text-secondary [&_strong]:text-primary">
            <strong>{view.scopeText}</strong> &middot; {view.scopeLock.protectionText}
          </p>

          <p className="m-0 text-xs leading-normal text-secondary" role="status">
            {view.summary}
          </p>

          {view.skipped.length > 0 && (
            <ul className="m-0 flex list-disc flex-col gap-1 rounded-control border-l-[3px] border-strong bg-surface-panel py-3 pe-3 ps-6 text-xs leading-[1.45] text-secondary">
              {view.skipped.map((skip) => (
                <li key={skip.elementId}>{skip.message}</li>
              ))}
            </ul>
          )}

          {state.commitErrors.length > 0 && (
            <div role="alert">
              <p className="m-0 text-[11px] leading-[1.45] text-status-danger before:content-['\26A0__']">
                The change was rejected and nothing was applied. {state.commitErrors.join(' ')}
              </p>
            </div>
          )}

          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {view.cards.map((card) => {
              const cardId = `proposal-${card.proposal.id}`
              return (
                <li key={card.proposal.id}>
                  {/* `proposal-card` is a query hook for the tests; status is
                      carried by the card's text, the edge is a second cue. */}
                  <article
                    className="proposal-card flex flex-col gap-2 rounded-card border border-default
                      border-l-[3px] bg-surface-panel p-3 shadow-hairline
                      data-[status=pending]:border-l-action-primary
                      data-[status=accepted]:border-l-status-success
                      data-[status=rejected]:border-l-strong
                      data-[status=stale]:border-l-status-warning
                      data-[status=invalid]:border-l-status-danger"
                    aria-labelledby={`${cardId}-title`}
                    data-status={card.status}
                    data-target-id={card.proposal.elementId}
                  >
                    <h4 className="m-0 text-[13px] font-semibold text-primary" id={`${cardId}-title`}>
                      {card.targetName}
                    </h4>

                    <p className="m-0 text-[11px] text-muted">
                      <code className="font-mono">{card.proposal.elementId}</code>
                      <span aria-hidden="true"> &middot; </span>
                      <span>{card.scopeText}</span>
                    </p>

                    <p className="m-0 text-xs leading-normal text-secondary">
                      {card.proposal.summary}
                    </p>

                    <ChangeTable card={card} />

                    <p
                      className="proposal-card__status m-0 text-xs leading-[1.45] text-secondary
                        focus-visible:outline-2 focus-visible:outline-offset-4
                        focus-visible:outline-focus-ring"
                      tabIndex={-1}
                      ref={(node) => {
                        statusRefs.current.set(card.proposal.id, node)
                      }}
                    >
                      <span className="font-semibold text-primary after:content-[':']">
                        {card.status === 'pending' ? 'Pending' : null}
                        {card.status === 'accepted' ? 'Accepted' : null}
                        {card.status === 'rejected' ? 'Rejected' : null}
                        {card.status === 'stale' ? 'Stale' : null}
                        {card.status === 'invalid' ? 'Not applicable' : null}
                      </span>{' '}
                      {card.statusText}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <ToolbarButton
                        type="button"
                        disabled={!card.canAccept}
                        aria-label={`Accept change for ${card.targetName}`}
                        onClick={() => {
                          decide(card, 'accepted')
                        }}
                      >
                        Accept
                      </ToolbarButton>
                      <ToolbarButton
                        type="button"
                        disabled={!card.canReject}
                        aria-label={`Reject change for ${card.targetName}`}
                        onClick={() => {
                          decide(card, 'rejected')
                        }}
                      >
                        Reject
                      </ToolbarButton>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* The composer is last in the DOM because it is last on screen: the rail
          scrolls the run above it and keeps the instruction box docked. */}
      <div
        className={`flex min-h-0 min-w-0 flex-[0_1_auto] flex-col gap-2 overflow-auto ${
          // With no run to review there is nothing to be pushed below, so the
          // composer sits under its heading instead of leaving the rail empty.
          view === undefined && state.failure === undefined ? '' : 'mt-auto'
        }`}
      >
        {/* Short by design: the composer sits at the foot of the rail, and a
            long explanation here would push the input off screen. */}
        <PanelHint elementId={hintId}>
          A deterministic demo engine, not a model. Proposals only, for scope{' '}
          <strong>{EDIT_SCOPE_LABELS[scope]}</strong>: nothing changes until you accept a card.
          {canRun
            ? ''
            : ' Select at least one element on the canvas or in Layers to run an instruction.'}
        </PanelHint>

        <details className="rounded-control border border-default bg-surface-panel p-3 text-xs text-secondary">
          <summary className="cursor-pointer font-semibold text-primary">
            Example instructions
          </summary>
          {/* The examples wrap into rows rather than stacking one per line: in
              the rail the composer must stay short enough to leave the run its
              own room. */}
          <ul className="m-0 mt-3 flex max-h-40 list-none flex-wrap gap-2 overflow-auto p-0">
            {scenarioExamples().map((example) => (
              <li key={example}>
                <button
                  type="button"
                  className="min-h-touch cursor-pointer rounded-control border border-default
                    bg-surface-elevated px-3 py-2 text-left text-[13px] text-secondary
                    transition-colors duration-instant hover:not-disabled:bg-surface-hover
                    hover:not-disabled:text-primary focus-visible:outline-2
                    focus-visible:outline-offset-2 focus-visible:outline-focus-ring
                    disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={!canRun}
                  onClick={() => {
                    run(example)
                  }}
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </details>

        <label className="text-xs font-semibold text-secondary" htmlFor={fieldId}>
          Instruction
        </label>
        <div
          className="flex min-w-0 items-center gap-2 rounded-input border border-default
            bg-surface-canvas p-1 focus-within:border-selection
            focus-within:ring-2 focus-within:ring-selection-fill"
        >
          <input
            className="min-h-9 w-full min-w-0 flex-1 rounded-input border border-transparent
              bg-transparent p-2 font-[inherit] text-[13px] text-primary
              focus-visible:outline-2 focus-visible:outline-offset-1
              focus-visible:outline-focus-ring"
            id={fieldId}
            type="text"
            autoComplete="off"
            placeholder="Describe the change…"
            value={state.instruction}
            aria-describedby={hintId}
            onChange={(event) => {
              props.onStateChange({ ...state, instruction: event.target.value })
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              run(state.instruction)
            }}
          />
          <ToolbarButton
            type="button"
            tone="primary"
            className="min-h-9 flex-none px-3 whitespace-nowrap"
            disabled={!canRun}
            aria-describedby={hintId}
            onClick={() => {
              run(state.instruction)
            }}
          >
            Run instruction
          </ToolbarButton>
        </div>
      </div>
    </section>
  )
}

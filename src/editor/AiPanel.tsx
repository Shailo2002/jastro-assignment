import { useEffect, useId, useRef, useState, type JSX } from 'react'

import type { TemplateDocument } from '../model/document'
import { generateProposals } from '../engine/generate-proposals'
import type { Proposal } from '../engine/proposal'
import { scenarioExamples } from '../engine/scenario-catalog'
import type { ElementId } from '../model/ids'
import type { EditScope } from '../model/viewport'
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
    <table className="proposal-card__changes">
      <caption className="visually-hidden">
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
    <section className="ai-panel" aria-labelledby="ai-heading">
      <h2 className="inspector__heading" id="ai-heading">
        AI edits
      </h2>

      <p className="inspector__hint" id={hintId}>
        A deterministic demo engine, not a model: it reads your instruction, the selected
        elements, their current values, and scope <strong>{EDIT_SCOPE_LABELS[scope]}</strong>,
        and returns proposals. Nothing changes until you accept a specific card.
        {canRun
          ? ''
          : ' Select at least one element on the canvas or in Layers to run an instruction.'}
      </p>

      <label className="field__label" htmlFor={fieldId}>
        Instruction
      </label>
      <input
        className="field__control"
        id={fieldId}
        type="text"
        autoComplete="off"
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

      <div className="ai-panel__actions">
        <button
          type="button"
          className="toolbar-button"
          disabled={!canRun}
          aria-describedby={hintId}
          onClick={() => {
            run(state.instruction)
          }}
        >
          Run instruction
        </button>
      </div>

      <details className="ai-panel__examples" open>
        <summary>Example instructions</summary>
        <ul className="ai-panel__example-list">
          {scenarioExamples().map((example) => (
            <li key={example}>
              <button
                type="button"
                className="ai-panel__example"
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

      {state.failure !== undefined && (
        <div role="alert" className="ai-panel__failure">
          <p className="field__error">{state.failure.message}</p>
          {state.failure.skipped !== undefined && state.failure.skipped.length > 0 && (
            <ul className="ai-panel__skipped">
              {state.failure.skipped.map((skip) => (
                <li key={skip.elementId}>{skip.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {view !== undefined && (
        <div className="ai-panel__results">
          <h3 className="ai-panel__results-heading" ref={resultsRef} tabIndex={-1}>
            {view.scenarioTitle}
          </h3>

          {/* The Scope Lock statement is repeated here so the reviewer reads
              what an acceptance will touch at the moment of accepting it. */}
          <p className="ai-panel__scope">
            <strong>{view.scopeText}</strong> &middot; {view.scopeLock.protectionText}
          </p>

          <p className="ai-panel__summary" role="status">
            {view.summary}
          </p>

          {view.skipped.length > 0 && (
            <ul className="ai-panel__skipped">
              {view.skipped.map((skip) => (
                <li key={skip.elementId}>{skip.message}</li>
              ))}
            </ul>
          )}

          {state.commitErrors.length > 0 && (
            <div role="alert">
              <p className="field__error">
                The change was rejected and nothing was applied. {state.commitErrors.join(' ')}
              </p>
            </div>
          )}

          <ul className="ai-panel__cards">
            {view.cards.map((card) => {
              const cardId = `proposal-${card.proposal.id}`
              return (
                <li key={card.proposal.id}>
                  <article
                    className="proposal-card"
                    aria-labelledby={`${cardId}-title`}
                    data-status={card.status}
                    data-target-id={card.proposal.elementId}
                  >
                    <h4 className="proposal-card__title" id={`${cardId}-title`}>
                      {card.targetName}
                    </h4>

                    <p className="proposal-card__meta">
                      <code className="proposal-card__id">{card.proposal.elementId}</code>
                      <span aria-hidden="true"> &middot; </span>
                      <span>{card.scopeText}</span>
                    </p>

                    <p className="proposal-card__summary">{card.proposal.summary}</p>

                    <ChangeTable card={card} />

                    <p
                      className="proposal-card__status"
                      tabIndex={-1}
                      ref={(node) => {
                        statusRefs.current.set(card.proposal.id, node)
                      }}
                    >
                      <span className="proposal-card__status-label">
                        {card.status === 'pending' ? 'Pending' : null}
                        {card.status === 'accepted' ? 'Accepted' : null}
                        {card.status === 'rejected' ? 'Rejected' : null}
                        {card.status === 'stale' ? 'Stale' : null}
                        {card.status === 'invalid' ? 'Not applicable' : null}
                      </span>{' '}
                      {card.statusText}
                    </p>

                    <div className="proposal-card__actions">
                      <button
                        type="button"
                        className="toolbar-button"
                        disabled={!card.canAccept}
                        aria-label={`Accept change for ${card.targetName}`}
                        onClick={() => {
                          decide(card, 'accepted')
                        }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="toolbar-button"
                        disabled={!card.canReject}
                        aria-label={`Reject change for ${card.targetName}`}
                        onClick={() => {
                          decide(card, 'rejected')
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

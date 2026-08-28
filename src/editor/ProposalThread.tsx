import type { JSX, RefObject } from 'react'

import type { ProposalRunFailure } from '../engine/generate-proposals'
import { Icon } from './Icon'
import { PanelHeading, ToolbarButton } from './controls'
import type { ProposalCardView, ProposalReviewView } from './proposal-review'

/**
 * One AI turn, read as a conversation.
 *
 * The instruction that was run is shown as the reviewer's own message, and the
 * generated run answers it below - so the rail states what was asked before it
 * states what came back, and a run whose instruction has since been retyped in
 * the composer still reports the words it was actually generated from.
 *
 * Nothing here changes the document. Running an instruction produces proposals
 * and leaves the canvas, the revision, and the history untouched; acceptance
 * commits exactly one card through the same validated pipeline the inspector
 * and the code surface use. Per-element outcomes are independent by
 * construction: one card, one command. There is no "accept all", because that
 * would be a single multi-target command and a reviewer could no longer decline
 * one element of it.
 *
 * This component is presentation only: the run, the decisions, and the focus
 * targets all belong to the rail that owns them.
 */

function ChangeTable(props: { card: ProposalCardView }): JSX.Element {
  return (
    // The rail is narrow and a value can be long, so the table scrolls inside
    // its own box rather than pushing the card - or the page - sideways.
    <div className="min-w-0 overflow-x-auto">
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
    </div>
  )
}

/** The reviewer's own message: the instruction exactly as it was submitted. */
function InstructionBubble(props: { instruction: string }): JSX.Element {
  return (
    <p
      className="m-0 ms-auto max-w-[85%] rounded-card rounded-ee-xs border border-default
        bg-surface-elevated px-3 py-2 text-[13px] leading-normal text-primary
        [overflow-wrap:anywhere]"
    >
      <span className="sr-only">Instruction run: </span>
      {props.instruction}
    </p>
  )
}

export function ProposalThread(props: {
  /** The current run, recomputed against live state; absent before the first. */
  view: ProposalReviewView | undefined
  failure: ProposalRunFailure | undefined
  /** Errors from the shared pipeline when an acceptance was rejected. */
  commitErrors: readonly string[]
  /** The instruction as typed when the run was started, not as typed now. */
  submittedInstruction: string | undefined
  /** Focus lands here after a run, so the next Tab is inside the results. */
  resultsRef: RefObject<HTMLHeadingElement | null>
  /** Focus lands on a card's status line after that card is decided. */
  registerStatusRef: (proposalId: string, node: HTMLParagraphElement | null) => void
  onDecide: (card: ProposalCardView, outcome: 'accepted' | 'rejected') => void
}): JSX.Element {
  const { view, failure } = props

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby="ai-heading">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="grid size-6 flex-none place-items-center rounded-pill bg-accent-brand
            text-primary"
          aria-hidden="true"
        >
          <Icon name="sparkle" className="size-[14px]" />
        </span>
        <PanelHeading id="ai-heading" className="text-primary">
          AI edits
        </PanelHeading>
      </div>

      {props.submittedInstruction !== undefined &&
        props.submittedInstruction.trim() !== '' && (
          <InstructionBubble instruction={props.submittedInstruction} />
        )}

      {/* The reply. It keeps the rail's full width rather than sitting in an
          avatar gutter: the cards inside it carry before/after tables, and 36px
          is a column of one of them. */}
      <div className="flex min-w-0 flex-col gap-3">
        {failure !== undefined && (
          <div role="alert">
            <p className="m-0 text-[11px] leading-[1.45] text-status-danger before:content-['\26A0__']">
              {failure.message}
            </p>
            {failure.skipped !== undefined && failure.skipped.length > 0 && (
              <ul className="m-0 mt-2 flex list-disc flex-col gap-1 rounded-control border-l-[3px] border-strong bg-surface-panel py-3 pe-3 ps-6 text-xs leading-[1.45] text-secondary">
                {failure.skipped.map((skip) => (
                  <li key={skip.elementId}>{skip.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {view !== undefined && (
          <>
            <h3
              className="m-0 text-sm font-semibold text-primary focus-visible:outline-2
                focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
              ref={props.resultsRef}
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

            {props.commitErrors.length > 0 && (
              <div role="alert">
                <p className="m-0 text-[11px] leading-[1.45] text-status-danger before:content-['\26A0__']">
                  The change was rejected and nothing was applied.{' '}
                  {props.commitErrors.join(' ')}
                </p>
              </div>
            )}

            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {view.cards.map((card) => {
                const cardId = `proposal-${card.proposal.id}`
                return (
                  <li key={card.proposal.id}>
                    {/* `proposal-card` is a query hook for the tests; status
                        is carried by the card's text, the edge is a second
                        cue. */}
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
                      <h4
                        className="m-0 text-[13px] font-semibold text-primary"
                        id={`${cardId}-title`}
                      >
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
                          props.registerStatusRef(card.proposal.id, node)
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
                            props.onDecide(card, 'accepted')
                          }}
                        >
                          Accept
                        </ToolbarButton>
                        <ToolbarButton
                          type="button"
                          disabled={!card.canReject}
                          aria-label={`Reject change for ${card.targetName}`}
                          onClick={() => {
                            props.onDecide(card, 'rejected')
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
          </>
        )}
      </div>
    </section>
  )
}

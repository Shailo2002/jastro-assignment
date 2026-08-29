import type { JSX } from 'react'

import type { ProposalRunFailure } from '../engine/generate-proposals'
import { Icon } from './Icon'
import { ToolbarButton } from './controls'
import {
  describeRunFailure,
  describeSkipped,
  type ProposalCardView,
  type ProposalReviewView,
} from './proposal-review'

/**
 * The undecided end of the transcript.
 *
 * A proposal is the change that has not happened yet, so it is drawn as the
 * LAST card of the history: the same card shape as a committed entry, in the
 * same column, one row further down, holding Accept and Reject where a
 * committed entry holds Restore. Read top to bottom the rail is then one list -
 * what was changed, then what is being offered - rather than a change log with
 * a second, differently shaped review surface bolted under it.
 *
 * A decided card leaves. Accepting commits it, and the commit arrives in the
 * history immediately above as an ordinary AI edit, so keeping a duplicate
 * "Accepted" card would state the same change twice; rejecting means it never
 * happened, and a transcript of things that did not happen is not a history.
 * The outcome is announced instead, which is what a screen reader needs and
 * what a repeated card was standing in for.
 *
 * Nothing here changes the document. Acceptance commits exactly one card
 * through the same validated pipeline the inspector and the code surface use;
 * per-element outcomes stay independent by construction - one card, one
 * command - which is why there is no "accept all".
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

/** The word a card wears where a committed entry wears its source. */
const STATUS_LABELS: Readonly<Record<ProposalCardView['status'], string>> = {
  pending: 'Proposed',
  accepted: 'Accepted',
  rejected: 'Rejected',
  stale: 'Stale',
  invalid: 'Not applicable',
}

export function ProposalThread(props: {
  /** The current run, recomputed against live state; absent before the first. */
  view: ProposalReviewView | undefined
  failure: ProposalRunFailure | undefined
  /** Errors from the shared pipeline when an acceptance was rejected. */
  commitErrors: readonly string[]
  /** What the last decision did, announced once and then left alone. */
  decisionNote: string | undefined
  /** Focus lands on a card's title after a run, and after the card above it goes. */
  registerCardRef: (proposalId: string, node: HTMLHeadingElement | null) => void
  onDecide: (card: ProposalCardView, outcome: 'accepted' | 'rejected') => void
}): JSX.Element {
  const { view, failure } = props

  // Decided cards are gone from the list, so the run itself is only whatever is
  // still open: proposals awaiting a decision, and ones that cannot be applied
  // and say why.
  const cards = view?.cards.filter((card) => card.status !== 'accepted' && card.status !== 'rejected') ?? []
  const skippedText = view === undefined ? undefined : describeSkipped(view.skipped)

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Proposed changes">
      {/* The run's own tally and the outcome of the last decision. Both are
          read aloud and neither is drawn: the cards below already say what is
          on offer, and a decided card has left rather than restating itself. */}
      <p className="sr-only" role="status">
        {props.decisionNote ?? view?.summary ?? ''}
      </p>

      {/* A run that produced nothing is one sentence, not a report: the
          reviewer typed something that did not apply, and the next thing they
          will do is type again. The engine's fuller account is still on the
          failure object for anyone debugging. */}
      {failure !== undefined && (
        <p
          className="m-0 text-xs leading-[1.45] text-status-danger before:content-['\26A0__']"
          role="alert"
        >
          {describeRunFailure(failure)}
        </p>
      )}

      {view !== undefined && skippedText !== undefined && (
        <p className="m-0 text-[11px] leading-[1.45] text-muted">{skippedText}</p>
      )}

      {props.commitErrors.length > 0 && (
        <div role="alert">
          <p className="m-0 text-[11px] leading-[1.45] text-status-danger before:content-['\26A0__']">
            The change was rejected and nothing was applied. {props.commitErrors.join(' ')}
          </p>
        </div>
      )}

      {cards.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {cards.map((card) => {
            const cardId = `proposal-${card.proposal.id}`
            return (
              <li key={card.proposal.id}>
                {/* `proposal-card` is a query hook for the tests. It wears the
                    committed card's shape so the offer reads as the next entry
                    of the same list; what says it is not one yet is the word
                    beside the glyph and the two buttons under it. */}
                <article
                  className="proposal-card flex min-w-0 flex-col gap-2 rounded-card border
                    border-strong border-l-[3px] bg-surface-panel p-3 shadow-hairline
                    data-[status=pending]:border-l-action-primary
                    data-[status=stale]:border-l-status-warning
                    data-[status=invalid]:border-l-status-danger"
                  aria-labelledby={`${cardId}-title`}
                  data-status={card.status}
                  data-target-id={card.proposal.elementId}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      className="grid size-6 flex-none place-items-center rounded-pill border
                        border-default bg-surface-elevated text-status-warning"
                      aria-hidden="true"
                    >
                      <Icon name="sparkle" className="size-[14px]" />
                    </span>
                    <h3
                      className="m-0 text-[13px] font-semibold text-primary
                        focus-visible:outline-2 focus-visible:outline-offset-4
                        focus-visible:outline-focus-ring"
                      id={`${cardId}-title`}
                      tabIndex={-1}
                      ref={(node) => {
                        props.registerCardRef(card.proposal.id, node)
                      }}
                    >
                      {STATUS_LABELS[card.status]} AI edit
                    </h3>
                  </div>

                  <p className="m-0 text-[11px] text-muted [overflow-wrap:anywhere]">
                    <span className="font-semibold text-secondary">{card.targetName}</span>
                    <span aria-hidden="true"> &middot; </span>
                    <span>{card.scopeText}</span>
                  </p>

                  <p className="m-0 text-xs leading-normal text-secondary">
                    {card.proposal.summary}
                  </p>

                  <ChangeTable card={card} />

                  {/* Only said when it is not obvious: a pending card is
                      explained by the two buttons under it, while one that
                      cannot be applied has to say why. */}
                  {card.status !== 'pending' && (
                    <p className="proposal-card__status m-0 text-xs leading-[1.45] text-secondary">
                      <span className="font-semibold text-primary after:content-[':']">
                        {STATUS_LABELS[card.status]}
                      </span>{' '}
                      {card.statusText}
                    </p>
                  )}

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
      )}
    </section>
  )
}

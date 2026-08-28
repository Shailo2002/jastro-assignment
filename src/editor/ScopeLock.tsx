import type { JSX } from 'react'

import type { EditScope } from '../model/viewport'
import { Icon } from './Icon'
import { describeScopeLock } from './edit-scope'

/**
 * Scope Lock indicator.
 *
 * States, before any commit, what an edit will touch and what it provably will
 * not. The statement is the same whether the edit comes from the inspector, the
 * code view, an AI proposal, or a restore, so it is drawn once: at the head of
 * the composer, which is the one surface that is always mounted and never
 * scrolls away. It was in the top bar until the composer began naming the
 * selection too - two places saying the same thing is one place too many, and
 * the bar is for controls.
 *
 * Only the SHORT form is drawn - the count and the scope, beside a lock, lit up
 * when there is something to edit. The guarantee itself is longer than a
 * toolbar can hold honestly, so the protected views and the affected element
 * names stay in the accessible name and in the tooltip: complete for anyone
 * reading with assistive technology or hovering, never a wall of truncated
 * prose across the chrome. Colour is not the carrier either way - the count,
 * the scope, and the protection are all text.
 */
export function ScopeLock(props: {
  scope: EditScope
  targetNames: readonly string[]
}): JSX.Element {
  const description = describeScopeLock({
    scope: props.scope,
    targetNames: props.targetNames,
  })

  const guidance = description.canEdit
    ? `Affected: ${description.targetNames.join(', ')}.`
    : 'Select an element on the canvas or in Layers to edit it.'

  return (
    <section
      className="flex w-fit min-w-0 flex-none items-center gap-1.5 rounded-pill border
        border-transparent px-2 py-1 text-muted
        data-[editable=true]:border-selection/45 data-[editable=true]:bg-selection-fill
        data-[editable=true]:text-action-primary"
      aria-labelledby="scope-lock-heading"
      data-scope={props.scope}
      data-editable={description.canEdit}
      title={`Scope Lock. ${description.targetText}, ${description.scopeText}. ${description.protectionText} ${guidance}`}
    >
      <h2 className="sr-only" id="scope-lock-heading">
        Scope Lock
      </h2>
      {/* The glyph changes with the state as well as the fill: an open padlock
          for nothing to edit, the selection marquee once there is. */}
      <Icon
        name={description.canEdit ? 'selection' : 'lock'}
        className="size-[13px] shrink-0"
      />

      {/* Announced politely, but the canvas status line owns the `status`
          role, so a screen reader hears one selection summary, not two. */}
      <p
        className="m-0 truncate text-[11px] font-semibold whitespace-nowrap"
        aria-live="polite"
      >
        <strong>{description.targetText}</strong>
        <span aria-hidden="true"> &middot; </span>
        <strong>{description.scopeText}</strong>
      </p>

      {/* The full guarantee. Never truncated, never abbreviated - it is simply
          not competing with the controls for horizontal room. */}
      <p className="sr-only">{description.protectionText}</p>
      <p className="sr-only">{guidance}</p>
      {description.canEdit ? (
        <ul className="sr-only">
          {description.targetNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

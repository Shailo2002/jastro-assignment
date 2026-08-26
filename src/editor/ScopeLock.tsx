import type { JSX } from 'react'

import type { EditScope } from '../model/viewport'
import { describeScopeLock } from './edit-scope'

/**
 * Scope Lock indicator.
 *
 * States, before any commit, what an edit will touch and what it provably will
 * not. Colour is never the carrier: the count, the scope, the affected names,
 * and the protected views are all text, inside a bordered block with an icon.
 */
export function ScopeLock(props: {
  scope: EditScope
  targetNames: readonly string[]
}): JSX.Element {
  const description = describeScopeLock({
    scope: props.scope,
    targetNames: props.targetNames,
  })

  return (
    <section
      className="scope-lock"
      aria-labelledby="scope-lock-heading"
      data-scope={props.scope}
      data-editable={description.canEdit}
    >
      <h2 className="scope-lock__heading" id="scope-lock-heading">
        <span className="scope-lock__icon" aria-hidden="true">
          &#128274;
        </span>
        Scope Lock
      </h2>

      {/* Announced politely, but the canvas status line owns the `status`
          role, so a screen reader hears one selection summary, not two. */}
      <p className="scope-lock__summary" aria-live="polite">
        <strong className="scope-lock__targets">{description.targetText}</strong>
        <span aria-hidden="true"> &middot; </span>
        <strong className="scope-lock__scope">{description.scopeText}</strong>
      </p>

      <p className="scope-lock__protection">{description.protectionText}</p>

      {description.canEdit ? (
        <details className="scope-lock__details">
          <summary>Affected elements</summary>
          <ul className="scope-lock__list">
            {description.targetNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="scope-lock__empty">
          Select an element on the canvas or in Layers to edit it.
        </p>
      )}
    </section>
  )
}

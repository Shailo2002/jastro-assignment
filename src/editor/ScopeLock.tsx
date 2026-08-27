import type { JSX } from 'react'

import type { EditScope } from '../model/viewport'
import { Icon } from './Icon'
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
      className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 rounded-card border
        border-transparent px-2 py-1 data-[editable=true]:border-selection
        data-[editable=true]:bg-selection-fill/70 max-[900px]:flex-wrap"
      aria-labelledby="scope-lock-heading"
      data-scope={props.scope}
      data-editable={description.canEdit}
    >
      <h2
        className="m-0 flex flex-none items-center gap-2 text-xs font-semibold tracking-[0.06em]
          text-muted uppercase"
        id="scope-lock-heading"
      >
        <Icon name="lock" />
        Scope Lock
      </h2>

      {/* Announced politely, but the canvas status line owns the `status`
          role, so a screen reader hears one selection summary, not two. */}
      <p
        className="m-0 flex-none text-sm whitespace-nowrap text-primary max-[900px]:whitespace-normal"
        aria-live="polite"
      >
        <strong>{description.targetText}</strong>
        <span aria-hidden="true"> &middot; </span>
        <strong>{description.scopeText}</strong>
      </p>

      {/* The explanatory sentence is the only part that gives way, and only
          when there is genuinely no room: the text stays in the DOM. */}
      <p className="m-0 min-w-0 flex-[0_1_auto] truncate text-xs leading-[1.45] text-secondary
        max-[900px]:overflow-visible max-[900px]:whitespace-normal">
        {description.protectionText}
      </p>

      {description.canEdit ? (
        <details className="flex-none text-xs text-secondary">
          <summary className="min-h-6 cursor-pointer">Affected elements</summary>
          <ul className="m-0 mt-2 flex list-disc flex-col gap-0.5 ps-4 text-muted">
            {description.targetNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="m-0 min-w-0 flex-[0_1_auto] truncate text-xs leading-[1.45] text-secondary
          max-[900px]:overflow-visible max-[900px]:whitespace-normal">
          Select an element on the canvas or in Layers to edit it.
        </p>
      )}
    </section>
  )
}

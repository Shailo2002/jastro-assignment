import type { JSX } from 'react'

import { EDIT_SCOPES, type EditScope } from '../model/viewport'
import { EDIT_SCOPE_LABELS } from './edit-scope'

const SCOPE_META: Readonly<Record<EditScope, string>> = {
  all: 'shared',
  desktop: '1440px',
  tablet: '768px',
  mobile: '375px',
}

/**
 * Edit scope control.
 *
 * Deliberately a separate control from the preview viewport, with its own
 * label and its own wording ("All views", "Mobile only"): choosing what an edit
 * writes to must never be confused with choosing what is on screen.
 */
export function ScopeSwitcher(props: {
  value: EditScope
  onChange: (scope: EditScope) => void
}): JSX.Element {
  const { value, onChange } = props

  return (
    <div className="segmented" role="group" aria-label="Edit scope">
      {EDIT_SCOPES.map((scope) => {
        const selected = scope === value
        return (
          <button
            key={scope}
            type="button"
            className="segmented__item"
            aria-pressed={selected}
            onClick={() => {
              onChange(scope)
            }}
          >
            <span className="segmented__label">{EDIT_SCOPE_LABELS[scope]}</span>
            <span className="segmented__meta">{SCOPE_META[scope]}</span>
          </button>
        )
      })}
    </div>
  )
}

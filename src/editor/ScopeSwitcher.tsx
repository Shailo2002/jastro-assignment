import type { JSX } from 'react'

import { SegmentedGroup, SegmentedItem } from './controls'
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
    <SegmentedGroup label="Edit scope" tone="scope">
      {EDIT_SCOPES.map((scope) => (
        <SegmentedItem
          key={scope}
          type="button"
          className="min-h-9"
          aria-pressed={scope === value}
          label={EDIT_SCOPE_LABELS[scope]}
          meta={SCOPE_META[scope]}
          onClick={() => {
            onChange(scope)
          }}
        />
      ))}
    </SegmentedGroup>
  )
}

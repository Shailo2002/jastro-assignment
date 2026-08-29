import type { JSX } from 'react'

import { SegmentedGroup, SegmentedItem } from './controls'
import { EDIT_SCOPES, type EditScope } from '../model/viewport'
import { EDIT_SCOPE_LABELS } from './edit-scope'

/** What the control writes on screen, one word each. */
const SCOPE_SHORT: Readonly<Record<EditScope, string>> = {
  all: 'All',
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
}

/** The width each scope stands for, kept out of the visible label. */
const SCOPE_META: Readonly<Record<EditScope, string>> = {
  all: 'shared',
  desktop: '1440px',
  tablet: '768px',
  mobile: '375px',
}

/**
 * Edit scope control.
 *
 * Deliberately a separate control from the preview viewport: choosing what an
 * edit writes to must never be confused with choosing what is on screen. The
 * two were kept apart by wording alone ("Desktop" against "Desktop only"),
 * which cost four long labels in a toolbar that has other work to do. The word
 * `Scope` is printed once, in front of the capsule, and each item is then a
 * single word - shorter than the old labels and less ambiguous, because the
 * question is asked out loud instead of being implied by a suffix.
 *
 * The full wording stays in every item's accessible name, along with the width
 * it stands for, so nothing is lost to anyone reading by ear.
 */
export function ScopeSwitcher(props: {
  value: EditScope
  onChange: (scope: EditScope) => void
}): JSX.Element {
  const { value, onChange } = props

  return (
    <div className="flex min-w-0 flex-none items-center gap-2">
      {/* The question, asked once in front of the answers. It is decoration
          for assistive technology - the group is named `Edit scope` either way
          - so a toolbar short of room drops it rather than a control. */}
      <span
        className="flex-none text-[11px] whitespace-nowrap text-muted max-[1400px]:hidden"
        aria-hidden="true"
      >
        Scope
      </span>
      <SegmentedGroup label="Edit scope">
        {EDIT_SCOPES.map((scope) => (
          <SegmentedItem
            key={scope}
            type="button"
            className="min-h-touch"
            aria-pressed={scope === value}
            aria-label={`${EDIT_SCOPE_LABELS[scope]}, ${SCOPE_META[scope]}`}
            label={SCOPE_SHORT[scope]}
            onClick={() => {
              onChange(scope)
            }}
          />
        ))}
      </SegmentedGroup>
    </div>
  )
}

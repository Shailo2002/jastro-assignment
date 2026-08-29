import type { JSX } from 'react'

import { SegmentedGroup, SegmentedItem } from './controls'
import type { IconName } from './Icon'
import { EDIT_SCOPES, type EditScope } from '../model/viewport'
import { EDIT_SCOPE_LABELS } from './edit-scope'

/** What the control writes on screen, one word each. */
const SCOPE_SHORT: Readonly<Record<EditScope, string>> = {
  all: 'All',
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
}

/**
 * The glyph each scope rests as when it is not the chosen one: the device it
 * writes to, and the stack for the shared value every view reads.
 */
const SCOPE_ICONS: Readonly<Record<EditScope, IconName>> = {
  all: 'layers',
  desktop: 'monitor',
  tablet: 'tablet',
  mobile: 'smartphone',
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
 * which cost four long labels in a toolbar that has other work to do. The
 * question is instead asked once, in front of the capsule, and each item is
 * then a single word.
 *
 * That question is printed as `Editing` rather than `Scope`. "Scope" is our
 * word for it - it names the concept in the model, the commit pipeline, and
 * the accessible name of this group - but it tells a first-time reader
 * nothing. `Editing Mobile` is the same fact stated as a sentence they are
 * already in the middle of, and it cannot be misread as a filter over what is
 * shown.
 *
 * Only the chosen scope spells its word; the other three rest as the glyph of
 * the view they write to, the same shape the panel switcher wears. That keeps
 * a four-item capsule about as wide as a two-item one in a strip that also has
 * to hold the selection, and it means the answer is legible from shape alone,
 * before any colour is read.
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
      {/* The question, asked once in front of the answers, and worded the way
          the person reading it would word it. It is decoration for assistive
          technology - the group is named `Edit scope` either way - so a
          toolbar short of room drops it rather than a control. */}
      <span
        className="flex-none text-[11px] whitespace-nowrap text-muted max-[1400px]:hidden"
        aria-hidden="true"
      >
        Editing
      </span>
      <SegmentedGroup label="Edit scope">
        {EDIT_SCOPES.map((scope) => (
          <SegmentedItem
            key={scope}
            type="button"
            className="min-h-touch"
            icon={SCOPE_ICONS[scope]}
            labelOnlyWhenPressed
            aria-pressed={scope === value}
            aria-label={`${EDIT_SCOPE_LABELS[scope]}, ${SCOPE_META[scope]}`}
            title={`${EDIT_SCOPE_LABELS[scope]}, ${SCOPE_META[scope]}`}
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

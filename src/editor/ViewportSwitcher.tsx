import type { JSX } from 'react'

import { SegmentedGroup, SegmentedItem } from './controls'
import { VIEWPORTS, VIEWPORT_WIDTHS, type Viewport } from '../model/viewport'

const VIEWPORT_LABELS: Readonly<Record<Viewport, string>> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
}

/**
 * Preview viewport control.
 *
 * A segmented control of real buttons. The selected item exposes
 * `aria-pressed="true"`, and the width is part of the accessible name, so the
 * current preview is never communicated by colour alone.
 *
 * This changes which projection is shown. It is NOT the edit scope; that is a
 * separate control so the two can never be visually confused.
 */
export function ViewportSwitcher(props: {
  value: Viewport
  onChange: (viewport: Viewport) => void
}): JSX.Element {
  const { value, onChange } = props

  return (
    <SegmentedGroup label="Preview viewport">
      {VIEWPORTS.map((viewport) => (
        <SegmentedItem
          key={viewport}
          type="button"
          className="min-h-touch"
          aria-pressed={viewport === value}
          label={VIEWPORT_LABELS[viewport]}
          meta={`${VIEWPORT_WIDTHS[viewport]}px`}
          metaHidden
          onClick={() => {
            onChange(viewport)
          }}
        />
      ))}
    </SegmentedGroup>
  )
}

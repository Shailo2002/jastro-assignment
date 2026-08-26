import type { JSX } from 'react'

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
    <div className="segmented" role="group" aria-label="Preview viewport">
      {VIEWPORTS.map((viewport) => {
        const selected = viewport === value
        return (
          <button
            key={viewport}
            type="button"
            className="segmented__item"
            aria-pressed={selected}
            onClick={() => {
              onChange(viewport)
            }}
          >
            <span className="segmented__label">{VIEWPORT_LABELS[viewport]}</span>
            <span className="segmented__meta">{VIEWPORT_WIDTHS[viewport]}px</span>
          </button>
        )
      })}
    </div>
  )
}

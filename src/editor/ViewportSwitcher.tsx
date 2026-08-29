import type { JSX } from 'react'

import { IconButton } from './controls'
import type { IconName } from './Icon'
import { VIEWPORTS, VIEWPORT_WIDTHS, type Viewport } from '../model/viewport'

const VIEWPORT_LABELS: Readonly<Record<Viewport, string>> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
}

/** The glyph is the whole control, so it has to read as the device itself. */
const VIEWPORT_ICONS: Readonly<Record<Viewport, IconName>> = {
  desktop: 'monitor',
  tablet: 'tablet',
  mobile: 'smartphone',
}

/** Desktop -> Tablet -> Mobile -> Desktop. */
function nextViewport(current: Viewport): Viewport {
  const index = VIEWPORTS.indexOf(current)
  return VIEWPORTS[(index + 1) % VIEWPORTS.length] ?? 'desktop'
}

/**
 * Preview viewport control.
 *
 * One button that cycles through the three previews rather than a segmented
 * row of three. The top bar is chrome around the thing under review, and the
 * viewport is a single question with a single current answer, so it costs one
 * control - the same shape the rest of the bar's icon actions use. It sits in
 * that bar, beside the panel switcher: both choose what the shell shows, and
 * neither is a fact about the edit being made.
 *
 * Being icon-only, the whole state lives in the accessible name, and the name
 * says both halves out loud: what is on screen NOW, and what one press will
 * change it to. Nothing here is carried by colour, and the device glyph changes
 * with the state, so the control survives a greyscale screenshot.
 *
 * This changes which projection is shown. It is NOT the edit scope; that is a
 * separate control, worded differently, so the two can never be confused.
 */
export function ViewportSwitcher(props: {
  value: Viewport
  onChange: (viewport: Viewport) => void
}): JSX.Element {
  const { value, onChange } = props
  const next = nextViewport(value)
  const name =
    `Preview viewport: ${VIEWPORT_LABELS[value]} ${VIEWPORT_WIDTHS[value]}px.` +
    ` Switch to ${VIEWPORT_LABELS[next]}.`

  return (
    <IconButton
      type="button"
      variant="chrome"
      icon={VIEWPORT_ICONS[value]}
      aria-label={name}
      title={name}
      onClick={() => {
        onChange(next)
      }}
    />
  )
}

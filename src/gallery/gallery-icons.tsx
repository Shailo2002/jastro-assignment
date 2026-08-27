import type { JSX } from 'react'

/**
 * The gallery's icon set.
 *
 * Kept beside the gallery rather than shared with the editor's `Icon`: the two
 * surfaces have different vocabularies, and the catalog should not depend on
 * editor internals. Emoji are never used as interface icons - these are inline
 * stroke SVGs that take `currentColor`, so an icon always matches the text it
 * sits beside. Every icon is decorative by construction; the meaning belongs to
 * the label next to it, or to the accessible name of an icon-only control.
 */

export type GalleryIconName =
  | 'search'
  | 'grid'
  | 'megaphone'
  | 'portfolio'
  | 'chart'
  | 'arrow-right'
  | 'panel-left'
  | 'bolt'
  | 'clock'

const PATHS: Readonly<Record<GalleryIconName, JSX.Element>> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4a1 1 0 0 0 1 1h3l7 4V5L8 9H5a1 1 0 0 0-1 1Z" />
      <path d="M18.5 9.5a3.5 3.5 0 0 1 0 5" />
    </>
  ),
  portfolio: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M3 12h18" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 17v-5" />
      <path d="M13 17V8" />
      <path d="M18 17v-8" />
    </>
  ),
  'arrow-right': <path d="M5 12h13m-5-6 6 6-6 6" />,
  'panel-left': (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
    </>
  ),
  bolt: <path d="M13.5 3 5.5 13.5H11L10.5 21l8-10.5H13L13.5 3Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.3l2.6 2.2" />
    </>
  ),
}

export function GalleryIcon(props: {
  name: GalleryIconName
  className?: string
}): JSX.Element {
  return (
    <svg
      className={props.className === undefined ? 'g-icon' : `g-icon ${props.className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-icon={props.name}
    >
      {PATHS[props.name]}
    </svg>
  )
}

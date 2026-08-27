import type { JSX } from 'react'

/**
 * The editor's icon set.
 *
 * Emoji are never used as interface icons: they are inconsistent across
 * platforms, they carry their own announcement in assistive technology, and
 * they cannot inherit the token colours. These are inline stroke SVGs that take
 * `currentColor`, so an icon always matches the text it sits beside.
 *
 * Every icon is decorative by construction (`aria-hidden`, `focusable="false"`).
 * The meaning belongs to the text next to it, or - for an icon-only control -
 * to that control's own accessible name.
 */

export type IconName =
  | 'lock'
  | 'warning'
  | 'panel-left'
  | 'panel-right'
  | 'chevron-left'
  | 'monitor'
  | 'code'
  | 'layers'
  | 'sliders'
  | 'close'
  | 'clock'
  | 'sparkle'
  | 'send'

const PATHS: Readonly<Record<IconName, JSX.Element>> = {
  lock: (
    <>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 17.5v.5" />
    </>
  ),
  'panel-left': (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  'panel-right': (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </>
  ),
  'chevron-left': <path d="m15 18-6-6 6-6" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
    </>
  ),
  code: (
    <>
      <path d="m9 8-4 4 4 4" />
      <path d="m15 8 4 4-4 4" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 14 9 5 9-5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 17h4" />
      <path d="M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" />
      <path d="M18.5 16.5 19.2 18.6 21.3 19.3 19.2 20 18.5 22.1 17.8 20 15.7 19.3 17.8 18.6Z" />
    </>
  ),
  send: (
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
}

/** Base geometry every editor icon shares; callers add size and colour. */
const ICON_CLASS =
  'size-5 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]'

export function Icon(props: { name: IconName; className?: string }): JSX.Element {
  return (
    <svg
      className={
        props.className === undefined ? ICON_CLASS : `${ICON_CLASS} ${props.className}`
      }
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-icon={props.name}
    >
      {PATHS[props.name]}
    </svg>
  )
}

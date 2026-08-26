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

export type IconName = 'lock' | 'warning' | 'panel-left' | 'panel-right' | 'chevron-left'

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
}

export function Icon(props: { name: IconName; className?: string }): JSX.Element {
  return (
    <svg
      className={props.className === undefined ? 'icon' : `icon ${props.className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-icon={props.name}
    >
      {PATHS[props.name]}
    </svg>
  )
}

import type { ComponentProps, JSX, ReactNode } from 'react'

import { Icon, type IconName } from './Icon'

/**
 * The editor's repeated controls.
 *
 * Everything else in the editor carries its own styling in `className`, but
 * these four shapes appear in a dozen files, and a toolbar where one button is
 * a pixel taller than its neighbour reads as a bug. Each one owns its base
 * utilities here; callers pass content, state, and any extra classes.
 *
 * The rules they all share:
 * - the pressed state is fill + border + a `✓` text mark, never colour alone;
 * - disabled stays legible (AA contrast, dashed border), because the panel that
 *   owns the control explains the prerequisite in text;
 * - the touch target is 44px wherever a pointer or finger can reach it.
 */

/** Marks a pressed control in text as well as in fill. */
const PRESSED_MARK = "aria-pressed:after:content-['_✓']"

const DISABLED =
  'disabled:cursor-not-allowed disabled:border-dashed disabled:bg-surface-panel' +
  ' disabled:text-muted disabled:transform-none'

/**
 * A text button.
 *
 * `chrome` is the toolbar treatment - panel fill, hairline rim, 10px radius, so
 * every control in the top bar reads as one family. `panel` is the plainer
 * treatment used inside the rail, the docks, and the cards.
 */
export function ToolbarButton({
  variant = 'panel',
  tone = 'neutral',
  className = '',
  children,
  ...rest
}: ComponentProps<'button'> & {
  variant?: 'chrome' | 'panel'
  /**
   * `primary` is the one filled action a panel may hold - running an AI
   * instruction. Kept a variant rather than an extra `className` so no caller
   * ends up with two background utilities fighting for the same button.
   */
  tone?: 'neutral' | 'primary'
}): JSX.Element {
  const base =
    'min-h-touch cursor-pointer px-4 py-2 font-medium transition-colors duration-instant' +
    ` active:translate-y-px ${PRESSED_MARK} ${DISABLED}`
  const pressed =
    'aria-pressed:border-selection aria-pressed:bg-surface-hover aria-pressed:text-primary'
  const chrome =
    'rounded-input border border-default bg-surface-panel text-xs text-secondary' +
    ' shadow-hairline hover:bg-surface-elevated hover:text-primary active:border-strong'
  const panel =
    'rounded-control border border-default bg-surface-elevated text-sm text-secondary' +
    ' hover:bg-surface-hover hover:text-primary active:border-strong'
  const primary =
    'rounded-input border border-action-primary bg-action-primary text-sm text-on-accent' +
    ' hover:not-disabled:border-action-primary-hover hover:not-disabled:bg-action-primary-hover'

  const skin =
    tone === 'primary' ? primary : `${variant === 'chrome' ? chrome : panel} ${pressed}`

  return (
    <button className={`${base} ${skin} ${className}`} {...rest}>
      {children}
    </button>
  )
}

/**
 * An icon-only control. It always carries an accessible name and a tooltip,
 * and when it is pressed it grows a dot in the corner so the state survives a
 * greyscale screenshot.
 */
export function IconButton({
  icon,
  className = '',
  ...rest
}: ComponentProps<'button'> & { icon: IconName }): JSX.Element {
  return (
    <button
      className={`relative inline-flex size-touch cursor-pointer items-center justify-center
        rounded-control border border-default bg-surface-elevated p-0 text-secondary
        transition-colors duration-instant hover:bg-surface-hover hover:text-primary
        active:bg-surface-elevated aria-pressed:border-selection aria-pressed:text-primary
        aria-pressed:after:absolute aria-pressed:after:right-1 aria-pressed:after:bottom-1
        aria-pressed:after:size-1.5 aria-pressed:after:rounded-pill
        aria-pressed:after:bg-action-primary aria-pressed:after:content-['']
        ${DISABLED} ${className}`}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  )
}

/**
 * Opens one of the right-hand docks. Below 620px the label is dropped and the
 * icon stands alone - the accessible name never changes.
 */
export function DockToggle({
  icon,
  label,
  className = '',
  ...rest
}: ComponentProps<'button'> & {
  icon: IconName
  label: string
}): JSX.Element {
  return (
    <button
      className={`inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-input
        border border-default bg-surface-panel px-3 py-2 text-xs font-medium text-secondary
        shadow-hairline transition-colors duration-instant hover:bg-surface-elevated
        hover:text-primary active:translate-y-px aria-pressed:border-selection
        aria-pressed:bg-surface-hover aria-pressed:text-primary ${PRESSED_MARK} ${className}`}
      {...rest}
    >
      <Icon name={icon} />
      <span className="max-[620px]:hidden">{label}</span>
    </button>
  )
}

/**
 * A segmented control: a real `group` of real buttons, one of which reports
 * `aria-pressed="true"`. Used for the preview viewport and for the edit scope,
 * which are deliberately two separate controls.
 */
export function SegmentedGroup({
  label,
  tone = 'chrome',
  children,
}: {
  label: string
  /** `chrome` sits in the top toolbar, `scope` in the scope bar below it. */
  tone?: 'chrome' | 'scope'
  children: ReactNode
}): JSX.Element {
  const skin =
    tone === 'chrome'
      ? 'gap-1 rounded-input border border-default bg-surface-panel p-0.5 shadow-hairline'
      : 'gap-1 rounded-control border border-default bg-surface-elevated p-1'
  return (
    <div className={`flex flex-wrap ${skin}`} role="group" aria-label={label}>
      {children}
    </div>
  )
}

/** One item of a `SegmentedGroup`; `meta` is the width or scope hint. */
export function SegmentedItem({
  label,
  meta,
  metaHidden = false,
  className = '',
  ...rest
}: ComponentProps<'button'> & {
  label: string
  meta: string
  /** Keeps `meta` in the accessible name but out of the picture. */
  metaHidden?: boolean
}): JSX.Element {
  return (
    <button
      className={`group/seg flex min-w-0 cursor-pointer items-baseline justify-center gap-2 rounded-control
        border border-transparent px-3 py-1 text-secondary transition-colors duration-instant
        hover:bg-surface-hover hover:text-primary active:bg-surface-elevated
        aria-pressed:border-selection aria-pressed:bg-surface-hover aria-pressed:text-primary
        ${DISABLED} ${className}`}
      {...rest}
    >
      {/* The mark reads the pressed state from the button, so the ✓ lands
          beside the label rather than after the width hint. */}
      <span className="text-xs font-semibold group-aria-pressed/seg:after:content-['_✓']">
        {label}
      </span>
      <span className={metaHidden ? 'sr-only' : 'text-xs text-muted'}>{meta}</span>
    </button>
  )
}

/**
 * A panel section title: 12px/600 with normal casing, per DESIGN_SYSTEM.md -
 * never faint all-caps micro type.
 */
export function PanelHeading({
  id,
  className = '',
  children,
}: {
  id?: string
  className?: string
  children: ReactNode
}): JSX.Element {
  return (
    <h2 id={id} className={`m-0 text-xs font-semibold text-secondary ${className}`}>
      {children}
    </h2>
  )
}

/** Explanatory text under a panel heading, or an empty state's one line. */
export function PanelHint({
  elementId,
  className = '',
  children,
}: {
  /** Set when a control points at this text with `aria-describedby`. */
  elementId?: string
  className?: string
  children: ReactNode
}): JSX.Element {
  return (
    <p id={elementId} className={`m-0 text-xs leading-[1.45] text-muted ${className}`}>
      {children}
    </p>
  )
}

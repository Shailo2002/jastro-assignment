import type { ComponentProps, JSX, ReactNode } from 'react'

import { Icon, type IconName } from './Icon'

/**
 * The editor's repeated controls.
 *
 * Everything else in the editor carries its own styling in `className`, but
 * these shapes appear in a dozen files, and a toolbar where one button is a
 * pixel taller than its neighbour reads as a bug. Each one owns its base
 * utilities here; callers pass content, state, and any extra classes.
 *
 * The rules they all share:
 * - the pressed state INVERTS the chip - a filled surface with dark ink - so it
 *   differs from its neighbours in luminance, not merely in hue, and survives a
 *   greyscale screenshot without a tick or any other mark bolted onto the
 *   label; `aria-pressed` carries the same fact to assistive technology;
 * - disabled stays legible (AA contrast, dashed border), because the panel that
 *   owns the control explains the prerequisite in text;
 * - the touch target is 44px wherever a pointer or finger can reach it.
 *
 * Toolbar controls separate the TARGET from the SKIN: the button element keeps
 * the full 44px target, and a nested span paints a 32px pill inside it. That is
 * what lets the top bar read as a light row of chips without any control
 * shrinking below the pointer and touch size the accessibility suite measures
 * on the real element.
 */

/** Disabled treatment for a control that paints its own surface. */
const DISABLED =
  'disabled:cursor-not-allowed disabled:border-dashed disabled:bg-surface-panel' +
  ' disabled:text-muted disabled:transform-none'

/**
 * Disabled treatment for a control whose surface lives on an inner span; the
 * outer element must stay transparent or it would paint a box around the pill.
 */
const DISABLED_TARGET =
  'disabled:cursor-not-allowed disabled:text-muted disabled:transform-none'

/** The inner pill every toolbar chip wears: 32px tall, fully rounded. */
const CHIP =
  'inline-flex min-h-8 min-w-0 items-center justify-center gap-1.5 rounded-pill border' +
  ' border-transparent px-3 transition-colors duration-instant'

/**
 * The pressed skin for a chip that is one CHOICE among peers - which panel is
 * docked, which scope an edit writes to. Inverting it to the action fill is
 * what makes the chosen one legible at a glance in a row of identical shapes.
 */
const CHIP_PRESSED =
  'group-aria-pressed/chip:border-action-primary group-aria-pressed/chip:bg-action-primary' +
  ' group-aria-pressed/chip:text-on-accent'

/**
 * The pressed skin for a chip that is its own ON/OFF toggle, with no peers to
 * be told apart from. It lifts the surface and strengthens the rim rather than
 * taking the action fill, so the bar never reads as though several unrelated
 * things were selected at once.
 */
const CHIP_TOGGLED =
  'group-aria-pressed/chip:border-strong group-aria-pressed/chip:bg-surface-hover' +
  ' group-aria-pressed/chip:text-primary'

/**
 * A text button.
 *
 * `chrome` is the toolbar treatment - a 32px pill inside a 44px target, so
 * every control in the top bar reads as one family of chips. `panel` is the
 * plainer treatment used inside the rail, the docks, and the cards.
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
  if (variant === 'chrome' && tone !== 'primary') {
    return (
      <button
        className={`group/chip inline-flex min-h-touch cursor-pointer items-center justify-center
          rounded-pill px-0.5 text-xs font-medium text-secondary transition-colors
          duration-instant hover:text-primary active:translate-y-px
          ${DISABLED_TARGET} ${className}`}
        {...rest}
      >
        <span
          className={`${CHIP} border-default bg-surface-panel shadow-hairline
            group-hover/chip:bg-surface-elevated group-disabled/chip:border-dashed
            ${CHIP_TOGGLED}`}
        >
          {children}
        </span>
      </button>
    )
  }

  const base =
    'min-h-touch cursor-pointer px-4 py-2 font-medium transition-colors duration-instant' +
    ` active:translate-y-px ${DISABLED}`
  const pressed =
    'aria-pressed:border-action-primary aria-pressed:bg-action-primary' +
    ' aria-pressed:text-on-accent'
  const panel =
    'rounded-control border border-default bg-surface-elevated text-sm text-secondary' +
    ' hover:bg-surface-hover hover:text-primary active:border-strong'
  const primary =
    'rounded-input border border-action-primary bg-action-primary text-sm text-on-accent' +
    ' hover:not-disabled:border-action-primary-hover hover:not-disabled:bg-action-primary-hover'

  const skin = tone === 'primary' ? primary : `${panel} ${pressed}`

  return (
    <button className={`${base} ${skin} ${className}`} {...rest}>
      {children}
    </button>
  )
}

/**
 * An icon-only control. It always carries an accessible name and a tooltip, and
 * the pressed state inverts the glyph well, so it never rests on colour.
 *
 * `chrome` is the top-bar treatment: a 44px target with a 32px round well
 * inside it, so it lines up with the toolbar chips.
 */
export function IconButton({
  icon,
  variant = 'panel',
  className = '',
  ...rest
}: ComponentProps<'button'> & { icon: IconName; variant?: 'chrome' | 'panel' }): JSX.Element {
  if (variant === 'chrome') {
    return (
      <button
        className={`group/chip inline-flex size-touch cursor-pointer items-center justify-center
          rounded-pill p-0 text-secondary transition-colors duration-instant
          hover:text-primary ${DISABLED_TARGET} ${className}`}
        {...rest}
      >
        <span
          className={`grid size-8 place-items-center rounded-pill border border-transparent
            transition-colors duration-instant group-hover/chip:bg-surface-elevated
            ${CHIP_PRESSED}`}
        >
          <Icon name={icon} className="size-[18px]" />
        </span>
      </button>
    )
  }

  return (
    <button
      className={`inline-flex size-touch cursor-pointer items-center justify-center
        rounded-control border border-default bg-surface-elevated p-0 text-secondary
        transition-colors duration-instant hover:bg-surface-hover hover:text-primary
        aria-pressed:border-action-primary aria-pressed:bg-action-primary
        aria-pressed:text-on-accent ${DISABLED} ${className}`}
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
        hover:text-primary active:translate-y-px aria-pressed:border-action-primary
        aria-pressed:bg-action-primary aria-pressed:text-on-accent ${className}`}
      {...rest}
    >
      <Icon name={icon} />
      <span className="max-[620px]:hidden">{label}</span>
    </button>
  )
}

/**
 * A segmented control: a real `group` of real buttons, one of which reports
 * `aria-pressed="true"`.
 *
 * In the top bar the track is drawn by a pseudo-element inset inside the row,
 * so the group reads as one 36px capsule while each button inside it keeps its
 * full 44px target.
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
      ? 'gap-0 rounded-pill before:pointer-events-none before:absolute' +
        ' before:inset-x-0 before:inset-y-1 before:rounded-pill before:border' +
        ' before:border-default before:bg-surface-panel before:shadow-hairline'
      : 'gap-1 rounded-control border border-default bg-surface-elevated p-1'
  return (
    <div
      className={`relative flex flex-wrap items-center ${skin}`}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  )
}

/**
 * One item of a `SegmentedGroup`; `meta` is the width or scope hint. There is
 * no whitespace between the label and the hint, so an item whose name needs a
 * word beyond its label carries `aria-label` and omits `meta` rather than
 * gluing the two together.
 *
 * The button is the target; the span inside it is the chip that is seen.
 */
export function SegmentedItem({
  label,
  meta,
  metaHidden = false,
  labelOnlyWhenPressed = false,
  icon,
  className = '',
  ...rest
}: ComponentProps<'button'> & {
  label: string
  meta?: string
  /** Keeps `meta` in the accessible name but out of the picture. */
  metaHidden?: boolean
  /**
   * Shows the label only on the pressed item, leaving the rest as glyphs. The
   * text stays in the DOM either way, and it means the selected item differs
   * from its neighbours in SHAPE as well as in fill.
   */
  labelOnlyWhenPressed?: boolean
  /** Decorative glyph before the label; the label still carries the meaning. */
  icon?: IconName
}): JSX.Element {
  return (
    <button
      className={`group/chip relative flex min-w-0 cursor-pointer items-center justify-center
        rounded-pill px-0.5 text-secondary transition-colors duration-instant
        hover:text-primary active:translate-y-px ${DISABLED_TARGET} ${className}`}
      {...rest}
    >
      <span
        className={`${CHIP} px-2.5 group-hover/chip:bg-surface-hover
          group-disabled/chip:border-dashed group-disabled/chip:border-default ${CHIP_PRESSED}`}
      >
        {icon === undefined ? null : (
          <Icon name={icon} className="size-4" aria-hidden="true" />
        )}
        <span
          className={`truncate text-xs font-semibold ${
            labelOnlyWhenPressed ? 'sr-only group-aria-pressed/chip:not-sr-only' : ''
          }`}
        >
          {label}
        </span>
        {meta === undefined ? null : (
          <span
            className={
              metaHidden
                ? 'sr-only'
                : /* Never a translucent tint: on the pressed fill it has to be
                     a solid ink that still clears AA. */
                  'text-xs text-muted group-aria-pressed/chip:text-on-accent'
            }
          >
            {meta}
          </span>
        )}
      </span>
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

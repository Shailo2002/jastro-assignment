import {
  ArrowUp,
  ChevronLeft,
  Clock,
  Code,
  Layers,
  Lock,
  Monitor,
  PanelLeft,
  PanelRight,
  Smartphone,
  SlidersHorizontal,
  Sparkles,
  SquareDashedMousePointer,
  Tablet,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { JSX } from 'react'

/**
 * The editor's icon set.
 *
 * The glyphs come from `lucide-react`: one maintained, optically consistent
 * family, shipped as inline SVG components in the bundle rather than fetched
 * from a CDN, so the app still renders identically offline. Emoji are never
 * used as interface icons - they are inconsistent across platforms, they carry
 * their own announcement in assistive technology, and they cannot inherit the
 * token colours.
 *
 * The indirection is deliberate: components ask for a ROLE (`warning`, `code`,
 * `viewport-mobile`), not for a vendor component. Swapping the family, or one
 * glyph within it, is a change to this file alone.
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
  | 'tablet'
  | 'smartphone'
  | 'code'
  | 'layers'
  | 'sliders'
  | 'close'
  | 'clock'
  | 'sparkle'
  | 'send'
  | 'selection'

const GLYPHS: Readonly<Record<IconName, LucideIcon>> = {
  lock: Lock,
  warning: TriangleAlert,
  'panel-left': PanelLeft,
  'panel-right': PanelRight,
  'chevron-left': ChevronLeft,
  monitor: Monitor,
  tablet: Tablet,
  smartphone: Smartphone,
  code: Code,
  layers: Layers,
  sliders: SlidersHorizontal,
  close: X,
  clock: Clock,
  sparkle: Sparkles,
  send: ArrowUp,
  selection: SquareDashedMousePointer,
}

/** Base geometry every editor icon shares; callers add size and colour. */
const ICON_CLASS = 'size-5 shrink-0'

export function Icon(props: { name: IconName; className?: string }): JSX.Element {
  const Glyph = GLYPHS[props.name]
  return (
    <Glyph
      className={
        props.className === undefined ? ICON_CLASS : `${ICON_CLASS} ${props.className}`
      }
      /* Lucide's default 2px stroke reads heavy beside 12px chip labels; 1.8
         matches the weight the rest of the shell was drawn at. */
      strokeWidth={1.8}
      aria-hidden="true"
      focusable="false"
      data-icon={props.name}
    />
  )
}

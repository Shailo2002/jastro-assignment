import type {
  BoxSpacing,
  Dimension,
  EditableProperties,
} from '../model/properties'
import type { CSSProperties } from 'react'

/**
 * Resolved properties -> inline React styles.
 *
 * The template's appearance comes from validated data, so these values are
 * genuinely dynamic and belong inline. Editor chrome uses CSS tokens instead;
 * no raw colour literal is written in a component file. Values reaching here
 * have already passed the property schema, so no sanitising is needed.
 *
 * Pure and total: an absent property produces an absent CSS declaration rather
 * than a default, so the stylesheet's own defaults still apply.
 */

function dimensionToCss(value: Dimension): string {
  if (value === 'auto') return 'auto'
  return `${value.value}${value.unit === 'rem' ? 'rem' : value.unit}`
}

function alignmentToCss(value: 'start' | 'center' | 'end' | 'stretch'): string {
  switch (value) {
    case 'start':
      return 'flex-start'
    case 'end':
      return 'flex-end'
    default:
      return value
  }
}

function justificationToCss(
  value: 'start' | 'center' | 'end' | 'space-between',
): string {
  switch (value) {
    case 'start':
      return 'flex-start'
    case 'end':
      return 'flex-end'
    default:
      return value
  }
}

function applyBox(
  target: Record<string, string>,
  prefix: 'padding' | 'margin',
  box: BoxSpacing,
): void {
  // Only the named sides are written, so a partial box keeps the others.
  if (box.top !== undefined) target[`${prefix}Top`] = `${box.top}px`
  if (box.right !== undefined) target[`${prefix}Right`] = `${box.right}px`
  if (box.bottom !== undefined) target[`${prefix}Bottom`] = `${box.bottom}px`
  if (box.left !== undefined) target[`${prefix}Left`] = `${box.left}px`
}

/** Named shadow levels resolve to tokens, never to inline colour literals. */
const SHADOW_TOKENS: Readonly<Record<'none' | 'soft' | 'glow', string>> = {
  none: 'none',
  soft: 'var(--shadow-soft)',
  glow: 'var(--shadow-glow)',
}

export function propertiesToStyle(properties: EditableProperties): CSSProperties {
  const style: Record<string, string | number> = {}
  const lengths: Record<string, string> = {}

  const { typography, surface, spacing, size, layout } = properties

  if (typography !== undefined) {
    if (typography.fontSize !== undefined) style['fontSize'] = `${typography.fontSize}px`
    if (typography.fontWeight !== undefined) style['fontWeight'] = typography.fontWeight
    if (typography.lineHeight !== undefined) style['lineHeight'] = typography.lineHeight
    if (typography.letterSpacing !== undefined) {
      style['letterSpacing'] = `${typography.letterSpacing}px`
    }
    if (typography.textAlign !== undefined) style['textAlign'] = typography.textAlign
    if (typography.textTransform !== undefined) {
      style['textTransform'] = typography.textTransform
    }
    if (typography.color !== undefined) style['color'] = typography.color
  }

  if (surface !== undefined) {
    if (surface.background !== undefined) style['backgroundColor'] = surface.background
    if (surface.borderWidth !== undefined) {
      style['borderWidth'] = `${surface.borderWidth}px`
      style['borderStyle'] = 'solid'
    }
    if (surface.borderColor !== undefined) style['borderColor'] = surface.borderColor
    if (surface.borderRadius !== undefined) style['borderRadius'] = `${surface.borderRadius}px`
    if (surface.opacity !== undefined) style['opacity'] = surface.opacity
    if (surface.shadow !== undefined) style['boxShadow'] = SHADOW_TOKENS[surface.shadow]
  }

  if (spacing !== undefined) {
    if (spacing.padding !== undefined) applyBox(lengths, 'padding', spacing.padding)
    if (spacing.margin !== undefined) applyBox(lengths, 'margin', spacing.margin)
    if (spacing.gap !== undefined) style['gap'] = `${spacing.gap}px`
  }

  if (size !== undefined) {
    if (size.width !== undefined) style['width'] = dimensionToCss(size.width)
    if (size.height !== undefined) style['height'] = dimensionToCss(size.height)
    if (size.minWidth !== undefined) style['minWidth'] = dimensionToCss(size.minWidth)
    if (size.maxWidth !== undefined) style['maxWidth'] = dimensionToCss(size.maxWidth)
    if (size.minHeight !== undefined) style['minHeight'] = dimensionToCss(size.minHeight)
    if (size.maxHeight !== undefined) style['maxHeight'] = dimensionToCss(size.maxHeight)
  }

  if (layout !== undefined) {
    if (layout.display !== undefined) style['display'] = layout.display
    if (layout.flexDirection !== undefined) style['flexDirection'] = layout.flexDirection
    if (layout.alignItems !== undefined) style['alignItems'] = alignmentToCss(layout.alignItems)
    if (layout.justifyContent !== undefined) {
      style['justifyContent'] = justificationToCss(layout.justifyContent)
    }
    if (layout.gridColumns !== undefined) {
      style['gridTemplateColumns'] = `repeat(${layout.gridColumns}, minmax(0, 1fr))`
    }
    const x = layout.translateX ?? 0
    const y = layout.translateY ?? 0
    if (x !== 0 || y !== 0) style['transform'] = `translate(${x}px, ${y}px)`
  }

  return { ...style, ...lengths }
}

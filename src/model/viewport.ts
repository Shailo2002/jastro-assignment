import { z } from 'zod'

/** Preview viewports. The document is one document; these are projections. */
export const VIEWPORTS = ['desktop', 'tablet', 'mobile'] as const
export type Viewport = (typeof VIEWPORTS)[number]

/**
 * Scope of an edit. `all` writes to `element.base`; a viewport name writes only
 * to `element.overrides[viewport]` and must leave other viewports untouched.
 */
export const EDIT_SCOPES = ['all', ...VIEWPORTS] as const
export type EditScope = (typeof EDIT_SCOPES)[number]

/** Nominal preview widths required by the assignment brief. */
export const VIEWPORT_WIDTHS: Readonly<Record<Viewport, number>> = Object.freeze(
  { desktop: 1440, tablet: 768, mobile: 375 },
)

export const viewportSchema = z.enum(VIEWPORTS)
export const editScopeSchema = z.enum(EDIT_SCOPES)

export function isViewport(value: unknown): value is Viewport {
  return typeof value === 'string' && (VIEWPORTS as readonly string[]).includes(value)
}

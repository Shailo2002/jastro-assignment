import type { IconName } from './Icon'

/**
 * The right-hand panels.
 *
 * Exactly one is docked at a time, so the identifiers, labels, and the ids the
 * switcher and the docks point at each other with live in one place - a dock
 * and the button that reveals it can never drift apart.
 */
export type EditorPanel = 'design' | 'code' | 'layers'

/**
 * What the dock currently holds. `none` is a real resting state: every panel
 * can be dismissed from its own corner, and then the canvas has the full width
 * of the workspace to itself.
 */
export type DockedPanel = EditorPanel | 'none'

export const EDITOR_PANELS: readonly EditorPanel[] = ['design', 'code', 'layers']

export const PANEL_LABELS: Readonly<Record<EditorPanel, string>> = {
  design: 'Design',
  code: 'Code',
  layers: 'Layers',
}

/** Visible title of each dock, used for its tooltip. */
export const PANEL_TITLES: Readonly<Record<EditorPanel, string>> = {
  design: 'Design panel',
  code: 'Code panel',
  layers: 'Layers panel',
}

/** Id of the dock a panel fills; what the switcher points at. */
export const PANEL_DOCK_IDS: Readonly<Record<EditorPanel, string>> = {
  design: 'design-panel',
  code: 'code-panel',
  layers: 'layers-panel',
}

/** Id of the heading the panel itself renders; names its dock. */
export const PANEL_HEADING_IDS: Readonly<Record<EditorPanel, string>> = {
  design: 'inspector-heading',
  code: 'code-heading',
  layers: 'layers-heading',
}

/** Decorative glyph beside each label. */
export const PANEL_ICONS: Readonly<Record<EditorPanel, IconName>> = {
  design: 'sliders',
  code: 'code',
  layers: 'layers',
}

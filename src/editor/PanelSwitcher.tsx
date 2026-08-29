import type { JSX } from 'react'

import { SegmentedGroup, SegmentedItem } from './controls'
import {
  EDITOR_PANELS,
  PANEL_DOCK_IDS,
  PANEL_ICONS,
  PANEL_LABELS,
  PANEL_TITLES,
  type DockedPanel,
  type EditorPanel,
} from './editor-panels'

/**
 * The right-hand panel switcher.
 *
 * One capsule holding three mutually exclusive choices, so exactly one item
 * reports `aria-pressed` rather than three independent toggles that could all
 * be on at once. Design, Code, and Layers each fill the single right-hand dock,
 * so the canvas beside it keeps a predictable width whichever is chosen.
 *
 * Only the chosen panel spells its name; the other two rest as glyphs. That
 * keeps the capsule short in a bar that is chrome around the work, and it means
 * the selection is legible from shape alone, before any colour is read. When the
 * dock has been closed no item is pressed, which is the honest report: nothing
 * is docked.
 *
 * It ends the top bar at the edge the dock opens from, so the control and the
 * thing it opens are neighbours, and it sits above every region rather than on
 * the canvas toolbar because docking a panel resizes the whole workspace, not
 * only the canvas.
 *
 * It changes nothing but which panel is visible - not the document, not the
 * selection, not the edit scope.
 */
export function PanelSwitcher(props: {
  /** `none` when every dock has been dismissed; then nothing is pressed. */
  value: DockedPanel
  onChange: (panel: EditorPanel) => void
}): JSX.Element {
  const { value, onChange } = props

  return (
    <SegmentedGroup label="Editor panel">
      {EDITOR_PANELS.map((panel) => (
        <SegmentedItem
          key={panel}
          type="button"
          className="min-h-touch"
          icon={PANEL_ICONS[panel]}
          labelOnlyWhenPressed
          aria-pressed={panel === value}
          aria-controls={PANEL_DOCK_IDS[panel]}
          /* The visible word is the label; the name says what it opens, and
             begins with the visible text so speech input still reaches it. */
          aria-label={PANEL_TITLES[panel]}
          title={PANEL_TITLES[panel]}
          label={PANEL_LABELS[panel]}
          onClick={() => {
            onChange(panel)
          }}
        />
      ))}
    </SegmentedGroup>
  )
}

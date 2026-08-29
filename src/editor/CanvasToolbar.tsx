import type { JSX } from 'react'

import type { ElementId } from '../model/ids'
import { VIEWPORT_WIDTHS, type EditScope, type Viewport } from '../model/viewport'
import { ScopeSwitcher } from './ScopeSwitcher'
import { SelectionSummary } from './SelectionSummary'
import { IconButton } from './controls'
import type { ElementTreeRow } from './element-tree'

/**
 * The canvas toolbar.
 *
 * One strip along the foot of the workspace holding what is true of the EDIT
 * about to be made: whether the preview is scaled to the room available, where
 * a commit would be written (scope), and what is selected. The two controls
 * that choose what the whole shell shows - which device the preview stands in
 * for, and which panel the dock holds - sit in the top bar, because each of
 * them reframes the entire window rather than the canvas alone.
 *
 * It is pinned rather than scrolled: it belongs to the canvas region, not to
 * the canvas content, so it stays put while a tall preview scrolls under it,
 * and it sits inside the dock's inset, so an open panel never covers it.
 *
 * The reading order runs left to right from the view (fit) through the
 * decision (scope) to the subject (selection).
 *
 * `canvas-toolbar` is a query hook for the accessibility suite, which measures
 * the touch target of every control in the editor's chrome.
 *
 * Nothing here is a document change: the scope decides where a later commit
 * lands, and the rest changes only what is drawn.
 */
export function CanvasToolbar(props: {
  /** Reported in text only; the control that changes it lives in the top bar. */
  viewport: Viewport
  fit: boolean
  onFitChange: (fit: boolean) => void
  scope: EditScope
  onScopeChange: (scope: EditScope) => void
  rows: readonly ElementTreeRow[]
  selectedIds: readonly ElementId[]
  /** Reported in text only; the chip that shows it lives in the top bar. */
  revision: number
}): JSX.Element {
  return (
    <div
      className="canvas-toolbar flex min-w-0 flex-none flex-wrap items-center gap-x-2 gap-y-1
        border-t border-default bg-surface-shell/88 px-2 py-1 backdrop-blur-[18px]"
    >
      {/* Whether the preview is scaled to the room available. One glyph,
          because it is a single question whose answer is already visible on
          the canvas. */}
      <div className="flex flex-none items-center gap-1">
        <IconButton
          type="button"
          variant="chrome"
          pressedStyle="toggle"
          icon="fit"
          aria-pressed={props.fit}
          aria-label="Fit to canvas"
          title="Fit to canvas"
          onClick={() => {
            props.onFitChange(!props.fit)
          }}
        />
      </div>

      <ScopeSwitcher value={props.scope} onChange={props.onScopeChange} />

      {/* One row, and it stays one row until it truly cannot: the name of the
          selected element truncates first, then drops (the count still states
          the selection, and the inspector names it in full), and only after
          that does the toolbar take a second line rather than overflow. */}
      <div className="ms-auto flex flex-nowrap items-center gap-x-2">
        {/* Ranked degradation, so the strip stays one line as long as it can:
            the element's name truncates, then the whole summary steps back to
            text for assistive technology only - the composer's Scope Lock is
            still stating the selection on screen - and only then does the
            toolbar take a second row rather than overflow. */}
        <div className="min-w-0 max-[1400px]:sr-only">
          <SelectionSummary
            rows={props.rows}
            selectedIds={props.selectedIds}
            namesClassName="max-w-[12ch]"
          />
        </div>

        {/* The facts about the view, spelled out for anyone reading by ear and
            left to the controls on screen: a toolbar states them, it does not
            narrate them. */}
        <p className="sr-only">
          Previewing {props.viewport} at {VIEWPORT_WIDTHS[props.viewport]}px, revision{' '}
          {props.revision}.
        </p>
      </div>
    </div>
  )
}

import type { JSX } from 'react'

import type { ElementId } from '../model/ids'
import { VIEWPORT_WIDTHS, type EditScope, type Viewport } from '../model/viewport'
import { ScopeSwitcher } from './ScopeSwitcher'
import { SelectionSummary } from './SelectionSummary'
import { ToolbarLink } from './controls'
import type { ElementTreeRow } from './element-tree'

/**
 * The canvas toolbar.
 *
 * One strip along the foot of the workspace holding what is true of the EDIT
 * about to be made: where a commit would be written (scope) and what is
 * selected, plus the one way out of the editor to the template as a visitor
 * would meet it. The two controls that choose what the whole shell shows -
 * which device the preview stands in for, and which panel the dock holds - sit
 * in the top bar, because each of them reframes the entire window rather than
 * the canvas alone.
 *
 * It is pinned rather than scrolled: it belongs to the canvas region, not to
 * the canvas content, so it stays put while a tall preview scrolls under it,
 * and it sits inside the dock's inset, so an open panel never covers it.
 *
 * The reading order runs left to right from the way out (open the template on
 * its own page) through the subject (what is selected) to the decision (which
 * views an edit is written to), which sits at the trailing edge beside the
 * composer that acts on it - the last thing read before an edit is made.
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
  /**
   * Where the template stands on its own page, with no editor chrome around
   * it. Undefined when the shell is not mounted on a route that has such a
   * page - the landing page's embedded demo - and the control is then absent
   * rather than dead.
   */
  previewHref?: string | undefined
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
      {/* The template as a visitor would meet it: same document, same
          renderer, no editor around it. A real link, opened by the browser in
          a tab of its own, so the editor and the page under review can be read
          side by side and neither one is lost to the other. */}
      <div className="flex flex-none items-center gap-1">
        {props.previewHref === undefined ? null : (
          <ToolbarLink
            icon="external"
            href={props.previewHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open preview in a new tab"
            title="Open the template as a full page in a new tab"
          >
            {/* One word on screen, because the glyph already says "leaves this
                page" and the strip has a selection to fit. The verb stays in
                the accessible name and the tooltip, where a control that
                navigates has to say so. Below the wide breakpoint even the
                word steps back and the glyph stands alone. */}
            <span className="max-[1100px]:sr-only">Preview</span>
          </ToolbarLink>
        )}
      </div>

      {/* Ranked degradation, so the strip stays one line as long as it can:
          the element's name truncates first, then the whole summary steps back
          to text for assistive technology only - the composer's Scope Lock is
          still stating the selection on screen - and only then does the
          toolbar take a second row rather than overflow. It is the one part of
          the strip allowed to shrink; the two controls either side of it keep
          their full size. */}
      <div className="min-w-0 flex-1 max-[1400px]:sr-only">
        <SelectionSummary
          rows={props.rows}
          selectedIds={props.selectedIds}
          namesClassName="max-w-[12ch]"
        />
      </div>

      {/* `ms-auto` rather than the flex-1 above alone, so the control still
          sits hard against the trailing edge at the widths where the summary
          has stepped back to assistive technology. */}
      <div className="ms-auto flex flex-none items-center">
        <ScopeSwitcher value={props.scope} onChange={props.onScopeChange} />
      </div>

      {/* The facts about the view, spelled out for anyone reading by ear and
          left to the controls on screen: a toolbar states them, it does not
          narrate them. */}
      <p className="sr-only">
        Previewing {props.viewport} at {VIEWPORT_WIDTHS[props.viewport]}px, revision{' '}
        {props.revision}.
      </p>
    </div>
  )
}

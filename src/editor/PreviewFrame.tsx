import { useRef, type JSX, type ReactNode, type RefObject } from 'react'

import { TemplateRenderer } from '../renderer/TemplateRenderer'
import type { TemplateDocument } from '../model/document'
import { VIEWPORT_WIDTHS, type Viewport } from '../model/viewport'
import { fitScale, useElementSize } from './use-element-size'

/**
 * The preview frame.
 *
 * The template always lays out at its true virtual width (1440 / 768 / 375) so
 * its own responsive rules resolve honestly. When "Fit" is on the frame is
 * transform-scaled down to the available canvas width, which keeps a 1440 px
 * preview inspectable without page-level horizontal scrolling. The wrapper is
 * sized to the scaled dimensions so the scaled frame does not leave a hole in
 * the layout.
 *
 * The rendered template is `inert`. It is a projection, not a live page: its
 * own links and buttons must not take pointer input, must not appear in the
 * editor's tab order, and must not offer an assistive-technology user a "Start
 * editing this template" action that would navigate out of the editor. The
 * selection overlay above it is the accessible surface, and it carries every
 * element's name and selected state.
 *
 * The frame renders no editor affordances of its own. A caller that needs one -
 * the selection overlay - is handed the frame element and its current scale via
 * `renderOverlay`, so measured chrome shares the frame's transform without the
 * renderer learning anything about selection.
 *
 * It draws its own edge only when it does not fill the workspace card it sits
 * in. A desktop preview scaled to fit IS the width of the card, so a second
 * rim and radius a pixel inside the card's own would read as two frames around
 * one template; a tablet or mobile preview is narrower than the card, and there
 * the rim is what separates the device under review from the matting beside it.
 */
export function PreviewFrame(props: {
  document: TemplateDocument
  viewport: Viewport
  fit: boolean
  renderOverlay?: (args: {
    frameRef: RefObject<HTMLDivElement | null>
    scale: number
  }) => ReactNode
}): JSX.Element {
  const { document, viewport, fit } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  const containerSize = useElementSize(containerRef)
  const frameSize = useElementSize(frameRef)

  const virtualWidth = VIEWPORT_WIDTHS[viewport]
  const scale = fitScale(containerSize?.width, virtualWidth, fit)

  /**
   * Does the scaled preview take the whole width available to it? Measured
   * rather than inferred from the viewport, because Fit, the dock's inset, and
   * the window all move the answer. Before the first measurement it is assumed
   * to fill, which is the resting case and avoids a rim that flashes away.
   */
  const fills =
    containerSize === undefined || virtualWidth * scale >= containerSize.width - 1

  return (
    // The frame is scaled to fit, so this only scrolls when Fit is off.
    <div
      className={`min-w-0 overflow-x-auto ${fills ? '' : 'p-4'}`}
      ref={containerRef}
    >
      <div
        className="mx-auto"
        style={{
          width: virtualWidth * scale,
          ...(frameSize === undefined ? {} : { height: frameSize.height * scale }),
        }}
      >
        {/* `preview__frame` and `preview__document` carry no styling: they are
            query hooks the browser tests use to measure the real frame. */}
        <div
          className={`preview__frame relative origin-top-left overflow-hidden bg-surface-canvas
            ${fills ? '' : 'rounded-card border border-default shadow-raised'}`}
          ref={frameRef}
          style={{ width: virtualWidth, transform: `scale(${scale})` }}
          data-viewport={viewport}
          data-scale={scale}
        >
          <div className="preview__document" inert>
            <TemplateRenderer document={document} viewport={viewport} />
          </div>
          {props.renderOverlay?.({ frameRef, scale })}
        </div>
      </div>
    </div>
  )
}

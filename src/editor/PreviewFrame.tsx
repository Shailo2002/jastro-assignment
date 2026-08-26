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
 * The frame renders no editor affordances of its own. A caller that needs one -
 * the selection overlay - is handed the frame element and its current scale via
 * `renderOverlay`, so measured chrome shares the frame's transform without the
 * renderer learning anything about selection.
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

  return (
    <div className="preview" ref={containerRef}>
      <div
        className="preview__scaler"
        style={{
          width: virtualWidth * scale,
          ...(frameSize === undefined ? {} : { height: frameSize.height * scale }),
        }}
      >
        <div
          className="preview__frame"
          ref={frameRef}
          style={{ width: virtualWidth, transform: `scale(${scale})` }}
          data-viewport={viewport}
          data-scale={scale}
        >
          <TemplateRenderer document={document} viewport={viewport} />
          {props.renderOverlay?.({ frameRef, scale })}
        </div>
      </div>
    </div>
  )
}

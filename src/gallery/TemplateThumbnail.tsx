import { useRef, type JSX } from 'react'

import type { TemplateDocument } from '../model/document'
import { TemplateRenderer } from '../renderer/TemplateRenderer'
import { useElementSize } from '../editor/use-element-size'

const THUMBNAIL_VIEWPORT_WIDTH = 1440
const FALLBACK_SCALE = 0.28

/** A real, read-only render of the template cropped into a gallery thumbnail. */
export function TemplateThumbnail(props: { document: TemplateDocument }): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const size = useElementSize(containerRef)
  const scale = size === undefined ? FALLBACK_SCALE : size.width / THUMBNAIL_VIEWPORT_WIDTH

  return (
    <div className="template-thumbnail" ref={containerRef} aria-hidden="true" inert>
      <div
        className="template-thumbnail__page"
        style={{ width: THUMBNAIL_VIEWPORT_WIDTH, transform: `scale(${scale})` }}
      >
        <TemplateRenderer document={props.document} viewport="desktop" />
      </div>
      <span className="template-thumbnail__shade" />
    </div>
  )
}


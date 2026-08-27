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
    <div
      className="relative aspect-16/10 overflow-hidden rounded-card border border-default
        bg-surface-canvas transition-colors duration-fast
        group-hover/card:border-strong group-focus-within/card:border-strong"
      ref={containerRef}
      aria-hidden="true"
      inert
    >
      <div
        className="pointer-events-none absolute top-0 left-0 origin-top-left"
        style={{ width: THUMBNAIL_VIEWPORT_WIDTH, transform: `scale(${scale})` }}
      >
        <TemplateRenderer document={props.document} viewport="desktop" />
      </div>
      {/* Fades the crop into the card instead of ending mid-sentence. */}
      <span className="absolute inset-x-0 bottom-0 h-[22%] bg-linear-to-b from-transparent to-surface-canvas" />
    </div>
  )
}


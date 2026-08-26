import { useMemo, type JSX } from 'react'

import { resolveDocument } from '../engine/responsive-resolver'
import type { TemplateDocument } from '../model/document'
import type { Viewport } from '../model/viewport'
import { RenderedTemplate } from './element-renderer'

/**
 * The canonical renderer.
 *
 * Switching viewport re-resolves a projection of the same document. It never
 * writes, so preview is provably read-only with respect to canonical state.
 */
export function TemplateRenderer(props: {
  document: TemplateDocument
  viewport: Viewport
}): JSX.Element {
  const { document, viewport } = props
  const resolved = useMemo(() => resolveDocument(document, viewport), [document, viewport])

  return <RenderedTemplate document={resolved} />
}

import { useEffect, useState, type JSX } from 'react'

import { TemplateRenderer } from '../renderer/TemplateRenderer'
import { VIEWPORT_WIDTHS, type Viewport } from '../model/viewport'
import type { DocumentStore } from '../store/document-store'
import { useDocumentStore } from '../editor/use-document-store'

/**
 * The standalone preview.
 *
 * The same canonical document, through the same renderer, with no editor
 * around it: this is the template as a visitor would meet it. It reads the
 * store and never writes, so opening it can neither change the document nor
 * enter history - the editor tab remains the only surface that commits.
 *
 * The page stands at the REAL window width rather than at a fixed virtual one:
 * off the canvas there is no device to stand in for, so the responsive
 * projection is chosen from the browser the page is actually being read in.
 * The breakpoints are the preview widths themselves, so a window as wide as
 * the tablet frame resolves the tablet overrides, matching what the editor
 * showed.
 *
 * Unlike the canvas preview this template is NOT inert: here its own links and
 * buttons are the point, and there is no selection overlay above them to take
 * their place in the tab order.
 */
export function PreviewPage(props: {
  store: DocumentStore
  templateName: string
}): JSX.Element {
  const state = useDocumentStore(props.store)
  const viewport = useWindowViewport()

  return (
    <div className="preview-page min-h-dvh bg-surface-canvas">
      {/* The renderer starts its own headings at h2 (the editor shell owns the
          h1 there), so this page names itself, off screen: a page whose only
          heading is an h2 has a level missing, and the name is what tells a
          reader of the tab which template they are looking at. */}
      <h1 className="sr-only">{props.templateName} preview</h1>
      <TemplateRenderer document={state.document} viewport={viewport} />
    </div>
  )
}

/** The projection the real window width falls into. */
function windowViewport(width: number): Viewport {
  if (width >= VIEWPORT_WIDTHS.desktop) return 'desktop'
  if (width >= VIEWPORT_WIDTHS.tablet) return 'tablet'
  return 'mobile'
}

function useWindowViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(() =>
    typeof window === 'undefined' ? 'desktop' : windowViewport(window.innerWidth),
  )

  useEffect(() => {
    const sync = (): void => {
      setViewport(windowViewport(window.innerWidth))
    }
    sync()
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('resize', sync)
    }
  }, [])

  return viewport
}

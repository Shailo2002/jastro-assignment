import { useState, type JSX } from 'react'

import type { DocumentStore } from '../store/document-store'
import { VIEWPORT_WIDTHS, type Viewport } from '../model/viewport'
import { PreviewFrame } from './PreviewFrame'
import { ViewportSwitcher } from './ViewportSwitcher'
import { useDocumentStore } from './use-document-store'
import './editor-shell.css'

/**
 * The editor shell.
 *
 * Step 6 scope: a toolbar and a preview canvas. The preview viewport lives in
 * local UI state and is intentionally NOT part of the canonical document -
 * switching it re-resolves a projection and cannot change stored data.
 *
 * The edit-scope control is present but disabled, so a reviewer can see that
 * preview and scope are two different things before scoped editing exists.
 */
export function EditorShell(props: { store: DocumentStore }): JSX.Element {
  const { store } = props
  const state = useDocumentStore(store)
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [fit, setFit] = useState(true)

  return (
    <div className="shell">
      <header className="shell__toolbar">
        <h1 className="shell__title">Scoped AI Template Editor</h1>

        <div className="shell__controls">
          <ViewportSwitcher value={viewport} onChange={setViewport} />

          <p className="scope-indicator" data-disabled="true">
            <span className="scope-indicator__label">Edit scope</span>
            <span className="scope-indicator__value">All views</span>
            <span className="scope-indicator__hint">
              Scoped editing arrives with the inspector; preview size does not change what an
              edit targets.
            </span>
          </p>

          <button
            type="button"
            className="toolbar-button"
            aria-pressed={fit}
            onClick={() => {
              setFit((current) => !current)
            }}
          >
            Fit to canvas
          </button>
        </div>
      </header>

      <main className="shell__canvas" aria-label="Template preview">
        <p className="shell__status">
          Previewing {viewport} at {VIEWPORT_WIDTHS[viewport]}px &middot; revision{' '}
          {state.document.revision}
        </p>
        <PreviewFrame document={state.document} viewport={viewport} fit={fit} />
      </main>
    </div>
  )
}

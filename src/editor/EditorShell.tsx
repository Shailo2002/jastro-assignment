import { useMemo, useState, type JSX, type RefObject } from 'react'

import { resolveDocument } from '../engine/responsive-resolver'
import type { DocumentStore } from '../store/document-store'
import { VIEWPORT_WIDTHS, type Viewport } from '../model/viewport'
import { LayersPanel } from './LayersPanel'
import { PreviewFrame } from './PreviewFrame'
import { SelectionOverlay } from './SelectionOverlay'
import { SelectionSummary } from './SelectionSummary'
import { ViewportSwitcher } from './ViewportSwitcher'
import { collectElementIds, flattenResolvedDocument, type ElementTreeRow } from './element-tree'
import { useDocumentStore } from './use-document-store'
import { useElementRects } from './use-element-rects'
import type { SelectionApi } from './use-selection'
import { useSelection } from './use-selection'
import './editor-shell.css'

/**
 * Measured canvas selection layer.
 *
 * Split out so the geometry hook runs against the live frame element that
 * `PreviewFrame` owns, without `PreviewFrame` itself knowing about selection.
 */
function CanvasSelectionLayer(props: {
  frameRef: RefObject<HTMLDivElement | null>
  scale: number
  changeKey: string
  rows: readonly ElementTreeRow[]
  selection: SelectionApi
}): JSX.Element {
  const rects = useElementRects(props.frameRef, props.scale, props.changeKey)
  return <SelectionOverlay rows={props.rows} rects={rects} selection={props.selection} />
}

/**
 * The editor shell.
 *
 * Step 7 scope: a toolbar, a preview canvas with a selection overlay, and a
 * layers tree.
 *
 * Preview viewport and selection both live in local UI state and are
 * intentionally NOT part of the canonical document: switching viewport
 * re-resolves a projection, and selecting stores stable IDs. Neither can
 * produce a document revision or a history entry.
 *
 * The edit-scope control is still present but disabled, so a reviewer can see
 * that preview and scope are two different things before scoped editing exists.
 */
export function EditorShell(props: {
  store: DocumentStore
  onBackToTemplates?: () => void
}): JSX.Element {
  const { store } = props
  const state = useDocumentStore(store)
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [fit, setFit] = useState(true)

  // Canvas and layers read one traversal of one projection, so the two surfaces
  // offer the same targets, names, and order.
  const resolved = useMemo(
    () => resolveDocument(state.document, viewport),
    [state.document, viewport],
  )
  const rows = useMemo(() => flattenResolvedDocument(resolved), [resolved])
  const knownIds = useMemo(() => collectElementIds(rows), [rows])
  const selection = useSelection(knownIds)

  return (
    <div className="shell">
      <header className="shell__toolbar">
        <div className="shell__identity">
          {props.onBackToTemplates === undefined ? null : (
            <button
              type="button"
              className="shell__back"
              onClick={props.onBackToTemplates}
              aria-label="Back to templates"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}
          <h1 className="shell__title">Scoped AI Template Editor</h1>
        </div>

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

      <div className="shell__body">
        <main className="shell__canvas" aria-label="Template preview">
          <div className="shell__canvas-status">
            <p className="shell__status">
              Previewing {viewport} at {VIEWPORT_WIDTHS[viewport]}px &middot; revision{' '}
              {state.document.revision}
            </p>
            <SelectionSummary rows={rows} selectedIds={selection.selectedIds} />
          </div>

          <PreviewFrame
            document={state.document}
            viewport={viewport}
            fit={fit}
            renderOverlay={({ frameRef, scale }) => (
              <CanvasSelectionLayer
                frameRef={frameRef}
                scale={scale}
                changeKey={`${state.document.revision}:${viewport}:${String(fit)}`}
                rows={rows}
                selection={selection}
              />
            )}
          />
        </main>

        <LayersPanel rows={rows} selection={selection} />
      </div>
    </div>
  )
}

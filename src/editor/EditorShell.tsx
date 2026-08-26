import { useMemo, useState, type JSX, type RefObject } from 'react'

import { resolveDocument, resolveElementProperties } from '../engine/responsive-resolver'
import type { DocumentStore } from '../store/document-store'
import type { ElementId } from '../model/ids'
import type { EditablePropertyPatch } from '../model/properties'
import { VIEWPORT_WIDTHS, type EditScope, type Viewport } from '../model/viewport'
import { InspectorPanel } from './InspectorPanel'
import { LayersPanel } from './LayersPanel'
import { PreviewFrame } from './PreviewFrame'
import { ScopeLock } from './ScopeLock'
import { ScopeSwitcher } from './ScopeSwitcher'
import { SelectionOverlay } from './SelectionOverlay'
import { SelectionSummary } from './SelectionSummary'
import { ViewportSwitcher } from './ViewportSwitcher'
import { collectElementIds, flattenResolvedDocument, type ElementTreeRow } from './element-tree'
import type { EditTarget } from './inspector-model'
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
 * Step 8 scope: toolbar, canvas with selection overlay, layers tree, Scope Lock
 * indicator, and the inspector.
 *
 * Three pieces of state live here and are deliberately NOT part of the
 * canonical document: the preview viewport (what is on screen), the selection
 * (which stable IDs an edit targets), and the edit scope (whether a commit
 * writes the shared base or one viewport's override). Only the inspector's
 * commits reach the document, and they do so through the store's single
 * validated command pipeline.
 */
export function EditorShell(props: {
  store: DocumentStore
  onBackToTemplates?: () => void
}): JSX.Element {
  const { store } = props
  const state = useDocumentStore(store)
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [editScope, setEditScope] = useState<EditScope>('all')
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

  const selectedNames = selection.selectedIds.flatMap((id) => {
    const row = rows.find((candidate) => candidate.id === id)
    return row === undefined ? [] : [row.descriptor.accessibleName]
  })

  /**
   * What the inspector shows: the shared base for scope `all`, otherwise the
   * value that scope's viewport actually resolves to. The scope, not the
   * preview, decides - so "edit mobile while looking at desktop" stays honest.
   */
  const targets: readonly EditTarget[] = selection.selectedIds.flatMap((id) => {
    const element = state.document.elements[id]
    if (element === undefined) return []
    return [
      {
        element,
        displayed:
          editScope === 'all' ? element.base : resolveElementProperties(element, editScope),
      },
    ]
  })

  const commit = (input: {
    targetIds: readonly ElementId[]
    changes: Readonly<Record<ElementId, EditablePropertyPatch>>
  }): readonly string[] => {
    const result = store.commit({
      source: 'canvas',
      targetIds: input.targetIds,
      scope: editScope,
      changes: input.changes,
    })
    return result.ok ? [] : result.errors.map((error) => error.message)
  }

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
          <ScopeSwitcher value={editScope} onChange={setEditScope} />

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
        <LayersPanel rows={rows} selection={selection} />

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

        <aside className="shell__sidebar" aria-label="Editing tools">
          <ScopeLock scope={editScope} targetNames={selectedNames} />
          <InspectorPanel
            resolved={resolved}
            targets={targets}
            scope={editScope}
            revision={state.document.revision}
            onCommit={commit}
          />
        </aside>
      </div>
    </div>
  )
}

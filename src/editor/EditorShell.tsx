import { useMemo, useState, type JSX, type RefObject } from 'react'

import { resolveDocument, resolveElementProperties } from '../engine/responsive-resolver'
import type { DocumentStore } from '../store/document-store'
import type { EditSource } from '../model/history'
import type { ElementId } from '../model/ids'
import type { Proposal } from '../engine/proposal'
import type { EditablePropertyPatch } from '../model/properties'
import { VIEWPORT_WIDTHS, type EditScope, type Viewport } from '../model/viewport'
import { AiPanel } from './AiPanel'
import { CodePanel, type CodeDraft } from './CodePanel'
import { HistoryPanel, type RestoreRequest } from './HistoryPanel'
import { Icon } from './Icon'
import { InspectorPanel } from './InspectorPanel'
import { LayersPanel } from './LayersPanel'
import { PreviewFrame } from './PreviewFrame'
import { RecoveryNotice } from './RecoveryNotice'
import { ResetProjectDialog } from './ResetProjectDialog'
import { ScopeLock } from './ScopeLock'
import { ScopeSwitcher } from './ScopeSwitcher'
import { SelectionOverlay } from './SelectionOverlay'
import { SelectionSummary } from './SelectionSummary'
import { SidebarTabs, type SidebarTab } from './SidebarTabs'
import { ViewportSwitcher } from './ViewportSwitcher'
import { collectElementIds, flattenResolvedDocument, type ElementTreeRow } from './element-tree'
import type { EditTarget } from './inspector-model'
import { describePersistenceStatus } from './persistence-status'
import { EMPTY_AI_PANEL_STATE, toAiEditDraft, type AiPanelState } from './proposal-review'
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

type SidebarPanelId = 'design' | 'code' | 'ai' | 'history'

const SIDEBAR_TABS: readonly SidebarTab<SidebarPanelId>[] = [
  { id: 'design', label: 'Design' },
  { id: 'code', label: 'Code' },
  { id: 'ai', label: 'AI' },
  { id: 'history', label: 'History' },
]

/**
 * The editor shell.
 *
 * Toolbar, canvas with selection overlay, layers tree, Scope Lock indicator,
 * and a tabbed sidebar holding the inspector and the structured code surface.
 *
 * Three pieces of state live here and are deliberately NOT part of the
 * canonical document: the preview viewport (what is on screen), the selection
 * (which stable IDs an edit targets), and the edit scope (whether a commit
 * writes the shared base or one viewport's override), plus the unapplied code
 * draft. Only the sidebar's commits reach the document, and they do so through
 * the store's single validated command pipeline.
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
  const [activePanel, setActivePanel] = useState<SidebarPanelId>('design')
  /**
   * The unapplied code draft. It lives here rather than inside the code panel
   * so that switching panels does not silently throw away typed work, and so
   * that a change of selection or scope discards it deliberately, in one place.
   */
  const [codeDraft, setCodeDraft] = useState<{ key: string; draft: CodeDraft } | undefined>(
    undefined,
  )
  /**
   * The AI panel's transient state: the instruction, the generated run, and the
   * per-proposal outcomes. Unlike a code draft it deliberately SURVIVES a
   * change of selection or scope: a proposal carries the selection and revision
   * it was generated from, so it is shown as no longer applicable rather than
   * silently vanishing. Nothing here is durable, and none of it is persisted.
   */
  const [aiState, setAiState] = useState<AiPanelState>(EMPTY_AI_PANEL_STATE)
  /** Reset is confirmed in a modal; opening it changes nothing on its own. */
  const [resetPending, setResetPending] = useState(false)
  /**
   * Panel visibility. Both panels are hidden rather than unmounted, so a
   * collapse cannot discard a code draft, a proposal run, or the selection -
   * and cannot silently move the canvas out from under a measurement.
   */
  const [layersOpen, setLayersOpen] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

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

  // A draft belongs to the selection and scope it was written for; anything
  // else would let one element's values be applied under another's name.
  const codeDraftKey = `${editScope}:${selection.selectedIds.join(',')}`
  if (codeDraft !== undefined && codeDraft.key !== codeDraftKey) {
    setCodeDraft(undefined)
  }

  /**
   * The one place this shell writes to the document. Canvas controls and the
   * code surface differ only in `source` and in whether they carry the revision
   * they were prepared against - a code draft does, so a draft written before
   * someone else's edit is rejected instead of overwriting it.
   */
  const commit = (input: {
    source: Extract<EditSource, 'canvas' | 'code'>
    targetIds: readonly ElementId[]
    changes: Readonly<Record<ElementId, EditablePropertyPatch>>
    baseRevision?: number
  }): readonly string[] => {
    const result = store.commit({
      source: input.source,
      targetIds: input.targetIds,
      scope: editScope,
      changes: input.changes,
      baseRevision: input.baseRevision,
    })
    return result.ok ? [] : result.errors.map((error) => error.message)
  }

  /**
   * Accepting one proposal. It is a separate path from `commit` for two
   * reasons: the scope comes from the proposal rather than from the switcher,
   * so changing the switcher afterwards cannot redirect an accepted change to
   * another viewport; and the command carries the CURRENT selection as its
   * authority, so a proposal whose target has since been deselected is rejected
   * by the pipeline rather than applied.
   */
  const acceptProposal = (proposal: Proposal): readonly string[] => {
    const result = store.commit(toAiEditDraft(proposal, state.document), {
      selectionSnapshot: selection.selectedIds,
    })
    return result.ok ? [] : result.errors.map((error) => error.message)
  }

  /**
   * Restoring one revision. Like acceptance it is deliberately not routed
   * through `commit`: the element and the scope both come from the recorded
   * entry, so neither the current selection nor the scope switcher can redirect
   * a restore at another element or another viewport. The store still builds an
   * ordinary command and sends it down the same validated pipeline, which is
   * what makes the restore itself appear in history.
   */
  const restore = (request: RestoreRequest): readonly string[] => {
    const result = store.restore(request)
    return result.ok ? [] : result.errors.map((error) => error.message)
  }

  const persistence = describePersistenceStatus(state)

  /**
   * The one destructive action in the editor, reached only from the confirmed
   * dialog. Besides the store's own reset it clears the transient state that
   * belonged to the discarded document: a selection of ids that no longer have
   * the same values, a code draft written against the old revision, and a
   * pending AI run whose proposals were generated from it. Leaving any of those
   * alive would let work from the old project be applied to the fresh one.
   */
  const resetProject = (): void => {
    store.reset()
    selection.clear()
    setCodeDraft(undefined)
    setAiState(EMPTY_AI_PANEL_STATE)
    setViewport('desktop')
    setEditScope('all')
    setActivePanel('design')
    setResetPending(false)
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
              title="Back to templates"
            >
              <Icon name="chevron-left" />
            </button>
          )}
          <h1 className="shell__title">Scoped AI Template Editor</h1>
        </div>

        <div className="shell__controls">
          <ViewportSwitcher value={viewport} onChange={setViewport} />
          <ScopeSwitcher value={editScope} onChange={setEditScope} />

          {/* Icon-only controls: each carries an accessible name, a tooltip,
              and the expanded state of the panel it owns. */}
          <div className="shell__panel-toggles" role="group" aria-label="Panels">
            <button
              type="button"
              className="icon-button"
              aria-pressed={layersOpen}
              aria-expanded={layersOpen}
              aria-controls="layers-panel"
              aria-label="Layers panel"
              title="Layers panel"
              onClick={() => {
                setLayersOpen((current) => !current)
              }}
            >
              <Icon name="panel-left" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-pressed={sidebarOpen}
              aria-expanded={sidebarOpen}
              aria-controls="editor-sidebar"
              aria-label="Editing tools panel"
              title="Editing tools panel"
              onClick={() => {
                setSidebarOpen((current) => !current)
              }}
            >
              <Icon name="panel-right" />
            </button>
          </div>

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

          {/* Persistence is stated, not implied: the label says how this
              document was obtained, and the sentence is read out with it. */}
          <p className="persistence-chip" data-tone={persistence.tone}>
            <span className="persistence-chip__dot" aria-hidden="true" />
            {persistence.label}
            <span className="visually-hidden">. {persistence.detail}</span>
          </p>

          <button
            type="button"
            className="toolbar-button"
            onClick={() => {
              setResetPending(true)
            }}
          >
            Reset project&hellip;
          </button>
        </div>
      </header>

      {persistence.needsAttention ? (
        <RecoveryNotice
          status={persistence}
          onReset={() => {
            setResetPending(true)
          }}
        />
      ) : null}

      <div
        className="shell__body"
        data-layers={layersOpen ? 'open' : 'closed'}
        data-sidebar={sidebarOpen ? 'open' : 'closed'}
      >
        <LayersPanel rows={rows} selection={selection} hidden={!layersOpen} />

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

        <aside
          className="shell__sidebar"
          id="editor-sidebar"
          aria-label="Editing tools"
          hidden={!sidebarOpen}
        >
          <ScopeLock scope={editScope} targetNames={selectedNames} />

          <SidebarTabs tabs={SIDEBAR_TABS} value={activePanel} onChange={setActivePanel} />

          <div
            role="tabpanel"
            id={`sidebar-panel-${activePanel}`}
            aria-labelledby={`sidebar-tab-${activePanel}`}
            className="shell__panel"
          >
            {activePanel === 'history' ? (
              <HistoryPanel
                document={state.document}
                selectedIds={selection.selectedIds}
                onRestore={restore}
              />
            ) : activePanel === 'ai' ? (
              <AiPanel
                document={state.document}
                selectedIds={selection.selectedIds}
                scope={editScope}
                state={aiState}
                onStateChange={setAiState}
                onAccept={acceptProposal}
              />
            ) : activePanel === 'design' ? (
              <InspectorPanel
                resolved={resolved}
                targets={targets}
                scope={editScope}
                revision={state.document.revision}
                onCommit={(input) => commit({ source: 'canvas', ...input })}
              />
            ) : (
              <CodePanel
                targets={targets}
                scope={editScope}
                revision={state.document.revision}
                draft={codeDraft?.key === codeDraftKey ? codeDraft.draft : undefined}
                onDraftChange={(draft) => {
                  setCodeDraft(draft === undefined ? undefined : { key: codeDraftKey, draft })
                }}
                onApply={(input) => commit({ source: 'code', ...input })}
              />
            )}
          </div>
        </aside>
      </div>

      {resetPending ? (
        <ResetProjectDialog
          onConfirm={resetProject}
          onCancel={() => {
            setResetPending(false)
          }}
        />
      ) : null}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState, type JSX, type RefObject } from 'react'

import { resolveDocument, resolveElementProperties } from '../engine/responsive-resolver'
import type { DocumentStore } from '../store/document-store'
import type { EditSource } from '../model/history'
import type { ElementId } from '../model/ids'
import type { Proposal } from '../engine/proposal'
import type { EditablePropertyPatch } from '../model/properties'
import { VIEWPORT_WIDTHS, type EditScope, type Viewport } from '../model/viewport'
import { AiPanel } from './AiPanel'
import { CodePanel, type CodeDraft } from './CodePanel'
import { EditorDock } from './EditorDock'
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
import { SurfaceTabs, type SurfaceTab } from './SurfaceTabs'
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

/** Which surface fills the centre of the shell. */
type Surface = 'preview' | 'code'

const SURFACE_TABS: readonly SurfaceTab<Surface>[] = [
  { id: 'preview', label: 'Preview', icon: 'monitor' },
  { id: 'code', label: 'Code', icon: 'code' },
]

const SURFACE_LABELS: Readonly<Record<Surface, string>> = {
  preview: 'Template preview',
  code: 'Structured code',
}

/**
 * The editor shell.
 *
 * The layout has three regions. A left rail holds the two surfaces that are
 * about change over time - the per-element history above, the AI instruction
 * composer docked below it - and stays visible, because both of them are
 * reference material for whatever is being edited. The centre is one surface at
 * a time, chosen by a tablist: the rendered preview or the structured code
 * view. Design and Layers are docks: opened from the toolbar, overlaid on the
 * right, closed again when they are not needed, so the preview keeps its width.
 *
 * Five pieces of state live here and are deliberately NOT part of the canonical
 * document: the preview viewport (what is on screen), the selection (which
 * stable IDs an edit targets), the edit scope (whether a commit writes the
 * shared base or one viewport's override), which surface is showing, and which
 * docks are open. Only commits reach the document, and every one of them goes
 * through the store's single validated command pipeline.
 */
export function EditorShell(props: {
  store: DocumentStore
  onBackToTemplates?: () => void
  templateName?: string
}): JSX.Element {
  const { store } = props
  const state = useDocumentStore(store)
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [editScope, setEditScope] = useState<EditScope>('all')
  const [fit, setFit] = useState(true)
  const [surface, setSurface] = useState<Surface>('preview')
  /**
   * The unapplied code draft. It lives here rather than inside the code panel
   * so that leaving the code surface does not silently throw away typed work,
   * and so that a change of selection or scope discards it deliberately, in one
   * place.
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
   * Dock visibility. The editor arrives as a focused canvas; the first
   * selection reveals Design, and Layers opens when the tree is wanted. Both
   * are hidden rather than unmounted, so closing one cannot discard the layers
   * tree's focus position or the inspector's pending error - and cannot
   * silently move the canvas out from under a measurement.
   */
  const [layersOpen, setLayersOpen] = useState(false)
  const [designOpen, setDesignOpen] = useState(false)
  /** Closing a dock returns focus to the toggle that owns it. */
  const layersToggleRef = useRef<HTMLButtonElement | null>(null)
  const designToggleRef = useRef<HTMLButtonElement | null>(null)

  // Canvas and layers read one traversal of one projection, so the two surfaces
  // offer the same targets, names, and order.
  const resolved = useMemo(
    () => resolveDocument(state.document, viewport),
    [state.document, viewport],
  )
  const rows = useMemo(() => flattenResolvedDocument(resolved), [resolved])
  const knownIds = useMemo(() => collectElementIds(rows), [rows])
  const selection = useSelection(knownIds)
  const previousSelectionSize = useRef(0)

  /* The first selection reveals its editing context. When Layers is already
     open it remains available for additive selection, while Design appears
     beside it; a direct canvas selection opens Design on its own. */
  useEffect(() => {
    if (previousSelectionSize.current === 0 && selection.selectedIds.length > 0) {
      setDesignOpen(true)
    }
    previousSelectionSize.current = selection.selectedIds.length
  }, [selection.selectedIds.length])

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
   *
   * Which docks are open is deliberately left alone: it is chrome, it holds
   * nothing from the discarded document, and moving it would be a surprise.
   */
  const resetProject = (): void => {
    store.reset()
    selection.clear()
    setCodeDraft(undefined)
    setAiState(EMPTY_AI_PANEL_STATE)
    setViewport('desktop')
    setEditScope('all')
    setSurface('preview')
    setResetPending(false)
  }

  const closeLayers = (): void => {
    setLayersOpen(false)
    layersToggleRef.current?.focus()
  }

  const closeDesign = (): void => {
    setDesignOpen(false)
    designToggleRef.current?.focus()
  }

  return (
    <div className="shell">
      <header className="shell__toolbar">
        <div className="shell__toolbar-start">
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
          <span className="shell__project-mark" aria-hidden="true">
            <span />
          </span>
          <div className="shell__project-copy">
            <h1 className="shell__title">
              <span className="visually-hidden">Scoped AI Template Editor</span>
              <span aria-hidden="true">{props.templateName ?? 'Aster Labs'}</span>
            </h1>
            <span className="shell__project-state">main</span>
          </div>
        </div>

        <div className="shell__toolbar-center">
          <SurfaceTabs
            tabs={SURFACE_TABS}
            value={surface}
            onChange={setSurface}
            label="Editing surface"
            idPrefix="surface"
          />
          <ViewportSwitcher value={viewport} onChange={setViewport} />
          <span className="shell__page-pill">Homepage</span>
        </div>

        <div className="shell__toolbar-end">
          {/* Dock toggles: each carries a tooltip and the expanded state of the
              panel it owns, so "open" is never signalled by colour alone. */}
          <div className="shell__dock-toggles" role="group" aria-label="Panels">
            <button
              type="button"
              className="dock-toggle"
              ref={designToggleRef}
              aria-pressed={designOpen}
              aria-expanded={designOpen}
              aria-controls="design-panel"
              title="Design panel"
              onClick={() => {
                setDesignOpen((current) => !current)
              }}
            >
              <Icon name="sliders" />
              <span>Design</span>
            </button>
            <button
              type="button"
              className="dock-toggle"
              ref={layersToggleRef}
              aria-pressed={layersOpen}
              aria-expanded={layersOpen}
              aria-controls="layers-panel"
              title="Layers panel"
              onClick={() => {
                setLayersOpen((current) => !current)
              }}
            >
              <Icon name="layers" />
              <span>Layers</span>
            </button>
          </div>

          <button
            type="button"
            className="toolbar-button"
            aria-label="Reset project…"
            onClick={() => {
              setResetPending(true)
            }}
          >
            Reset&hellip;
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

      {/* Scope Lock is above every surface rather than inside one panel: what an
          edit will touch is the same statement whether the edit comes from the
          inspector, the code view, an AI proposal, or a restore. */}
      <div className="shell__scopebar">
        <ScopeLock scope={editScope} targetNames={selectedNames} />

        <div className="shell__scopebar-end">
          <p className="persistence-chip" data-tone={persistence.tone}>
            <span className="persistence-chip__dot" aria-hidden="true" />
            {persistence.label}
            <span className="visually-hidden">. {persistence.detail}</span>
          </p>
          <ScopeSwitcher value={editScope} onChange={setEditScope} />
        </div>
      </div>

      <div
        className="shell__body"
        data-surface={surface}
        data-docks={Number(designOpen) + Number(layersOpen)}
      >
        <aside className="rail" aria-label="History and AI">
          <div className="rail__intro">
            <span className="rail__intro-icon" aria-hidden="true">
              <Icon name="sparkle" />
            </span>
            <div>
              <p className="rail__eyebrow">Build with AI</p>
              <h2>Describe the next change</h2>
            </div>
            <span className="rail__mode">Proposal mode</span>
          </div>

          <div className="rail__composer">
            <AiPanel
              document={state.document}
              selectedIds={selection.selectedIds}
              scope={editScope}
              state={aiState}
              onStateChange={setAiState}
              onAccept={acceptProposal}
            />
          </div>

          <div className="rail__scroll">
            <HistoryPanel
              document={state.document}
              selectedIds={selection.selectedIds}
              onRestore={restore}
            />
          </div>
        </aside>

        <main className="shell__main" aria-label={SURFACE_LABELS[surface]}>
          <div
            role="tabpanel"
            id={`surface-panel-${surface}`}
            aria-labelledby={`surface-tab-${surface}`}
            className="shell__surface"
          >
            {surface === 'preview' ? (
              <>
                <div className="shell__canvas-status">
                  <p className="shell__status">
                    Previewing {viewport} at {VIEWPORT_WIDTHS[viewport]}px &middot; revision{' '}
                    {state.document.revision}
                  </p>
                  <div className="shell__canvas-tools">
                    <SelectionSummary rows={rows} selectedIds={selection.selectedIds} />
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
              </>
            ) : (
              <div className="shell__code-workspace">
                <aside className="shell__files" aria-label="Project files">
                  <p>Project</p>
                  <ul>
                    <li>src</li>
                    <li data-depth="1">components</li>
                    <li data-depth="1">template.json</li>
                    <li data-depth="1">responsive.json</li>
                    <li>styles</li>
                  </ul>
                </aside>
                <div className="shell__code">
                  <div className="shell__code-heading">
                    <span>template.json</span>
                    <span>Validated structured properties</span>
                  </div>
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
                </div>
              </div>
            )}
          </div>
        </main>

        <div className="shell__docks">
          <EditorDock
            id="design-panel"
            labelledBy="inspector-heading"
            title="Design panel"
            open={designOpen}
            onClose={closeDesign}
          >
            <InspectorPanel
              resolved={resolved}
              targets={targets}
              scope={editScope}
              revision={state.document.revision}
              onCommit={(input) => commit({ source: 'canvas', ...input })}
            />
          </EditorDock>

          <EditorDock
            id="layers-panel"
            labelledBy="layers-heading"
            title="Layers panel"
            open={layersOpen}
            onClose={closeLayers}
          >
            <LayersPanel rows={rows} selection={selection} />
          </EditorDock>
        </div>
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

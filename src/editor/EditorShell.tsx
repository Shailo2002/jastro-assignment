import { useMemo, useState, type JSX, type RefObject } from "react";

import {
  resolveDocument,
  resolveElementProperties,
} from "../engine/responsive-resolver";
import type { DocumentStore } from "../store/document-store";
import type { EditSource } from "../model/history";
import type { ElementId } from "../model/ids";
import type { Proposal } from "../engine/proposal";
import type { EditablePropertyPatch } from "../model/properties";
import {
  VIEWPORT_WIDTHS,
  type EditScope,
  type Viewport,
} from "../model/viewport";
import { AiPanel } from "./AiPanel";
import { CodePanel, type CodeDraft } from "./CodePanel";
import { EditorDock } from "./EditorDock";
import { HistoryPanel, type RestoreRequest } from "./HistoryPanel";
import { BrandMark } from "../brand/BrandMark";
import { Icon } from "./Icon";
import { IconButton, ToolbarButton } from "./controls";
import { InspectorPanel } from "./InspectorPanel";
import { LayersPanel } from "./LayersPanel";
import { PreviewFrame } from "./PreviewFrame";
import { RecoveryNotice } from "./RecoveryNotice";
import { ResetProjectDialog } from "./ResetProjectDialog";
import { ScopeLock } from "./ScopeLock";
import { ScopeSwitcher } from "./ScopeSwitcher";
import { SelectionOverlay } from "./SelectionOverlay";
import { SelectionSummary } from "./SelectionSummary";
import { PanelSwitcher } from "./PanelSwitcher";
import {
  PANEL_DOCK_IDS,
  PANEL_HEADING_IDS,
  PANEL_TITLES,
  type EditorPanel,
} from "./editor-panels";
import { ViewportSwitcher } from "./ViewportSwitcher";
import {
  collectElementIds,
  flattenResolvedDocument,
  type ElementTreeRow,
} from "./element-tree";
import type { EditTarget } from "./inspector-model";
import { describePersistenceStatus } from "./persistence-status";
import {
  EMPTY_AI_PANEL_STATE,
  toAiEditDraft,
  type AiPanelState,
} from "./proposal-review";
import { useDocumentStore } from "./use-document-store";
import { useElementRects } from "./use-element-rects";
import type { SelectionApi } from "./use-selection";
import { useSelection } from "./use-selection";

/**
 * Measured canvas selection layer.
 *
 * Split out so the geometry hook runs against the live frame element that
 * `PreviewFrame` owns, without `PreviewFrame` itself knowing about selection.
 */
function CanvasSelectionLayer(props: {
  frameRef: RefObject<HTMLDivElement | null>;
  scale: number;
  changeKey: string;
  rows: readonly ElementTreeRow[];
  selection: SelectionApi;
}): JSX.Element {
  const rects = useElementRects(props.frameRef, props.scale, props.changeKey);
  return (
    <SelectionOverlay
      rows={props.rows}
      rects={rects}
      selection={props.selection}
    />
  );
}

/**
 * The editor shell.
 *
 * The layout has three regions. A left rail holds the two surfaces that are
 * about change over time - the per-element history above, the AI instruction
 * composer docked below it - and stays visible, because both of them are
 * reference material for whatever is being edited. The centre is the rendered
 * template and nothing else: it is what is under review, so no editor surface
 * ever takes its place. The right is one dock holding one panel at a time -
 * Design, Code, or Layers - chosen by a segmented switcher the same shape as
 * the viewport control, because these are mutually exclusive choices too.
 *
 * Four pieces of state live here and are deliberately NOT part of the canonical
 * document: the preview viewport (what is on screen), the selection (which
 * stable IDs an edit targets), the edit scope (whether a commit writes the
 * shared base or one viewport's override), and which panel is docked. Only
 * commits reach the document, and every one of them goes through the store's
 * single validated command pipeline.
 */
export function EditorShell(props: {
  store: DocumentStore;
  onBackToTemplates?: () => void;
  templateName?: string;
}): JSX.Element {
  const { store } = props;
  const state = useDocumentStore(store);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [editScope, setEditScope] = useState<EditScope>("all");
  const [fit, setFit] = useState(true);
  /**
   * Which panel the right dock holds. Design is the resting choice: it is the
   * panel an edit starts from, and the one a fresh selection wants.
   */
  const [panel, setPanel] = useState<EditorPanel>("design");
  /**
   * The unapplied code draft. It lives here rather than inside the code panel
   * so that leaving the code surface does not silently throw away typed work,
   * and so that a change of selection or scope discards it deliberately, in one
   * place.
   */
  const [codeDraft, setCodeDraft] = useState<
    { key: string; draft: CodeDraft } | undefined
  >(undefined);
  /**
   * The AI panel's transient state: the instruction, the generated run, and the
   * per-proposal outcomes. Unlike a code draft it deliberately SURVIVES a
   * change of selection or scope: a proposal carries the selection and revision
   * it was generated from, so it is shown as no longer applicable rather than
   * silently vanishing. Nothing here is durable, and none of it is persisted.
   */
  const [aiState, setAiState] = useState<AiPanelState>(EMPTY_AI_PANEL_STATE);
  /** Reset is confirmed in a modal; opening it changes nothing on its own. */
  const [resetPending, setResetPending] = useState(false);

  // Canvas and layers read one traversal of one projection, so the two surfaces
  // offer the same targets, names, and order.
  const resolved = useMemo(
    () => resolveDocument(state.document, viewport),
    [state.document, viewport],
  );
  const rows = useMemo(() => flattenResolvedDocument(resolved), [resolved]);
  const knownIds = useMemo(() => collectElementIds(rows), [rows]);
  const selection = useSelection(knownIds);

  const selectedNames = selection.selectedIds.flatMap((id) => {
    const row = rows.find((candidate) => candidate.id === id);
    return row === undefined ? [] : [row.descriptor.accessibleName];
  });

  /**
   * What the inspector shows: the shared base for scope `all`, otherwise the
   * value that scope's viewport actually resolves to. The scope, not the
   * preview, decides - so "edit mobile while looking at desktop" stays honest.
   */
  const targets: readonly EditTarget[] = selection.selectedIds.flatMap((id) => {
    const element = state.document.elements[id];
    if (element === undefined) return [];
    return [
      {
        element,
        displayed:
          editScope === "all"
            ? element.base
            : resolveElementProperties(element, editScope),
      },
    ];
  });

  // A draft belongs to the selection and scope it was written for; anything
  // else would let one element's values be applied under another's name.
  const codeDraftKey = `${editScope}:${selection.selectedIds.join(",")}`;
  if (codeDraft !== undefined && codeDraft.key !== codeDraftKey) {
    setCodeDraft(undefined);
  }

  /**
   * The one place this shell writes to the document. Canvas controls and the
   * code surface differ only in `source` and in whether they carry the revision
   * they were prepared against - a code draft does, so a draft written before
   * someone else's edit is rejected instead of overwriting it.
   */
  const commit = (input: {
    source: Extract<EditSource, "canvas" | "code">;
    targetIds: readonly ElementId[];
    changes: Readonly<Record<ElementId, EditablePropertyPatch>>;
    baseRevision?: number;
  }): readonly string[] => {
    const result = store.commit({
      source: input.source,
      targetIds: input.targetIds,
      scope: editScope,
      changes: input.changes,
      baseRevision: input.baseRevision,
    });
    return result.ok ? [] : result.errors.map((error) => error.message);
  };

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
    });
    return result.ok ? [] : result.errors.map((error) => error.message);
  };

  /**
   * Restoring one revision. Like acceptance it is deliberately not routed
   * through `commit`: the element and the scope both come from the recorded
   * entry, so neither the current selection nor the scope switcher can redirect
   * a restore at another element or another viewport. The store still builds an
   * ordinary command and sends it down the same validated pipeline, which is
   * what makes the restore itself appear in history.
   */
  const restore = (request: RestoreRequest): readonly string[] => {
    const result = store.restore(request);
    return result.ok ? [] : result.errors.map((error) => error.message);
  };

  const persistence = describePersistenceStatus(state);

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
    store.reset();
    selection.clear();
    setCodeDraft(undefined);
    setAiState(EMPTY_AI_PANEL_STATE);
    setViewport("desktop");
    setEditScope("all");
    setPanel("design");
    setResetPending(false);
  };

  return (
    <div
      className="flex h-[100dvh] flex-col overflow-hidden bg-surface-canvas text-sm
        max-[900px]:h-auto max-[900px]:min-h-[100dvh] max-[900px]:overflow-visible"
    >
      <header
        className="flex min-h-[52px] flex-none flex-nowrap items-center justify-between gap-3
          border-b border-default bg-surface-shell/88 px-3 py-1 backdrop-blur-[18px]
          max-[900px]:flex-wrap"
      >
        <div
          className="flex min-w-0 flex-1 basis-0 flex-nowrap items-center gap-2
          max-[900px]:flex-auto"
        >
          {props.onBackToTemplates === undefined ? null : (
            <IconButton
              type="button"
              variant="chrome"
              icon="chevron-left"
              className="shrink-0"
              onClick={props.onBackToTemplates}
              aria-label="Back to templates"
              title="Back to templates"
            />
          )}
          {/* Product identity, the same mark the gallery rail shows. */}
          <BrandMark className="size-[22px] flex-none" />
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="m-0 min-w-0 truncate text-[13px] font-semibold tracking-[-0.01em] text-primary">
              <span className="sr-only">Scoped AI Template Editor</span>
              <span aria-hidden="true">
                {props.templateName ?? "Aster Labs"}
              </span>
            </h1>
            <span className="text-[11px] text-muted max-[1180px]:hidden">
              main
            </span>
          </div>
        </div>

        <div
          className="flex min-w-0 flex-none flex-nowrap items-center justify-center gap-2
          max-[900px]:order-3 max-[900px]:w-full max-[900px]:justify-start
          max-[900px]:overflow-x-auto"
        >
          <ViewportSwitcher value={viewport} onChange={setViewport} />
        </div>

        <div
          className="flex min-w-0 flex-1 basis-0 flex-nowrap items-center justify-end gap-2
          max-[900px]:flex-auto"
        >
          {/* One switcher, not three toggles: the dock holds one panel, so the
              control that chooses it reports exactly one pressed item. */}
          <PanelSwitcher value={panel} onChange={setPanel} />

          <ToolbarButton
            type="button"
            variant="chrome"
            aria-label="Reset project…"
            onClick={() => {
              setResetPending(true);
            }}
          >
            Reset&hellip;
          </ToolbarButton>
        </div>
      </header>

      {persistence.needsAttention ? (
        <RecoveryNotice
          status={persistence}
          onReset={() => {
            setResetPending(true);
          }}
        />
      ) : null}

      {/* Scope Lock is above every surface rather than inside one panel: what an
          edit will touch is the same statement whether the edit comes from the
          inspector, the code view, an AI proposal, or a restore. */}
      <div
        className="flex min-h-[46px] flex-none flex-wrap items-center justify-between gap-2
          border-b border-default bg-surface-shell px-3 py-1 max-[620px]:items-stretch"
      >
        <ScopeLock scope={editScope} targetNames={selectedNames} />

        {/* Stays on the right even when Scope Lock has taken the whole row. */}
        <div
          className="flex min-w-0 flex-[0_1_auto] flex-wrap items-center gap-3 ms-auto
          max-[620px]:m-0 max-[620px]:w-full max-[620px]:overflow-x-auto"
        >
          <p
            className="group/persist m-0 inline-flex min-h-8 items-center gap-2 rounded-pill
              border border-default px-2 py-1 text-xs whitespace-nowrap text-secondary
              data-[tone=warning]:border-status-warning data-[tone=warning]:text-primary"
            data-tone={persistence.tone}
          >
            {/* The dot repeats the tone; the label beside it always states it
                in words, so the status never rests on colour. */}
            <span
              className="size-2 rounded-pill bg-muted
                group-data-[tone=saved]/persist:bg-status-success
                group-data-[tone=warning]/persist:bg-status-warning"
              aria-hidden="true"
            />
            {persistence.label}
            <span className="sr-only">. {persistence.detail}</span>
          </p>
          <ScopeSwitcher value={editScope} onChange={setEditScope} />
        </div>
      </div>

      {/* The main track is min-width 0 so a 1440px preview cannot push the
          rail - or the page - into horizontal overflow. */}
      <div
        className="group/body relative grid min-h-0 min-w-0 flex-1
          grid-cols-[minmax(0,320px)_minmax(0,1fr)]
          max-[1180px]:grid-cols-[minmax(0,292px)_minmax(0,1fr)]
          max-[900px]:grid-cols-[minmax(0,1fr)]"
        data-panel={panel}
      >
        {/* The AI composer above, element history below: both are reference
            material for whatever is being edited. */}
        <aside
          className="flex min-h-0 min-w-0 flex-col border-r border-default bg-surface-shell
            max-[900px]:border-r-0 max-[900px]:border-b"
          aria-label="History and AI"
        >
          <div className="flex min-w-0 flex-none items-center gap-3 border-b border-default p-3">
            <span
              className="grid size-[34px] flex-none place-items-center rounded-control
                bg-accent-brand text-primary"
              aria-hidden="true"
            >
              <Icon name="sparkle" className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-xs font-semibold text-secondary">
                Build with AI
              </p>
              <h2 className="m-0 text-sm font-semibold text-primary">
                Describe the next change
              </h2>
            </div>
            <span
              className="ms-auto rounded-pill border px-2 py-1 text-xs whitespace-nowrap
                text-status-success border-status-success/35"
            >
              Proposal mode
            </span>
          </div>

          {/* The composer may hold a whole proposal run, but it must never crowd
              the history out; past this it scrolls inside itself. */}
          <div className="flex min-h-0 flex-1 overflow-hidden p-3 max-[900px]:max-h-none">
            <AiPanel
              document={state.document}
              selectedIds={selection.selectedIds}
              scope={editScope}
              state={aiState}
              onStateChange={setAiState}
              onAccept={acceptProposal}
            />
          </div>

          <div
            className="max-h-[38%] flex-[0_1_34%] overflow-auto border-t border-default
            bg-surface-canvas p-3 max-[900px]:max-h-none"
          >
            <HistoryPanel
              document={state.document}
              selectedIds={selection.selectedIds}
              onRestore={restore}
              showGuidance={false}
            />
          </div>
        </aside>

        {/* The workspace carries the same ambient field as the gallery, so the
            two surfaces read as one product; the preview frame paints its own
            opaque background on top, so nothing under review is tinted. */}
        {/* Above 1100px the dock insets this surface instead of covering it,
            so a panel never hides the part of the canvas being edited; the code
            panel is wider, so the inset widens with it. Below that it overlays
            - the only honest answer when there is no room for both. */}
        <main
          className="flex min-h-0 min-w-0 bg-ambient transition-[margin] duration-fast
            min-[1101px]:me-82 min-[1101px]:group-data-[panel=code]/body:me-114"
          aria-label="Template preview"
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto px-4 pt-3 pb-6">
            <div
              className="flex min-w-0 flex-none flex-wrap items-center justify-between
              gap-x-4 gap-y-2 px-1"
            >
              <p className="m-0 text-[13px] text-secondary">
                Previewing {viewport} at {VIEWPORT_WIDTHS[viewport]}px &middot;
                revision {state.document.revision}
              </p>
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <SelectionSummary
                  rows={rows}
                  selectedIds={selection.selectedIds}
                />
                <ToolbarButton
                  type="button"
                  variant="chrome"
                  aria-pressed={fit}
                  onClick={() => {
                    setFit((current) => !current);
                  }}
                >
                  Fit to canvas
                </ToolbarButton>
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
          </div>
        </main>

        {/* The dock overlays the right edge; the layer itself is inert so the
            canvas keeps taking pointer input everywhere the dock is not. All
            three panels stay mounted and the switcher only reveals one, so
            moving between them cannot discard an unapplied code draft, the
            inspector's pending error, or the layers tree's focus position. */}
        <div
          className="pointer-events-none absolute inset-y-0 end-0 z-20 flex max-w-full
            items-stretch gap-2 p-2 max-[900px]:inset-0 max-[900px]:flex-col max-[900px]:p-0"
        >
          <EditorDock
            id={PANEL_DOCK_IDS.design}
            labelledBy={PANEL_HEADING_IDS.design}
            title={PANEL_TITLES.design}
            open={panel === "design"}
          >
            <InspectorPanel
              resolved={resolved}
              targets={targets}
              scope={editScope}
              revision={state.document.revision}
              onCommit={(input) => commit({ source: "canvas", ...input })}
            />
          </EditorDock>

          <EditorDock
            id={PANEL_DOCK_IDS.code}
            labelledBy={PANEL_HEADING_IDS.code}
            title={PANEL_TITLES.code}
            open={panel === "code"}
            wide
          >
            <CodePanel
              targets={targets}
              scope={editScope}
              revision={state.document.revision}
              draft={
                codeDraft?.key === codeDraftKey ? codeDraft.draft : undefined
              }
              onDraftChange={(draft) => {
                setCodeDraft(
                  draft === undefined
                    ? undefined
                    : { key: codeDraftKey, draft },
                );
              }}
              onApply={(input) => commit({ source: "code", ...input })}
            />
          </EditorDock>

          <EditorDock
            id={PANEL_DOCK_IDS.layers}
            labelledBy={PANEL_HEADING_IDS.layers}
            title={PANEL_TITLES.layers}
            open={panel === "layers"}
          >
            <LayersPanel rows={rows} selection={selection} />
          </EditorDock>
        </div>
      </div>

      {resetPending ? (
        <ResetProjectDialog
          onConfirm={resetProject}
          onCancel={() => {
            setResetPending(false);
          }}
        />
      ) : null}
    </div>
  );
}

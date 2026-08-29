import { useEffect, useMemo, useState, type JSX, type RefObject } from "react";

import {
  resolveDocument,
  resolveElementProperties,
} from "../engine/responsive-resolver";
import type { DocumentStore } from "../store/document-store";
import type { EditSource } from "../model/history";
import type { ElementId } from "../model/ids";
import type { Proposal } from "../engine/proposal";
import type { EditablePropertyPatch } from "../model/properties";
import type { EditScope, Viewport } from "../model/viewport";
import { CanvasToolbar } from "./CanvasToolbar";
import { CodePanel, type CodeDraft } from "./CodePanel";
import { ConversationRail } from "./ConversationRail";
import { EditorDock } from "./EditorDock";
import { type RestoreRequest } from "./HistoryTimeline";
import { BrandMark } from "../brand/BrandMark";
import { IconButton, ToolbarButton } from "./controls";
import { Icon } from "./Icon";
import { InspectorPanel } from "./InspectorPanel";
import { LayersPanel } from "./LayersPanel";
import { PreviewFrame } from "./PreviewFrame";
import { RecoveryNotice } from "./RecoveryNotice";
import { ResetProjectDialog } from "./ResetProjectDialog";
import { SelectionOverlay } from "./SelectionOverlay";
import { PanelSwitcher } from "./PanelSwitcher";
import { PersistenceChip } from "./PersistenceChip";
import { ViewportSwitcher } from "./ViewportSwitcher";
import {
  PANEL_DOCK_IDS,
  PANEL_HEADING_IDS,
  PANEL_TITLES,
  type DockedPanel,
} from "./editor-panels";
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
 * The layout has three regions. A left rail holds one conversation about the
 * layout - the transcript of what has changed above, the AI composer that
 * writes the next change docked under it - and stays visible, because both of
 * them are reference material for whatever is being edited. The centre is the
 * rendered template and nothing else: it is what is under review, so no editor
 * surface ever takes its place. The right is one dock holding one panel at a
 * time - Design, Code, or Layers - chosen from the top bar, which also holds
 * the project itself and the preview viewport: those three are the controls
 * that reframe every region at once. The canvas toolbar at the foot of the
 * workspace keeps what describes the edit about to be made - the scope a
 * commit writes to and the selection - beside the way out to the template on
 * its own page.
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
  /**
   * Where this template stands on its own page, with no editor around it. The
   * canvas toolbar links to it; left undefined - the landing page's embedded
   * demo - the link is simply absent.
   */
  previewHref?: string;
  /**
   * True when the shell is mounted inside another page - the landing page's
   * live demo - rather than standing as the /editor route. Presentation only:
   * the root fills its container instead of the viewport, and the shell's
   * page-level landmarks step down (the h1 becomes a paragraph, the main a
   * labelled section) so the host page keeps a single h1 and a single main.
   * Editing, validation, and history do not change shape at all.
   */
  embedded?: boolean;
}): JSX.Element {
  const { store } = props;
  const embedded = props.embedded === true;
  const Title = embedded ? ("p" as const) : ("h1" as const);
  const Workspace = embedded ? ("section" as const) : ("main" as const);
  const state = useDocumentStore(store);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [editScope, setEditScope] = useState<EditScope>("all");
  /**
   * The preview is always scaled to the room available. It is not a choice any
   * more: a 1440px frame at true size pushed the canvas into horizontal
   * scrolling, and reading the template at its real size is what the
   * standalone preview page is for.
   */
  const fit = true;
  /**
   * Which panel the right dock holds. `none` is the resting state, and the one
   * the editor opens in: with nothing selected there is no element for Design
   * or Code to describe, so the canvas has the whole workspace. Selecting
   * something docks Design - the panel an edit starts from - and deselecting
   * puts it away again; see `syncPanelToSelection` below.
   */
  const [panel, setPanel] = useState<DockedPanel>("none");
  const closeDock = (): void => {
    setPanel("none");
  };
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

  /**
   * The dock follows the selection.
   *
   * Design and Code describe one element, so they have nothing to say until
   * there is one: picking an element on the canvas or in Layers docks Design -
   * the panel an edit starts from - and clearing the selection puts that panel
   * away rather than leaving an empty dock holding a quarter of the window.
   *
   * Two carve-outs keep this from taking control away from the user. It only
   * opens Design when the dock is CLOSED, so choosing a panel first and then an
   * element is not overridden; and it never closes Layers, which reads the whole
   * tree and is one of the two ways to reach a selection in the first place -
   * clearing the selection from the tree must not pull the tree out from under
   * the pointer.
   *
   * It is derived during render from a remembered edge rather than in an
   * effect, so the dock and the selection are committed in the same paint and
   * no frame shows an empty Design panel.
   */
  const hasSelection = selection.selectedIds.length > 0;
  const [selectionWasOpen, setSelectionWasOpen] = useState(hasSelection);
  if (selectionWasOpen !== hasSelection) {
    setSelectionWasOpen(hasSelection);
    if (hasSelection) {
      if (panel === "none") setPanel("design");
    } else if (panel === "design" || panel === "code") {
      setPanel("none");
    }
  }

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

  /**
   * Escape clears the selection from anywhere in the editor.
   *
   * The canvas and Layers already answered Escape on their own targets, which
   * meant deselecting cost a click back into the canvas first - a pointer trip
   * to undo a pointer action. This listens on the window instead, so the key
   * works from the rail, the dock, the top bar, or nowhere in particular.
   *
   * It defers rather than competes. `defaultPrevented` means a nearer handler
   * has already claimed the key - a dock closing, a canvas target clearing, the
   * code editor stepping out - and a text field keeps Escape for itself, so
   * leaving a field and clearing the selection stay two deliberate presses. The
   * confirm dialog owns the key outright while it is open.
   */
  const clearSelection = selection.clear;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || event.defaultPrevented || resetPending) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="dialog"]',
        ) !== null
      ) {
        return;
      }
      clearSelection();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [clearSelection, resetPending]);

  const persistence = describePersistenceStatus(state);

  /**
   * The one destructive action in the editor, reached only from the confirmed
   * dialog. Besides the store's own reset it clears the transient state that
   * belonged to the discarded document: a selection of ids that no longer have
   * the same values, a code draft written against the old revision, and a
   * pending AI run whose proposals were generated from it. Leaving any of those
   * alive would let work from the old project be applied to the fresh one.
   *
   * The dock is not touched here: it is chrome, it holds nothing from the
   * discarded document, and clearing the selection already puts Design or Code
   * away through the rule above - so reset lands on the same empty-selection
   * state a fresh editor opens in, by the same path.
   */
  const resetProject = (): void => {
    store.reset();
    selection.clear();
    setCodeDraft(undefined);
    setAiState(EMPTY_AI_PANEL_STATE);
    setViewport("desktop");
    setEditScope("all");
    setResetPending(false);
  };

  return (
    <div
      className={
        embedded
          ? // Inside a host page the frame decides the height; the shell fills
            // it and keeps its own scrolling, at every width. Its ambient field
            // is the inset one, painted on this box rather than fixed to the
            // viewport: fixed, it would line up pixel for pixel with the host
            // page's own field and the frame would read as a hole cut in the
            // page instead of a separate view of the product.
            "flex h-full flex-col overflow-hidden bg-ambient-inset text-sm"
          : "flex h-[100dvh] flex-col overflow-hidden bg-ambient text-sm max-[900px]:h-auto max-[900px]:min-h-[100dvh] max-[900px]:overflow-visible"
      }
    >
      {/* The top bar carries the project - what is being edited, whether it is
          saved, and the shell's only destructive action - and the two controls
          that reframe the whole window: which device the preview stands in for,
          and which panel the dock holds. Both change the shape of every region
          at once, so they belong to the shell rather than to the canvas. What
          is left describes the EDIT about to be made - the scope a commit
          writes to, the selection - and stays on the canvas toolbar at the foot
          of the workspace it describes.

          The bar has no surface of its own: it sits directly on the ambient
          field, and its chips and buttons are the only things that draw. A
          panel and a rule here would have made a fourth edge competing with
          the three cards below, when the cards are what the eye should count. */}
      {/* Three zones, so each group sits where its meaning is: the project on
          the left, the VIEW controls centred over the workspace they change,
          and the state of the document with the action that discards it on the
          right. The centre column is `auto` between two equal `1fr` gutters,
          which keeps the switchers on the header's true centre line however
          long the template name grows. */}
      <header
        className="grid min-h-[52px] flex-none grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]
          items-center gap-x-3 px-3 py-1 max-[820px]:grid-cols-1 max-[820px]:justify-items-center
          max-[820px]:gap-y-2 max-[820px]:py-2"
      >
        <div className="flex min-w-0 flex-none flex-nowrap items-center gap-2">
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
          <div className="flex min-w-0 items-baseline">
            <Title className="m-0 min-w-0 truncate text-[13px] font-semibold tracking-[-0.01em] text-primary">
              <span className="sr-only">Scoped AI Template Editor</span>
              <span aria-hidden="true">
                {props.templateName ?? "Aster Labs"}
              </span>
            </Title>
          </div>
        </div>

        {/* What the shell shows: which device the preview stands in for, and
            which panel the dock holds. Both change the VIEW, never the
            document, so they share the centre of the bar and stay clear of the
            destructive action on the right. */}
        <div className="flex min-w-0 items-center justify-center gap-x-2">
          <ViewportSwitcher value={viewport} onChange={setViewport} />
          <span
            className="mx-1 h-5 w-px flex-none bg-default"
            aria-hidden="true"
          />
          <PanelSwitcher value={panel} onChange={setPanel} />
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 max-[820px]:justify-center">
          <ToolbarButton
            type="button"
            variant="chrome"
            tone="danger"
            aria-label="Reset project…"
            onClick={() => {
              setResetPending(true);
            }}
          >
            <Icon name="reset" className="size-[14px]" />
            Reset
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

      {/* The main track is min-width 0 so a 1440px preview cannot push the
          rail - or the page - into horizontal overflow. */}
      <div
        className="group/body relative grid min-h-0 min-w-0 flex-1
          grid-cols-[minmax(0,320px)_minmax(0,1fr)]
          max-[1180px]:grid-cols-[minmax(0,292px)_minmax(0,1fr)]
          max-[900px]:grid-cols-[minmax(0,1fr)]"
        data-panel={panel}
      >
        {/* One conversation: the change transcript above, the composer that
            writes the next change docked under it. */}
        <ConversationRail
          document={state.document}
          selectedIds={selection.selectedIds}
          selectedNames={selectedNames}
          scope={editScope}
          state={aiState}
          onStateChange={setAiState}
          onSelectElement={(elementId) => {
            selection.select(elementId, false);
          }}
          onAccept={acceptProposal}
          onRestore={restore}
        />

        {/* The shell carries the same ambient field as the gallery, so the two
            surfaces read as one product; the workspace and the card inside it
            are transparent so that field runs under the preview, and the
            preview frame paints its own opaque background on top, so nothing
            under review is tinted. */}
        {/* Above 1100px the dock insets this surface instead of covering it, so
            a panel never hides the part of the canvas being edited. Every dock
            is the same width, so the inset is one value; with the dock closed
            there is no inset at all. Below 1100px it overlays - the only honest
            answer when there is no room for both. */}
        <Workspace
          className="flex min-h-0 min-w-0 flex-col transition-[margin] duration-fast
            min-[1101px]:group-data-[panel=design]/body:me-92
            min-[1101px]:group-data-[panel=code]/body:me-92
            min-[1101px]:group-data-[panel=layers]/body:me-92"
          aria-label="Template preview"
        >
          {/* One workspace card: the preview and the strip that describes it
              share a single rounded, bordered surface, floating inside the
              ambient field rather than running to the edges of the window. The
              template scrolls within the card and the strip is its foot, so the
              two read as one object under review instead of a canvas with a
              window-wide bar tacked beneath it. The card clips, which is what
              rounds the strip's bottom corners without either piece having to
              know the other's radius. */}
          <div
            className="m-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-panel
              border border-default shadow-soft"
          >
            {/* Empty space in the workspace deselects, the way it does in every
                canvas tool: pressing on anything here that is not a control -
                the matting around the frame, the frame's own background -
                clears the selection. Overlay targets and the controls above the
                frame are real buttons, so they are excluded by the same test
                rather than by a list of coordinates. */}
            {/* The scrolling canvas and the watermark that rides its corner.
                The chip is pinned to this box rather than to the scrolled
                content, so it stays in the corner of the VIEW however far a
                tall template scrolls under it. */}
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              <div
                className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto"
                onMouseDown={(event) => {
                  const target = event.target;
                  if (!(target instanceof HTMLElement)) return;
                  if (
                    target.closest("button, a, input, select, textarea") !==
                    null
                  ) {
                    return;
                  }
                  clearSelection();
                }}
              >
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

              {/* Where the work stands, worn by the document it describes. */}
              <PersistenceChip
                status={persistence}
                revision={state.document.revision}
                className="absolute end-3 bottom-3 z-10"
              />
            </div>

            {/* The card's foot, not scrolled with its contents: what states the
                pending edit stays with the canvas it describes, however far a
                tall template scrolls, and inside the dock's inset, so an open
                panel never covers it. */}
            <CanvasToolbar
              viewport={viewport}
              previewHref={props.previewHref}
              scope={editScope}
              onScopeChange={setEditScope}
              rows={rows}
              selectedIds={selection.selectedIds}
              revision={state.document.revision}
            />
          </div>
        </Workspace>

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
            onClose={closeDock}
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
            onClose={closeDock}
          >
            <CodePanel
              targets={targets}
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
            onClose={closeDock}
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

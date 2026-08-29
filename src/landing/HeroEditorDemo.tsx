import { useRef, useState, type JSX } from "react";

import { EditorShell } from "../editor/EditorShell";
import { useElementSize } from "../editor/use-element-size";
import { getTemplate } from "../gallery/template-catalog";
import type { TemplateDocument } from "../model/document";
import { TemplateRenderer } from "../renderer/TemplateRenderer";
import { createDocumentStore } from "../store/document-store";
import type { StorageLike } from "../store/persistence";
import { useDesktopViewport } from "./use-desktop-viewport";

const DEMO_TEMPLATE = getTemplate("aster-labs");
if (DEMO_TEMPLATE === undefined) {
  throw new Error("The landing demo template is missing from the catalog.");
}
const DEMO_TEMPLATE_ENTRY = DEMO_TEMPLATE;

/** The width every template lays out at before the frame scales it. */
const TEMPLATE_LAYOUT_WIDTH = 1440;

/**
 * A throwaway storage for the hero demo: real enough that the editor hydrates
 * cleanly and its persistence chip tells the truth ("saved" - into this Map),
 * gone on reload. The demo must never be handed browser storage: the hero
 * would silently overwrite the visitor's real Aster Labs project, which is
 * saved under exactly the key this store would write.
 */
function createEphemeralStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

/**
 * The narrow-viewport stand-in: the same template, really rendered, inert.
 * Below the editor's own 900px breakpoint the shell stacks and grows, which a
 * fixed hero frame cannot contain - so small screens get the truth about the
 * template and an invitation to a larger one, never a broken editor.
 */
function StaticTemplatePreview(props: {
  document: TemplateDocument;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef);
  const scale = size === undefined ? 0.26 : size.width / TEMPLATE_LAYOUT_WIDTH;

  return (
    <div
      className="relative aspect-16/10 overflow-hidden bg-surface-canvas"
      ref={containerRef}
      aria-hidden="true"
      inert
    >
      <div
        className="pointer-events-none absolute top-0 left-0 origin-top-left"
        style={{ width: TEMPLATE_LAYOUT_WIDTH, transform: `scale(${scale})` }}
      >
        <TemplateRenderer document={props.document} viewport="desktop" />
      </div>
    </div>
  );
}

/**
 * The hero's "product shot": not a screenshot but the real editor, mounted
 * live inside a browser-chrome frame. It runs the same shell, store, and
 * validation pipeline as /editor - only the storage is a throwaway, so
 * whatever a visitor does in the frame is gone on reload and can never touch
 * a saved project.
 */
export function HeroEditorDemo(): JSX.Element {
  const [store] = useState(() =>
    createDocumentStore({
      createDocument: DEMO_TEMPLATE_ENTRY.createDocument,
      storage: createEphemeralStorage(),
    }),
  );
  const [staticDocument] = useState(() => DEMO_TEMPLATE_ENTRY.createDocument());
  const interactive = useDesktopViewport();

  return (
    <figure className="m-0 flex flex-col gap-4">
      <div
        className="overflow-hidden rounded-panel border border-default bg-surface-shell
          shadow-raised"
      >
        {/* Browser chrome, so the frame reads as the product running - the
            lights are drawn at half strength because they are scenery, not
            status. */}
        <div
          className="flex min-h-11 items-center gap-3 border-b border-default
            bg-surface-panel px-4 py-2"
        >
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-3 rounded-pill bg-status-danger opacity-60" />
            <span className="size-3 rounded-pill bg-status-warning opacity-60" />
            <span className="size-3 rounded-pill bg-status-success opacity-60" />
          </span>
          <span
            className="hidden min-w-0 items-center truncate rounded-pill border border-default
              bg-surface-shell px-3 py-1 font-mono text-xs text-muted sm:flex"
          >
            scoped.app/#/editor/aster-labs
          </span>
          <span
            className="ms-auto flex flex-none items-center gap-2 rounded-pill
              bg-accent-brand-soft px-3 py-1 text-xs font-semibold text-primary"
          >
            <span
              className="size-1.5 rounded-pill bg-status-success"
              aria-hidden="true"
            />
            Live demo
          </span>
        </div>

        {interactive ? (
          <div className="h-[min(74vh,720px)] min-h-[520px]">
            <EditorShell store={store} embedded templateName="Aster Labs" />
          </div>
        ) : (
          <StaticTemplatePreview document={staticDocument} />
        )}
      </div>

      <figcaption className="text-center text-sm text-muted">
        {interactive
          ? "This frame is the real editor. Click any element, edit it, undo it - nothing here is saved, and your own projects are never touched."
          : "A live, editable copy of this editor opens here on a larger screen."}
      </figcaption>
    </figure>
  );
}

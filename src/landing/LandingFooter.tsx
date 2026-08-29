import type { JSX } from "react";

import { BrandMark } from "../brand/BrandMark";

/**
 * The landing footer. Every entry is a button, not an anchor: the app lives
 * under a HashRouter, so `#section` hrefs would be route changes, and a
 * marketing page must never fight its own router. Section jumps and route
 * changes both arrive as callbacks from the page, which owns that knowledge.
 */

function FooterColumn(props: {
  title: string;
  links: readonly { readonly label: string; readonly onSelect: () => void }[];
}): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="m-0 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
        {props.title}
      </h3>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {props.links.map((link) => (
          <li key={link.label}>
            <button
              type="button"
              onClick={link.onSelect}
              className="rounded-xs p-0 text-sm text-secondary transition-colors
                duration-fast hover:text-primary"
            >
              {link.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LandingFooter(props: {
  onOpenGallery: () => void;
  onOpenEditor: () => void;
  onJumpTo: (sectionId: string) => void;
}): JSX.Element {
  return (
    <footer className="border-t border-default">
      <div
        className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-6 py-16
          md:flex-row md:justify-between"
      >
        <div className="flex max-w-xs flex-col gap-4">
          <span className="flex items-center gap-2.5">
            <BrandMark className="size-6" />
            <span className="text-md font-semibold text-primary">
              Scoped AI Template Editor
            </span>
          </span>
          <p className="m-0 text-sm leading-relaxed text-muted">
            A local-first template editor where every change - canvas, code, or
            AI - commits through one validated pipeline.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-12 sm:grid-cols-3">
          <FooterColumn
            title="Product"
            links={[
              { label: "Template gallery", onSelect: props.onOpenGallery },
              { label: "Open the editor", onSelect: props.onOpenEditor },
              {
                label: "Pricing",
                onSelect: () => {
                  props.onJumpTo("pricing");
                },
              },
            ]}
          />
          <FooterColumn
            title="Explore"
            links={[
              {
                label: "Live demo",
                onSelect: () => {
                  props.onJumpTo("demo");
                },
              },
              {
                label: "Features",
                onSelect: () => {
                  props.onJumpTo("features");
                },
              },
              {
                label: "Workflow",
                onSelect: () => {
                  props.onJumpTo("workflow");
                },
              },
            ]}
          />
          <FooterColumn
            title="Under the hood"
            links={[
              {
                label: "One validation pipeline",
                onSelect: () => {
                  props.onJumpTo("workflow");
                },
              },
              {
                label: "Scoped proposals",
                onSelect: () => {
                  props.onJumpTo("features");
                },
              },
              {
                label: "Versioned history",
                onSelect: () => {
                  props.onJumpTo("features");
                },
              },
            ]}
          />
        </div>
      </div>

      <div className="border-t border-default">
        <p
          className="mx-auto m-0 w-full max-w-[1200px] px-6 py-6 text-xs
            text-muted"
        >
          &copy; 2026 Scoped AI Template Editor. Built as a hiring assignment;
          runs entirely in your browser.
        </p>
      </div>
    </footer>
  );
}

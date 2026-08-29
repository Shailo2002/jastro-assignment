import type { JSX, ReactNode } from "react";

import { LandingIcon, type LandingIconName } from "./landing-icons";
import { Reveal } from "./Reveal";

/**
 * The feature grid, Vetra's bento shape: a row of three narrow cards over a
 * row of two wide ones. Each card opens with a small still-life built from
 * the product's real vocabulary - scope chips, a proposal card, revision rows
 * - drawn with tokens rather than screenshots, so the section keeps up with
 * the product by construction.
 */

function FeatureCard(props: {
  icon: LandingIconName;
  title: string;
  copy: string;
  vignette: ReactNode;
  delay: number;
  wide?: boolean;
}): JSX.Element {
  return (
    <Reveal
      delay={props.delay}
      className={props.wide === true ? "md:col-span-3" : "md:col-span-2"}
    >
      <article
        className="flex h-full flex-col overflow-hidden rounded-panel border border-default
          bg-surface-shell shadow-hairline transition-colors duration-fast
          hover:border-strong"
      >
        <div
          className="flex min-h-44 flex-1 items-center justify-center border-b border-default
            bg-[radial-gradient(120%_140%_at_50%_0%,var(--accent-brand-soft),transparent_65%)]
            p-6"
          aria-hidden="true"
        >
          {props.vignette}
        </div>
        <div className="flex flex-col gap-2 p-6">
          <div className="flex items-center gap-2.5">
            <LandingIcon name={props.icon} className="size-4 text-secondary" />
            <h3 className="m-0 text-md font-semibold text-primary">
              {props.title}
            </h3>
          </div>
          <p className="m-0 text-sm leading-relaxed text-secondary">
            {props.copy}
          </p>
        </div>
      </article>
    </Reveal>
  );
}

/** A chip in the scope-lock vignette. */
function ScopeChip(props: { label: string; active?: boolean }): JSX.Element {
  return (
    <span
      className={
        props.active === true
          ? `flex items-center gap-1.5 rounded-pill border border-selection bg-selection-fill
            px-3 py-1.5 text-xs font-semibold text-primary`
          : `flex items-center gap-1.5 rounded-pill border border-default bg-surface-panel
            px-3 py-1.5 text-xs text-muted`
      }
    >
      {props.active === true ? (
        <LandingIcon name="lock" className="size-3" />
      ) : null}
      {props.label}
    </span>
  );
}

function ScopeVignette(): JSX.Element {
  return (
    <span className="flex flex-wrap items-center justify-center gap-2">
      <ScopeChip label="Entire page" />
      <ScopeChip label="Hero section" active />
      <ScopeChip label="Selection" />
    </span>
  );
}

function ProposalVignette(): JSX.Element {
  return (
    <span
      className="flex w-full max-w-64 flex-col gap-3 rounded-card border border-default
        bg-surface-panel p-4 shadow-soft"
    >
      <span className="text-xs leading-relaxed text-secondary">
        &ldquo;Make the hero headline carry more weight.&rdquo;
      </span>
      <span className="h-px bg-default" />
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted">
          fontWeight 600 &rarr; 700
        </span>
        <span className="flex gap-1.5">
          <span
            className="rounded-pill bg-action-primary px-2.5 py-1 text-xs font-semibold
              text-on-accent"
          >
            Accept
          </span>
          <span className="rounded-pill border border-default px-2.5 py-1 text-xs text-secondary">
            Dismiss
          </span>
        </span>
      </span>
    </span>
  );
}

function HistoryVignette(): JSX.Element {
  return (
    <span className="flex w-full max-w-64 flex-col gap-2">
      {(
        [
          ["r14", "Tightened hero spacing", true],
          ["r13", "Rewrote the call to action", false],
          ["r12", "Restored from r9", false],
        ] as const
      ).map(([revision, label, current]) => (
        <span
          key={revision}
          className={
            current
              ? `flex items-center gap-2.5 rounded-card border border-selection
                bg-selection-fill px-3 py-2`
              : "flex items-center gap-2.5 rounded-card border border-default bg-surface-panel px-3 py-2"
          }
        >
          <LandingIcon name="history" className="size-3.5 text-muted" />
          <span className="font-mono text-xs text-muted">{revision}</span>
          <span className="truncate text-xs text-secondary">{label}</span>
        </span>
      ))}
    </span>
  );
}

function CodeVignette(): JSX.Element {
  return (
    <span
      className="flex w-full max-w-80 flex-col gap-1 rounded-card border border-default
        bg-surface-canvas p-4 font-mono text-xs leading-relaxed"
    >
      <span className="text-muted">&#123;</span>
      <span className="ps-4 text-secondary">
        &quot;headline&quot;:{" "}
        <span className="text-primary">&quot;Launch with Aster&quot;</span>,
      </span>
      <span className="ps-4 text-secondary">
        &quot;fontWeight&quot;: <span className="text-primary">700</span>
      </span>
      <span className="text-muted">&#125;</span>
      <span className="mt-2 flex items-center gap-1.5 font-ui text-xs font-semibold text-status-success">
        <LandingIcon name="shield" className="size-3.5" />
        Validated against the document schema
      </span>
    </span>
  );
}

function ViewportsVignette(): JSX.Element {
  return (
    <span className="flex items-end justify-center gap-4">
      {(
        [
          ["1440", "h-24 w-36"],
          ["768", "h-20 w-16"],
          ["375", "h-16 w-9"],
        ] as const
      ).map(([width, size]) => (
        <span key={width} className="flex flex-col items-center gap-2">
          <span
            className={`${size} rounded-sm border border-strong
              bg-[linear-gradient(to_bottom,var(--surface-hover),var(--surface-panel))]`}
          />
          <span className="font-mono text-xs text-muted">{width}</span>
        </span>
      ))}
    </span>
  );
}

export function FeatureBento(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
      <FeatureCard
        icon="lock"
        title="Scope Lock"
        copy="Point an edit at the selection, one section, or the whole page - and nothing outside that scope can change, no matter who asked for the edit."
        vignette={<ScopeVignette />}
        delay={0}
      />
      <FeatureCard
        icon="sparkle"
        title="AI that proposes, never applies"
        copy="Instructions come back as proposals: readable diffs you accept or dismiss one by one. Until you accept, the document has not moved."
        vignette={<ProposalVignette />}
        delay={0.08}
      />
      <FeatureCard
        icon="history"
        title="History you can walk"
        copy="Every commit is a named revision with provenance. Restoring an old one is itself a new commit, so history only ever grows - nothing is lost."
        vignette={<HistoryVignette />}
        delay={0.16}
      />
      <FeatureCard
        icon="code"
        title="A code surface that cannot break the page"
        copy="The code panel edits validated, structured JSON - not fragile JSX. A draft that fails validation is rejected with reasons, and the canvas never flinches."
        vignette={<CodeVignette />}
        delay={0}
        wide
      />
      <FeatureCard
        icon="viewports"
        title="Three honest viewports"
        copy="Desktop, tablet, and mobile are real layout passes at true widths - with per-viewport overrides - not a squeezed desktop render."
        vignette={<ViewportsVignette />}
        delay={0.08}
        wide
      />
    </div>
  );
}

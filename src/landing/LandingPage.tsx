import { useEffect, useState, type JSX, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { BrandMark } from "../brand/BrandMark";
import { FeatureBento } from "./FeatureBento";
import { HeroEditorDemo } from "./HeroEditorDemo";
import { LandingFooter } from "./LandingFooter";
import { LandingIcon, type LandingIconName } from "./landing-icons";
import { PricingSection } from "./PricingSection";
import { Reveal } from "./Reveal";

/**
 * The marketing page at `/`.
 *
 * It borrows Vetra's landing shape - centered dark hero, glowing product
 * frame, brand marquee, bento features, pricing, closing call - and replaces
 * the one thing a landing page usually fakes: the product shot is the real
 * editor, mounted live (see HeroEditorDemo). Everything here is chrome around
 * the app, so it holds route state only; the canonical document and its
 * history belong to the editor's own store and are never touched from here.
 *
 * In-page navigation is buttons over `scrollIntoView`, never `#anchor` hrefs:
 * the app lives under a HashRouter, so a fragment IS a route, and a nav that
 * types `#features` into the URL would navigate the visitor off the page.
 */

/** The teams whose sites ship as the gallery's templates - the product's own universe. */
const MARQUEE_BRANDS = [
  "Aster Labs",
  "Nova Portfolio",
  "Orbit Metrics",
  "Luma Assistant",
  "Kindred Goods",
  "Waypoint Summit",
  "Hollowbrook",
  "Amberline",
] as const;

const WORKFLOW_STEPS: readonly {
  readonly icon: LandingIconName;
  readonly title: string;
  readonly copy: string;
}[] = [
  {
    icon: "pointer",
    title: "Select",
    copy: "Click the canvas or walk the layers tree. Scope Lock decides how far the next edit is allowed to reach.",
  },
  {
    icon: "sparkle",
    title: "Propose",
    copy: "Type an instruction. The AI answers with proposals - diffs you read and accept, never changes it already made.",
  },
  {
    icon: "shield",
    title: "Validate",
    copy: "Canvas, code, AI, restore: every door leads to the same structural validation. An invalid edit never touches the document.",
  },
  {
    icon: "history",
    title: "Commit",
    copy: "Each accepted change lands as a revision with provenance, and any earlier revision restores as a new, validated commit.",
  },
];

function scrollToSection(sectionId: string, instant: boolean): void {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: instant ? "auto" : "smooth",
    block: "start",
  });
}

/** A section's centered heading pair: sans statement, serif-italic accent. */
function SectionHeading(props: {
  id?: string;
  lead: string;
  accent: string;
  copy: string;
}): JSX.Element {
  return (
    <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
      <h2
        id={props.id}
        className="m-0 text-[clamp(30px,4.2vw,48px)] leading-[1.08] font-semibold
          tracking-[-0.03em] text-primary"
      >
        {props.lead}{" "}
        <em className="font-serif font-normal text-secondary italic">
          {props.accent}
        </em>
      </h2>
      <p className="m-0 text-md leading-relaxed text-secondary">{props.copy}</p>
    </Reveal>
  );
}

/** One hero element's entrance; the page's only mount-time animation. */
function HeroEnter(props: {
  children: ReactNode;
  order: number;
  className?: string;
}): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      className={props.className}
      initial={
        prefersReducedMotion === true ? { opacity: 0 } : { opacity: 0, y: 24 }
      }
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: prefersReducedMotion === true ? 0.2 : 0.7,
        delay: 0.1 + props.order * 0.09,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
    >
      {props.children}
    </motion.div>
  );
}

export function LandingPage(props: {
  onOpenGallery: () => void;
  onOpenEditor: (templateId: string) => void;
}): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  // The nav starts transparent over the hero and takes a surface once the
  // page moves, so the fixed bar never draws a line across the headline.
  useEffect(() => {
    const update = (): void => {
      setScrolled(window.scrollY > 8);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
    };
  }, []);

  const jumpTo = (sectionId: string): void => {
    scrollToSection(sectionId, prefersReducedMotion === true);
  };

  return (
    <div className="min-h-screen bg-ambient text-primary">
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-normal ${
          scrolled
            ? "border-b border-default bg-surface-shell/85 backdrop-blur-md"
            : "border-b border-transparent"
        }`}
      >
        <nav
          aria-label="Landing page"
          className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-6 px-6"
        >
          <button
            type="button"
            onClick={() => {
              jumpTo("top");
            }}
            className="flex items-center gap-2.5 rounded-control p-1"
            aria-label="Scoped AI Template Editor - back to top"
          >
            <BrandMark className="size-6" />
            <span className="text-md font-semibold tracking-[-0.01em] text-primary">
              Scoped
            </span>
          </button>

          <div className="ms-auto hidden items-center gap-1 md:flex">
            {(
              [
                ["Features", "features"],
                ["Workflow", "workflow"],
                ["Pricing", "pricing"],
              ] as const
            ).map(([label, sectionId]) => (
              <button
                key={sectionId}
                type="button"
                onClick={() => {
                  jumpTo(sectionId);
                }}
                className="rounded-pill px-3.5 py-2 text-sm text-secondary transition-colors
                  duration-fast hover:text-primary"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={props.onOpenGallery}
              className="rounded-pill px-3.5 py-2 text-sm text-secondary transition-colors
                duration-fast hover:text-primary"
            >
              Templates
            </button>
          </div>

          <button
            type="button"
            onClick={props.onOpenGallery}
            className="ms-auto inline-flex min-h-10 items-center gap-2 rounded-pill
              bg-action-neutral px-4.5 text-sm font-semibold text-on-neutral
              transition-colors duration-fast hover:bg-action-neutral-hover md:ms-0"
          >
            Start editing
          </button>
        </nav>
      </header>

      <main id="top" className="overflow-x-clip">
        {/* ------------------------------------------------ hero ---------- */}
        <section
          className="relative px-6 pt-36 pb-24"
          aria-label="Introduction"
        >
          {/* The hero's light: one brand bloom high behind the headline, one
              cool bloom behind the frame. Pure token light - no image. */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[520px]
              w-[min(1100px,100%)]
              bg-[radial-gradient(60%_70%_at_50%_0%,var(--accent-brand-soft),transparent_70%)]
              blur-2xl"
            aria-hidden="true"
          />

          <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-8">
            <HeroEnter order={0}>
              <p
                className="m-0 flex items-center gap-2 rounded-pill border border-default
                  bg-surface-panel/70 px-4 py-1.5 text-xs font-semibold text-secondary"
              >
                <LandingIcon
                  name="sparkle"
                  className="size-3.5 text-accent-warm"
                />
                New - AI proposals, reviewable before they land
              </p>
            </HeroEnter>

            <HeroEnter order={1}>
              <h1
                className="m-0 max-w-4xl text-center text-[clamp(42px,6.2vw,76px)]
                  leading-[1.04] font-semibold tracking-[-0.035em] text-primary"
              >
                Edit templates with{" "}
                {/* One unit: the accent must never strand "precision" alone on
                    a line with "AI" ending the one above. */}
                <em className="font-serif font-normal whitespace-nowrap text-secondary italic">
                  AI precision
                </em>
              </h1>
            </HeroEnter>

            <HeroEnter order={2}>
              <p
                className="m-0 max-w-xl text-center text-md leading-relaxed
                  text-secondary"
              >
                A local-first template editor where the canvas, the code, and
                the AI all commit through one validated pipeline - every change
                scoped, reviewed, and one click from undone.
              </p>
            </HeroEnter>

            <HeroEnter order={3}>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={props.onOpenGallery}
                  className="inline-flex min-h-touch items-center gap-2 rounded-pill
                    bg-action-neutral px-7 text-md font-semibold text-on-neutral
                    transition-colors duration-fast hover:bg-action-neutral-hover"
                >
                  Start editing
                  <LandingIcon name="arrow-right" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    jumpTo("workflow");
                  }}
                  className="inline-flex min-h-touch items-center gap-2 rounded-pill border
                    border-default bg-surface-panel/70 px-7 text-md font-semibold
                    text-primary transition-colors duration-fast hover:bg-surface-hover"
                >
                  See the workflow
                </button>
              </div>
            </HeroEnter>

            <HeroEnter order={4} className="relative w-full scroll-mt-24">
              <div
                className="pointer-events-none absolute -inset-x-8 top-12 -z-10 h-full
                  bg-[radial-gradient(50%_50%_at_50%_35%,var(--selection-fill),transparent_75%)]
                  blur-3xl"
                aria-hidden="true"
              />
              <div id="demo" className="scroll-mt-24">
                <HeroEditorDemo />
              </div>
            </HeroEnter>
          </div>
        </section>

        {/* ------------------------------------------------ marquee ------- */}
        <section className="px-6 py-16" aria-label="Template partners">
          <Reveal className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-8">
            <p className="m-0 text-xs font-semibold tracking-[0.16em] text-muted uppercase">
              Trusted by the teams behind every template in the gallery
            </p>
            {/* The mask's colours only supply alpha - black is "opaque here",
                not a painted colour - so the fade costs no token. */}
            <div
              className="w-full overflow-hidden
                [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
            >
              <div className="flex w-max animate-marquee items-center gap-16 pe-16">
                {[false, true].map((duplicate) => (
                  <span
                    key={duplicate ? "copy" : "original"}
                    className="flex items-center gap-16"
                    aria-hidden={duplicate ? true : undefined}
                  >
                    {MARQUEE_BRANDS.map((brand) => (
                      <span
                        key={brand}
                        className="text-md font-semibold tracking-[0.14em] whitespace-nowrap
                          text-muted uppercase"
                      >
                        {brand}
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ------------------------------------------------ features ------ */}
        <section
          id="features"
          className="scroll-mt-24 px-6 py-24"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-14">
            <SectionHeading
              id="features-heading"
              lead="A full editor, made"
              accent="scoped"
              copy="Every surface - canvas, code, AI - writes through the same validation. Nothing lands that the document would not accept, from anyone."
            />
            <FeatureBento />
          </div>
        </section>

        {/* ------------------------------------------------ workflow ------ */}
        <section
          id="workflow"
          className="scroll-mt-24 px-6 py-24"
          aria-labelledby="workflow-heading"
        >
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-14">
            <SectionHeading
              id="workflow-heading"
              lead="One pipeline,"
              accent="four doors"
              copy="However an edit arrives, it walks the same road. That is the whole architecture, and the reason nothing on the canvas can surprise you."
            />
            <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
              {WORKFLOW_STEPS.map((step, index) => (
                /* The list item must be the ol's direct child (axe: list
                   structure), so the reveal animates inside it. */
                <li key={step.title} className="h-full">
                  <Reveal delay={index * 0.08} className="h-full">
                    <div
                      className="flex h-full flex-col gap-4 rounded-panel border border-default
                      bg-surface-shell p-6 shadow-hairline"
                    >
                      <span className="flex items-center justify-between">
                        <span
                          className="flex size-10 items-center justify-center rounded-card
                          border border-default bg-surface-panel"
                        >
                          <LandingIcon
                            name={step.icon}
                            className="size-4.5 text-secondary"
                          />
                        </span>
                        <span className="font-mono text-xs text-muted">
                          0{index + 1}
                        </span>
                      </span>
                      <span className="flex flex-col gap-1.5">
                        <span className="text-md font-semibold text-primary">
                          {step.title}
                        </span>
                        <span className="text-sm leading-relaxed text-secondary">
                          {step.copy}
                        </span>
                      </span>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------ pricing ------- */}
        <section
          id="pricing"
          className="scroll-mt-24 px-6 py-24"
          aria-labelledby="pricing-heading"
        >
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-14">
            <SectionHeading
              id="pricing-heading"
              lead="A plan for every"
              accent="scope"
              copy="One of these plans is real. It is the free one, and it is not missing anything."
            />
            <PricingSection onOpenGallery={props.onOpenGallery} />
          </div>
        </section>

        {/* ------------------------------------------------ closing call -- */}
        <section className="px-6 pt-8 pb-24" aria-label="Get started">
          <Reveal className="mx-auto w-full max-w-[1200px]">
            <div
              className="relative flex flex-col items-center gap-6 overflow-hidden
                rounded-panel border border-default bg-surface-shell px-6 py-20
                text-center"
            >
              <div
                className="pointer-events-none absolute inset-0
                  bg-[radial-gradient(70%_90%_at_50%_110%,var(--accent-brand-soft),transparent_70%)]"
                aria-hidden="true"
              />
              <h2
                className="relative m-0 max-w-2xl text-[clamp(30px,4.2vw,48px)]
                  leading-[1.08] font-semibold tracking-[-0.03em] text-primary"
              >
                Ready to edit with{" "}
                <em className="font-serif font-normal text-secondary italic">
                  precision
                </em>
                ?
              </h2>
              <p className="relative m-0 max-w-lg text-md leading-relaxed text-secondary">
                Open the gallery, pick a starting point, and make your first
                scoped edit in under a minute. It is already yours - it runs in
                your browser.
              </p>
              <button
                type="button"
                onClick={props.onOpenGallery}
                className="relative inline-flex min-h-touch items-center gap-2 rounded-pill
                  bg-action-neutral px-7 text-md font-semibold text-on-neutral
                  transition-colors duration-fast hover:bg-action-neutral-hover"
              >
                Open the gallery
                <LandingIcon name="arrow-right" className="size-4" />
              </button>
            </div>
          </Reveal>
        </section>
      </main>

      <LandingFooter
        onOpenGallery={props.onOpenGallery}
        onOpenEditor={() => {
          props.onOpenEditor("aster-labs");
        }}
        onJumpTo={jumpTo}
      />
    </div>
  );
}

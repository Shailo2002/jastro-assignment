import { useState, type JSX } from "react";

import { LandingIcon } from "./landing-icons";
import { Reveal } from "./Reveal";

/**
 * Two tiers, Vetra's shape - with the joke told straight: this product runs
 * entirely in the visitor's browser, so the real plan is the free one and the
 * paid card says so out loud. The billing toggle still works, because a
 * pricing section whose toggle is painted on reads as a mockup.
 */

type Billing = "monthly" | "annually";

const STUDIO_PRICE: Readonly<Record<Billing, number>> = {
  monthly: 19,
  annually: 15,
};

function PlanFeature(props: { children: string }): JSX.Element {
  return (
    <li className="flex items-start gap-2.5 text-sm text-secondary">
      <LandingIcon name="check" className="mt-0.5 size-4 text-status-success" />
      {props.children}
    </li>
  );
}

export function PricingSection(props: {
  onOpenGallery: () => void;
}): JSX.Element {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div className="flex flex-col items-center gap-10">
      <div
        className="flex rounded-pill border border-default bg-surface-panel p-1"
        role="group"
        aria-label="Billing period"
      >
        {(["monthly", "annually"] as const).map((period) => (
          <button
            key={period}
            type="button"
            aria-pressed={billing === period}
            onClick={() => {
              setBilling(period);
            }}
            className={
              billing === period
                ? `min-h-9 rounded-pill bg-action-neutral px-5 text-sm font-semibold
                  text-on-neutral transition-colors duration-fast`
                : `min-h-9 rounded-pill px-5 text-sm text-secondary transition-colors
                  duration-fast hover:text-primary`
            }
          >
            {period === "monthly" ? "Monthly" : "Annually"}
          </button>
        ))}
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
        <Reveal>
          <article
            className="relative flex h-full flex-col gap-6 rounded-panel border
              border-selection bg-surface-shell p-8 shadow-glow"
          >
            <span
              className="absolute -top-3 start-8 rounded-pill bg-action-primary px-3 py-1
                text-xs font-semibold text-on-accent"
            >
              Everything included
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="m-0 text-md font-semibold text-primary">Local</h3>
              <p className="m-0 flex items-baseline gap-2">
                <span className="text-[40px] leading-none font-semibold tracking-tight text-primary">
                  $0
                </span>
                <span className="text-sm text-muted">forever</span>
              </p>
              <p className="m-0 mt-1 text-sm text-secondary">
                The whole editor, running in your browser. No account, no
                server, no network - your work never leaves the machine.
              </p>
            </div>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              <PlanFeature>All four starting templates</PlanFeature>
              <PlanFeature>Scoped AI proposals with review</PlanFeature>
              <PlanFeature>Full version history and restore</PlanFeature>
              <PlanFeature>Desktop, tablet, and mobile passes</PlanFeature>
              <PlanFeature>Saved locally, recovered automatically</PlanFeature>
            </ul>
            <button
              type="button"
              onClick={props.onOpenGallery}
              className="mt-auto inline-flex min-h-touch items-center justify-center gap-2
                rounded-pill bg-action-neutral px-6 text-sm font-semibold text-on-neutral
                transition-colors duration-fast hover:bg-action-neutral-hover"
            >
              Start free
              <LandingIcon name="arrow-right" className="size-4" />
            </button>
          </article>
        </Reveal>

        <Reveal delay={0.08}>
          <article
            className="flex h-full flex-col gap-6 rounded-panel border border-default
              bg-surface-shell p-8"
          >
            <div className="flex flex-col gap-1">
              <h3 className="m-0 text-md font-semibold text-primary">Studio</h3>
              <p className="m-0 flex items-baseline gap-2">
                <span className="text-[40px] leading-none font-semibold tracking-tight text-primary">
                  ${STUDIO_PRICE[billing]}
                </span>
                <span className="text-sm text-muted">
                  {billing === "monthly"
                    ? "per month"
                    : "per month, billed yearly"}
                </span>
              </p>
              <p className="m-0 mt-1 text-sm text-secondary">
                The plan this page would sell if this product had a company
                behind it. It does not - Studio is set dressing, like the one on
                every landing page.
              </p>
            </div>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              <PlanFeature>Shared template libraries</PlanFeature>
              <PlanFeature>Review threads across a team</PlanFeature>
              <PlanFeature>Unlimited proposal archive</PlanFeature>
              <PlanFeature>Priority in the validation queue</PlanFeature>
            </ul>
            <button
              type="button"
              onClick={props.onOpenGallery}
              className="mt-auto inline-flex min-h-touch items-center justify-center gap-2
                rounded-pill border border-default bg-surface-panel px-6 text-sm
                font-semibold text-primary transition-colors duration-fast
                hover:bg-surface-hover"
            >
              Take the free one anyway
            </button>
          </article>
        </Reveal>
      </div>
    </div>
  );
}

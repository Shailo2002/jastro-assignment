# Decision Log

Record decisions while implementing. This file supports the README trade-off explanation, PRODUCT_NOTES cuts, and AI_USAGE evidence. Do not rewrite history to make the process look perfect.

## Confirmed initial decisions

| Date | Decision | Reason | Consequence |
| --- | --- | --- | --- |
| 2026-08-26 | Use React + TypeScript + Vite | The prototype is client-side; SSR and server features are not required | Simpler state-centric architecture and deployment |
| 2026-08-26 | Use one typed JSON document as durable source of truth | Required for stable IDs, scope validation, history, persistence, and shared editing surfaces | Renderer supports a constrained element/property vocabulary |
| 2026-08-26 | Code surface edits validated JSON rather than arbitrary JSX | Safer and feasible within assignment time | Less expressive than a production code editor; document this trade-off |
| 2026-08-26 | Use deterministic scenarios, not a model API | Explicit assignment requirement | Demo instructions are predefined but consume current selection/state |
| 2026-08-26 | Use localStorage through a versioned adapter | Refresh persistence is required; backend is not | Device-local project only |
| 2026-08-26 | Additional capability: Scope Lock | Directly addresses user trust by showing what will and will not change | Must be visible for manual and AI edits |
| 2026-08-26 | Adapt Vetra's visual language to an editor shell | User requested Vetra-like UI; dense tools need different layout | Preserve dark/blue/rounded feel without copying the marketing page |

## Decision template

Copy this section for each new decision:

### YYYY-MM-DD - Decision title

- Context:
- Options considered:
- Decision:
- Why:
- Trade-off:
- Evidence/test:
- Related step/commit:

## Rejected suggestions log

Capture at least one material AI correction for `AI_USAGE.md`.

| Date | AI suggestion | Why rejected/corrected | Resulting change | Evidence |
| --- | --- | --- | --- | --- |
| TODO | TODO | TODO | TODO | diff/test/commit |


## Step 0 decisions

### 2026-08-26 - Vite + pnpm + Vitest/RTL + Playwright baseline

- Context: Step 0 needs a scaffold and repeatable quality commands inside the existing documentation-first folder.
- Options considered: Next.js (rejected: pulls a server/routing model the assignment explicitly cuts), CRA (unmaintained), Vite + React + TS (chosen).
- Decision: Vite 7 + React 19 + strict TypeScript, pnpm as the single package manager, Vitest + jsdom + React Testing Library for unit/component tests, Playwright for the reviewer journey.
- Why: `TEST_PLAN.md` and `IMPLEMENTATION_STEPS.md` already specify the `pnpm lint/typecheck/test/test:watch/test:e2e/build` command set; Vite keeps the app a pure client bundle with no backend surface.
- Trade-off: two test runners to maintain; mitigated by keeping unit specs in `src/**` and e2e specs in `e2e/**` with `e2e` excluded from the Vitest `include`.
- Evidence/test: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` all pass.
- Related step/commit: Step 0.

### 2026-08-26 - Plain CSS custom properties for the token layer

- Context: `DESIGN_SYSTEM.md` requires semantic tokens with raw values confined to a definition layer.
- Options considered: Tailwind, CSS-in-JS, plain CSS custom properties (chosen).
- Decision: `src/styles/tokens.css` holds every raw value; `src/styles/global.css` and future components reference only `var(--token)`.
- Why: the design system is already expressed as a `:root` custom-property block, so this is a direct mapping with no extra build step or dependency.
- Trade-off: no utility-class ergonomics; acceptable for a small, dense editor shell.
- Evidence/test: `src/styles/tokens.css` contains the only literals; `pnpm build` emits the token CSS.
- Related step/commit: Step 0.

### 2026-08-26 - Playwright base URL uses `localhost`, not `127.0.0.1`

- Context: the first `pnpm test:e2e` run failed with `Timed out waiting 60000ms from config.webServer`.
- Decision: set the Playwright `baseURL` and `webServer.url` to `http://localhost:5173`.
- Why: Vite 7's default host resolves to `::1` only; probing confirmed `localhost` and `[::1]` return 200 while `127.0.0.1` does not connect.
- Evidence/test: `pnpm test:e2e` passes after the change.
- Related step/commit: Step 0.

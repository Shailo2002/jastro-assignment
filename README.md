# Scoped AI Template Editor

A browser-based website-builder prototype that lets a non-technical owner safely edit one responsive template through canvas controls, validated structured code, and deterministic AI proposals. Changes are constrained by stable element selection and viewport scope, require explicit acceptance, and can be restored independently per element.

> Status: implemented through Step 6A - canonical model, safety engines, persistence, responsive renderer, preview shell, and one-template gallery entry flow.

## Links

- Live demo: TODO
- Walkthrough: TODO
- Repository: TODO

## Reviewer quick start

Prerequisites: a current Node.js LTS release and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL shown by Vite. Exact setup will be verified from a clean checkout before submission.

Quality commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Reviewer journey

1. Find Aster Labs in the template gallery and choose **Use template**.
2. Switch desktop, tablet, and mobile preview sizes.
3. Select one element, then add another with Shift/Ctrl/Cmd-click.
4. Set All or a single viewport in Scope Lock.
5. Make a manual canvas/inspector edit.
6. Apply a valid structured JSON edit, then try invalid JSON.
7. Run a deterministic example instruction and inspect before/after cards.
8. Accept one element and reject another.
9. Restore one prior element/viewport revision.
10. Reload to verify persistence; use deliberate reset when finished.

## Deterministic demo examples

Final exact phrases must match implemented scenarios. Planned examples:

- Content: “Make this heading shorter.”
- Style: “Make this button blue and more rounded.”
- Move/resize/reorder: “Make this card wider.”
- Responsive: “Make these cards smaller on mobile.”
- Multi-element: “Make selected buttons consistent.”
- Safe failure: “Create a backend database.”

No real model is connected. The scenario engine uses the current instruction, selected stable IDs, current values, and scope to produce typed proposals. The same input and state produces the same result.

## Architecture

```text
Canvas / structured code / accepted proposal / restore
                        |
                        v
              validated EditCommand
                        |
                        v
              canonical typed document
                 /       |       \
         renderer     history   persistence
             |
      responsive resolver
```

Canvas and code do not synchronize directly. Both read the same canonical document and submit changes through the same runtime validation and commit pipeline.

### Canonical model ownership

- Model/schema: TODO implementation paths
- Command validator/apply: TODO implementation paths
- Responsive resolution: TODO implementation paths
- History/restore: TODO implementation paths
- Persistence: TODO implementation paths
- Deterministic proposal engine: TODO implementation paths

### Commit boundary

A durable change occurs only after a typed command passes shape, target, selection (for AI), allowed-field, value, structure, scope, and stale-revision validation. Invalid commands preserve the current document and history.

### Responsive resolution

Base values apply across views. Desktop, tablet, and mobile overrides are merged after base values for only the active preview. A single-viewport edit writes only that override.

### Trade-off

The code surface edits validated structured JSON instead of arbitrary JSX/HTML. This limits expressiveness but enables safe runtime validation, stable IDs, scoped patches, deterministic rendering, and independent recovery within the assignment.

Full design: [ARCHITECTURE.md](./ARCHITECTURE.md).

## Template and visual source

- Template: **"Aster Labs"**, an original one-page business template authored for this assignment. It is not derived from a third-party template, theme, or marketplace download. Source of truth: `src/model/initial-template.ts` (hero, features, call-to-action, and footer sections; 26 elements with stable ids such as `hero.heading`, `hero.cta.primary`, and `features.card.1`).
- Template assets: one original SVG, `public/template/hero-preview.svg`, drawn for this repository. No external image, icon set, or font file is bundled.
- Editor visual direction: inspired by [Vetra](https://vetra-app.vercel.app/) - dark neutral surfaces, blue accent, thin borders, rounded controls, restrained glow. The editor adapts the style and does not copy the site's content.
- Gallery layout direction: inspired by the supplied dark template-marketplace screenshot, reduced to one honest template card with no copied branding, pricing, authentication, or fake inventory.
- Any additional image, icon, font, or component-library source must be listed here before submission.

## Main dependencies

Currently installed and used:

- React + TypeScript + Vite for the client application and build.
- React Router DOM in declarative `HashRouter` mode for gallery/editor navigation and static-host-safe direct links.
- Zod for runtime model and command validation.
- Vitest + React Testing Library for unit/component tests.
- Playwright for real-browser flows and responsive checks.

The project deliberately uses a small purpose-built document store with React's `useSyncExternalStore`; Zustand and Immer were not installed because a generic state setter would make the guarded commit boundary easier to bypass. Tailwind, shadcn/ui, Monaco, and dnd-kit remain deferred until a later step proves each dependency is necessary.

## Requirement mapping

| Requirement | Implementation evidence | Test evidence |
| --- | --- | --- |
| Stable typed canonical model | TODO | TODO |
| Canvas-code consistency | TODO | TODO |
| Desktop/tablet/mobile isolation | TODO | TODO |
| AI selection/field/scope safety | TODO | TODO |
| Independent proposal outcomes | TODO | TODO |
| Per-element/scope recovery | TODO | TODO |
| Persistence and reset | TODO | TODO |
| Keyboard accessibility | TODO | TODO |

The complete working checklist is in [REQUIREMENTS_CHECKLIST.md](./REQUIREMENTS_CHECKLIST.md).

## Product decision: Scope Lock

The editor visibly states the selected targets and edit scope before manual or AI actions. Proposal review also lists protected views/elements. The hypothesis and intended validation are documented in [PRODUCT_NOTES.md](./PRODUCT_NOTES.md).

## Known cuts

No authentication, backend, database, real model integration, multiplayer collaboration, multiple working templates, arbitrary JSX compilation, or full freeform design-canvas parity. The catalog is data-driven so another real template can be added later without redesigning the gallery.

## AI-assisted development

This project is implemented in bounded steps with AI suggestions reviewed through diffs, focused tests, manual scenarios, and meaningful commits. Actual examples, corrections, commands, and limitations are recorded in [AI_USAGE.md](./AI_USAGE.md).

## Documentation

- [PROJECT_SETUP.md](./PROJECT_SETUP.md) - start and documentation map
- [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md) - staged execution guide
- [TEST_PLAN.md](./TEST_PLAN.md) - automated coverage
- [MANUAL_QA.md](./MANUAL_QA.md) - hands-on verification
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Vetra-inspired UI rules
- [PRODUCT_NOTES.md](./PRODUCT_NOTES.md) - product rules and extra capability

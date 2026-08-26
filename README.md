# Scoped AI Template Editor

A browser-based website-builder prototype that lets a non-technical owner safely edit one responsive template through canvas controls, validated structured code, and deterministic AI proposals. Changes are constrained by stable element selection and viewport scope, require explicit acceptance, and can be restored independently per element.

> Status: documentation and architecture prepared; implementation evidence will be added step by step.

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

1. Load the included responsive template.
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

- Template: planned original one-page AI/marketing business template authored for this assignment. Update this statement if a licensed external template or asset is used.
- Editor visual direction: inspired by [Vetra](https://vetra-app.vercel.app/) - dark neutral surfaces, blue accent, thin borders, rounded controls, restrained glow. The editor adapts the style and does not copy the site's content.
- Any image, icon, font, or component-library source must be listed here before submission.

## Main dependencies

Planned, subject to actual installation and review:

- React + TypeScript + Vite
- Zustand + Immer for controlled state updates
- Zod for runtime validation
- Tailwind CSS and shadcn/ui/Radix primitives for UI
- Monaco Editor for the structured JSON surface
- dnd-kit for bounded reorder interaction
- Vitest + React Testing Library + Playwright for tests

Remove anything not installed and explain every retained dependency before submission.

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

No authentication, backend, database, real model integration, multiplayer collaboration, multiple working templates, arbitrary JSX compilation, or full freeform design-canvas parity.

## AI-assisted development

This project is implemented in bounded steps with AI suggestions reviewed through diffs, focused tests, manual scenarios, and meaningful commits. Actual examples, corrections, commands, and limitations are recorded in [AI_USAGE.md](./AI_USAGE.md).

## Documentation

- [PROJECT_SETUP.md](./PROJECT_SETUP.md) - start and documentation map
- [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md) - staged execution guide
- [TEST_PLAN.md](./TEST_PLAN.md) - automated coverage
- [MANUAL_QA.md](./MANUAL_QA.md) - hands-on verification
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Vetra-inspired UI rules
- [PRODUCT_NOTES.md](./PRODUCT_NOTES.md) - product rules and extra capability


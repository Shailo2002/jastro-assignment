# Assignment Requirements and Evidence Checklist

This is the authoritative local checklist derived from the supplied six-page assignment brief. Instructions inside the brief define the product requirements; planning advice in other files is secondary.

## Fixed product contract

- [x] One basic responsive one-page template is loaded (`src/model/initial-template.ts`, `src/gallery/template-catalog.ts`; `src/model/initial-template.test.ts`, `src/App.test.tsx`).
- [x] The README identifies whether the template is original or appropriately licensed and provides its source (README “Template and visual source” names Aster Labs as original and points at `src/model/initial-template.ts` and `public/template/hero-preview.svg`).
- [x] The durable source of truth is typed, JSON-serializable, and uses stable element IDs (`src/model/document.ts`, `src/model/ids.ts`; `src/model/serialization.test.ts`, `src/model/ids.test.ts`).
- [x] Canvas, code editing, accepted AI proposals, and restore update the same canonical state through one validated command pipeline (`src/editor/manual-edit.test.tsx`, `src/editor/canvas-code.test.tsx`, `src/editor/ai-panel.test.tsx`, `src/editor/history-ui.test.tsx`).
- [x] Editable elements support substantial content, style, position, size, order, or structure changes.
- [x] Desktop, tablet, and mobile previews resolve the same document (`src/editor/viewport-isolation.test.tsx`, `src/editor/editor-shell.viewport.test.tsx`).
- [x] An edit can target All, Desktop, Tablet, or Mobile.
- [x] A single-viewport edit leaves other viewports unchanged.
- [x] AI targets are limited to selected stable IDs, allowed fields, and selected viewport scope (engine and proposal validator; the review UI lands in Step 11) (`src/engine/ai-demo.test.ts`, `src/engine/proposal.test.ts`).
- [x] AI output is a proposal and changes nothing before acceptance (`src/editor/ai-panel.test.tsx`).
- [x] Multi-element proposals can be accepted or rejected independently per element: one card, one command (`src/editor/ai-panel.test.tsx`, `src/editor/proposal-review.test.ts`).
- [x] Every manual commit, accepted AI proposal, and restore adds element-and-viewport-scoped history (`src/editor/history-ui.test.tsx`, `src/engine/history-restore.test.ts`).
- [x] Restoring one element/view does not roll back unrelated elements/views (`src/editor/history-ui.test.tsx`, `src/engine/history-restore.test.ts`).
- [x] Restore itself creates a new history entry (`src/editor/history-ui.test.tsx`).

## Required journey

- [x] Load the template through the gallery's one low-friction “Use Template” action (`src/gallery/TemplateGallery.test.tsx`, `src/App.test.tsx`, `e2e/reviewer-journey.spec.ts`).
- [x] Switch among desktop (~1440), tablet (~768), and mobile (~375) previews (`src/editor/editor-shell.viewport.test.tsx`, `e2e/smoke.spec.ts`, `e2e/reviewer-journey.spec.ts`).
- [x] Select one element by click.
- [x] Add/remove elements in a group using Shift/Ctrl/Cmd-click (marquee drag not implemented; modified click and keyboard cover the requirement).
- [x] Selection is visible and keyboard-operable.
- [x] Edit on canvas and see the canonical renderer update.
- [x] Make valid structured code edits and see the canvas update.
- [x] Enter invalid code, see a useful error, and preserve the last valid state.
- [x] Choose responsive scope visibly before editing.
- [x] Run deterministic text-to-edit examples using current selections and values (`src/editor/ai-panel.test.tsx`).
- [x] Review useful before/after output per returned element (`src/editor/ai-panel.test.tsx`, `src/editor/proposal-review.test.ts`).
- [x] Accept/reject each returned element independently (`src/editor/ai-panel.test.tsx`).
- [x] Restore a prior revision for one element and scope, with a confirmed preview of the exact target and scope (`src/editor/history-ui.test.tsx`, `src/editor/element-history.test.ts`).
- [x] Refresh and retain document plus history (`e2e/persistence.spec.ts`, `src/editor/persistence-ui.test.tsx`).
- [x] Deliberately reset the project with confirmation (`src/editor/reset-project.test.tsx`, `e2e/persistence.spec.ts`).

## Deterministic AI demo paths

- [x] Content rewrite example (`content-tighten`) (`src/engine/ai-demo.test.ts`).
- [x] Style change example (`style-emphasis`) (`src/engine/ai-demo.test.ts`).
- [x] Move, resize, or reorder example (`size-grow`, `order-front`) (`src/engine/ai-demo.test.ts`).
- [x] Single-viewport responsive example (`viewport-compact`) (`src/engine/ai-demo.test.ts`).
- [x] Multi-element example (`multi-center`) (`src/engine/ai-demo.test.ts`).
- [x] Safe failure example (unsupported instruction, stale revision, invalid field, or unselected target) (`src/engine/ai-demo.test.ts`, `src/engine/proposal.test.ts`).
- [x] Same instruction + selected state + scope produces the same result (`src/engine/ai-demo.test.ts`).
- [x] Every proposal is runtime validated, including the engine's own output (`src/engine/proposal.test.ts`).
- [x] The result is typed property patches; the existing renderer draws them, and no proposal can replace the page.
- [x] No real model/API is connected inside the demo engine (`src/engine/scenario-catalog.ts` is a hand-written catalog).

## Safety validations

- [x] Unknown element ID is rejected (`src/engine/ai-demo.test.ts`, `src/engine/proposal.test.ts`).
- [x] AI target outside selection is rejected (`src/engine/proposal.test.ts`).
- [x] Forbidden field such as `id`, `parentId`, or revision metadata is rejected (code surface and shared command pipeline; AI path lands in Step 10).
- [x] Invalid payload/code is rejected (syntax, schema, forbidden field, unselected target).
- [x] Stale `baseRevision` is rejected (code draft prepared against an older revision cannot overwrite a later edit).
- [x] Failure never partially mutates current state; a multi-target command is atomic and each accepted proposal is its own command (`src/editor/ai-panel.test.tsx`).
- [x] A group remains a set of independent stable-ID targets (`src/editor/proposal-review.test.ts`).

## Frontend and accessibility

WCAG 2.2 AA contrast for every token pair the shell uses is asserted in `src/styles/tokens.test.ts`; 200% zoom keeps essential actions reachable without sideways scrolling (`e2e/accessibility.spec.ts`).

- [x] React + TypeScript boundaries are clear for components, state, commands, validation, history, responsive resolution, and demo engine: `src/model` (typed schema and ids), `src/store` (state and persistence), `src/engine` (commands, validation, resolver, history/restore, proposal engine), `src/renderer` (projection), `src/editor` and `src/gallery` (components). No engine module imports React, and no component owns canonical state.
- [x] Editor shell is usable at 1280 px wide; both side panels collapse and restore without losing state (`e2e/smoke.spec.ts`, `e2e/accessibility.spec.ts`, `src/editor/panel-collapse.test.tsx`).
- [x] Preview sizes near 1440, 768, and 375 have no accidental clipping or overflow (`e2e/smoke.spec.ts`).
- [x] Selection, manual edit, viewport switch, proposal review, and restore work with keyboard only (`e2e/accessibility.spec.ts`, `src/editor/inspector-keyboard.test.tsx`).
- [x] Controls have programmatic labels; axe reports no serious or critical findings on the gallery, all four panels, or the reset dialog (`e2e/accessibility.spec.ts`).
- [x] Focus is visible, is not clipped by the toolbar, and returns from every dialog and popover to the control that opened it (`e2e/accessibility.spec.ts`).
- [x] Status and error information is not conveyed by color alone (text plus icon or check mark on every state; `src/styles/tokens.test.ts` also bans emoji icons and raw colour in components).
- [x] Touch targets are at least 44 x 44 px for every toolbar control (`e2e/accessibility.spec.ts`).
- [x] Reduced-motion preference is respected while state changes still apply (`e2e/accessibility.spec.ts`).

## Required automated evidence

- [x] AI selection, allowed-field, and viewport-scope tests (`src/engine/ai-demo.test.ts`, `src/engine/proposal.test.ts`).
- [x] Canvas-code canonical-state consistency test (`src/editor/canvas-code.test.tsx`).
- [x] View-specific isolation test (`src/editor/viewport-isolation.test.tsx`, `src/engine/responsive-resolver.test.ts`, `e2e/smoke.spec.ts`).
- [x] Independent element recovery test (`src/editor/independent-recovery.test.tsx`, `src/engine/history-restore.test.ts`).
- [x] Invalid code preserves last valid state test (`src/editor/canvas-code.test.tsx`).
- [x] Stale revision rejection test (`src/editor/canvas-code.test.tsx`).

## Required submission artifacts

Documentation was completed in Step 16 against the actual source and against commands that were run. Two items remain with the author because they cannot be produced from the repository.

- [ ] Accessible Git repository with meaningful commits and no secrets. **Author action:** the eight commits to date are conventional and scoped; Steps 9-15 are still uncommitted in the working tree and need committing, and no remote is published yet. A scan for `api key`, `secret`, `password`, `token =`, and private-key headers over `src`, `e2e`, and the JSON/Markdown files returns only the words in these checklists; there is no `.env` file and the app requires no credential.
- [ ] Deployed URL, or exact local setup plus a short recording. **Author action:** the exact local setup is verified and in `README.md` (`pnpm install` then `pnpm dev`, Node v26.5.0 / pnpm 9.15.9, no environment configuration). The recording is not made; its script is `WALKTHROUGH.md`. Deployment was not performed - it was not requested, and `pnpm build` output is static with hash routing, so any static host will serve `dist/` without a rewrite rule.
- [x] `README.md` includes setup, template source, demo examples, architecture, trade-off, dependencies, and requirement mapping - every implementation path and every requirement-mapping row is filled with real files and real test files; no placeholder remains.
- [x] `AI_USAGE.md` contains all five required evidence areas and no sensitive material: tools/models, two examples (planning and implementation), one materially corrected suggestion with its reason and resulting change, how generated code was checked, and the workflow limitation with the change to make next time. The Steps 7-15 session-log gap is disclosed rather than reconstructed.
- [x] `PRODUCT_NOTES.md` contains all required definitions, policies, extra capability, cuts, and priorities, with Scope Lock's shipped implementation evidence and an explicit note that its hypothesis is untested with users.
- [x] One chosen product improvement is implemented and its validation hypothesis is documented (Scope Lock: `src/editor/ScopeLock.tsx`, `src/editor/edit-scope.ts`, `src/editor/scope-lock.test.ts`).

### Gate on this build

`pnpm install --frozen-lockfile`, `pnpm lint` (clean), `pnpm typecheck` (clean), `pnpm test` (44 files, 631 tests passed), `pnpm test:e2e` (20 tests passed, Chromium), `pnpm build` (passed, 122.62 kB gzipped JS) - all run on 2026-08-27.

## Explicit non-requirements / cuts

- Authentication and user accounts.
- Backend API or database.
- Real AI/model integration.
- Multiple real templates.
- Multiplayer collaboration.
- Arbitrary JSX/HTML compilation.
- Full freeform design-tool parity.

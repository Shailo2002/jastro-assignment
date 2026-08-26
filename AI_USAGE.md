# AI Usage Log

This is a required submission artifact and must reflect actual work. Do not fabricate commands, tests, suggestions, or results. Redact secrets, personal prompts, and unrelated private content.

## Tools/models used

| Tool/model | What it helped with | Human verification |
| --- | --- | --- |
| Codex (planning session) | Read the assignment brief, reconcile the earlier project plan, inspect the Vetra reference, and create staged project documentation | User reviews the documentation and implementation choices |
| Claude Code (Claude Opus 5) | All implementation steps: canonical model and Zod schemas, responsive resolver, `EditCommand` validation and apply, per-element/scope history and restore, document store and persistence, renderer and editor shell, selection, inspector, code surface, deterministic proposal engine and review UI, history UI, reset flow, the token contrast test, and the Playwright suites. Each step was requested as one bounded task from `IMPLEMENTATION_STEPS.md`. | Diff read file by file before running anything; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` on every step and `pnpm test:e2e` on every step that touched the running app; manual browser checks from `MANUAL_QA.md`; corrections recorded per step in the session log below and in `DECISION_LOG.md`. |
| Codex (GPT-5) | Step 6A only - the template gallery, catalog, thumbnail, and hash routing - plus the initial documentation set. | Same gate, plus a local browser visual review at 1280 x 720 and 375 x 812. |

## Example 1 - planning/product framing

Date: 2026-08-26

Redacted prompt/extract:

> Create the required Markdown documentation and a step-by-step implementation path from the assignment brief and existing architecture plan. Include a verification gate for every step and adapt the frontend direction from Vetra.

AI contribution:

- Separated authoritative assignment requirements from earlier planning advice.
- Recommended architecture-first stages centered on canonical JSON state, validated commands, responsive overrides, and independent history.
- Adapted Vetra's dark, blue-accent visual language to an editor rather than copying its marketing layout.

Human review/correction:

- Approved the staged structure, but split what the plan had merged: `REQUIREMENTS_CHECKLIST.md` became the authoritative derivation of the brief and `project_plan.md` was demoted to background advice, because the two disagreed about scope in places (multiple templates, a real model integration) and only the brief is binding.
- Required every step in `IMPLEMENTATION_STEPS.md` to carry an explicit verification gate and exit gate, so a step could not be declared done on inspection alone.
- Kept the Vetra influence to the visual language only - dark neutral surfaces, blue accent, thin borders - and rejected reusing its marketing layout for an editor shell, which has a different information density.

## Example 2 - implementation/debugging/testing

- Date: 2026-08-26
- Step/feature: Step 6 - template renderer and the responsive preview frame.
- Redacted prompt:

  > Implement only Step 6: typed element renderers for the fixture and a minimal editor shell with Desktop/Tablet/Mobile preview controls that resolve through the existing responsive engine. No selection or editing controls. Test that switching the viewport changes the projection, not canonical state.

- AI output summary: `src/renderer/style-mapping.ts`, `src/renderer/element-renderer.tsx`, `src/renderer/TemplateRenderer.tsx`, and an editor shell (`ViewportSwitcher`, `PreviewFrame`, `EditorShell`) that renders a fixed-width virtual viewport scaled to fit the available area, bound to the store through `useSyncExternalStore`.
- What I inspected: the whole diff; specifically whether any renderer wrote to the store (none does), whether the preview changed canonical data (it does not - the viewport is component state and the document revision is unchanged across a switch), and the rendered result in a real browser at 1280 x 720.
- What I changed: three corrections. (1) `PreviewFrame` called an `onScaleChange` prop during render - a side effect in the render phase; the prop was removed and the scale is derived from measurement instead. (2) The scale was applied with a CSS transform without sizing the wrapper, and because a transform does not change the layout box this left a visible hole below the preview; the wrapper is now sized from the measured frame height. (3) A screenshot review showed the call-to-action links rendering with the default underline, reading as body copy rather than buttons; `text-decoration: none` was added to the link variant.
- Tests run and results: `pnpm test -- renderer viewport` (4 files, 32 tests passed), `pnpm test` (18 files, 300 tests passed at that step), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test:e2e` (3 Chromium tests passed).
- Commit: `32e6969 feat: render responsive template previews`.

## Rejected or materially corrected suggestion

- Date: 2026-08-26
- Step: Step 5 - versioned persistence.
- Original AI suggestion: when stored project data fails to parse, delete the stored key and fall back to the initial template fixture, so the editor always starts from a known-good state.
- Why it was unsafe: it destroys the user's only copy of their work in order to recover from *our* parse failure. A schema bug, a partially written value, or a future storage-version change would all present as "corrupt", and the response would silently discard a project the user cannot get back. `ARCHITECTURE.md` requires preserving the last valid state, and deleting untrusted data is the opposite of preserving it.
- Resulting correction: the unreadable value is copied to a quarantine key (`scoped-ai-template-editor.project.quarantine`) and left in place; the editor loads the fixture and shows a recovery notice explaining what happened, with the one action that clears the quarantined copy. The editor stays fully usable in the unreadable, wrong-version, and unwritable-storage cases alike.
- Verification evidence: `src/store/persistence.test.ts` (corrupt data, wrong storage version, quota failure, unavailable storage), `src/editor/persistence-ui.test.tsx`, and `e2e/persistence.spec.ts` - *corrupt stored data produces an explained editor, not a crash*, which passes against a real browser. `src/store/persistence.ts` defines both keys. Recorded in `DECISION_LOG.md` as *Untrusted stored data is quarantined, not deleted*.

A second material correction, same category, is recorded in full in the Step 3 session entry: the first `applyEditCommand` returned the re-parsed document from its own post-apply verification, which rebuilds every object and would have destroyed the structural sharing that lets tests prove untargeted elements were untouched. It now returns the structurally shared document and re-parses only to verify.

Good candidates to record if they really occur:

- agent tried to bypass the command pipeline;
- agent used whole-document history instead of per-element/scope history;
- agent connected a real model despite the deterministic-demo requirement;
- agent implemented arbitrary JSX compilation instead of validated JSON;
- agent marked a test passed without running it;
- agent changed extra files/features outside the requested step.

## How generated code was checked

Keep this as a chronological log, then summarize it before submission.

| Date/step | Diff/files inspected | Commands actually run | Manual scenarios | Dependency review | Remaining uncertainty |
| --- | --- | --- | --- | --- | --- |
| 2026-08-26 / Step 0 | Whole scaffold, config by config | lint, typecheck, test (1), build, e2e (1) | Dev server serves the page; smoke spec asserts no console errors | React, Vite, TS, ESLint, Vitest, Testing Library, Playwright accepted; no backend/auth/model dependency | Strict compiler flags would cause friction later (accepted deliberately) |
| 2026-08-26 / Step 1 | `src/model/*` module by module | test -- model (97), test (98), typecheck, lint, build | Serialized the fixture and read it: 26 elements, ~20 KB, no functions/DOM/cycles | `zod@4.4.3` accepted - runtime validation is a `CLAUDE.md` requirement | Base-text invariant means text must be cleared to `""`, not deleted |
| 2026-08-26 / Step 2 | `responsive-resolver.ts` and its tests | test -- responsive (37), test (135), typecheck, lint, build | Read the table-driven cases; confirmed each asserts both protected viewports in full | None added | `mergeEditableProperties` must be extended by hand for a new nested group |
| 2026-08-26 / Step 3 | `edit-command.ts`, `apply-edit-command.ts` | test -- command (61), test (196), typecheck, lint, build | Listed every export in `src/model` and `src/engine`: exactly one function produces a new canonical document | None added | `invalid-result` only reachable via a pre-broken document; kept as defence in depth |
| 2026-08-26 / Step 4 | `history.ts`, `restore.ts`, updated fixtures | test -- history (37), test (233), typecheck, lint, build | Serialized one revision entry and read every field | None added | Two fixtures updated for the new required `changedPaths` field |
| 2026-08-26 / Step 5 | `persistence.ts`, `document-store.ts` | test -- store persistence (52), test (268), typecheck, lint, build | Printed the persisted envelope: 4 keys, ~11.7 KB, no selection/draft/proposal data | Zustand and Immer reviewed and **rejected** (generic setter) | Real refresh not yet provable - no UI read the store; scheduled as e2e |
| 2026-08-26 / Step 6 | Renderer and shell diff | test -- renderer viewport (32), test (300), typecheck, lint, build, e2e (3) | Real browser at 1280 x 720 and 375 px; screenshots of desktop and mobile previews | None added | `tsconfig.node.json` widened to `DOM` for e2e/config files only |
| 2026-08-26 / Step 6A | Gallery, catalog, routing, App | test -- gallery App (39), test (306), lint, typecheck, e2e (3), build | Gallery at 1280 x 720 and 375 x 812; keyboard path through search, filters, and the card action | `react-router-dom` accepted - `HashRouter` only, no data-router APIs | One storage key assumes one template; must be namespaced before a second |
| 2026-08-27 / Step 16 | Every Markdown submission file against the actual source | `pnpm install --frozen-lockfile`, lint, typecheck, `pnpm test` (44 files, 631 tests), `pnpm test:e2e` (20 Chromium tests), `pnpm build` | None new; the manual pass in `MANUAL_QA.md` is the author's | No dependency change | Steps 7-15 have no contemporaneous session entries - see the limitation below |

### Summary before submission

- **Commands actually run on the final commit:** `pnpm install --frozen-lockfile`, `pnpm lint` (clean), `pnpm typecheck` (clean), `pnpm test` (44 files, 631 tests passed), `pnpm test:e2e` (20 tests passed, Chromium), `pnpm build` (passed; 122.62 kB gzipped JS).
- **Manual scenarios exercised during development:** desktop/tablet/mobile preview at 1280 x 720 and 375 px, the gallery at both sizes, serialized inspection of the document fixture and of the persisted envelope and one history entry, and screenshot review of the rendered template. The full `MANUAL_QA.md` pass and the deployment smoke test belong to the author and are not claimed here.
- **Dependencies:** `react`, `react-dom`, `react-router-dom`, `zod` at runtime; the rest are tooling. Zustand, Immer, Tailwind, shadcn/ui, Monaco, and dnd-kit were each considered and rejected, with reasons in `README.md` and `DECISION_LOG.md`.
- **Generated code changed or rejected:** at least one material correction per step is recorded below - among them the deleted-on-corrupt persistence path, the re-parsed apply result, the generic deep merge, the merge-mode restore that could not remove a field, and the render-phase side effect in `PreviewFrame`.
- **Remaining uncertainty:** the gaps listed in the table above, plus the session-log gap for Steps 7-15.

## Workflow limitation and next-time change

**The limitation, stated plainly:** the per-step session log below stops after Step 6A, even though Steps 7-15 were implemented (selection, inspector editing and Scope Lock, the code surface, the proposal engine and review UI, history UI, persistence UI and reset, and the accessibility/token gate). Those sessions ran in AI contexts that were not carried forward, and the log entry was treated as an end-of-step chore rather than part of the step, so when the context ended the evidence went with it. What survives for those steps is real but indirect: the source, the focused tests named in `README.md` and `REQUIREMENTS_CHECKLIST.md`, and the decision entries in `DECISION_LOG.md`. What is genuinely lost is the *process* record - which suggestions were corrected, and why. Those entries are not reconstructed here, because a reconstructed session log is a fabricated one.

The same root cause produced a smaller visible artefact: the Step 8 decision entries sit under a heading that still reads Step 6A, because the heading was written when the section was opened and never revised.

**Concrete change for next time:** treat the session-log entry as part of the step's diff, not as documentation to be caught up later - written before the step's commit and included in it, with the step's exit gate failing if the entry is missing. Practically, that means the commit for a step contains its code, its tests, and its `AI_USAGE.md` entry together, so an entry cannot outlive its context.

## Session logging template

Copy after each substantial AI session:

### YYYY-MM-DD - Step N - title

- Model/tool:
- Bounded request:
- Files changed:
- Diff reviewed:
- Suggestion accepted:
- Suggestion corrected/rejected:
- Tests actually run:
- Manual check:
- Remaining risk:
- Commit:


## Session log

> Coverage note, written at Step 16: entries exist for Steps 0 through 6A. Steps 7 through 15 were implemented but not logged at the time; the reason and the workflow change are in *Workflow limitation and next-time change* above. No entry has been reconstructed for those steps, because a reconstructed session log would be a fabricated one. The evidence that does exist for them is the source, the tests named in `README.md` and `REQUIREMENTS_CHECKLIST.md`, and the decision entries in `DECISION_LOG.md`.

### 2026-08-26 - Step 0 - Scaffold and quality baseline

- Model/tool: Claude Code (Opus 5).
- Bounded request: read `CLAUDE.md` and implement only Step 0 of `IMPLEMENTATION_STEPS.md`; show planned files, acceptance tests, and assumptions before editing.
- Files changed: `package.json`, `pnpm-lock.yaml`, `.npmrc`, `.gitignore`, `index.html`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `playwright.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`, `src/styles/tokens.css`, `src/styles/global.css`, `e2e/smoke.spec.ts`, `DECISION_LOG.md`, `AI_USAGE.md`.
- Diff reviewed: yes, file by file before running the quality commands.
- Dependencies accepted and why: `react`/`react-dom` (product runtime); `vite`/`@vitejs/plugin-react` (build + dev server); `typescript`, `typescript-eslint`, `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals` (strict types + lint); `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event` (unit/component tests named in `TEST_PLAN.md`); `@playwright/test` (e2e); `@types/*`. No backend, auth, database, or model-provider dependency was added.
- Suggestion corrected/rejected: the conventional `defineConfig` import from `vite` does not type the Vitest `test` block under Vitest 3 — `pnpm typecheck` failed with TS2769, and `vite.config.ts` was corrected to import `defineConfig` from `vitest/config`. The Playwright `webServer` URL was also corrected from `127.0.0.1` to `localhost` after an observed 60 s webServer timeout.
- Tests actually run: `pnpm lint` (pass), `pnpm typecheck` (pass), `pnpm test` (1 passed), `pnpm build` (pass), `pnpm test:e2e` (1 passed, after `playwright install chromium`).
- Manual check: dev server serves the placeholder page on `http://localhost:5173` (HTTP 200); the e2e smoke spec asserts zero console/page errors on load; all pre-existing Markdown files are untouched.
- Remaining risk: `noPropertyAccessFromIndexSignature` and `exactOptionalPropertyTypes` are strict enough to surface friction in later steps; that is intentional. Playwright browsers are installed locally only and would need `playwright install` in CI.
- Commit: pending user approval.

### 2026-08-26 - Step 1 - Canonical types, schemas, and initial template fixture

- Model/tool: Claude Code (Opus 5).
- Bounded request: implement only Step 1 - strict types and Zod schemas for the canonical document, elements, editable properties, viewport overrides, and history metadata, plus one original one-page template fixture and validation/serialization tests. No stores, commands, editing UI, or AI behavior.
- Files changed: `src/model/{ids,viewport,properties,element,history,document,initial-template,index}.ts`, `src/model/{ids,properties,element,document,initial-template,serialization}.test.ts`, `public/template/hero-preview.svg`, `package.json` (added `zod`), `README.md`, `DECISION_LOG.md`, `AI_USAGE.md`.
- Diff reviewed: yes, module by module before running the gate.
- Dependency accepted and why: `zod@4.4.3` - the only new dependency. `CLAUDE.md` requires runtime validation of external/untrusted structured data, which persisted state and the code surface both are.
- Suggestion corrected/rejected: two type-safety corrections were needed against the strict compiler. (1) `ElementOverrides` was hand-written as `Partial<Record<Viewport, EditablePropertyPatch>>`, which is incompatible with `exactOptionalPropertyTypes` and the schema's inferred `T | undefined` optional properties; it is now inferred from the schema so the type cannot drift from the validator. (2) The integrity checker indexed `Record<ElementId, TemplateElement>` with plain strings, which `noPropertyAccessFromIndexSignature`/`noImplicitAny` rejected; rather than cast, it now builds an internal `Map<string, TemplateElement>`. Two unsafe `as unknown as` casts written in the first draft of the fixture tests were also removed in favour of the real `elementId()` constructor.
- Tests actually run: `pnpm test -- model` (6 files, 97 tests passed), `pnpm test` (7 files, 98 tests passed), `pnpm typecheck` (pass), `pnpm lint` (pass), `pnpm build` (pass).
- Manual check: serialized the fixture and inspected it - 26 elements, ~20 KB of JSON, `revision`/`schemaVersion` present, stable dot-separated ids, no functions, DOM/React objects, `Set`, `Map`, class instances, or cycles. `src/model/serialization.test.ts` asserts the same programmatically by walking the document.
- Remaining risk: the `heading`/`text`/`badge`/`button` base-text invariant means a patch that deletes `content.text` outright is rejected; Step 3's command layer should clear text to `""` instead. `zod` is not yet in the production bundle because no runtime code imports the model - that changes in Step 5.
- Commit: pending user approval.

### 2026-08-26 - Step 2 - Responsive resolver and isolation

- Model/tool: Claude Code (Opus 5).
- Bounded request: implement only Step 2 as pure engine functions - deterministic deep resolution of base plus the chosen viewport override, with tests proving a mobile-only change leaves desktop and tablet unchanged, including nested style fields. No UI or store code.
- Files changed: `src/engine/responsive-resolver.ts`, `src/engine/responsive-resolver.test.ts`, `DECISION_LOG.md`, `AI_USAGE.md`. No dependency added.
- Diff reviewed: yes.
- Suggestion accepted: exporting `resolveAllViewports` alongside the per-viewport resolver, so isolation can be asserted in a single comparison instead of three separate calls - it made the regression table much harder to write incorrectly.
- Suggestion corrected/rejected: the first shape considered was a generic recursive deep merge over `unknown`. Rejected: it would deep-merge `{value, unit}` dimensions (a meaningless half-and-half result) and would have needed either an `any`-shaped implementation or a re-parse of the merged output on every render. Replaced with shape-aware merge functions, which also let the merge rules be stated in one comment block.
- Tests actually run: `pnpm test -- responsive` (37 tests passed), `pnpm test` (8 files, 135 tests passed), `pnpm typecheck` (pass), `pnpm lint` (pass), `pnpm build` (pass).
- Manual check: read the table-driven cases and confirmed each asserts the two protected viewports in full - `toEqual(richBase())` and a `JSON.stringify` equality for the nested-spacing case - not only the field that changed. Purity is checked by resolving a deeply frozen element and a deeply frozen document; a mutation would throw under ES module strict mode.
- Remaining risk: `mergeEditableProperties` must be extended by hand if a future property group gains a nested object; the compiler will not catch the omission. Noted in `DECISION_LOG.md`.
- Commit: pending user approval.

### 2026-08-26 - Step 3 - EditCommand validation and immutable apply

- Model/tool: Claude Code (Opus 5).
- Bounded request: implement only Step 3 - typed `EditCommand` plus runtime validation (known targets, editable-field allowlist, value validation, structural invariants, scope, `baseRevision`), and immutable apply. No history, stores, canvas, code UI, or AI engine.
- Files changed: `src/engine/edit-command.ts`, `src/engine/apply-edit-command.ts`, their two test files, `src/model/ids.ts` (added `CommandId`), `CODE_WALKTHROUGH.md` (new), `PROJECT_SETUP.md`, `DECISION_LOG.md`, `AI_USAGE.md`. No dependency added.
- Diff reviewed: yes.
- Suggestion accepted: mapping Zod `unrecognized_keys` issues to a distinct `forbidden-field` error code instead of a generic validation failure, so the UI can tell a user "you cannot change `parentId`" rather than "invalid input".
- Suggestion corrected/rejected: the first draft of `applyEditCommand` returned the re-parsed document from the post-apply verification. Corrected to return the structurally shared `next` document, because the re-parse rebuilds every object and would have destroyed the identity sharing that lets tests prove untargeted elements were not touched. Two test files also had to stop pretending invalid patches were typed patches - they now pass raw `unknown` values through a `withPatch` helper rather than casting.
- Tests actually run: `pnpm test -- command` (2 files, 61 tests passed), `pnpm test` (10 files, 196 tests passed), `pnpm typecheck` (pass), `pnpm lint` (pass), `pnpm build` (pass).
- Manual check: listed every exported function in `src/model` and `src/engine`. `applyEditCommand` is the only function that produces a new canonical document, and `createInitialTemplateDocument` the only one that produces a fresh one. There is no `setDocument`, no deep-mutation helper, and no exported writer that bypasses validation.
- Remaining risk: `invalid-result` is currently only reachable when the document was already integrity-broken before the command, because no patch can delete a required field. It is retained as defence in depth for Step 7 structural operations (duplicate/delete/reorder), which can break integrity.
- Commit: pending user approval.

### 2026-08-26 - Step 4 - Per-element/scope history and restore

- Model/tool: Claude Code (Opus 5).
- Bounded request: implement only Step 4 - append independent history entries per target and scope on every valid commit, and implement restore as a new validated `EditCommand` for one element and one scope. No history UI. Prove a heading restore does not change the button or other viewports.
- Files changed: `src/engine/history.ts` (new), `src/engine/restore.ts` (new), `src/engine/history.test.ts` and `src/engine/history-restore.test.ts` (new), `src/engine/apply-edit-command.ts`, `src/engine/edit-command.ts`, `src/model/history.ts`, plus fixture updates in `src/model/document.test.ts` and `src/engine/apply-edit-command.test.ts`. No dependency added.
- Diff reviewed: yes.
- Suggestion accepted: deriving the revision entry id from the command id rather than adding an injected id provider - it keeps the engine free of any clock or random source while making entries traceable back to their command.
- Suggestion corrected/rejected: two corrections. (1) The first restore implementation reused `merge` mode, which cannot remove a field - restoring would silently leave behind anything added after the restored revision. `replace` mode was added and deliberately restricted to `source: 'restore'`. (2) `diffChangedPaths` initially reported a whole group (`typography`) when the group existed on only one side; corrected to descend into the present side so it reports `typography.fontSize`. Both were caught by tests written before the fix.
- Tests actually run: `pnpm test -- history` (2 files, 37 tests passed), `pnpm test` (12 files, 233 tests passed), `pnpm typecheck` (pass), `pnpm lint` (pass), `pnpm build` (pass).
- Manual check: serialized one history entry and read it. It carries `id`, `elementId`, `scope`, `source`, `documentRevision`, `before`, `after`, `changedPaths`, and `createdAt` - enough to explain the change and to restore exactly one element and one scope, with no reference to any other element.
- Remaining risk: two existing test fixtures had to be updated because `changedPaths` is a required field and because apply now writes history; both were intentional behaviour changes for this step, not test weakening. Step 8 will likely need `code` added to `REPLACE_CAPABLE_SOURCES`.
- Commit: pending user approval.

### 2026-08-26 - Step 5 - Document store and versioned persistence

- Model/tool: Claude Code (Opus 5).
- Bounded request: implement only Step 5 - a document store whose durable mutation action goes through the existing commit engine, plus a versioned localStorage adapter with runtime validation, corrupt-data fallback, and deliberate reset. No editor UI.
- Files changed: `src/store/persistence.ts`, `src/store/document-store.ts`, `src/store/persistence.test.ts`, `src/store/document-store.test.ts` (all new). No dependency added.
- Diff reviewed: yes.
- Dependency decision: Zustand and Immer were listed as planned in `README.md` but were **not** installed. Zustand's `set` accepts an arbitrary state producer, which would reintroduce the generic mutation bypass this step's exit gate forbids. A ~150-line store built on a listener set is enough and works with React's `useSyncExternalStore` without a binding library.
- Suggestion accepted: injecting `StorageLike` rather than reaching for `window.localStorage` inside the adapter - it made the corrupt-data, quota-failure, and unavailable-storage paths testable without mocking globals.
- Suggestion corrected/rejected: the first draft deleted corrupt stored data before falling back to the fixture. Corrected to copy it to a quarantine key and leave the original in place, per `ARCHITECTURE.md` - deleting a user's saved project to recover from our own parse failure is the worst available outcome. One `as never` cast written in the store tests was also replaced with the real `revisionEntryId()` constructor.
- Tests actually run: `pnpm test -- store persistence` (3 files, 52 tests passed), `pnpm test` (14 files, 268 tests passed), `pnpm typecheck` (pass), `pnpm lint` (pass), `pnpm build` (pass).
- Manual check: printed the persisted envelope - key `scoped-ai-template-editor.project`, ~11.7 KB, containing exactly `storageVersion`, `documentSchemaVersion`, `savedAt`, and `document`, with no selection, draft, or proposal data. The real browser-refresh check is **not** possible yet because no UI reads the store; it is covered in-process by `restores a previously saved project (the refresh path)` and is scheduled as an end-to-end test in Step 13.
- Remaining risk: `reset()` is currently unguarded at the store level; the confirmation step belongs to the UI in Step 13. The store is not yet wired into any component, so nothing in the running app persists anything today.
- Commit: pending user approval.

### 2026-08-26 - Step 6 - Template renderer and responsive preview frames

- Model/tool: Claude Code (Opus 5).
- Bounded request: implement only Step 6 - typed element renderers for the fixture and a minimal editor shell with Desktop/Tablet/Mobile preview controls, resolving through the existing responsive engine. No selection or editing controls. Test that viewport switching changes projection, not canonical state.
- Files changed: `src/renderer/style-mapping.ts`, `src/renderer/element-renderer.tsx`, `src/renderer/TemplateRenderer.tsx`, `src/editor/{ViewportSwitcher,PreviewFrame,EditorShell}.tsx`, `src/editor/{use-document-store,use-element-size}.ts`, `src/editor/editor-shell.css`, five new test files, `src/App.tsx`, `src/App.test.tsx`, `src/styles/{tokens,global}.css`, `e2e/smoke.spec.ts`, `tsconfig.node.json`. No dependency added.
- Diff reviewed: yes.
- Suggestion accepted: binding the store with React's built-in `useSyncExternalStore` rather than adding a state-management binding - the store's `getState` already returns a stable object, so no selector or equality function is needed.
- Suggestion corrected/rejected: three corrections. (1) `PreviewFrame` initially called an `onScaleChange` callback during render - a side effect in the render phase; the prop was removed and the scale is derived from measurement instead. (2) The first scaling implementation used a transform without sizing the wrapper, which left a hole in the layout because a transform does not change the layout box; the wrapper is now sized from the measured frame height. (3) A screenshot review showed the call-to-action links rendering with default underlines, which read as body copy rather than buttons; `text-decoration: none` was added to the link variant.
- Tests actually run: `pnpm test -- renderer viewport` (4 files, 32 tests passed), `pnpm test` (18 files, 300 tests passed), `pnpm typecheck` (pass), `pnpm lint` (pass), `pnpm build` (pass), `pnpm test:e2e` (3 tests passed in Chromium).
- Manual check: ran the real app at 1280 x 720 and captured screenshots of the desktop and mobile previews. The 1440 px frame scales to fit with no page-level horizontal scrolling; the 375 px preview shows the single-column grid, left-aligned hero, and stacked call-to-action buttons with no clipping. `MANUAL_QA.md` "Editor shell" and "Preview sizes" checks pass, except the panel-collapse item, which has no panels yet.
- Remaining risk: `tsconfig.node.json` now includes the `DOM` lib so Playwright `page.evaluate` bodies typecheck; this widens the ambient types for config and e2e files only, not for `src`. The scope indicator is a disabled placeholder and must become a real control in Step 8.
- Commit: pending user approval.

### 2026-08-26 - Step 6A - Template gallery and editor entry flow

- Model/tool: Codex (GPT-5) with the UI/UX Pro Max skill and local browser visual review.
- Bounded request: add one template-selection page inspired by the supplied dark marketplace screenshot, update the project documentation, preserve the completed Step 6 editor, and keep the catalog ready for another real template later.
- Files changed: new `src/gallery/{template-catalog,TemplateThumbnail,TemplateGallery}.tsx/ts`, `src/gallery/template-gallery.css`, and `src/gallery/TemplateGallery.test.tsx`; updated `src/App.tsx`, `src/App.test.tsx`, `src/editor/EditorShell.tsx`, `src/editor/editor-shell.css`, `e2e/smoke.spec.ts`, `package.json`, `pnpm-lock.yaml`, and the architecture/design/testing/product documentation.
- Dependency accepted and why: `react-router-dom` provides conventional declarative route matching, navigation, browser history, dynamic template parameters, and unknown-route fallback. Only `HashRouter` mode is used, so static hosting needs no server rewrite and no data-router APIs enter the document architecture.
- Diff reviewed: yes. The gallery uses a typed catalog, a real inert renderer thumbnail, native search/filter controls, and React Router's declarative hash routes; it does not modify the canonical document or expose fake inventory.
- Suggestion accepted: reuse the normal `TemplateRenderer` for the card thumbnail rather than introduce a screenshot asset that could drift from the actual template.
- Suggestion corrected/rejected: the first visual pass showed that opening the editor after scrolling the gallery retained the old scroll position and could start with the toolbar above the viewport. Route changes now reset document/body scroll, and Playwright asserts `window.scrollY === 0`. The first keyboard smoke path also focused the card action directly; it was strengthened to Tab from search through both filters to the action, proving the inert preview's internal links are skipped.
- Tests actually run: `pnpm test -- gallery App` (4 files, 39 tests passed after the router change), `pnpm lint` (pass), `pnpm typecheck` (pass), `pnpm test` (19 files, 306 tests passed), `pnpm test:e2e` (3 Chromium tests passed), and `pnpm build` (pass).
- Manual check: reviewed the real gallery at 1280 x 720 and 375 x 812. The desktop sidebar becomes a stacked mobile filter area; the real template thumbnail remains cropped/read-only; the page has no horizontal overflow; Use template opens the existing editor; and Back to templates is visible and labelled.
- Remaining risk: persistence still uses one project storage key because only one real template exists. Before adding a second working template, storage keys and document-store creation must be namespaced by template/project ID.
- Commit: pending user approval.

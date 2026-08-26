# Step-by-Step Implementation Guide

Follow these steps in order. Each step is deliberately small enough to give Claude Code as a bounded request, inspect its diff, verify behavior, and make one meaningful commit.

## How to use each step

1. Ask Claude Code to read `CLAUDE.md` and implement only the current step.
2. Review the proposed file list before it edits.
3. Inspect the diff after it edits.
4. Run the focused automated checks listed for the step.
5. Run the manual check when present.
6. Update `AI_USAGE.md`, `DECISION_LOG.md`, and requirement evidence.
7. Commit only after the exit gate passes.

Do not skip a failing gate. Fix the current step or document a deliberate change of architecture before continuing.

---

## Step 0 - Scaffold and quality baseline

### Goal

Create a minimal React + TypeScript + Vite application and establish repeatable quality commands. Do not build editor features yet.

### Suggested bounded prompt

```text
Read CLAUDE.md and the Step 0 section of IMPLEMENTATION_STEPS.md.
Scaffold only the React + TypeScript + Vite baseline in this existing folder.
Preserve all Markdown files. Add strict TypeScript, lint, Vitest + RTL,
Playwright configuration, and scripts named lint, typecheck, test,
test:watch, test:e2e, and build. Add one smoke component test.
Do not implement the editor UI or data model. Show me the planned files first.
```

### Work

- Initialize Vite React TypeScript without deleting the documentation.
- Choose pnpm or npm and use one lockfile.
- Enable strict TypeScript and reasonable lint rules.
- Configure unit/component tests and one smoke test.
- Configure Playwright with a placeholder smoke spec; install browser only if required.
- Add semantic global token placeholders rather than polished UI.
- Update README commands only if the actual scripts differ.

### Automated verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run `pnpm test:e2e` after Playwright browser setup.

### Manual verification

- Development server opens a minimal page without console errors.
- Existing Markdown files remain intact.
- Package file contains no unnecessary backend/auth/model dependencies.

### Exit gate

- All baseline commands pass.
- A clean install can be explained from the lockfile and README.
- No assignment feature is prematurely implemented.

### Suggested commit

`chore: scaffold editor application and quality tooling`

---

## Step 1 - Canonical types, schemas, and initial template fixture

### Goal

Define a typed, JSON-serializable template document with stable IDs and one original responsive one-page business template. No editor shell yet.

### Suggested bounded prompt

```text
Implement only Step 1. Create strict TypeScript types and Zod schemas for the
canonical template document, elements, editable properties, viewport overrides,
and history metadata. Create one small original one-page template fixture with
stable human-readable IDs. Add validation and serialization tests. Do not add
stores, commands, editing UI, or AI behavior.
```

### Work

- Add `model` types and runtime schemas.
- Define stable element types needed for a useful one-page template (section, heading, text, button, image/container/card as justified).
- Define constrained editable properties; keep identity/history forbidden.
- Create initial document factory, not a mutable singleton.
- Include parent/child integrity validation.
- Use stable IDs such as `hero.section`, `hero.heading`, `hero.cta.primary`.
- Document the template as original in README, unless external assets are introduced.

### Automated verification

- Initial template passes runtime schema.
- JSON serialize/parse round-trip passes.
- Duplicate/missing IDs and broken parent-child links fail.
- Document factory returns independent copies.

```bash
pnpm test -- model
pnpm typecheck
pnpm test
```

### Manual verification

Inspect the serialized fixture. Confirm it contains no functions, DOM/React objects, `Set`, `Map`, or circular references.

### Exit gate

- Stable typed IDs are visible in fixture/tests.
- Base and all three override slots are representable.
- Schema version and document revision exist.
- README accurately states the template source.

### Suggested commit

`feat: add canonical template document model`

---

## Step 2 - Responsive resolver and isolation

### Goal

Resolve one document into Desktop, Tablet, or Mobile using base values plus only that viewport's override.

### Suggested bounded prompt

```text
Implement only Step 2 as pure engine functions. Add deterministic deep resolution
of base properties plus the chosen viewport override. Do not add UI or store code.
Write tests that prove a mobile-only change leaves desktop and tablet unchanged,
including nested style fields.
```

### Work

- Implement pure non-mutating resolver functions.
- Define merge semantics for nested properties and arrays/structure.
- Avoid truthiness bugs for valid values such as `0`, empty string, or `false`.
- Document resolution order in code comments only where it prevents ambiguity.

### Automated verification

- Base-only element resolves equally in all views.
- Each viewport override affects only that viewport.
- Nested property merge preserves untouched sibling fields.
- Input document is unchanged/frozen in tests if useful.

```bash
pnpm test -- responsive
pnpm typecheck
pnpm test
```

### Manual verification

Read the table-driven test cases and confirm they assert protected viewport values, not only the changed value.

### Exit gate

- Resolution is a pure function.
- View-specific isolation has explicit regression coverage.

### Suggested commit

`feat: implement responsive property resolution`

---

## Step 3 - EditCommand validation and immutable apply

### Goal

Create the only legal durable edit path and reject unsafe targets, fields, values, scopes, and stale revisions.

### Suggested bounded prompt

```text
Implement only Step 3. Add typed EditCommand and runtime validation, including
known targets, editable-field allowlist, value validation, structural invariants,
scope, and baseRevision checks. Apply valid commands immutably. Do not add history,
stores, canvas, code UI, or AI engine yet. Test every rejection preserves the
original document and revision.
```

### Work

- Define command/source/scope/change types and schemas.
- Separate parse/validate from apply.
- Return typed result/error values rather than throwing into UI for expected invalid input.
- Reject identity, parent linkage, schema, revision, and history patches.
- Decide whether a multi-target manual command is atomic; document the decision. AI cards will still accept independently.
- Apply All changes to base and viewport changes only to matching override.

### Automated verification

- Valid command returns a new document.
- Unknown, duplicate, or empty targets fail.
- Forbidden fields and invalid values fail.
- Stale revision fails.
- Scope writes to the correct location.
- Every failure leaves serialized document and revision identical.

```bash
pnpm test -- command
pnpm typecheck
pnpm test
```

### Manual verification

Review every public mutation API. Confirm there is no generic `setDocument`/deep mutation escape hatch intended for feature UI.

### Exit gate

- One validated command path exists.
- Invalid input cannot reach current state.
- Protected viewport assertions pass.

### Suggested commit

`feat: add validated edit command pipeline`

---

## Step 4 - Per-element/scope history and restore

### Goal

Record every valid commit per affected element/scope and restore one target without rolling back unrelated work.

### Suggested bounded prompt

```text
Implement only Step 4. Extend the command commit pipeline to append independent
history entries per target and scope. Implement restore as a new validated
EditCommand for one element and one scope. Do not implement history UI yet.
Prove heading restore does not change the button or other viewports.
```

### Work

- Capture before/after values for each target.
- Record source, scope, changed fields, document revision, and time/ID (inject deterministic providers for tests).
- Restore selected prior values through normal validation/apply.
- Append a restore history entry; never delete later entries.

### Automated verification

- Manual, AI-source (simulated command), and restore sources create entries.
- Multi-target commit creates independent entries.
- Restore heading/mobile leaves heading desktop/tablet and all button values unchanged.
- Restore increments revisions and history.

```bash
pnpm test -- history
pnpm typecheck
pnpm test
```

### Manual verification

Inspect one serialized history entry and confirm it has enough data to explain and restore exactly one target/scope.

### Exit gate

- Independent recovery is proven below the UI layer.
- Restore uses the same pipeline, not snapshot replacement.

### Suggested commit

`feat: add granular revision history and restore`

---

## Step 5 - Document store and versioned persistence

### Goal

Expose the canonical commit pipeline through a small store and preserve validated document/history across refresh.

### Suggested bounded prompt

```text
Implement only Step 5. Add a document store whose durable mutation action accepts
validated commands through the existing commit engine. Add a versioned localStorage
adapter with runtime validation, corrupt-data fallback, and deliberate reset.
Do not build the full editor UI. Test hydration, corruption, schema mismatch,
refresh-equivalent round-trip, and reset.
```

### Work

- Keep document actions separate from UI state.
- Validate before hydration and before/after persistence as appropriate.
- Define storage key/schema version.
- Avoid persisting selections, dialogs, unsaved code drafts, or pending proposals unless deliberately documented.
- Reset loads a fresh initial document.

### Automated verification

- Commit action delegates to shared pipeline.
- Round-trip preserves document/history.
- Corrupt or incompatible storage does not poison current state.
- Reset clears stored project and returns initial fixture.

```bash
pnpm test -- store persistence
pnpm typecheck
pnpm test
```

### Manual verification

Use browser storage tools only to observe the versioned JSON. Refresh and confirm the same valid state; corrupt a local development value and confirm safe recovery messaging once UI exists.

### Exit gate

- No UI-facing generic state mutation bypass exists.
- Hydrated data is runtime validated.
- Reset logic is recoverable and covered.

### Suggested commit

`feat: persist validated editor document locally`

---

## Step 6 - Template renderer and responsive preview frames

### Goal

Render the canonical template through normal React components and switch preview sizes without changing data.

### Suggested bounded prompt

```text
Implement only Step 6. Build typed element renderers for the existing fixture and
a minimal editor shell with Desktop, Tablet, and Mobile preview controls. Resolve
through the existing responsive engine. Do not add selection or editing controls.
Use DESIGN_SYSTEM.md tokens and test that viewport switching changes projection,
not canonical state.
```

### Work

- Create renderer map by allowed element type.
- Render children from stable relationships and guard invalid structures.
- Add top toolbar, preview frame, fit/zoom behavior, and current viewport state.
- Keep current preview separate from edit scope (scope UI can appear disabled/placeholder until Step 8).
- Ensure editor works at 1280 px and virtual previews near 1440/768/375.

### Automated verification

- Renderer maps fixture types correctly.
- Viewport switch resolves expected values.
- Switching view leaves document revision/history unchanged.
- Basic accessible names exist for viewport controls.

```bash
pnpm test -- renderer viewport
pnpm typecheck
pnpm test
pnpm build
```

### Manual verification

Run the Editor shell and Preview sizes sections of `MANUAL_QA.md`.

### Exit gate

- One responsive page renders from canonical data.
- All preview sizes are inspectable without editor-shell horizontal overflow.
- No selection/edit feature is mixed into renderer state.

### Suggested commit

`feat: render responsive template previews`

---

## Step 7 - Stable-ID single and additive selection

### Goal

Select elements from canvas and layers using the same stable-ID UI state, with visible and keyboard-operable selection.

### Suggested bounded prompt

```text
Implement only Step 7. Add non-durable selection state keyed only by stable element
IDs. Support single click and Shift/Ctrl/Cmd additive toggle from both canvas and
a layers tree. Add keyboard selection and visible focus distinct from selection.
Do not add editing yet. Include RTL user-event tests.
```

### Work

- Add UI store/slice separate from document.
- Implement canvas selection overlay without changing document markup identity.
- Implement a layers tree/list synchronized with canvas.
- Add accessible names, selected state, and keyboard behavior.
- Show selected count and readable names.

### Automated verification

- Click selects one exact stable ID.
- Modified click adds/removes without changing unrelated IDs.
- Layers/canvas produce the same selection state.
- Keyboard action works and focus remains visible.
- Selection causes no document/history change.

```bash
pnpm test -- selection layers
pnpm typecheck
pnpm test
```

### Manual verification

Run the Selection and Keyboard-only selection items in `MANUAL_QA.md`.

### Exit gate

- Selection is never inferred from text/class/DOM position.
- Pointer and keyboard behavior agree.
- Multi-selection is visible on every target.

### Suggested commit

`feat: add stable element selection and layers panel`

---

## Step 8 - Scope Lock and manual inspector editing

### Goal

Make substantial manual edits through inspector/canvas controls with a visible All/Desktop/Tablet/Mobile scope and shared commit pipeline.

### Suggested bounded prompt

```text
Implement only Step 8. Add the Scope Lock indicator and inspector controls for a
credible subset of content, typography, color, spacing, size, and order/structure.
All commits must become existing EditCommands; invalid inputs must preserve state.
Support keyboard alternatives for order changes. Add scope-isolation and UI tests.
```

### Work

- Add separate edit-scope state and segmented control.
- Implement Scope Lock target/scope/protection text.
- Build selected-type-aware inspector fields with visible labels and validation.
- Include at least content, style, size/spacing, and one order/structure operation.
- Treat multi-selection mixed values explicitly.
- Use semantic tokens and component states from `DESIGN_SYSTEM.md`.

### Automated verification

- Inspector commit creates `canvas` source command/history.
- Invalid input preserves state/history.
- Mobile edit leaves desktop/tablet unchanged.
- All edit changes base and resolves where no override masks field.
- Order action preserves tree integrity.
- Scope Lock text tracks target count and scope.

```bash
pnpm test -- inspector scope manual-edit
pnpm typecheck
pnpm test
```

### Manual verification

Run Manual editing, Viewport isolation, and Scope Lock checks in `MANUAL_QA.md`.

### Exit gate

- Reviewer can make meaningful manual changes.
- Scope is visible before commit.
- Every durable edit is recoverable.

### Suggested commit

`feat: add scoped manual editing and scope lock`

---

## Step 9 - Validated structured code editing

### Goal

Edit selected element properties as JSON; valid edits update canonical state and invalid edits preserve the last valid state.

### Suggested bounded prompt

```text
Implement only Step 9. Add a code panel for validated JSON of the current selected
element or supported multi-selection representation. Keep draft state separate.
Parse and schema-validate, convert differences to an EditCommand(source code), and
use the shared pipeline. Do not compile JSX. Add invalid syntax, forbidden field,
stale revision, and canvas-code consistency tests.
```

### Work

- Start with a textarea or lightweight editor if Monaco adds risk; add Monaco only if justified.
- Include base revision in draft/session logic without making revision directly editable.
- Show syntax/schema errors with field paths.
- Make Apply/Revert behavior explicit.
- Document how keyboard users escape the editor surface.

### Automated verification

- Canvas commit updates displayed code.
- Valid code commit updates canvas/inspector.
- Invalid syntax and forbidden field preserve document/history.
- Stale draft cannot overwrite later manual edit.
- Scope writes to intended base/override.

```bash
pnpm test -- code-editor canvas-code
pnpm typecheck
pnpm test
pnpm build
```

### Manual verification

Run Structured code editing and corresponding keyboard checks in `MANUAL_QA.md`.

### Exit gate

- Canvas and code demonstrably share canonical state.
- Invalid drafts remain recoverable without damaging current state.
- README describes structured JSON honestly.

### Suggested commit

`feat: add validated structured code editing`

---

## Step 10 - Deterministic scenario engine and proposal validation

### Goal

Generate typed proposals from predefined instruction paths using current selection, current values, and chosen scope. Do not change template state.

### Suggested bounded prompt

```text
Implement only Step 10 as a deterministic engine with runtime proposal validation.
Cover content rewrite, style, resize/reorder, single-viewport, multi-element, and
unsupported paths. Inputs must include current selected IDs/values and scope.
Reject unselected targets, forbidden fields, incompatible types, invalid scope,
and stale revisions. Do not build proposal UI or commit proposals yet.
```

### Work

- Normalize instructions deterministically.
- Keep scenario matching explicit and documented.
- Capture selection snapshot and base revision in each proposal.
- Return per-element proposal results/failures.
- Use current values rather than fixed page replacement.
- Ensure no engine function receives a setter/store mutation callback.

### Automated verification

- Each required path returns expected typed proposals.
- Same input/state/scope deep-equals same output.
- Changing selected current value changes relevant before/after proposal.
- Unselected/unknown target and forbidden field are rejected.
- Generation leaves document/history unchanged.

```bash
pnpm test -- ai-demo proposal
pnpm typecheck
pnpm test
```

### Manual verification

Read scenario fixtures and confirm every reviewer-visible phrase in README maps to an actual path.

### Exit gate

- All five success categories plus one safe failure exist.
- Engine is deterministic and side-effect free.
- Selection/scope authority is tested at runtime boundaries.

### Suggested commit

`feat: implement deterministic scoped proposal engine`

---

## Step 11 - Proposal review and independent outcomes

### Goal

Show before/after proposals per element and allow independent accept/reject; acceptance uses the shared command pipeline.

### Suggested bounded prompt

```text
Implement only Step 11. Build the AI edit panel and per-element proposal review
cards. Generation must not change the canvas. Accept one card by converting only
that proposal to an existing EditCommand(source ai); reject changes only proposal
status. Detect stale proposals. Add partial-acceptance integration tests and
keyboard behavior.
```

### Work

- Add instruction input and reviewer-visible example actions.
- Disable/explain Run without selection.
- Show target, scope, before, after, validation status per card.
- Track pending/accepted/rejected/invalid/stale independently.
- Repeat Scope Lock snapshot in review.
- Announce results and manage focus after generation/acceptance.

### Automated verification

- Generation does not change document revision/history.
- Accept first of two changes only first target and creates its history.
- Reject second leaves its target and history unchanged.
- Later state change makes old proposal stale/non-acceptable.
- Keyboard can run, inspect, accept, and reject.

```bash
pnpm test -- proposal-review ai-panel
pnpm typecheck
pnpm test
```

### Manual verification

Run the full Deterministic AI demo section of `MANUAL_QA.md`.

### Exit gate

- AI never auto-applies.
- Independent target outcomes are visible and proven.
- Stale state cannot overwrite later work.

### Suggested commit

`feat: add independent AI proposal review`

---

## Step 12 - History UI and independent restore

### Goal

Let a reviewer inspect element/scoped revisions and restore one without disturbing unrelated state.

### Suggested bounded prompt

```text
Implement only Step 12. Add history UI for the selected element with source, time,
scope, changed fields, and current-vs-revision preview. Restore exactly one element
and scope through the existing restore command. Add keyboard support and integration
tests that protect other elements and viewports.
```

### Work

- Filter/group history by selected element.
- Show meaningful change summaries.
- Add restore preview/confirmation with exact target and scope.
- Return focus appropriately after dialog/action.

### Automated verification

- History reflects manual/code/AI commits.
- Restore changes one exact element/scope.
- Unrelated element and other viewport assertions remain equal.
- Restore creates a new visible entry.

```bash
pnpm test -- history-ui restore
pnpm typecheck
pnpm test
```

### Manual verification

Run History and restore plus keyboard restore checks in `MANUAL_QA.md`.

### Exit gate

- Independent recovery is easy to demonstrate.
- Whole-document rollback is not exposed as element restore.

### Suggested commit

`feat: add per-element history and recovery UI`

---

## Step 13 - Persistence/reset UX and full integration

### Goal

Complete refresh persistence, safe corrupt-data behavior, deliberate reset confirmation, and one integrated reviewer flow.

### Suggested bounded prompt

```text
Implement only Step 13. Connect existing versioned persistence to the UI, add
recoverable corrupt-data messaging, and add a deliberate Reset Project confirmation.
Create an integration/e2e flow covering refresh persistence and reset cancel/confirm.
Do not polish unrelated UI.
```

### Work

- Hydrate once with visible loading/recovery behavior if needed.
- Confirm reset; Cancel must preserve state.
- Clear pending drafts/proposals deliberately on reset.
- Add production-route refresh configuration if deployment requires it.

### Automated verification

- UI commit survives reload in end-to-end test.
- History survives reload.
- Cancel reset preserves state.
- Confirm reset restores fixture and clears old history/storage.
- Corrupt data cannot crash editor.

```bash
pnpm test -- persistence reset
pnpm test:e2e
pnpm typecheck
pnpm test
pnpm build
```

### Manual verification

Run Persistence and reset in `MANUAL_QA.md`.

### Exit gate

- Required journey survives a real browser refresh.
- Reset is deliberate and documented.

### Suggested commit

`feat: complete persistence and safe project reset`

---

## Step 14 - Accessibility, responsive shell, and Vetra-inspired polish

### Goal

Apply the design system after behavior is stable, then close keyboard, focus, responsive, contrast, loading/error, and reduced-motion gaps.

### Suggested bounded prompt

```text
Implement only Step 14. Audit the finished required journey against DESIGN_SYSTEM.md
and MANUAL_QA.md. Fix editor usability at 1280 px, preview frames near 1440/768/375,
keyboard/focus behavior, labels, contrast, touch targets, reduced motion, overflow,
and all component states. Preserve engine behavior. Add focused accessibility tests
for every fix and avoid unrelated visual redesign.
```

### Work

- Apply tokens across the shell; eliminate component-level raw hex exceptions.
- Use dark neutral panels, blue primary action/selection, thin borders, rounded controls, restrained glow.
- Ensure Vetra inspiration does not reduce editor density or clarity.
- Add loading, disabled, error, empty, focus-visible, hover, and active states.
- Verify dialogs/popovers focus and return.
- Lazy-load genuinely heavy editor panels only after measuring/observing need.

### Automated verification

- All prior tests pass.
- Role/name queries and focus assertions pass.
- Axe scan has no serious/critical findings if added.
- Production build passes.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

### Manual verification

Run the entire `MANUAL_QA.md`, especially 1280 shell, 1440/768/375 preview, keyboard-only route, 200% zoom, reduced motion, and no horizontal overflow.

### Exit gate

- Full required journey works keyboard-only.
- WCAG 2.2 AA checks are testable and pass.
- Visual polish supports, rather than obscures, scope and state.

### Suggested commit

`style: polish accessible Vetra-inspired editor UI`

---

## Step 15 - Final focused tests and requirement traceability

### Goal

Close missing assignment evidence and eliminate regressions without adding optional features.

### Suggested bounded prompt

```text
Implement only Step 15. Audit the current code and tests against
REQUIREMENTS_CHECKLIST.md and TEST_PLAN.md. Report missing evidence first.
Add only focused tests or minimal fixes required for AI selection/field/scope safety,
canvas-code consistency, viewport isolation, independent recovery, stale revisions,
and invalid-code safety. Do not add optional features.
```

### Work

- Map every fixed requirement to source and test evidence.
- Add/repair the single reviewer smoke journey.
- Inspect dependency list and remove unused packages.
- Check for secrets/private data and accidental logs.
- Update checkboxes only from actual evidence.

### Automated verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Run a production preview smoke test if configured.

### Manual verification

Run all of `MANUAL_QA.md` on the intended submission commit and record environment/date.

### Exit gate

- Every assignment-critical checklist item is either evidenced or explicitly disclosed as missing.
- No flaky/disabled test is used as evidence.
- No unused high-risk dependency remains.

### Suggested commit

`test: cover scoped editing safety and recovery`

---

## Step 16 - Submission documentation, deployment, and walkthrough

### Goal

Finish the reviewer-facing evidence from actual implementation, deploy, and verify the production build. Do not fabricate AI process evidence.

### Suggested bounded prompt

```text
Implement only Step 16 documentation updates. Inspect the actual source, tests,
package file, and command results. Replace README and PRODUCT_NOTES TODOs with
verified facts and paths. Help me structure AI_USAGE from the real session log,
but do not invent rejected suggestions or test results. Report any remaining TODO.
Do not deploy or push until I explicitly request it.
```

### Work

- Fill live/repository/walkthrough links when available.
- Verify README setup in a clean checkout.
- List actual dependencies and template/asset sources.
- Fill architecture paths and requirement mapping.
- Complete AI_USAGE with two redacted examples, one real correction, checks, and limitation.
- Finalize PRODUCT_NOTES based on shipped behavior.
- Deploy when explicitly requested and production-smoke test.
- Record a concise 3-5 minute walkthrough.

### Walkthrough order

1. State the safety problem and canonical architecture.
2. Show desktop/tablet/mobile preview.
3. Select one then multiple elements.
4. Show Scope Lock and a mobile-only manual edit; verify desktop protected.
5. Show valid and invalid code edits.
6. Generate multi-element deterministic proposals; accept one/reject one.
7. Restore one element/scope.
8. Refresh for persistence and mention reset.
9. Point to focused tests and one trade-off.

### Automated verification

- Clean install/setup succeeds from README.
- Full test/build gate passes on final commit.
- Production smoke test passes in a fresh browser context.
- Repository contains no secrets or unrelated personal material.
- Required Markdown files have no unexplained TODOs.

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

### Manual verification

- Follow the README from a clean checkout without relying on unlisted local configuration.
- Run the Final deployment smoke test section of `MANUAL_QA.md`.
- Rehearse the walkthrough once and verify every spoken claim against the product.
- Open every submission link in a signed-out or fresh browser context.

### Exit gate

- Submission package matches page 6 of the assignment.
- Every claim is backed by source, tests, or observed manual behavior.

### Suggested commits

- `docs: complete assignment evidence and reviewer guide`
- `chore: prepare production deployment` (only if deployment configuration changes)

---

## Optional work only after Step 16 passes

- Drag-marquee selection.
- Canvas visual diff overlay.
- JSON import/export.
- More advanced drag/resize handles.
- Additional template sections or animation polish.

Optional work must not weaken required tests, keyboard behavior, or submission clarity.

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
| 2026-08-26 | On corrupt stored data, delete the key and reload the fixture | Destroys the user's only copy to recover from our own parse failure | Quarantine the value under a second key, load the fixture, explain it in a recovery notice | `src/store/persistence.test.ts`, `e2e/persistence.spec.ts` *corrupt stored data produces an explained editor, not a crash* |
| 2026-08-26 | `applyEditCommand` returns the re-parsed document from its own verification | The re-parse rebuilds every object, destroying the structural sharing that proves untargeted elements were untouched | Return the structurally shared document; re-parse only to verify | `src/engine/apply-edit-command.test.ts` |
| 2026-08-26 | A generic recursive deep merge over `unknown` for viewport resolution | Would deep-merge `{value, unit}` dimensions into a meaningless half-and-half result, and needs `any` or a re-parse per render | Shape-aware merge functions with the rules stated in one comment block | `src/engine/responsive-resolver.test.ts` |
| 2026-08-26 | Implement restore with the existing `merge` patch mode | Merge cannot remove a field, so a restore would silently keep anything added later | Added `replace` mode, restricted to `source: 'restore'` | `src/engine/history-restore.test.ts` |
| 2026-08-26 | Use Zustand for the document store | `set(state => …)` is a generic mutation path around the validated commit boundary | Purpose-built ~150-line store exposing only `commit`, `restore`, `reset` | `src/store/document-store.ts`, `src/store/document-store.test.ts` |
| 2026-08-26 | `PreviewFrame` reports its scale through an `onScaleChange` prop | A side effect during the render phase | Prop removed; scale derived from measurement | `src/editor/editor-shell.viewport.test.tsx` |
| 2026-08-26 | Zod `unrecognized_keys` mapped to a generic validation failure | The UI cannot then say *you cannot change `parentId`* | Distinct `forbidden-field` error code | `src/engine/edit-command.test.ts` |


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

## Step 1 decisions

### 2026-08-26 - `base` and viewport overrides share one schema

- Context: `ARCHITECTURE.md` types a base as `EditableProperties` and an override as `DeepPartial<EditableProperties>`.
- Options considered: a generated `DeepPartial<>` type plus a second schema; one schema in which every group and field is already optional (chosen).
- Decision: `EditableProperties` is fully optional at every level, so it is its own deep-partial. `EditablePropertyPatch` is an alias, and `editablePropertyPatchSchema` is the same schema object.
- Why: the resolver (Step 2), the code surface diff (Step 8), and AI patches (Step 10) all validate against one schema instead of two that could drift apart.
- Trade-off: a base value can legitimately be absent, so the renderer must supply defaults rather than assume every field exists.
- Evidence/test: `src/model/properties.test.ts`, `src/model/element.test.ts` ("viewport override slots").
- Related step/commit: Step 1.

### 2026-08-26 - Forbidden fields are rejected structurally, not by a denylist

- Context: `id`, `parentId`, `childIds`, `revision`, `schemaVersion`, and `history` must never be writable through a property patch.
- Decision: every object in the property schema is a `z.strictObject`, so any key outside the editable boundary fails validation as an unknown key. `FORBIDDEN_PROPERTY_KEYS` is exported as documentation and for the Step 3 command allowlist message.
- Why: a denylist can be outgrown; a strict allowlist rejects fields nobody thought to forbid.
- Trade-off: adding a new editable property requires a schema change, which is the intended friction.
- Evidence/test: `src/model/properties.test.ts` rejects each forbidden key and unknown group keys; `src/model/element.test.ts` rejects a forbidden field nested inside a viewport override.
- Related step/commit: Step 1.

### 2026-08-26 - Constrained value types instead of arbitrary CSS strings

- Context: the assignment allows structured editing but must stay safe and deterministic.
- Decision: colors are hex, `transparent`, or `var(--token)`; links and image sources must be relative, an in-page anchor, or `https:`; dimensions are `'auto' | {value, unit}`; every numeric field is range-bounded.
- Why: it blocks `javascript:` URLs and unrenderable values at the model boundary, and it gives the AI proposal engine a small, checkable value space.
- Trade-off: less expressive than raw CSS; documented as the intentional safety-over-generality decision.
- Evidence/test: `src/model/properties.test.ts` (colors, URLs, ranges, falsy-but-valid values).
- Related step/commit: Step 1.

### 2026-08-26 - Branded id types with predicate-based constructors

- Context: `CLAUDE.md` asks for stable branded id types or clear aliases, and forbids unsafe casts.
- Decision: `ElementId`/`DocumentId`/`RevisionEntryId` are branded string subtypes produced by type-predicate guards (`isElementId`) and throwing constructors (`elementId`). Zod uses `z.custom<ElementId>(isElementId)`, which infers the brand with no cast.
- Trade-off: `Record<ElementId, T>` lookups need a branded key, so integrity checking builds a plain `Map<string, TemplateElement>` internally.
- Evidence/test: `src/model/ids.test.ts`.
- Related step/commit: Step 1.

### 2026-08-26 - Text and image elements must carry base content

- Context: structural invariants belong in the schema so an invalid edit is rejected rather than rendered.
- Decision: `heading`, `text`, `badge`, and `button` require a `base.content.text` string; `image` requires `imageSrc` and `imageAlt`. Empty strings are allowed.
- Why: guarantees the renderer and the accessibility story (`imageAlt` can never be dropped by an edit).
- Trade-off: an edit that deletes the `content.text` key entirely will be rejected; clearing text to `""` is the supported path.
- Evidence/test: `src/model/element.test.ts`.
- Related step/commit: Step 1.

## Step 2 decisions

### 2026-08-26 - Two-layer resolution, no viewport cascade

- Context: three previews must resolve from one document without leaking edits between viewports.
- Options considered: a CSS-like cascade (mobile inherits tablet inherits desktop); exactly two layers, `base` plus the requested viewport's override (chosen).
- Decision: `resolved = merge(element.base, element.overrides[viewport])`. No other viewport is read.
- Why: a cascade would make "edit mobile only" silently depend on tablet, which is exactly the safety property the assignment asks us to prove. Two layers make isolation a structural guarantee rather than a test we hope covers every case.
- Trade-off: a change meant for "tablet and smaller" must be written to both override slots by the command layer; there is no inheritance shortcut.
- Evidence/test: `src/engine/responsive-resolver.test.ts` - the isolation table runs over all three viewports and asserts the two protected viewports in full, plus `never copies one viewport override into another`.
- Related step/commit: Step 2.

### 2026-08-26 - Explicit merge semantics per shape, not a generic deep merge

- Context: a naive recursive merge would blend halves of two dimensions and would need an `any`-shaped implementation.
- Decision: property groups merge field by field; `spacing.padding` and `spacing.margin` merge one level deeper; dimensions (`{value, unit}`) and arrays are atomic and replace wholesale.
- Why: partial dimension blending (`{value: 100}` over `{value: 760, unit: 'px'}`) is never a meaningful edit, and keeping the merge shape-aware keeps the engine fully typed.
- Trade-off: adding a new nested property group means extending `mergeEditableProperties`; the compiler does not force that, so it is called out here and covered by tests.
- Evidence/test: `merge semantics` block, especially `merges padding and margin one level deeper` and `treats a dimension as atomic`.
- Related step/commit: Step 2.

### 2026-08-26 - Presence is decided by `!== undefined`, never truthiness

- Context: `0`, `''`, and `false` are all valid editable values (opacity 0, empty text, zero padding).
- Decision: the resolver copies only keys whose value is not `undefined`, via a single `definedOnly` helper, and an explicitly `undefined` override field means "not specified" rather than "erase".
- Why: `override.fontSize || base.fontSize` style code silently loses zero-valued edits; overrides remove a field by omitting the key, which is what the command layer will emit.
- Trade-off: `definedOnly` carries one contained, commented type assertion (`Object.fromEntries(...) as T`) - the only assertion in the engine. Its behaviour is pinned by the `falsy but valid values` tests.
- Evidence/test: `falsy but valid values` block (4 tests).
- Related step/commit: Step 2.

## Step 3 decisions

### 2026-08-26 - A multi-target command is atomic

- Context: `IMPLEMENTATION_STEPS.md` asks for an explicit decision on multi-target atomicity.
- Options considered: partial application (apply the valid targets, report the rest); all-or-nothing (chosen).
- Decision: every target is validated before any target is applied; one invalid target rejects the whole command.
- Why: a partially applied manual edit leaves the user unable to say what the document now contains, and it makes `baseRevision` meaningless for the targets that did land. Independent per-element AI outcomes are still supported, by emitting one command per accepted proposal in Step 11.
- Trade-off: a marquee selection containing one bad element fails entirely; the error names the offending element so the user can deselect it.
- Evidence/test: `src/engine/edit-command.test.ts` (`rejects the whole multi-target command when one target is unknown`), `src/engine/apply-edit-command.test.ts` (`rejections never reach current state`).
- Related step/commit: Step 3.

### 2026-08-26 - Validate, apply, then re-validate the result

- Context: an individually valid patch could still produce an invalid element or document.
- Decision: `applyEditCommand` runs `parseTemplateDocument` on the newly built document and refuses to return it if it fails, reporting `invalid-result`.
- Why: it makes "invalid state can never become current state" a property of the pipeline rather than a property of every patch author. The re-parse is a gate only - the structurally shared `next` document is returned, so untargeted elements keep their object identity.
- Trade-off: one extra full-document parse per commit (26 elements today); negligible, and it buys a hard guarantee.
- Evidence/test: `refuses to commit into a document that would not be valid afterwards`.
- Related step/commit: Step 3.

### 2026-08-26 - The engine reads no clock and no random source

- Context: commands need an id and a timestamp, and history entries will too.
- Decision: `createEditCommand` requires `id` and `createdAt` from the caller; nothing in `src/engine` calls `Date.now()` or `crypto.randomUUID()`.
- Why: determinism. The AI scenario engine (Step 10) must produce identical output for identical input, and tests must be able to assert exact values.
- Trade-off: the store layer (Step 6) has to own id and timestamp generation and inject it.
- Evidence/test: every command test uses a fixed `cmd.N` id and a fixed ISO timestamp.
- Related step/commit: Step 3.

### 2026-08-26 - A patch that sets nothing is rejected

- Context: the code surface and the canvas can both submit a "change" that changes nothing.
- Decision: an empty patch fails with `empty-change`.
- Why: it prevents no-op history entries and no-op revision bumps from accumulating and making the history panel useless.
- Trade-off: callers must diff before submitting; the code surface already needs a diff to build the patch.
- Evidence/test: `rejects a patch that sets nothing`.
- Related step/commit: Step 3.

## Step 4 decisions

### 2026-08-26 - History stores full scope snapshots, not just the patch

- Context: an entry has to both explain a change and be sufficient to restore it.
- Options considered: store only the fields the patch touched; store the full property set for that element/scope before and after (chosen).
- Decision: `before`/`after` are the complete property set for that element and scope, plus a derived `changedPaths` list for display.
- Why: a patch-only entry cannot answer "what did this element look like at that point", which is exactly what the history panel and restore need. Scope snapshots are small (one element, one viewport), so the cost is trivial.
- Trade-off: slight duplication between consecutive entries.
- Evidence/test: `src/engine/history.test.ts` (`records a schema-valid entry with everything needed to explain the change`), plus the manually inspected serialized entry.
- Related step/commit: Step 4.

### 2026-08-26 - Restore replaces the scope; only restore may do so

- Context: merge semantics cannot remove a field, so a merge-only restore would leave behind anything added after the restored revision.
- Decision: `EditCommand` gains `mode: 'merge' | 'replace'`, defaulting to `merge`. `replace` makes the target scope equal exactly the patch, and is permitted only when `source === 'restore'` (`mode-not-allowed` otherwise).
- Why: restore must genuinely undo. At the same time, an AI or canvas edit that could silently clear unmentioned fields would be the most dangerous operation in the product, so the capability is restricted at the validation boundary rather than by convention.
- Trade-off: Step 8's code surface will likely need `replace` too (deleting a field in the JSON editor should remove it). That is a deliberate one-line extension of `REPLACE_CAPABLE_SOURCES` when the step arrives, with its own tests.
- Evidence/test: `src/engine/history-restore.test.ts` (`replace mode is restricted`, `removes a field that was added after the restored revision`).
- Related step/commit: Step 4.

### 2026-08-26 - Restoring revision R restores `R.before`

- Context: "restore a prior revision" is ambiguous - it could mean the state before that commit or the state it produced.
- Decision: restore returns the element/scope to `R.before`, i.e. "revert this change".
- Why: it makes every past state reachable, including the original template (the oldest entry's `before`), which an `after`-based reading cannot do. It also matches how the entry is displayed: before -> after, restore the left side.
- Trade-off: the label in the history UI must say "revert to the state before this change" rather than "restore this version"; recorded here for Step 12.
- Evidence/test: `returns the element to its pre-edit values`, `removes the override entirely when restoring to "no override"`.
- Related step/commit: Step 4.

### 2026-08-26 - Revision entry ids are derived from the command id

- Context: history entries need stable ids, and the engine must stay deterministic.
- Decision: `id = ${command.id}.${elementId}`, e.g. `cmd.1.hero.heading`.
- Why: no injected id provider, no random source, and an entry visibly names the command that produced it.
- Trade-off: command ids must be unique, which the store layer (Step 6) owns.
- Evidence/test: `derives a traceable entry id from the command`.
- Related step/commit: Step 4.

## Step 5 decisions

### 2026-08-26 - A purpose-built store instead of Zustand

- Context: `project_plan.md` suggested Zustand + Immer; the exit gate requires that no UI-facing generic state mutation bypass exists.
- Options considered: Zustand (its `set` accepts an arbitrary state producer, which is precisely the escape hatch `CLAUDE.md` forbids); a small hand-written subscribable store (chosen).
- Decision: `createDocumentStore` exposes `getState`, `subscribe`, `commit`, `restore`, `reset` and nothing else. It is compatible with `useSyncExternalStore`, so no React binding library is needed either.
- Why: the store's value here is what it *refuses* to do. A generic setter would make the whole validation pipeline optional by accident.
- Trade-off: no devtools/middleware ecosystem, and no automatic selector memoisation; a UI store in a later step may re-evaluate for transient state, where the risk is different.
- Evidence/test: `src/store/document-store.test.ts` (`mutation surface` block asserts the exact exported key set).
- Related step/commit: Step 5.

### 2026-08-26 - Untrusted stored data is quarantined, not deleted

- Context: `ARCHITECTURE.md` requires corrupt or unsupported data to be kept isolated with a recoverable message and a deliberate reset.
- Decision: on corrupt or version-mismatched data, the raw string is copied to `scoped-ai-template-editor.project.quarantine`, the original key is left untouched, and the store starts from the fixture with `hydration: 'recovered-corrupt' | 'recovered-unsupported'` plus a message. Only an explicit `reset()` removes either key.
- Why: silently deleting a user's saved project to recover from our own parse failure is the worst possible outcome; keeping it means a future migration or manual recovery is still possible.
- Trade-off: a permanently broken value keeps failing on every load until the user resets. That is intentional and visible, not silent.
- Evidence/test: `src/store/persistence.test.ts` (`untrusted data`), `src/store/document-store.test.ts` (`falls back to the fixture and explains itself when storage is corrupt`).
- Related step/commit: Step 5.

### 2026-08-26 - `baseRevision` is optional on a draft but explicit for prepared edits

- Context: if the store always injected the current revision, stale-revision protection from Step 3 could never fire.
- Decision: `EditDraft.baseRevision` is optional. Omitted, it means "composed from the document as it is right now" (a canvas control). Any surface holding state prepared earlier - an AI proposal, a code draft, a restore - passes the revision it captured.
- Why: it keeps the common canvas path simple without quietly disabling the safety check that the assignment explicitly asks us to demonstrate.
- Trade-off: a caller that forgets to pass a captured revision loses staleness detection for that path. Step 10/11 must pass the proposal's captured revision, and there are tests on both sides.
- Evidence/test: `detects a stale edit when the caller passes the revision it captured`, `uses the current revision when the draft does not capture one`.
- Related step/commit: Step 5.

### 2026-08-26 - Only the document is persisted

- Context: `IMPLEMENTATION_STEPS.md` asks for a documented decision about what is persisted.
- Decision: the canonical document only. Selection, preview viewport, edit scope, active panel, unsaved code drafts, and pending AI proposals are not persisted.
- Why: a rehydrated proposal or code draft would be prepared against a document revision that no longer exists, which is the exact failure mode the product is designed to prevent. Transient UI state is cheap to re-establish.
- Trade-off: after a refresh the reviewer must reselect an element and reopen a panel.
- Evidence/test: the stored envelope contains `storageVersion`, `documentSchemaVersion`, `savedAt`, and `document`, and nothing else (`writes a versioned envelope`).
- Related step/commit: Step 5.

## Step 6 decisions

### 2026-08-26 - Scale the preview, do not fake the viewport

- Context: a 1440 px desktop preview must be inspectable inside a ~1200 px editor without the shell scrolling sideways.
- Options considered: render the template at the canvas's real width and pretend it is 1440 (rejected - the template's own layout would resolve at the wrong width, so the preview would be a lie); an iframe per viewport (heavier, and complicates selection in Step 7); lay out at the true virtual width and CSS-transform-scale to fit (chosen).
- Decision: the frame is always `width: 1440 | 768 | 375` and is scaled by `min(1, availableWidth / virtualWidth)`. Fit can be turned off, in which case the canvas scrolls rather than the page.
- Why: what the reviewer sees is genuinely the resolved layout at that width, just smaller.
- Trade-off: a transform does not affect layout box size, so the wrapper is sized from a measured frame height. Where `ResizeObserver` is unavailable the scale falls back to 1 and the canvas scrolls.
- Evidence/test: `e2e/smoke.spec.ts` asserts the frame's CSS width per viewport and that `documentElement.scrollWidth` never exceeds the window.
- Related step/commit: Step 6.

### 2026-08-26 - Heading level comes from structure, not from data

- Context: the previewed template contains headings, and so does the editor shell.
- Options considered: a `headingLevel` editable property (rejected - it invites an edit that breaks document outline, and it was not in the Step 1 schema); derive from structure (chosen).
- Decision: the shell owns the page `h1`; a heading whose parent is a root section renders as `h2`, any deeper heading as `h3`.
- Why: exactly one `h1`, no skipped levels, and no editable field that can produce an inaccessible outline.
- Trade-off: a designer cannot choose a heading level; visual size is controlled by `typography.fontSize` instead, which is the safer split.
- Evidence/test: `derives heading levels from structure so no level is skipped`.
- Related step/commit: Step 6.

### 2026-08-26 - Malformed structure degrades instead of throwing

- Context: the renderer reads `childIds`, which a future structural edit could leave dangling or cyclic.
- Decision: a missing child id is skipped, a child that appears in its own ancestry is not followed, and depth is capped at 24.
- Why: the commit pipeline already prevents invalid documents from becoming current state, so this is defence in depth - but a renderer that throws would take the whole editor down and lose the user's ability to fix the problem.
- Trade-off: a structural bug shows as missing content rather than a loud failure; the integrity checker remains the loud path.
- Evidence/test: `invalid structure guards` (dangling child, cycle, unknown root).
- Related step/commit: Step 6.

## Step 6A decisions

### 2026-08-26 - One honest catalog entry instead of fake inventory

- Context: the reference shows a large marketplace, but the assignment requires only one working template and time is better spent on editor safety.
- Options considered: duplicate placeholder cards (rejected because they mislead the reviewer); skip the gallery (rejected because the user requested template selection); show one polished card in a data-driven catalog (chosen).
- Decision: display only Aster Labs with accurate category/count metadata and an explicit note that more can be added later.
- Why: it satisfies the entry journey without pretending unfinished templates exist.
- Trade-off: the gallery is visually sparse compared with a commercial marketplace.
- Evidence/test: `shows the one available original template`; browser screenshot/manual gallery check.
- Related step/commit: Step 6A.

### 2026-08-26 - Declarative React Router with static-host-safe hash URLs

- Context: the app now has a gallery and editor view, while the assignment remains a small client-side prototype.
- Options considered: custom regular-expression/hash listeners (worked but duplicated standard routing behavior and produced a scroll-position bug); `BrowserRouter` (requires deployment rewrites); declarative `HashRouter` (chosen).
- Decision: use React Router DOM's `HashRouter`, `Routes`, `Route`, `Navigate`, `useNavigate`, and `useParams` for `#/templates` and `#/editor/:templateId`.
- Why: route matching, browser history, unknown-template fallback, and future template IDs are conventional and easier for a reviewer to verify, while direct links still work on static hosting.
- Trade-off: one runtime dependency and hash URLs that are less polished than clean pathnames. Data-router loaders/actions would be unnecessary complexity and are deliberately not used.
- Evidence/test: App navigation and unknown-template redirect tests plus the direct-route Playwright smoke test.
- Related step/commit: Step 6A.

## Step 8 decisions

### 2026-08-26 - Reordering is a property edit, not a structural command

- Context: Step 8 requires an order/structure operation, but the durable edit path carries property patches only, and history records `before`/`after` as property patches per element and scope.
- Options considered: a second, structural command type that rewrites the parent's `childIds` (rejected - it needs its own validation, its own history representation, and a schema migration, and it adds a write path that can restructure the tree); express order as the `layout.order` property (chosen).
- Decision: Move up/Move down emits one atomic multi-target `EditCommand` that renumbers `layout.order` across the affected siblings.
- Why: it keeps every durable write inside the one validated pipeline, makes a reorder restorable and versioned like any other edit, and makes it scopeable - reordering on mobile only is now expressible. Tree integrity holds by construction because `childIds` is never named by the command.
- Trade-off: order only takes effect inside a flex or grid parent, so the control is disabled with an explanation elsewhere; and the layers tree has to sort siblings by resolved order to keep matching what the canvas shows.
- Evidence/test: `planReorder` and `orderedChildIds` unit tests; `reorders siblings without restructuring the tree`, `scopes a reorder to one viewport`, and `moves the element in the layers tree, which follows visual order`.
- Related step/commit: Step 8.

### 2026-08-26 - Inspector controls are uncontrolled and commit on blur or Enter

- Context: a controlled input synchronised to canonical state needs an effect to reconcile the two, and committing per keystroke would add one history entry per character.
- Options considered: controlled inputs with a sync effect (rejected - reconciliation bugs and per-keystroke commits); a draft buffer plus explicit Apply per field (rejected - heavy for single-value fields); uncontrolled inputs remounted by a key that includes the document revision (chosen).
- Decision: each field row is uncontrolled, commits on blur or Enter, and is remounted when the revision, scope, or target list changes.
- Why: one user edit becomes exactly one command and one history entry, the control cannot drift from canonical state, and a rejected commit leaves what the user typed in place next to its error message.
- Trade-off: a field the user typed into but never blurred is discarded if the selection changes; no per-field Apply button is offered.
- Evidence/test: `sends a canvas-source command through the shared pipeline and records history`, `rejects an out-of-range value through the schema and changes nothing`, `commits a field with Enter, without a pointer`.
- Related step/commit: Step 8.

## Layout revision decisions

### 2026-08-27 - Three regions: a history/AI rail, one switchable main surface, and two right-hand docks

- Context: the shell had grown to a fixed 240 px layers column, a canvas, and a 340 px sidebar holding four tabbed panels (Design, Code, AI, History). Only one of the four was ever visible, so the two panels that are *reference* material - what has already happened to this element, and the instruction that would change it next - were hidden exactly when they were most useful, and the code surface was being read in a 340 px column.
- Options considered: keep the four-tab sidebar and widen it (rejected - the code surface is still cramped and history is still hidden while editing); float every panel (rejected - nothing would have a stable home); a left rail for history + AI, a tablist that swaps the centre between preview and code, and Design/Layers as toolbar-opened docks (chosen).
- Decision: history and the AI composer live permanently in a 380 px left rail; the centre is one surface at a time chosen by a real tablist; Design and Layers are disclosures opened from the toolbar, hidden rather than unmounted, and inset the main surface above 1100 px rather than covering it.
- Why: the surfaces that are read continuously stay on screen, the code view gets a reading width, and the two panels that are consulted intermittently cost nothing when closed. Nothing about the commit boundary moved - every write still goes through the store's one validated pipeline, and the docks own no document state.
- Trade-off: the preview is unmounted while the code surface is showing, so a rendered result has to be read back on the preview surface; with both docks open at 1280 px the canvas is narrow; and the AI run shares the rail's lower half with the composer, so a long run scrolls in a smaller box than a full-height panel gave it.
- Evidence/test: `src/editor/panel-collapse.test.tsx` (dock disclosure semantics, Escape and focus return, state kept across a close), `src/editor/canvas-code.test.tsx` (draft survives a surface switch; the Design dock commits while the code surface is showing), `e2e/accessibility.spec.ts` (whole journey by keyboard, axe on both surfaces with both docks open, 200% zoom without sideways scrolling).
- Related step/commit: UI revision after Step 12.

### 2026-08-27 - Scope Lock is chrome, not panel furniture

- Context: Scope Lock lived at the top of the sidebar, so it was only visible while a sidebar panel was open - yet it governs an inspector edit, a code apply, an accepted proposal, and a restore equally.
- Options considered: repeat it in each panel (rejected - four copies of one statement drift); leave it in the Design dock (rejected - it would disappear whenever the dock is closed); give it its own bar under the toolbar, beside the edit-scope control (chosen).
- Decision: a scope bar under the toolbar holds the Scope Lock statement, the persistence chip, and the edit-scope switcher.
- Why: what an edit will touch is stated once, in one place, and cannot be closed away. Putting the scope *control* next to the scope *statement* also stops it from being confused with the preview viewport, which stays in the toolbar.
- Trade-off: the bar costs a row of vertical space, and at narrow widths the protection sentence is clipped with an ellipsis - the full text stays in the DOM for assistive technology, and both the AI panel and the restore confirmation repeat it at the moment of committing.
- Evidence/test: `screen.getByRole('region', { name: 'Scope Lock' })` assertions across `panel-collapse.test.tsx`, `manual-edit.test.tsx`, `reset-project.test.tsx`, `e2e/smoke.spec.ts`, and `e2e/reviewer-journey.spec.ts`.
- Related step/commit: UI revision after Step 12.

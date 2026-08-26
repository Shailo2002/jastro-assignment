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

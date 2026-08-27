# Scoped AI Template Editor

A browser-based website-builder prototype that lets a non-technical owner safely edit one responsive template through canvas controls, validated structured code, and deterministic AI proposals. Changes are constrained by stable element selection and viewport scope, require explicit acceptance, and can be restored independently per element.

> Status: feature-complete for the assignment - canonical model, validated command pipeline, responsive renderer and scope isolation, stable selection, inspector editing, structured code surface, deterministic AI proposals with independent accept/reject, per-element/scope history and restore, persistence and reset, and the accessibility gate.

## Links

- Live demo: not deployed. The reviewer path is the local setup below, which is the alternative the assignment allows. Nothing in the app needs a server: `pnpm build` produces a static `dist/` that can be served from any static host as-is, and routing is `HashRouter`, so no rewrite rule is required.
- Walkthrough recording: pending - to be recorded by the author against this commit.
- Repository: this checkout. No remote URL is published yet.

These three links are deliberately left unfilled rather than pointed at a URL that does not exist; everything else in this document is verified against the source and against commands that were actually run.

## Reviewer quick start

Prerequisites: Node.js 20 or newer and pnpm 9. Verified with Node v26.5.0 and pnpm 9.15.9 on macOS.

```bash
pnpm install            # or: pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL Vite prints (`http://localhost:5173`). The app opens on the template gallery; choose **Use template** on any of the four starter templates to enter the editor. No environment variable, API key, `.env` file, or backend is needed - the repository contains none, and the editor works fully offline.

Quality commands, and what they produced on this commit:

```bash
pnpm lint        # eslint . - clean
pnpm typecheck   # tsc -b --noEmit - clean
pnpm test        # vitest run - 44 files, 631 tests passed
pnpm test:e2e    # playwright test - 20 tests passed (Chromium)
pnpm build       # tsc -b && vite build - 404.59 kB / 122.62 kB gzipped JS, 35.22 kB / 5.68 kB gzipped CSS
```

`pnpm test:e2e` needs the Playwright browser once per machine: `pnpm exec playwright install chromium`. The Playwright config starts and stops its own dev server, so no server needs to be running first.

## Reviewer journey

1. Choose any template in the gallery. Aster Labs is the primary reviewer path.
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

Every phrase below is implemented in `src/engine/scenario-catalog.ts` and is asserted, verbatim, by `src/engine/ai-demo.test.ts`.

| Category | Phrase | What it proposes |
| --- | --- | --- |
| Content rewrite | “Rewrite the copy to be shorter” | Keeps the first sentence and drops trailing clauses over a twelve-word budget. Text is only removed, never invented; an already-short element is reported as a skip. |
| Style | “Make the heading bolder” | Raises the current font weight one step. Text elements only; other types are skipped by name. |
| Resize | “Make this bigger” | Scales the current font size by 1.25, or the current fixed width for boxes. |
| Reorder | “Move this to the front” | Lowers `layout.order` by one, so the element moves a step earlier among its siblings. |
| Single viewport | “Make the mobile spacing more compact” | Reduces the padding and gap that one viewport resolves to by 25%. Refused at scope All. |
| Multi-element | “Align the selected elements to center” | One independent proposal per selected element. Requires at least two. |
| Safe failure | “Add a pricing table with three plans” | Rejected as unsupported, with the supported phrases offered. Nothing is changed. |

Running an instruction changes nothing. Each returned element gets its own review card showing the target, its stable id, the scope, and a before/after row per field; Accept commits exactly that one proposal as a single-target `EditCommand` with `source: 'ai'`, and Reject changes only the card's status.

A card can be accepted only while it is still current. Staleness is measured per element and per field rather than by the document revision counter: an edit to another element - or to another field of the same element - leaves the card acceptable, while any edit to the fields the card names marks it stale and disables Accept. A whole-document counter would make a run poison itself, since accepting the first card would stale every sibling. A run survives a change of selection or panel, but a proposal whose target is no longer selected is shown as not applicable, because an AI edit may only touch the current selection.

Matching is first-match-wins over an ordered catalog after the instruction is lowercased and stripped of punctuation, so `MAKE THE HEADING BOLDER.` and `make the heading bolder` are the same input.

No real model is connected. The scenario engine reads the instruction, the selected stable IDs, those elements' current values for the chosen scope, and the scope itself, and returns typed proposals. It takes no store handle, no callback, no clock, and no random source, so the same input and state always produces a deeply equal result and generation provably cannot change the document.

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

- Model/schema: `src/model/document.ts`, `src/model/element.ts`, `src/model/properties.ts`, `src/model/ids.ts` (branded `ElementId`/`CommandId`/`RevisionEntryId`), `src/model/viewport.ts`, `src/model/history.ts`, `src/model/initial-template.ts`, re-exported from `src/model/index.ts`.
- Command validator/apply: `src/engine/edit-command.ts` (shape, target, allowed-field, value, scope, and `baseRevision` validation) and `src/engine/apply-edit-command.ts` (immutable apply plus post-apply re-validation). `applyEditCommand` is the only function in the codebase that produces a new canonical document from an existing one.
- Responsive resolution: `src/engine/responsive-resolver.ts` (`resolveElement`, `resolveDocument`, `resolveAllViewports`, `mergeEditableProperties`).
- History/restore: `src/engine/history.ts` (per-element, per-scope revision entries and `changedPaths`), `src/engine/restore.ts` (`createRestoreCommand`, `restoreElementRevision`), and `src/editor/element-history.ts` for the panel's derived view.
- Persistence: `src/store/persistence.ts` (versioned envelope, quarantine, storage-failure paths), `src/store/document-store.ts` (`commit`, `restore`, `reset` - the store has no generic setter), `src/editor/persistence-status.ts`.
- Deterministic proposal engine: `src/engine/scenario-catalog.ts` (the hand-written instruction catalog), `src/engine/generate-proposals.ts`, `src/engine/proposal.ts` (proposal schema and validation), `src/editor/proposal-review.ts` (per-card staleness and before/after description).

### Editor layout

One toolbar, one scope bar, and three regions below them:

- **Left rail** - the AI task flow is primary, with compact per-element history below it. Both stay available because they answer the two immediate questions: what should change next, and what already happened to this element.
- **Main surface** - one thing at a time, chosen by a tablist: the rendered preview, or the structured code view.
- **Right docks** - the editor starts with a clean canvas; the first selection reveals Design, while Layers remains available from the toolbar for tree navigation and additive selection. Each is a disclosure, not a modal: the canvas stays selectable underneath, both can be open at once, and Escape or the close control returns focus to the toggle that owns it. Above 1100 px an open dock insets the main surface instead of covering it. Docks are hidden rather than unmounted, so closing one cannot discard the layers tree's focus position or the inspector's pending error.

Scope Lock sits in the chrome above every surface rather than inside one panel, because the same statement governs an inspector edit, a code apply, an accepted proposal, and a restore.

### Commit boundary

A durable change occurs only after a typed command passes shape, target, selection (for AI), allowed-field, value, structure, scope, and stale-revision validation. Invalid commands preserve the current document and history.

### Responsive resolution

Base values apply across views. Desktop, tablet, and mobile overrides are merged after base values for only the active preview. A single-viewport edit writes only that override.

### Structured code surface

The Code surface - the second tab of the main tablist - shows the current selection as formatted JSON, keyed by stable element id, for the scope Scope Lock currently names:

```json
{
  "hero.heading": {
    "content": { "text": "Ship a landing page ..." },
    "typography": { "fontSize": 56, "fontWeight": 700 }
  }
}
```

This is structured data, not JSX, CSS, or a compiled source file. Only allowlisted properties parse; identity, parent, revision, and history fields are rejected rather than written. `revision` and `scope` are deliberately not part of the editable text - the panel captures the revision it serialized and Scope Lock owns the scope, so a draft cannot claim to be fresh or quietly retarget another viewport.

Apply diffs the draft against the current values and submits only the changed fields as an `EditCommand` with source `code`, through the same pipeline the inspector uses. Apply stays disabled until the draft parses and differs. A rejected draft (syntax, schema, protected field, unselected element, stale revision) stays on screen with an error naming the line or field path, and the document and history are untouched. Because a code edit merges, deleting a field from the draft is reported rather than silently ignored; clearing a field back to an earlier value is what History restore is for.

Keyboard: the editor is a plain textarea, so Tab leaves it normally; Escape moves focus to the surface's Apply button, or Revert when there is nothing to apply. Revert reloads the canonical values and is never disabled.

### Trade-off

The code surface edits validated structured JSON instead of arbitrary JSX/HTML. This limits expressiveness but enables safe runtime validation, stable IDs, scoped patches, deterministic rendering, and independent recovery within the assignment.

Full design: [ARCHITECTURE.md](./ARCHITECTURE.md). Decisions and the corrections behind them: [DECISION_LOG.md](./DECISION_LOG.md).

## Template and visual source

- Templates: **Aster Labs**, **Nova Portfolio**, **Orbit Metrics**, and **Luma Studio** are original one-page starter templates authored for this assignment. They are not derived from third-party templates, themes, or marketplace downloads. Aster's source of truth is `src/model/initial-template.ts`; the three compact variants are defined in `src/model/template-variants.ts`. All share the same 26 stable element ids so every editor feature works consistently.
- Template assets: four original SVGs in `public/template/`, drawn for this repository. No external image, icon set, or font file is bundled.
- Editor visual direction: inspired by [Vetra](https://vetra-app.vercel.app/) - dark neutral surfaces, blue accent, thin borders, rounded controls, restrained glow. The editor adapts the style and does not copy the site's content.
- Gallery layout direction: inspired by the supplied dark template-marketplace screenshot, reduced to four honest template cards with no copied branding, pricing, authentication, or fake inventory.
- No other third-party image, icon set, font file, CSS framework, or component library is used. Editor icons are inline SVG in `src/editor/Icon.tsx`; typography uses the `--font-ui` stack in `src/styles/tokens.css`, which prefers a locally installed Inter and otherwise falls back to the platform system font - no font file is downloaded or bundled, and there is no `@font-face` or web-font link anywhere in the project. This list is complete as of the final commit.

## Main dependencies

Four runtime dependencies, which is the complete `dependencies` block of `package.json`:

| Package | Why it is here |
| --- | --- |
| `react`, `react-dom` 19 | The client application. |
| `react-router-dom` 7 | Declarative `HashRouter` routing for `#/templates` and `#/editor/:templateId`, so direct links and refreshes work on any static host with no rewrite rule. |
| `zod` 4 | Runtime validation of every piece of untrusted structured data: persisted state, code-panel drafts, edit commands, and the proposal engine's own output. `CLAUDE.md` requires it and the safety model depends on it. |

Development-only: TypeScript, Vite and `@vitejs/plugin-react`, ESLint with `typescript-eslint` and the React plugins, Vitest with jsdom, Testing Library (`react`, `dom`, `jest-dom`, `user-event`), Playwright, and `@axe-core/playwright`.

Deliberately **not** installed:

- **Zustand / Immer** - the store is ~150 hand-written lines over a listener set plus React's `useSyncExternalStore`. A generic `set(state => …)` would reopen the mutation bypass this architecture exists to close; `DocumentStore` exposes only `commit`, `restore`, and `reset`.
- **Tailwind / shadcn/ui** - the design tokens in `src/styles/tokens.css` are asserted for WCAG 2.2 AA contrast by `src/styles/tokens.test.ts`, which also bans raw colour values in component files. A utility framework would move colour decisions out of that check.
- **Monaco / CodeMirror** - the code surface edits a small validated JSON object, not a source file; a plain textarea keeps the keyboard behaviour simple (no focus trap) and adds no megabyte-scale dependency.
- **dnd-kit** - reorder is expressed as a `layout.order` property edit through the same command pipeline, so it needs buttons with real keyboard equivalents, not a drag library.

## Requirement mapping

| Requirement | Implementation evidence | Test evidence |
| --- | --- | --- |
| Stable typed canonical model | `src/model/document.ts`, `src/model/element.ts`, `src/model/properties.ts`, `src/model/ids.ts`, `src/model/initial-template.ts` | `src/model/serialization.test.ts`, `src/model/ids.test.ts`, `src/model/document.test.ts`, `src/model/element.test.ts`, `src/model/initial-template.test.ts` |
| Canvas-code consistency | `src/editor/CodePanel.tsx`, `src/editor/code-document.ts`, `src/engine/edit-command.ts`, `src/engine/apply-edit-command.ts` | `src/editor/canvas-code.test.tsx`, `src/editor/code-editor.test.ts` |
| Desktop/tablet/mobile isolation | `src/engine/responsive-resolver.ts`, `src/editor/edit-scope.ts`, `src/editor/ScopeLock.tsx`, `src/editor/ViewportSwitcher.tsx`, `src/editor/PreviewFrame.tsx` | `src/engine/responsive-resolver.test.ts`, `src/editor/viewport-isolation.test.tsx`, `src/editor/editor-shell.viewport.test.tsx`, `src/editor/scope-lock.test.ts`, `e2e/smoke.spec.ts` |
| AI selection/field/scope safety | `src/engine/scenario-catalog.ts`, `src/engine/generate-proposals.ts`, `src/engine/proposal.ts` | `src/engine/ai-demo.test.ts`, `src/engine/proposal.test.ts` |
| Independent proposal outcomes | `src/editor/AiPanel.tsx`, `src/editor/proposal-review.ts` | `src/editor/ai-panel.test.tsx`, `src/editor/proposal-review.test.ts` |
| Per-element/scope recovery | `src/engine/history.ts`, `src/engine/restore.ts`, `src/editor/element-history.ts`, `src/editor/HistoryPanel.tsx` | `src/engine/history.test.ts`, `src/engine/history-restore.test.ts`, `src/editor/element-history.test.ts`, `src/editor/history-ui.test.tsx`, `src/editor/independent-recovery.test.tsx` |
| Persistence and reset | `src/store/persistence.ts`, `src/store/document-store.ts`, `src/editor/persistence-status.ts`, `src/editor/RecoveryNotice.tsx`, `src/editor/ResetProjectDialog.tsx` | `src/store/persistence.test.ts`, `src/editor/persistence-status.test.ts`, `src/editor/persistence-ui.test.tsx`, `src/editor/reset-project.test.tsx`, `e2e/persistence.spec.ts` |
| Keyboard accessibility | `src/editor/use-roving-focus.ts`, `src/editor/SurfaceTabs.tsx`, `src/editor/EditorDock.tsx`, `src/editor/ResetProjectDialog.tsx`, `src/editor/InspectorFieldRow.tsx` | `e2e/accessibility.spec.ts`, `src/editor/inspector-keyboard.test.tsx`, `src/editor/panel-collapse.test.tsx` |
| WCAG 2.2 AA contrast and design tokens | `src/styles/tokens.css`, `src/editor/Icon.tsx` | `src/styles/tokens.test.ts` |

The complete working checklist is in [REQUIREMENTS_CHECKLIST.md](./REQUIREMENTS_CHECKLIST.md).

## Accessibility

- The whole required journey - open the template, switch viewport, switch edit scope, select one and several elements, edit a property, apply structured code, run and accept a proposal, restore a revision - is driven end to end with the keyboard alone in `e2e/accessibility.spec.ts`.
- The canvas is `inert`: the rendered template's own links and buttons are not in the tab order and cannot be activated, so the selection overlay above it is the only interactive canvas surface.
- Every token pair the shell uses is asserted at WCAG 2.2 AA in `src/styles/tokens.test.ts`. Two DESIGN_SYSTEM draft values were adjusted to reach it (`--text-muted`, and the ink used on accent and danger fills); both are documented at their definition.
- Raw colour values and emoji icons are banned from component files by the same test; icons are inline SVG from `src/editor/Icon.tsx`.
- The Design and Layers docks are opened from labelled toolbar controls carrying `aria-expanded`/`aria-controls`, and close from the toggle, their own close button, or Escape - all three returning focus to the toggle. A closed dock is hidden rather than unmounted, so selection, code drafts, and pending proposals survive.
- Axe (`@axe-core/playwright`) scans the gallery, both main surfaces with the rail and both docks on screen, and the reset dialog for serious and critical findings.
- Verified in a real browser: visible focus that the toolbar does not clip, focus returning from every dialog and popover, 44x44px toolbar targets, 200% zoom without sideways scrolling, and reduced motion that removes transitions while keeping state changes.
- Editor surfaces are not lazy-loaded: the production bundle is ~123 kB gzipped and builds in under a second, so splitting it would add complexity without a measured need.

## Persistence and reset

- The canonical document is saved to `localStorage` under a versioned envelope (`scoped-ai-template-editor.project`) after every successful commit, restore, and reset. Nothing is written unless it re-validates, and nothing is hydrated without validation.
- Transient editor state is deliberately **not** persisted: selection, preview viewport, edit scope, which main surface is showing, which docks are open, unapplied code drafts, and pending AI proposals. A proposal generated against an older document must not come back to life after a refresh.
- The scope bar states the persistence status ("Original template", "Saved locally", "Recovered", "Not saved") in words, not colour alone.
- If stored data is unreadable, from another storage/schema version, or unwritable, the editor loads the original template, keeps the untrusted copy under a quarantine key, and shows a recovery notice with the one action that clears it. The editor stays fully usable in every one of those cases.
- **Reset Project** is the only destructive action. It opens a confirmation that names what will be lost; Cancel, Escape, and clicking outside all leave everything untouched. Confirming clears the stored project and the quarantined copy, reloads the original template, and discards the pending code draft, pending AI run, and selection that belonged to the discarded document.
- Deployment needs no server rewrite rule: routing is `HashRouter`, so a refresh on `/#/editor/aster-labs` is served by the same static `index.html`.

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
- [WALKTHROUGH.md](./WALKTHROUGH.md) - the recording script, in order
- [AI_USAGE.md](./AI_USAGE.md) - AI usage evidence
- [DECISION_LOG.md](./DECISION_LOG.md) - decisions and corrections
- [CODE_WALKTHROUGH.md](./CODE_WALKTHROUGH.md) - reading order through the source

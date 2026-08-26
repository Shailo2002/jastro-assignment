# AI Usage Log

This is a required submission artifact and must reflect actual work. Do not fabricate commands, tests, suggestions, or results. Redact secrets, personal prompts, and unrelated private content.

## Tools/models used

| Tool/model | What it helped with | Human verification |
| --- | --- | --- |
| Codex (planning session) | Read the assignment brief, reconcile the earlier project plan, inspect the Vetra reference, and create staged project documentation | User reviews the documentation and implementation choices |
| Claude Code | TODO: add model/version and bounded implementation tasks as they occur | TODO |

## Example 1 - planning/product framing

Date: 2026-08-26

Redacted prompt/extract:

> Create the required Markdown documentation and a step-by-step implementation path from the assignment brief and existing architecture plan. Include a verification gate for every step and adapt the frontend direction from Vetra.

AI contribution:

- Separated authoritative assignment requirements from earlier planning advice.
- Recommended architecture-first stages centered on canonical JSON state, validated commands, responsive overrides, and independent history.
- Adapted Vetra's dark, blue-accent visual language to an editor rather than copying its marketing layout.

Human review/correction:

- TODO: record what you changed or approved after reviewing these files.

## Example 2 - implementation/debugging/testing

Add one short real interaction after implementation begins.

- Date: TODO
- Step/feature: TODO
- Redacted prompt: TODO
- AI output summary: TODO
- What I inspected: TODO
- What I changed: TODO
- Tests run and results: TODO
- Commit: TODO

## Rejected or materially corrected suggestion

Use a real example; the assignment requires the reason and resulting change.

- Date: TODO
- Original AI suggestion: TODO
- Why it was unsafe, incorrect, over-scoped, or weak: TODO
- Resulting correction: TODO
- Verification evidence: TODO

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
| TODO | TODO | TODO | TODO | TODO | TODO |

Final summary must cover:

- commands/tests run;
- manual scenarios exercised;
- dependency names and why they were accepted;
- any generated code changed or rejected;
- remaining uncertainty.

## Workflow limitation and next-time change

TODO after enough implementation evidence exists. Discuss a real limitation such as lost context across sessions, over-broad changes, shallow accessibility assumptions, brittle generated tests, or time spent reviewing dependency choices. State the concrete workflow change you would make next time.

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

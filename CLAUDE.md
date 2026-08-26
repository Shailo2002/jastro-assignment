# Claude Code Instructions

You are helping implement a hiring assignment named **Scoped AI Template Editor**. Work incrementally and wait for the user to request the next numbered step from `IMPLEMENTATION_STEPS.md`.

## Required reading before editing

Read these files in order:

1. `REQUIREMENTS_CHECKLIST.md`
2. `ARCHITECTURE.md`
3. the current numbered section in `IMPLEMENTATION_STEPS.md`
4. `DESIGN_SYSTEM.md` for UI work
5. `TEST_PLAN.md` for behavior or test work

Treat `project_plan.md` as background advice, not an authoritative specification.

## Scope rules

- Implement only the requested numbered step.
- Do not implement future-step features “while you are here.”
- Do not add authentication, backend APIs, a database, a real LLM, collaboration, or multiple templates.
- Do not make the DOM the canonical state.
- Keep template catalog/search/route state separate from the canonical editor document and history.
- Do not dynamically compile arbitrary JSX/React code; the code surface edits validated structured JSON.
- Do not allow canvas, code, AI, or restore to bypass the shared validation and commit pipeline.
- Do not mutate current template state when an edit, code document, proposal, ID, field, scope, or revision is invalid.
- Do not overwrite user work or rewrite unrelated files without explaining why.

## Expected response for each step

Before coding, report:

1. the step number and goal;
2. files expected to change;
3. acceptance tests to run;
4. any assumption that affects architecture.

After coding, report:

1. what changed;
2. tests and checks run with their results;
3. files that deserve manual review;
4. risks, TODOs, or uncertainty;
5. a suggested conventional commit message.

Never claim a test passed unless you actually ran it. If a dependency or command is unavailable, say so and provide the smallest recovery action.

## Quality rules

- Use strict TypeScript; avoid `any` and unsafe casts.
- Prefer small pure engine functions with explicit inputs and outputs.
- Validate external/untrusted structured data at runtime with Zod.
- Keep stable branded ID types or clear ID aliases.
- Preserve the last valid canonical state on any failure.
- Make keyboard behavior and focus visible for every interactive UI.
- Use semantic design tokens; do not scatter raw color values through components.
- Add focused tests with behavior changes, not later as cleanup.
- Use meaningful filenames and component boundaries; avoid a single oversized store or component.

## Step completion protocol

At the end of a step:

```text
inspect diff -> run focused tests -> run full tests -> manual check
-> update docs/evidence -> user reviews -> commit
```

The user owns final approval. Do not automatically push, deploy, or create external resources unless explicitly asked.

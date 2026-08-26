# Scoped AI Template Editor - Documentation Index

This repository is intentionally documentation-first. Build the assignment one verified step at a time; do not ask an AI agent to generate the entire product in one pass.

## Start here

1. Read the assignment summary and completion checklist in [REQUIREMENTS_CHECKLIST.md](./REQUIREMENTS_CHECKLIST.md).
2. Read the system boundaries in [ARCHITECTURE.md](./ARCHITECTURE.md).
3. Read the adapted Vetra visual rules in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).
4. Follow [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md) from Step 0 onward.
5. Use [TEST_PLAN.md](./TEST_PLAN.md) and [MANUAL_QA.md](./MANUAL_QA.md) at each step, not only at the end.
6. Keep [AI_USAGE.md](./AI_USAGE.md) and [DECISION_LOG.md](./DECISION_LOG.md) updated while working.
7. Finish the submission-facing [README.md](./README.md) and [PRODUCT_NOTES.md](./PRODUCT_NOTES.md) only with facts verified in the implemented project.

The original discussion-derived plan remains available in [project_plan.md](./project_plan.md) as reference. If it conflicts with the assignment brief, the assignment brief and [REQUIREMENTS_CHECKLIST.md](./REQUIREMENTS_CHECKLIST.md) win.

## Documentation map

| File | Purpose | When to update |
| --- | --- | --- |
| `CLAUDE.md` | Guardrails and workflow for Claude Code | When architecture or commands change |
| `IMPLEMENTATION_STEPS.md` | Ordered build stages, tests, manual checks, and commit gates | At every completed step |
| `ARCHITECTURE.md` | Canonical model, command pipeline, responsive resolution, history | When a technical decision changes |
| `DESIGN_SYSTEM.md` | Vetra-inspired editor tokens, components, states, and accessibility | During UI implementation |
| `CODE_WALKTHROUGH.md` | Per-step reading guide: what changed, where, and why | After every completed step |
| `TEST_PLAN.md` | Unit, integration, and end-to-end coverage | Whenever behavior is added |
| `MANUAL_QA.md` | Keyboard, viewport, persistence, and failure-path checks | After each UI-bearing step |
| `REQUIREMENTS_CHECKLIST.md` | Assignment-to-evidence traceability | When evidence exists |
| `DECISION_LOG.md` | Decisions, rejected ideas, trade-offs | At each meaningful decision |
| `AI_USAGE.md` | Required AI-workflow evidence | After every substantial AI session |
| `PRODUCT_NOTES.md` | Required product definitions and chosen improvement | As behavior is finalized |
| `README.md` | Reviewer-facing setup, demo, architecture, and requirement map | Continuously; finalize before submission |

## Non-negotiable build order

```text
typed model -> responsive resolver -> command validation -> history
-> renderer -> template gallery -> selection -> manual editing -> code editing
-> deterministic AI proposal/review -> persistence -> polish -> submission
```

The durable source of truth must be typed JSON data with stable element IDs. Canvas, code, AI acceptance, and restore must all submit commands through the same validation and commit boundary.

## Working agreement

- Complete one numbered step at a time.
- Inspect the diff before accepting AI-written code.
- Run the step's focused test and the full regression suite.
- Perform the listed manual check when the step affects UI.
- Record unexpected decisions and corrected AI suggestions.
- Commit only when the step's exit gate passes.
- Do not mark documentation checkboxes from intention; mark them only from observed evidence.

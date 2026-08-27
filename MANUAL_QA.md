# Manual QA Checklist

Run the relevant section after each implementation step. Run the full checklist before deployment and recording.

## Environment

- Browser(s): Chromium via Playwright for the automated gate (`playwright.config.ts`); the manual pass below is intended for a current Chromium-based browser plus one other engine.
- Commit/build: run against the Step 16 working tree (base commit `a6ddd18`), Node v26.5.0, pnpm 9.15.9, production build 404.59 kB / 122.62 kB gzipped.
- Date: 2026-08-27 (automated gate). Manual pass: to be dated by the tester.
- Tester: the automated gate was run by Claude Code; every unticked box below is a human check and is deliberately left unticked - no box in this file is ticked on the strength of an automated test alone.

Automated gate after the black-shell design pass: `npm run lint` clean, `npm run typecheck` clean, `npm test` 45 files / 643 tests passed, `npm run test:e2e` 20 tests passed, and `npm run build` produced 418.81 kB / 126.79 kB gzipped JavaScript with a 56.96 kB / 8.60 kB gzipped stylesheet.

## Template gallery

- [ ] Default URL opens the template gallery, not directly into the editor.
- [ ] Exactly four real templates are shown: Aster Labs, Nova Portfolio, Orbit Metrics, and Luma Studio; no fake inventory appears.
- [ ] Card thumbnail is a real read-only render and its internal links cannot receive focus.
- [ ] Search has a visible label and can find `marketing`, `portfolio`, `dashboard`, or `responsive`.
- [ ] A no-result search shows a clear empty state and Clear filters restores the card.
- [ ] All templates, Marketing, Portfolio, and SaaS filters work and show honest counts.
- [ ] Use template opens the editor by pointer and keyboard.
- [ ] Only a template with restored saved work is labelled Continue editing.
- [ ] Back to templates returns without resetting document state.
- [ ] Gallery has no page-level horizontal scrolling at 1280, 768, or 375 px.
- [ ] Collapsing the rail leaves every control operable, named, and in the same tab order; expanding restores the labels.
- [ ] Cmd/Ctrl+K focuses the search field and reopens a collapsed rail.
- [ ] Recent work lists a template only after that template has saved work, and offers no second route into the editor.
- [ ] The rail claims no account, workspace switcher, or paid tier.

## Editor shell

- [ ] Opens without console errors.
- [ ] Usable at 1280 x 720.
- [ ] Initial editor view has a focused canvas with Design and Layers closed.
- [ ] Selecting the first canvas or layer target reveals Design and keeps the selection visible.
- [ ] The left rail and the right docks do not cover essential toolbar actions.
- [ ] Design and Layers close/reopen without losing selection or draft state.
- [ ] Switching Preview/Code keeps the selection, the code draft, and any pending proposal.
- [ ] No unintended page-level horizontal scroll.

## Preview sizes

- [ ] Desktop virtual viewport near 1440 px is visible through fit/zoom behavior.
- [ ] Tablet viewport near 768 px has no template clipping.
- [ ] Mobile viewport near 375 px has no template clipping.
- [ ] Switching view does not change canonical data.
- [ ] Current preview and edit scope are both visible.

## Selection

- [ ] Click selects one element and shows its name/boundary.
- [ ] Shift/Ctrl/Cmd-click adds a second element.
- [ ] Modified click can remove one selected item.
- [ ] Layers and canvas show the same selection.
- [ ] Tab/arrow navigation reaches selectable elements/layers.
- [ ] Enter/Space selection works.
- [ ] Shift/Ctrl/Cmd + Enter adds and removes from the keyboard.
- [ ] Escape clears the selection from either surface (documented escape shortcut).
- [ ] Selection and keyboard focus look different (solid selection border vs dashed focus ring).
- [ ] The toolbar reports the selected count and readable names as text.
- [ ] The most recently added target is marked as the active/primary one.
- [ ] Selecting never changes the revision number shown in the canvas status line.
- [ ] Overlay boxes stay aligned with the template at every preview size and when Fit is off.

## Manual editing

- [ ] Text edit updates preview after a valid commit.
- [ ] Style, spacing, and size edits use the visible scope.
- [ ] One order/structure action works with pointer and keyboard alternative.
- [ ] Move up/Move down are ordinary buttons, so Tab plus Enter or Space is the keyboard alternative.
- [ ] A disabled Move up/Move down explains its prerequisite in text.
- [ ] Invalid value shows a nearby message.
- [ ] Invalid value does not alter document or history.
- [ ] Mixed multi-selection values are labeled Mixed.
- [ ] Every field has a persistent visible label and its unit.
- [ ] Clearing a numeric field commits nothing rather than deleting the property.
- [ ] Fields are only offered when every selected element supports them.
- [ ] The inspector shows the value of the edit scope, not of the preview viewport.

## Scope Lock

- [ ] Target count and scope are both readable as text.
- [ ] The protected views are named for a viewport-scoped edit.
- [ ] Affected element names can be revealed.
- [ ] It updates immediately when the selection or the scope changes.
- [ ] Preview viewport and edit scope are visibly different controls.

## Viewport isolation

- [ ] Record desktop/tablet/mobile value for one element.
- [ ] Apply a Mobile-only change.
- [ ] Verify only mobile changed.
- [ ] Apply an All-views change to a different field.
- [ ] Verify it flows to all views.
- [ ] Verify an existing override still wins only for its field.

## Structured code editing

- [ ] Current selection is represented as formatted validated JSON.
- [ ] Valid edit updates the canvas and inspector.
- [ ] Invalid syntax reports location and preserves last valid state.
- [ ] Valid JSON with a forbidden field is rejected.
- [ ] Unsaved draft has clear revert/close behavior.
- [ ] Keyboard can leave the code editor without a trap.

## Deterministic AI demo

- [ ] Run is disabled or explained with no selection.
- [ ] Example instructions are reviewer-visible.
- [ ] Same input/state/scope returns the same proposal.
- [ ] Canvas does not change at proposal generation.
- [ ] Each card shows before, after, target, and scope.
- [ ] Accept one item in a multi-element proposal.
- [ ] Reject another and verify it stays unchanged.
- [ ] Unsupported instruction fails safely.
- [ ] Change state after generation and verify stale proposal cannot apply.

## History and restore

- [ ] Manual edit appears with source, fields, target, and scope.
- [ ] Accepted AI edit appears independently.
- [ ] Restore preview identifies one element and scope.
- [ ] Restore changes only that element/scope.
- [ ] Restore creates a new history entry.

## Persistence and reset

- [ ] Reload preserves document, overrides, and history.
- [ ] Selection/transient proposal behavior matches the documented choice.
- [ ] Reset requires confirmation.
- [ ] Cancel reset preserves all state.
- [ ] Confirm reset loads the initial template and clears old history.

## Keyboard-only route

Without using a pointer:

- [ ] Change viewport.
- [ ] Change edit scope.
- [ ] Select one and multiple elements.
- [ ] Change one manual property.
- [ ] Open and apply a valid code edit.
- [ ] Run a proposal and accept/reject independently.
- [ ] Restore an element revision.
- [ ] Close every dialog/popover and return focus correctly.

## Visual and accessibility

- [ ] Visible focus on all controls.
- [ ] Focus is not fully hidden behind sticky panels/toolbars.
- [ ] Text and control contrast passes WCAG 2.2 AA.
- [ ] Status is not color-only.
- [ ] Icon buttons have accessible labels/tooltips.
- [ ] Touch-intended targets are at least 44 x 44 px.
- [ ] At 200% zoom, essential actions remain reachable.
- [ ] Reduced-motion mode removes non-essential transitions.

## Final deployment smoke test

- [ ] Fresh/incognito load succeeds.
- [ ] Direct editor route works on refresh.
- [ ] No secrets or private data appear in client bundle/repository.
- [ ] Production console has no actionable errors.
- [ ] Core end-to-end smoke test passes against production.
- [ ] README setup commands work in a clean checkout.

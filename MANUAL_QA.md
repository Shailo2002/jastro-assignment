# Manual QA Checklist

Run the relevant section after each implementation step. Run the full checklist before deployment and recording.

## Environment

- Browser(s): TODO
- Commit/build: TODO
- Date: TODO
- Tester: TODO

## Editor shell

- [ ] Opens without console errors.
- [ ] Usable at 1280 x 720.
- [ ] Left and right panels do not cover essential toolbar actions.
- [ ] Panels collapse/restore without losing selection or draft state.
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
- [ ] Selection and keyboard focus look different.

## Manual editing

- [ ] Text edit updates preview after a valid commit.
- [ ] Style, spacing, and size edits use the visible scope.
- [ ] One order/structure action works with pointer and keyboard alternative.
- [ ] Invalid value shows a nearby message.
- [ ] Invalid value does not alter document or history.
- [ ] Mixed multi-selection values are labeled Mixed.

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


# Manual QA Checklist

Run the relevant section after each implementation step. Run the full checklist before deployment and recording.

## Environment

- Browser(s): Chromium via Playwright for the automated gate (`playwright.config.ts`); the manual pass below is intended for a current Chromium-based browser plus one other engine.
- Commit/build: run against the Step 16 working tree (base commit `a6ddd18`), Node v26.5.0, pnpm 9.15.9, production build 404.59 kB / 122.62 kB gzipped.
- Date: 2026-08-27 (automated gate). Manual pass: to be dated by the tester.
- Tester: the automated gate was run by Claude Code; every unticked box below is a human check and is deliberately left unticked - no box in this file is ticked on the strength of an automated test alone.

Automated gate after moving component styling into `className` (Tailwind utilities over the same tokens; `template-gallery.css` and `editor-shell.css` deleted): `pnpm lint` clean, `pnpm typecheck` clean, `pnpm test` 46 files / 673 tests passed, `pnpm test:e2e` 21 tests passed, and `pnpm build` produced 573.19 kB / 175.77 kB gzipped JavaScript (Motion for React included) with a 46.90 kB / 9.30 kB gzipped stylesheet and the 44 kB `grainient-bg.webp` field.

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
- [ ] Collapsing the rail animates its width, keeps the identity mark in place, and moves the collapse toggle to the row under it; expanding reverses it.
- [ ] With reduced motion on, collapsing still works and arrives immediately.
- [ ] The ambient background image is visible behind the catalog and behind the whole editor shell - under the top bar and in the gutters around all three cards - stays fixed while the page scrolls, and never sits behind the rail card, the dock, or the preview frame.
- [ ] Recent work lists a template only after that template has saved work, and each entry opens that template's editor by pointer and keyboard.
- [ ] The rail names the local user with an avatar, name, and address, and claims no workspace switcher, account menu, or paid tier.
- [ ] The product mark renders in the rail, in the editor toolbar, and as the browser tab icon, and stays sharp when the rail collapses.

## Editor shell

- [ ] Opens without console errors.
- [ ] Usable at 1280 x 720.
- [ ] Initial editor view shows the canvas with no panel docked, because nothing is selected yet.
- [ ] Selecting an element docks the Design panel, and only that panel; the switcher marks exactly one of Design, Code, and Layers as pressed.
- [ ] Clearing the selection closes a docked Design or Code panel; a docked Layers panel stays, so the tree is still reachable with nothing selected.
- [ ] The left rail and the right dock do not cover essential toolbar actions in either bar.
- [ ] The rail, the workspace, and the dock read as three cards on one field: each rounded and bordered, with an even gutter around and between them, and no full-height rule dividing the rail from the canvas.
- [ ] The top bar draws no panel, border, or blur of its own; only its chips and buttons paint, and the field runs unbroken behind it.
- [ ] Switching Design/Code/Layers keeps the selection, the code draft, and any pending proposal.
- [ ] The rendered template stays on screen whichever panel is docked.
- [ ] No unintended page-level horizontal scroll.

## Preview sizes

- [ ] Desktop virtual viewport near 1440 px is visible through fit/zoom behavior.
- [ ] Tablet viewport near 768 px has no template clipping.
- [ ] Mobile viewport near 375 px has no template clipping.
- [ ] Switching view does not change canonical data.
- [ ] Current preview and edit scope are both visible at once: the viewport control in the top bar, the scope switcher on the canvas toolbar.

## Selection

- [ ] Click selects one element and shows its name/boundary.
- [ ] Shift/Ctrl/Cmd-click adds a second element.
- [ ] Modified click can remove one selected item.
- [ ] Layers and canvas show the same selection.
- [ ] Tab/arrow navigation reaches selectable elements/layers.
- [ ] Enter/Space selection works.
- [ ] Shift/Ctrl/Cmd + Enter adds and removes from the keyboard.
- [ ] Escape clears the selection from either surface, and from anywhere else in the editor - the top bar, the rail, an open dock - without clicking into the canvas first.
- [ ] Escape inside the instruction field leaves the field and keeps both the typed text and the selection; a second Escape clears the selection.
- [ ] Pressing empty workspace - the matting around the frame, or the frame's own background - clears the selection.
- [ ] The instruction field grows as an instruction wraps, Shift+Enter adds a line, Enter runs, no shortcut prose is printed under it, and focusing it lights exactly one ring.
- [ ] Selection and keyboard focus look different (solid selection border vs dashed focus ring).
- [ ] The toolbar reports the selected count and readable names as text.
- [ ] The most recently added target is marked as the active/primary one.
- [ ] Selecting never changes the revision number shown in the top bar.
- [ ] The preview and the canvas toolbar share one rounded, bordered card floating in the ambient field, with the toolbar as its foot behind a hairline and the card's bottom corners rounding the strip.
- [ ] An open dock never covers the canvas toolbar: the card, and the strip at its foot, end where the panel begins.
- [ ] A desktop preview at Fit fills the card with no second rim inside it; Tablet and Mobile draw their own rounded rim with matting either side.
- [ ] Nothing sits above the preview frame but the frame itself, and the top bar carries only the project name, `rev N` with the saved state, reset, and - after a hairline - the viewport control and the Design/Code/Layers switch.
- [ ] At 1280px with a panel docked the toolbar is still one row; narrower, it takes a second row rather than overflowing sideways.
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

## Right dock

- [ ] Design, Code, and Layers are all the same width; the canvas does not resize between them.
- [ ] Each panel closes from the cross in its top corner, and focus lands back on its switch.
- [ ] With the dock closed no switch is pressed and the canvas takes the full workspace.
- [ ] Reopening a panel finds it as it was left, including an unapplied code draft.
- [ ] The rail reads as one conversation: no band of empty space between the last transcript entry and the composer.

## Scope Lock

- [ ] Target count and scope are both readable as text at the head of the AI composer, whatever panel is docked.
- [ ] The protected views are named for a viewport-scoped edit (hover the indicator, or read it with a screen reader).
- [ ] Affected element names are reachable the same way.
- [ ] It updates immediately when the selection or the scope changes.
- [ ] Preview viewport and edit scope are visibly different controls in different bars: the viewport is one cycling device button in the top bar, the scope a row of named chips on the canvas toolbar.

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

- [ ] Run is disabled with no selection, the composer shows no Scope Lock chip, and the canvas states `Nothing selected`.
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
- [ ] Every focus ring hugs the shape it belongs to: clicking a toolbar chip, a panel switch, or a scope chip and then pressing Escape lights a ring around the pill itself, not an oval around the invisible 44px target, and nothing clips it.
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

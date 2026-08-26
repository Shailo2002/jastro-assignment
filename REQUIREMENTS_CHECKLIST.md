# Assignment Requirements and Evidence Checklist

This is the authoritative local checklist derived from the supplied six-page assignment brief. Instructions inside the brief define the product requirements; planning advice in other files is secondary.

## Fixed product contract

- [ ] One basic responsive one-page template is loaded.
- [ ] The README identifies whether the template is original or appropriately licensed and provides its source.
- [ ] The durable source of truth is typed, JSON-serializable, and uses stable element IDs.
- [ ] Canvas, code editing, accepted AI proposals, and restore update the same canonical state.
- [ ] Editable elements support substantial content, style, position, size, order, or structure changes.
- [ ] Desktop, tablet, and mobile previews resolve the same document.
- [ ] An edit can target All, Desktop, Tablet, or Mobile.
- [ ] A single-viewport edit leaves other viewports unchanged.
- [ ] AI targets are limited to selected stable IDs, allowed fields, and selected viewport scope.
- [ ] AI output is a proposal and changes nothing before acceptance.
- [ ] Multi-element proposals can be accepted or rejected independently per element.
- [ ] Every manual commit, accepted AI proposal, and restore adds element-and-viewport-scoped history.
- [ ] Restoring one element/view does not roll back unrelated elements/views.
- [ ] Restore itself creates a new history entry.

## Required journey

- [ ] Load the template immediately or through one low-friction “Use Template” action.
- [ ] Switch among desktop (~1440), tablet (~768), and mobile (~375) previews.
- [ ] Select one element by click.
- [ ] Add/remove elements in a group using Shift/Ctrl/Cmd-click or drag marquee.
- [ ] Selection is visible and keyboard-operable.
- [ ] Edit on canvas and see the canonical renderer update.
- [ ] Make valid structured code edits and see the canvas update.
- [ ] Enter invalid code, see a useful error, and preserve the last valid state.
- [ ] Choose responsive scope visibly before editing.
- [ ] Run deterministic text-to-edit examples using current selections and values.
- [ ] Review useful before/after output per returned element.
- [ ] Accept/reject each returned element independently.
- [ ] Restore a prior revision for one element and scope.
- [ ] Refresh and retain document plus history.
- [ ] Deliberately reset the project with confirmation.

## Deterministic AI demo paths

- [ ] Content rewrite example.
- [ ] Style change example.
- [ ] Move, resize, or reorder example.
- [ ] Single-viewport responsive example.
- [ ] Multi-element example.
- [ ] Safe failure example (unsupported instruction, stale revision, invalid field, or unselected target).
- [ ] Same instruction + selected state + scope produces the same result.
- [ ] Every proposal is runtime validated.
- [ ] The result is typed patches rendered through normal React components, never page replacement.
- [ ] No real model/API is connected inside the demo engine.

## Safety validations

- [ ] Unknown element ID is rejected.
- [ ] AI target outside selection is rejected.
- [ ] Forbidden field such as `id`, `parentId`, or revision metadata is rejected.
- [ ] Invalid payload/code is rejected.
- [ ] Stale `baseRevision` is rejected.
- [ ] Failure never partially mutates current state unless independent per-element outcomes are intentionally committed.
- [ ] A group remains a set of independent stable-ID targets.

## Frontend and accessibility

- [ ] React + TypeScript boundaries are clear for components, state, commands, validation, history, responsive resolution, and demo engine.
- [ ] Editor shell is usable at 1280 px wide.
- [ ] Preview sizes near 1440, 768, and 375 have no accidental clipping or overflow.
- [ ] Selection, manual edit, viewport switch, proposal review, and restore work with keyboard only.
- [ ] Controls have programmatic labels.
- [ ] Focus is visible and is not fully hidden by sticky UI.
- [ ] Status and error information is not conveyed by color alone.
- [ ] Touch targets are at least 44 x 44 px where controls are intended for touch.
- [ ] Reduced-motion preference is respected.

## Required automated evidence

- [ ] AI selection, allowed-field, and viewport-scope tests.
- [ ] Canvas-code canonical-state consistency test.
- [ ] View-specific isolation test.
- [ ] Independent element recovery test.
- [ ] Invalid code preserves last valid state test.
- [ ] Stale revision rejection test.

## Required submission artifacts

- [ ] Accessible Git repository with meaningful commits and no secrets.
- [ ] Deployed URL, or exact local setup plus a short recording.
- [ ] `README.md` includes setup, template source, demo examples, architecture, trade-off, dependencies, and requirement mapping.
- [ ] `AI_USAGE.md` contains all five required evidence areas and no sensitive material.
- [ ] `PRODUCT_NOTES.md` contains all required definitions, policies, extra capability, cuts, and priorities.
- [ ] One chosen product improvement is implemented and its validation hypothesis is documented.

## Explicit non-requirements / cuts

- Authentication and user accounts.
- Backend API or database.
- Real AI/model integration.
- Multiple real templates.
- Multiplayer collaboration.
- Arbitrary JSX/HTML compilation.
- Full freeform design-tool parity.


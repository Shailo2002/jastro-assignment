# Test Plan

## Testing strategy

Use three layers:

- Unit tests for pure model/engine functions.
- Integration tests for store + UI surface synchronization.
- Playwright end-to-end tests for the reviewer journey, keyboard behavior, persistence, and viewport UI.

Suggested tools: Vitest, React Testing Library, `@testing-library/user-event`, `jest-dom`, and Playwright.

## Commands (establish in Step 0)

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:watch
pnpm test:e2e
pnpm build
```

If the scaffold uses npm instead, keep the script names identical and substitute `npm run`.

## Test data rules

- Use stable fixture IDs such as `hero.heading`, `hero.cta.primary`, and `features.card.1`.
- Freeze or inject timestamps/command IDs for deterministic assertions.
- Build a fresh initial document for every test.
- Assert both changed values and explicitly protected values.
- For rejection tests, also assert document revision and history length remain unchanged.

## Required unit tests

### Model and serialization

- Initial document passes runtime schema validation.
- JSON round-trip preserves canonical data.
- Duplicate IDs, missing children, and broken parent links fail validation.

### Responsive resolver

- Base value resolves in all views when no override exists.
- Mobile override affects mobile only.
- Desktop/tablet remain byte-for-byte equivalent after a mobile-only edit.
- Base edit flows to views without a field override.
- Override wins for only the overridden field.

### Command validation and apply

- Valid command returns a new document and increments revisions.
- Unknown target ID is rejected with no mutation.
- Empty target list is rejected.
- Forbidden property is rejected.
- Invalid property value is rejected.
- Stale base revision is rejected.
- AI target outside captured selection is rejected.
- Each target receives only its own patch.

### History and restore

- Manual, AI acceptance, and restore each append scoped history.
- Multi-element commit produces independent element entries.
- Restoring heading does not change button.
- Restoring mobile does not change desktop/tablet.
- Restore adds a new history entry rather than deleting later history.

### Deterministic AI engine

- Same normalized input + selection + values + scope returns identical proposals.
- Content rewrite uses current selected text.
- Style scenario targets selected compatible types only.
- Responsive scenario uses chosen single viewport.
- Multi-element result contains independent proposals.
- Unsupported input returns a safe typed failure.
- Runtime proposal parser rejects unselected ID, forbidden field, and stale revision.

### Persistence

- Save and hydrate preserves document and history.
- Corrupt storage does not replace the initial valid state.
- Unsupported schema version follows the documented recovery path.
- Reset clears project data and returns the initial document.

## Required integration tests

### Template gallery and entry flow

- Default app route shows the real catalogued template, not the editor or fake inventory.
- Search matches template metadata and offers a clear empty-state recovery.
- Use template works with pointer and keyboard activation.
- The selected template opens the existing editor without changing canonical revision/history.
- Back to templates returns to the gallery without resetting persisted work.
- Direct hash entry opens the editor on static hosting.
- Unknown template and unmatched routes redirect to the gallery.

### Canvas-code consistency

1. Render selected element from the canonical document.
2. Commit a canvas text edit.
3. Assert code panel displays the new canonical value.
4. Apply valid JSON from code.
5. Assert canvas displays the new value.
6. Apply invalid JSON.
7. Assert error appears and canonical value/history are unchanged.

### Selection and scope

- Click selects one stable ID.
- Modified click adds/removes independent IDs.
- Keyboard selection produces the same selected ID state.
- Scope switch updates visible Scope Lock text.
- AI Run remains disabled without selection.

### Proposal review

- Generation leaves document revision unchanged.
- Accept first of two proposals changes only the first target.
- Reject second proposal leaves its target unchanged.
- A stale proposal becomes non-acceptable after another commit.

### Independent recovery

- Edit heading and button.
- Restore a prior heading/mobile entry.
- Assert heading/mobile changed to restored value.
- Assert heading/desktop, heading/tablet, and all button values are unchanged.

## End-to-end reviewer journey

One Playwright test should cover:

1. Load the gallery and choose Aster Labs.
2. Switch desktop/tablet/mobile.
3. Select heading and CTA using keyboard/additive selection.
4. Apply a mobile-only manual style edit.
5. Verify desktop remains unchanged.
6. Make a valid code edit, then an invalid one.
7. Generate a deterministic multi-element proposal.
8. Accept one and reject one.
9. Restore one element/scope.
10. Reload and confirm persistence.
11. Reset with confirmation.

Split this test if failure diagnosis becomes unclear, but retain one short smoke journey for deployed builds.

## Accessibility tests

- Use role/name queries instead of test IDs wherever possible.
- Add automated axe checks if time permits, but never treat them as a substitute for keyboard/manual checks.
- Assert focus moves into dialogs and returns to the invoking control.
- Assert error text is programmatically associated with the failing field/draft.
- Assert segmented controls expose pressed/selected state.

## Per-step regression gate

Before each commit:

```text
focused tests for the step
AND full unit/integration suite
AND typecheck
AND lint
AND build when routing/config/dependencies changed
AND listed manual check
```

Record actual command results in `AI_USAGE.md` when AI produced or changed code.

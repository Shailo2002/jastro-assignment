# Walkthrough script (3-5 minutes)

For the required recording. The order follows Step 16 of `IMPLEMENTATION_STEPS.md`. Every claim in the script is one you can show on screen; nothing here needs narration the product cannot back up.

Before recording: `pnpm install && pnpm dev`, open the gallery, and use **Reset Project** so the recording starts from the original template.

## 0. Setup (before you hit record)

- Window at 1280 x 720 or larger, browser zoom at 100%.
- Start on `#/templates`, not inside the editor.

## 1. The problem and the architecture (about 40s)

> "A non-technical owner editing a live template is mostly afraid of one thing: changing something they did not mean to change. So this editor is built so that every edit has to name its target and its scope before it can happen."

Show the diagram in `README.md` or say it: canvas, structured code, an accepted AI proposal, and restore all produce the same validated `EditCommand`, which is the only way the canonical typed document changes. The canvas is a projection, never the source of truth.

## 2. Responsive preview (about 20s)

Click **Use template** on Aster Labs. Switch Desktop, Tablet, Mobile.

> "One document, three projections. Switching the preview does not change canonical data - the revision number in the status line does not move."

## 3. Selection (about 20s)

Click the hero heading. Then Shift-click a second element.

> "Selection is by stable element id, not by DOM position or CSS class. The toolbar states the count and the names as text."

## 4. Scope Lock and a mobile-only edit (about 50s)

Point at Scope Lock: target count, names, and the edit scope, which is a separate control from the preview viewport.

Set scope to **Mobile**. Note the line naming Desktop and Tablet as protected. Change the heading's font size in the inspector.

Switch to Desktop and Tablet: unchanged. Switch back to Mobile: changed.

> "A single-viewport edit writes one override and nothing else."

## 5. Code, valid and invalid (about 45s)

Open the **Code** tab. Show that it is validated structured JSON keyed by stable element id, for the current scope - not JSX, not a compiled file.

- Valid: change a value, **Apply**, canvas updates.
- Invalid: break the JSON, or add a forbidden field such as `parentId`. Apply is refused with an error naming the line or field path, and the document and history are untouched.

> "This is the trade-off: less expressive than a real code editor, in exchange for runtime validation, stable ids, scoped patches, and safe recovery."

## 6. Deterministic proposals (about 60s)

Select two elements. Run **"Align the selected elements to center"**.

> "No model is connected. This reads the instruction, the selected ids, their current values, and the scope, and returns typed proposals. Generating changes nothing."

Show two cards, each with target, stable id, scope, and a before/after row per field. **Accept** one, **Reject** the other. Point out that only the accepted one committed, as its own command.

Optionally run **"Add a pricing table with three plans"** to show the safe failure: refused, with the supported phrases listed, nothing changed.

## 7. Restore (about 30s)

Open **History**. Show entries carrying source, target, scope, and the fields changed. Restore the heading's mobile revision.

> "Restore addresses one element and one scope, it is committed through the same pipeline, and it creates a new history entry rather than rewinding the page."

Show that the other element you edited is untouched.

## 8. Persistence and reset (about 25s)

Refresh the browser. The document and history come back; selection, drafts, and pending proposals deliberately do not.

> "Saved to localStorage under a versioned envelope, and nothing is stored or loaded without re-validating. Reset Project is the only destructive action and it asks first."

Open the reset dialog, then cancel it.

## 9. Tests and one trade-off (about 30s)

Name the focused evidence rather than the total count: `src/editor/viewport-isolation.test.tsx` for scope isolation, `src/editor/canvas-code.test.tsx` for invalid code preserving the last valid state and for stale-revision rejection, `src/editor/ai-panel.test.tsx` for independent accept/reject, `src/editor/independent-recovery.test.tsx` for per-element recovery, and `e2e/accessibility.spec.ts` for the whole journey with the keyboard alone.

Close on the trade-off you want the reviewer to remember - the JSON code surface, or reorder as a `layout.order` property edit instead of a structural command.

## Claims to avoid on camera

- Do not call it deployed unless it is; the local setup is the stated alternative.
- Do not claim a usability study; the Scope Lock hypothesis is untested with users.
- Do not quote a test count from memory - re-run `pnpm test` if you want to state one.

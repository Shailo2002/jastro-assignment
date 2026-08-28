# Vetra-Inspired Editor Design System

## Context and goals

The UI should borrow Vetra's confident dark surfaces, bright blue action color, centered clarity, rounded controls, thin borders, and restrained glow. It must not copy Vetra's marketing content or reproduce the landing page pixel-for-pixel. The assignment product is a dense website editor, so the visual language is adapted for long work sessions, clear state, and safe actions.

The editor shell must prioritize scope awareness and editing safety over decorative effects.

## Where styling lives

Components carry their own styling in `className`. There is no per-component
stylesheet: `src/styles/` holds `tokens.css` (the only file allowed to contain a
raw value), `theme.css` (which maps those tokens onto utility names), and
`global.css` (document-level rules). A component's appearance is readable, and
editable, in the component itself.

The utilities are named after the tokens, so the vocabulary below is what the
markup says: `bg-surface-panel`, `text-secondary`, `border-default`,
`rounded-card`, `shadow-hairline`, `min-h-touch`, `duration-instant`,
`bg-ambient`. Tailwind's spacing step is 4px, which is exactly `--space-1`, so
`p-1 p-2 p-3 p-4 p-5 p-6 p-8` are the product's spacing scale.

An arbitrary value (`text-[13px]`, `w-[min(320px,100%)]`) is allowed for a
one-off geometry, and may reference a token with `var(--…)`. It must never
inline a literal colour: `tokens.test.ts` scans every component for that, the
same way it scans the stylesheets.

Four repeated controls - `ToolbarButton`, `IconButton`, `DockToggle`, and
`SegmentedGroup`/`SegmentedItem` in `src/editor/controls.tsx` - own their base
utilities, because a toolbar where one button is a pixel taller than its
neighbour reads as a bug. A caller passes content, state, and variant, never a
competing background or border.

A handful of class names survive with no styling attached - `preview__frame`,
`selection-target`, `proposal-card`, `revision-card`, `dialog-backdrop` and
their `__status` parts. They are query hooks the browser tests measure and
assert against; each is commented as such where it is written.

## Foundations and semantic tokens

Use semantic tokens in components. Raw values belong only in the token
definition layer.

```css
:root {
  /* Surfaces: a true-black base with warm neutral greys above it. */
  --surface-canvas: #000000;
  --surface-shell: #080807;
  --surface-panel: #101010;
  --surface-elevated: #1a1a19;
  --surface-hover: #242423;

  --text-primary: #ffffff;
  --text-secondary: #a8a7a2;
  --text-muted: #8e8d89;
  --text-on-accent: #050506;

  --border-default: #2b2b29;
  --border-strong: #41413d;
  --border-selection: #6b9cff;

  --action-primary: #5b8def;
  --action-primary-hover: #74a2ff;
  --action-primary-active: #4775cc;
  /* A white pill for an action that opens work rather than changing it. */
  --action-neutral: #ffffff;
  --action-neutral-hover: #e6e6e3;
  --text-on-neutral: #0a0a0b;
  --status-success: #34d399;
  --status-warning: #fbbf24;
  --status-danger: #f87171;

  /* Identity only - never the sole signal for an interactive state. */
  --accent-brand: #6b4de0;
  --accent-brand-soft: rgb(107 77 224 / 18%);
  --accent-warm: #ff7a4d;

  --focus-ring: #8ab4ff;
  --selection-fill: rgb(91 141 239 / 14%);
  --glow-accent: 0 0 48px rgb(59 130 246 / 18%);

  /* Ambient field: the shipped grainient image under a contrast scrim.
     Composed here so components only ever ask for the field. */
  --ambient-scrim: rgb(0 0 0 / 42%);
  --ambient-image: url("/grainient-bg.webp");
  --ambient-page: /* scrim over --ambient-image over --surface-canvas */;

  --elevation-hairline:
    inset 0 0.5px 0 0 rgb(255 255 255 / 14%),
    inset 0 0 0 0.5px rgb(255 255 255 / 6%);
  --elevation-soft: 0 1px 2px rgb(0 0 0 / 40%), 0 8px 24px rgb(0 0 0 / 24%);
  --elevation-raised:
    0 1.5px 0 0 rgb(0 0 0 / 8%),
    0 3.5px 3px -1.5px rgb(0 0 0 / 16%),
    0 12.5px 12px -6px rgb(0 0 0 / 24%);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  --corner-xs: 4px;
  --corner-sm: 6px;
  --corner-control: 8px;
  --corner-input: 10px;
  --corner-card: 12px;
  --corner-panel: 16px;
  --corner-pill: 9999px;

  --duration-instant: 150ms;
  --duration-fast: 200ms;
  --duration-normal: 300ms;

  --type-xs: 12px;
  --type-sm: 14px;
  --type-md: 16px;
  --type-lg: 24px;
  --type-xl: 30px;
}
```

The ambient field is the one decorative layer in the system, and it is bounded
by the same contrast promise as everything else. It is a single image shipped
with the app - never a CDN fetch, so the product renders identically offline -
and it is never painted without its scrim: the image's brightest pixel is
rgb(55 64 79), where `--text-muted` measures 3.15:1, and the 42% scrim lifts the
same pixel to 4.65:1. `tokens.test.ts` asserts the scrim can never be removed or
weakened past 40%; `e2e/accessibility.spec.ts` decodes the real asset in a
browser and re-measures it. A replacement image that cannot pass that
measurement must be darkened or scrimmed harder, not shipped.

Every main surface uses the field: the gallery catalog, the editor workspace,
and the document body under both. It is `background-attachment: fixed`, so
content scrolls across a still field. Surfaces that need an opaque plane - the
rail, panels, docks, the preview frame - paint over it.

Two brief values are deliberately adjusted so the palette can meet the AA
requirement stated below, and both adjustments are recorded beside the token in
`tokens.css`: `surface.muted` (#272726) is darkened two steps, because
`--action-primary` as text measures 4.45:1 on it, and `text.on-accent` stays
near-black rather than white on the action and danger fills. `tokens.test.ts`
asserts every text/surface pair the shell actually uses.

The shell must meet WCAG 2.2 AA contrast. The gallery reads at a 16 px body; the editor is a dense work surface and reads at 14 px. Metadata may use 12 px but must retain adequate contrast and line height.

Recommended typography:

- UI and body: the brand face (`Camera Plain Variable`) with a `ui-sans-serif`/
  `system-ui` fallback stack. No webfont is fetched at runtime, so the app looks
  the same offline and in review.
- Structured code: JetBrains Mono or the system monospace stack.
- Editor title: 16-18 px / 600.
- Panel section title: 12-14 px / 600 with clear casing, not faint all-caps text.
- Marketing template headings may use the larger 36/48/60/72 px scale.

## Editor layout

At 1280 px, the editor must remain usable:

```text
top toolbar: 52px - project | Scope Lock statement + edit scope | viewport,
                    Design/Code/Layers, reset
left rail:   320px - AI task flow first, compact element history below
main:        minmax(0, 1fr) - the preview canvas, always
right dock:  360px, the same for every panel - one at a time, Design by default,
             dismissable from its own corner
```

Scope Lock is chrome, not panel furniture: it sits above every surface, because the same statement governs an inspector edit, a code apply, an accepted proposal, and a restore. It shares the one toolbar with the scope switcher that sets it - a second strip would have repeated the same subject and spent a row of the thing under review. Only the short statement is drawn; the protected views and the affected element names live in the region's accessible name and its tooltip, complete rather than truncated across the chrome. The persistence status is not a control, so it sits with the revision counter above the canvas.

Every dock is the same width whatever it holds, so the canvas beside it never resizes as the reviewer moves between panels. Each one can be dismissed from a close control in its top corner, which returns focus to the switch that opened it and gives the canvas the whole workspace; nothing about the document, the selection, or an unapplied draft changes when it does.

The dock is a region of the shell, not a modal. The canvas underneath stays selectable, and focus is not stolen when a panel is docked. Above 1100 px the dock insets the main surface rather than covering it; below that it overlays, which is the only honest answer when there is no room for both. At narrower editor widths the rail stacks above the main surface instead of shrinking the canvas to unusable dimensions. The preview itself must be zoomable/fit-to-canvas so a 1440 px virtual viewport can be inspected within the workspace.

Design, Code, and Layers are mutually exclusive, so they are one segmented switcher - the same shape as the viewport control - with exactly one pressed item, never three independent toggles. Design is the default, because it is the panel an edit starts from. The centre is always the rendered template: no panel ever replaces what is under review. Panels are hidden rather than unmounted, so switching between them keeps the layers tree's focus position, the inspector's pending error, and an unapplied code draft. The Code panel must present structured properties as an editor workspace rather than pretending to be an unrestricted source-code IDE.

## Component rules

Every interactive component must define default, hover, focus-visible, active, disabled, loading, and error behavior where the state is applicable.

### Template gallery

- The gallery must be the low-friction entry to the editor and must not introduce authentication or pricing.
- The catalog must show only real templates; future inventory must not be represented by fake or disabled cards.
- Each card must include a real preview, template name, category, concise description, attributes, availability, and an explicit Use template/Open action.
- The card is a framed preview with a caption under it, not a panel: no card border, no card fill, and no chip stack. Category and attributes read as one dot-separated line, and the preview is the only element that moves on hover.
- Only one filled action may appear in the grid. Continuing saved work uses the white `--action-neutral` pill; starting from an untouched template uses the quiet bordered pill, so the filled control always means "work already exists here."
- The preview must be read-only, removed from keyboard navigation, and hidden from assistive technology so its internal links do not compete with the card action.
- Search must have a persistent visible label and an empty state with a clear recovery action.
- Filter controls must use real buttons with `aria-pressed`; counts must match the actual catalog.
- The card action must be reachable and operable by keyboard, with a visible focus indicator.
- Returning from the editor must be predictable and must not erase persisted document state.
- At narrow widths the sidebar must become a stacked header/filter region without page-level horizontal scrolling.

### Product mark

- One component, `src/brand/BrandMark.tsx`, draws the mark everywhere it appears: the gallery rail, the editor toolbar, and `public/logo.svg` for the browser tab. Two drawings of one logo must not exist.
- The mark is always decorative. The control or link around it carries the accessible name, and the SVG is `aria-hidden`.
- Its ids are namespaced per instance, because a fixed id would be duplicated the moment two copies mount and the first one on the page would capture every reference.
- Its fill is the `--brand-mark` token. The mark is never a surface and never text, so it carries no contrast obligation - but it must not be recoloured per placement.

### Gallery navigation rail

- The rail is one column of 44 px rows: identity, search, filters, saved-work report, and a footer callout.
- The active filter must be marked by fill, border, and weight together - never by colour alone - and must expose `aria-pressed="true"`.
- A rail control that advertises a keyboard shortcut must implement it; the search badge names the platform key it actually binds.
- Collapsing the rail must hide labels visually only. Every control keeps its accessible name, its tooltip, and its position in the tab order, and reaching the search field by keyboard while collapsed must reopen the rail.
- Collapsing must read as one movement, not a swap: the rail width animates, the identity mark holds its place rather than being relocated or unmounted, and the collapse toggle travels from the end of the identity row to the row beneath the mark. The catalog beside it must follow the same animation instead of snapping to the new width.
- The animation is Motion for React (`motion/react`), driven by state, and must honour `prefers-reduced-motion`: the collapsed state still arrives, it just arrives immediately.
- The rail must not offer a second route into a project: saved work is reported there, and the card action opens it.
- Nothing in the rail may imply an account, a workspace switcher, or a paid tier that this product does not have.

### Top toolbar

- Anatomy: project name, viewport switcher, edit-scope switcher, preview/fit control, reset.
- Viewport and scope are different controls and must not be visually ambiguous.
- Selected segmented-control items must expose `aria-pressed="true"`.
- Reset must use danger styling only at confirmation time, not dominate routine controls.
- On overflow, low-priority labels may shorten but the current viewport and scope must remain visible.

### Scope Lock indicator

- Must state target count and edit scope in text, for example “2 selected · Mobile only.”
- Must carry the affected element names and the protected views - reading them may cost a hover or a screen reader, but they are never abbreviated away.
- Must update immediately when selection or scope changes.
- Must not use color alone; pair icon, text, and border treatment.
- AI proposal review must repeat the scope snapshot captured at generation.

### Buttons and icon buttons

- Text buttons use concise verbs: Apply, Accept, Reject, Restore, Reset.
- Icon-only controls must have an accessible name and tooltip.
- Touch size must be at least 44 x 44 px where touch interaction is expected.
- Loading must preserve width and expose an accessible busy state.
- Disabled state must explain the prerequisite when it is not obvious.
- Focus ring must remain visible against dark panels.

### Canvas and selectable elements

- Hover may show a subtle outline but must not be the only indication of interactivity.
- Selected element: 2 px selection border, readable name label, and `aria-selected` or equivalent list/tree semantics where applicable.
- Multi-selection: every target shows an outline; the active/primary target receives a stronger handle treatment.
- Keyboard focus and selected state must be visually distinguishable.
- Handles must not obscure content at 375 px preview.
- Long labels must truncate with a tooltip; stable IDs remain available in inspector/debug details.

### Layers tree

- Use tree/list semantics and buttons, not clickable `div` elements.
- Arrow keys navigate; Enter/Space select; modified activation adds to selection.
- Drag reorder must have Move up/Move down keyboard alternatives.
- Deep names truncate without horizontal page overflow.
- Empty state explains that the current template has no editable children.

### Inspector fields

- Every field must have a persistent visible label, current scope, units, and inline validation.
- Do not use placeholder-only labels.
- Commit behavior must be consistent: either explicit Apply or a documented blur/Enter commit.
- Error text must appear near the field and the last valid value must remain in canonical state.
- Mixed multi-selection values must display “Mixed,” never a fabricated shared value.

### Structured code panel

- Must label the format as validated JSON, not imply arbitrary source compilation.
- Apply is disabled until the draft differs and parses successfully.
- Parse/schema errors include a useful location or field path.
- Invalid drafts remain editable; closing/reverting requires an explicit choice if unsaved.
- Keyboard focus must not become trapped inside the editor; document the escape shortcut.

### AI edit and proposal cards

- Show example prompts as buttons or copyable choices.
- Run action is disabled without selection and explains why.
- Each proposal card shows element name/ID, scope, before, after, validation status, Accept, and Reject.
- Accept/reject outcomes are independent.
- Stale proposals show an error and cannot be accepted.
- No visual state may imply that a proposal has already changed the canvas.

### History and restore

- Entries show source, time, scope, and a meaningful changed-field summary.
- Restore action must state exactly one target and one scope.
- Confirmation preview should show current vs restored values.
- Restored entries remain in chronological history as new commits.

### Toasts, errors, and empty states

- Toasts supplement, not replace, persistent inline error/state.
- Errors use icon + title + next action and receive announcement semantics when appropriate.
- Empty states must explain what action produces content.
- Do not expose raw stack traces to the reviewer UI.

## Interaction and motion

- Component-level state changes use CSS transitions. Layout changes that must
  stay continuous - the rail collapse and the controls that move with it - use
  Motion for React, so the element's real geometry is animated rather than
  approximated. Both must respect `prefers-reduced-motion`.
- Hover/focus transitions should use 150-200 ms.
- Panel changes may use 200-300 ms opacity/transform transitions.
- Do not animate layout width/height on the editing canvas if it causes jank.
- Reduced motion must remove non-essential movement while preserving state changes.
- Never rely on hover for the only action.

## Content standards

Tone must be concise, confident, and explicit about scope.

Good:

- “Apply to Mobile only”
- “This proposal changes 2 selected elements.”
- “Code is invalid. The last valid version is still active.”
- “Restore Hero heading · Mobile”

Avoid:

- “Do it”
- “Something went wrong” without cause or recovery
- “AI updated your site” before acceptance
- “Global” when the actual scope is All views

## Accessibility acceptance checks

- Every editor action can be completed using keyboard only.
- Focus is visible and not fully covered by fixed UI.
- Selection, scope, proposal status, and validation status have text/semantic equivalents.
- Every form input has an accessible name and error association.
- Color contrast passes WCAG 2.2 AA.
- Touch-intended controls meet 44 x 44 px.
- Zoom to 200% does not hide essential actions or create two-dimensional page scrolling outside the intended canvas.

## Prohibited implementations

- Raw hex colors scattered in component files.
- Clickable non-semantic `div` elements.
- Hidden focus rings.
- Selection indicated by color alone.
- Low-contrast gray labels on gray panels.
- Unlabeled icon buttons.
- Fixed canvas widths that force editor-shell horizontal overflow.
- Decorative glow that reduces text contrast.
- Emoji used as interface icons.
- Automatic AI application.

## UI QA checklist

- [ ] 1280 px editor shell is usable.
- [ ] 1440/768/375 preview frames fit or zoom without clipping.
- [ ] Switching between the Design, Code, and Layers panels loses no state.
- [ ] Keyboard focus order follows visual order.
- [ ] All control states are visible.
- [ ] Scope Lock is readable before every edit.
- [ ] Invalid and stale states are understandable.
- [ ] Reduced-motion behavior is verified.
- [ ] No unintended page-level horizontal scrolling.

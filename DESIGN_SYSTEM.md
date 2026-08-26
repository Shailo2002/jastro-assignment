# Vetra-Inspired Editor Design System

## Context and goals

The UI should borrow Vetra's confident dark surfaces, bright blue action color, centered clarity, rounded controls, thin borders, and restrained glow. It must not copy Vetra's marketing content or reproduce the landing page pixel-for-pixel. The assignment product is a dense website editor, so the visual language is adapted for long work sessions, clear state, and safe actions.

The editor shell must prioritize scope awareness and editing safety over decorative effects.

## Foundations and semantic tokens

Use semantic variables in components. Raw values belong only in the token definition layer.

```css
:root {
  --surface-canvas: #050506;
  --surface-shell: #09090b;
  --surface-panel: #0f1013;
  --surface-elevated: #16181d;
  --surface-hover: #1d2027;

  --text-primary: #fafafa;
  --text-secondary: #a3a3a3;
  --text-muted: #737373;
  --text-on-accent: #ffffff;

  --border-default: #262626;
  --border-strong: #3f3f46;
  --border-selection: #6b9cff;

  --action-primary: #5b8def;
  --action-primary-hover: #74a2ff;
  --action-primary-active: #4775cc;
  --status-success: #34d399;
  --status-warning: #fbbf24;
  --status-danger: #f87171;

  --focus-ring: #8ab4ff;
  --selection-fill: rgb(91 141 239 / 14%);
  --glow-accent: 0 0 48px rgb(59 130 246 / 18%);

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;

  --radius-control: 8px;
  --radius-card: 12px;
  --radius-panel: 16px;
  --radius-pill: 9999px;

  --duration-instant: 150ms;
  --duration-fast: 200ms;
  --duration-normal: 300ms;
}
```

The shell must meet WCAG 2.2 AA contrast. Body text should use 16 px where space permits; dense metadata may use 14 px but must retain adequate contrast and line height.

Recommended typography:

- UI and body: Inter or Geist Sans with a system sans fallback.
- Structured code: JetBrains Mono or the system monospace stack.
- Editor title: 16-18 px / 600.
- Panel section title: 12-14 px / 600 with clear casing, not faint all-caps text.
- Marketing template headings may use the larger 36/48/60/72 px scale.

## Editor layout

At 1280 px, the editor must remain usable:

```text
top toolbar: 56px
left panel: 240px collapsible
canvas: minmax(0, 1fr)
right panel: 320px collapsible
status/scope information: visible in toolbar or right panel header
```

At narrower editor widths, panels should collapse into drawers instead of shrinking the canvas to unusable dimensions. The preview itself must be zoomable/fit-to-canvas so a 1440 px virtual viewport can be inspected within the workspace.

## Component rules

Every interactive component must define default, hover, focus-visible, active, disabled, loading, and error behavior where the state is applicable.

### Template gallery

- The gallery must be the low-friction entry to the editor and must not introduce authentication or pricing.
- The catalog must show only real templates; future inventory must not be represented by fake or disabled cards.
- Each card must include a real preview, template name, category, concise description, attributes, availability, and an explicit Use template/Open action.
- The preview must be read-only, removed from keyboard navigation, and hidden from assistive technology so its internal links do not compete with the card action.
- Search must have a persistent visible label and an empty state with a clear recovery action.
- Filter controls must use real buttons with `aria-pressed`; counts must match the actual catalog.
- The card action must be reachable and operable by keyboard, with a visible focus indicator.
- Returning from the editor must be predictable and must not erase persisted document state.
- At narrow widths the sidebar must become a stacked header/filter region without page-level horizontal scrolling.

### Top toolbar

- Anatomy: project name, viewport switcher, edit-scope switcher, preview/fit control, reset.
- Viewport and scope are different controls and must not be visually ambiguous.
- Selected segmented-control items must expose `aria-pressed="true"`.
- Reset must use danger styling only at confirmation time, not dominate routine controls.
- On overflow, low-priority labels may shorten but the current viewport and scope must remain visible.

### Scope Lock indicator

- Must state target count and edit scope in text, for example “2 selected · Mobile only.”
- Must list or reveal affected IDs/names and protected views.
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
- [ ] Left and right panels collapse without losing state.
- [ ] Keyboard focus order follows visual order.
- [ ] All control states are visible.
- [ ] Scope Lock is readable before every edit.
- [ ] Invalid and stale states are understandable.
- [ ] Reduced-motion behavior is verified.
- [ ] No unintended page-level horizontal scrolling.

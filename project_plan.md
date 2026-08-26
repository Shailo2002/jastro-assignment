Your main goal should be **a polished, safe website editor**, not a full SaaS product. The assignment is specifically evaluating product thinking, frontend quality, UX, architecture, state safety, AI-assisted development workflow, and your ability to explain decisions. 

Because you want to finish today, I would deliberately **avoid spending time on authentication, backend APIs, database infrastructure, or a large landing page**. None of those are required, and they can reduce the time available for the parts the reviewers actually score.

## 1. Product I would build

Think of it as a small **Framer/Webflow-style editor with a deterministic AI copilot**, rather than a chatbot.

The flow:

```text
/
│
├── Template Gallery
│      └── One polished business template
│            └── "Use Template"
│
└── /editor/:projectId
       │
       ├── Top Toolbar
       │     ├── Desktop / Tablet / Mobile
       │     ├── Scope: All / Desktop / Tablet / Mobile
       │     ├── Preview
       │     └── Reset
       │
       ├── Left Sidebar
       │     ├── Layers
       │     ├── Elements
       │     └── Recent projects
       │
       ├── Canvas
       │     └── Actual editable website
       │
       └── Right Sidebar
             ├── Design
             ├── AI Edit
             ├── Code
             └── History
```

Visually, I would aim closer to **Framer + Linear + v0**, rather than ChatGPT.

Your idea of creating `/t/:template_id` is reasonable, but I would rename it:

```text
/editor/:projectId
```

The template and project are different concepts.

```text
Template
    ↓ create
Project
    ↓ edit
Project state
```

You only need **one actual template**, because the assignment explicitly asks for one candidate-chosen responsive template. 

You can show one polished template card on the home page instead of pretending there are ten templates.

---

# 2. Do not build login/signup

I would skip Clerk.

The reviewer should be able to:

```text
Open deployed URL
↓
Click "Use Template"
↓
Immediately reach editor
```

Authentication adds:

- evaluation friction
- Clerk loading
- additional dependencies
- configuration/secrets
- more edge cases
- zero assignment points

If you eventually have extra time, a tiny landing page is fine.

But:

> **Editor first. Landing page last.**

---

# 3. Recommended stack

For this assignment I would use:

```text
React
TypeScript
Vite
Tailwind CSS
shadcn/ui + Radix
Zustand
Immer
Zod
Monaco Editor
dnd-kit
Vitest
React Testing Library
Playwright
Framer Motion / motion
localStorage
Vercel
```

### Why Vite instead of Next.js?

Next.js would work, but practically the entire assignment is a client-side application.

You don't need:

- SSR
- server components
- API routes
- server actions
- database
- authentication

Vite makes the architecture easier to understand and defend.

If you are significantly faster with Next.js, use Next.js. The important part is **React + TypeScript architecture**, which is explicitly part of the quality bar. 

---

# 4. Most important architecture decision

This is the heart of the assignment:

> **The DOM is NOT your state.**

Your template should exist as structured JSON.

Something conceptually like:

```text
TemplateDocument
│
├── id
├── version
├── rootElementIds
│
└── elements
      │
      ├── hero-section
      │     ├── id
      │     ├── type
      │     ├── children
      │     ├── base
      │     ├── overrides
      │     └── revisions
      │
      ├── hero-title
      ├── hero-description
      ├── primary-button
      └── ...
```

Each element:

```text
Element
├── stable ID
├── type
├── parent
├── children
├── content
├── styles
├── layout
├── base properties
├── desktop override
├── tablet override
├── mobile override
└── revision number
```

The assignment explicitly requires a **typed JSON-serializable template model with stable IDs** and says the canvas, code editor, and AI demo must update that same state. 

This architecture will probably matter more than almost anything else in your submission.

---

# 5. The central architecture

I would structure the application around one pipeline.

```text
                 ┌────────────────┐
                 │ Canonical State│
                 │ Template JSON  │
                 └───────┬────────┘
                         │
            ┌────────────┼─────────────┐
            │            │             │
            ▼            ▼             ▼
         Canvas      Code Editor    AI Engine
            │            │             │
            └────────────┼─────────────┘
                         │
                         ▼
                  Edit Command
                         │
                         ▼
                    Validation
                         │
                  ┌──────┴───────┐
                  │              │
                Valid          Invalid
                  │              │
                  ▼              └──> Error
                Commit
                  │
           ┌──────┼──────┐
           ▼      ▼      ▼
        State   History Persistence
```

This directly matches the assignment's technical contract that canvas, code and AI edits should use the same validation/commit pipeline. 

Do **not** build separate editing systems.

---

# 6. Use an EditCommand abstraction

Every modification should become something like:

```text
EditCommand

source:
  canvas | code | ai | restore

targetIds:
  ["hero-title"]

viewport:
  all | desktop | tablet | mobile

baseRevision:
  12

changes:
  ...
```

Then:

```text
Canvas edit
      ↓
EditCommand

Code edit
      ↓
EditCommand

AI proposal accepted
      ↓
EditCommand

History restore
      ↓
EditCommand
```

And everything goes through:

```text
validateCommand()
        ↓
applyCommand()
        ↓
createHistoryEntry()
        ↓
persist()
```

This will give you a very strong answer when reviewers ask:

> "How do canvas and code stay synchronized?"

Answer:

> They don't synchronize with each other directly. Both are projections of the same canonical document and both submit edits through the same command pipeline.

That is good architecture.

---

# 7. Responsive model

Do not maintain three separate websites.

Use:

```text
base
+
viewport override
```

For example:

```text
hero-title

base:
    fontSize: 64
    textAlign: left

tablet:
    fontSize: 48

mobile:
    fontSize: 36
    textAlign: center
```

Resolution:

```text
Desktop
base + desktop override

Tablet
base + tablet override

Mobile
base + mobile override
```

Conceptually:

```text
resolvedProps =
    deepMerge(
        element.base,
        element.overrides[currentViewport]
    )
```

This exactly fits the assignment requirement:

> Shared changes flow to all views unless a viewport override exists; single-view edits must leave other views unchanged. 

### Scope UX

Put this somewhere highly visible:

```text
Apply to:
[ All Views ] [ Desktop ] [ Tablet ] [ Mobile ]
```

Don't hide it deep in settings.

---

# 8. Canvas editing

Your canvas should support several obvious manual operations.

### Selection

Single:

```text
click element
```

Multi:

```text
Cmd / Ctrl / Shift + click
```

Selected element:

```text
┌───────────────────────────────┐
│ blue selection border         │
│                               │
│       Hero heading            │
│                               │
└───────────────────────────────┘
  hero-title
```

Multi selection:

```text
2 elements selected
```

with both outlines visible.

This satisfies the assignment without requiring drag-marquee initially.

---

## Canvas editing features

Implement these first:

**Content**

Double-click text → edit inline.

**Style**

Inspector:

```text
Typography
Font size
Weight
Color
Alignment

Spacing
Padding
Margin

Size
Width
Height
```

**Position**

```text
X / Y translation
alignment
```

**Order**

Layers panel using `dnd-kit`.

**Structure**

At minimum:

```text
Duplicate
Delete
Move up
Move down
```

That gives you credible "high-degree manual editing" without building the entirety of Figma.

---

# 9. Layers panel

This can make the editor feel substantially more professional.

Example:

```text
LAYERS

▼ Hero
   ├─ Badge
   ├─ Heading
   ├─ Description
   ├─ CTA Group
   │   ├─ Primary Button
   │   └─ Secondary Button
   └─ Hero Image

▼ Features
   ├─ Feature Card 1
   ├─ Feature Card 2
   └─ Feature Card 3
```

Clicking an item selects it on the canvas.

Clicking the canvas selects it in Layers.

Same state:

```text
selectedElementIds: Set<ElementId>
```

Never infer selection from CSS class or text because the assignment explicitly prohibits that approach. 

---

# 10. Code editor

Do not attempt to dynamically compile arbitrary React/JSX today.

That will dramatically increase complexity.

Use Monaco to edit the selected element's structured representation.

For example reviewer selects a button and Code shows:

```json
{
  "content": "Start Free",
  "style": {
    "background": "#111111",
    "color": "#ffffff",
    "borderRadius": 12
  },
  "layout": {
    "width": 160
  }
}
```

Then:

```text
Edit code
↓
Apply
↓
JSON.parse()
↓
Zod validation
↓
EditCommand
↓
Canonical template
↓
Canvas rerenders
```

Invalid:

```text
JSON parse error

Last valid state preserved.
```

This very cleanly demonstrates the required code/canvas state consistency and invalid-edit protection. 

---

# 11. Deterministic AI architecture

This is important:

## Do NOT call OpenAI/Gemini for the application's AI editor.

The assignment explicitly says:

> **Do not connect a real model. Build a deterministic text-to-edit demo.** 

Your AI coding tools can help you write the assignment, but the editor's "AI" itself should be deterministic.

Architecture:

```text
Instruction
+
Selected element IDs
+
Current values
+
Viewport scope
        ↓
Scenario Engine
        ↓
Typed Proposal[]
        ↓
Validator
        ↓
Proposal Review UI
```

Example paths:

```text
"Make this heading shorter"

"Make this button blue and more rounded"

"Make this card wider"

"Make these cards smaller on mobile"

"Make selected buttons consistent"
```

Failure:

```text
"Create a backend database"

→ Unsupported instruction
```

Same input + same state = same output.

---

# 12. AI must never directly change state

This distinction should be visible in your architecture.

Wrong:

```text
Prompt
↓
AI
↓
Template modified
```

Correct:

```text
Prompt
↓
AI engine
↓
Proposal
↓
Review
↓
Accept / Reject
↓
Commit
```

For multiple elements:

```text
AI Proposal

Hero title
Before → After
[Reject] [Accept]

CTA button
Before → After
[Reject] [Accept]

Hero image
Before → After
[Reject] [Accept]
```

Each one independent.

The assignment explicitly requires partial acceptance and independent outcomes. 

---

# 13. History model

Don't implement traditional whole-page undo snapshots.

That would violate one of the most important product requirements.

History needs to be granular:

```text
History

hero-title
├── rev 1 manual / all
├── rev 2 AI / mobile
├── rev 3 manual / all
└── rev 4 restore / mobile

cta-button
├── rev 1 manual / desktop
└── rev 2 AI / all
```

Reviewer should be able to:

```text
Select hero-title
→ History
→ Choose revision
→ Restore
```

without changing the button.

And restoring should itself create another revision.

This requirement is stated directly in the assignment. 

---

# 14. Persistence

Use localStorage.

You don't need MongoDB/Postgres.

Something like:

```text
projects
├── project-a
│   ├── document
│   ├── history
│   └── metadata
│
└── project-b
```

Use Zustand persistence or your own storage adapter.

Important:

```text
Refresh
↓
same template
same history
```

And provide:

```text
Reset Project
```

with confirmation.

---

# 15. Recommended state separation

Don't dump everything into one gigantic Zustand store.

Conceptually divide it into:

```text
Document State
    template
    elements
    version

Editor UI State
    selection
    viewport
    editScope
    activePanel

Proposal State
    current AI proposals

History State
    revisions

Persistence
    localStorage
```

Canonical document remains the important source of truth.

---

# 16. Folder architecture

I would structure it roughly like this:

```text
src/
│
├── app/
│   ├── routes/
│   └── providers/
│
├── components/
│   ├── editor/
│   │   ├── EditorShell
│   │   ├── EditorToolbar
│   │   ├── Canvas
│   │   ├── ViewportFrame
│   │   ├── SelectionOverlay
│   │   ├── LayersPanel
│   │   ├── InspectorPanel
│   │   ├── CodePanel
│   │   ├── AIEditPanel
│   │   ├── ProposalReview
│   │   └── HistoryPanel
│   │
│   └── ui/
│
├── template/
│   ├── initial-template.ts
│   ├── renderer.tsx
│   └── element-renderers/
│
├── model/
│   ├── template.types.ts
│   ├── element.schema.ts
│   ├── command.types.ts
│   └── proposal.schema.ts
│
├── engine/
│   ├── command-validator.ts
│   ├── command-apply.ts
│   ├── responsive-resolver.ts
│   ├── history-engine.ts
│   ├── ai-demo-engine.ts
│   └── code-parser.ts
│
├── store/
│   ├── editor-store.ts
│   └── persistence.ts
│
├── tests/
│
└── utils/
```

The important boundary is:

```text
UI
↓
commands
↓
engine
↓
canonical state
```

not the exact filenames.

---

# 17. One extra product capability

The assignment requires one product decision of your own. 

I think you can make this particularly strong.

## Add a "Scope Lock" indicator

Whenever the user edits something, show:

```text
┌────────────────────────────────────────────┐
│ Scope Lock                                 │
│                                            │
│ 2 elements • Mobile only                   │
│ Heading, CTA Button                        │
│                                            │
│ AI cannot modify anything outside scope.   │
└────────────────────────────────────────────┘
```

For an AI proposal:

```text
Will modify

✓ hero-title
✓ primary-cta

Protected

Desktop
Tablet
All other elements
```

Why this is a good product decision:

The fundamental user problem in the assignment is **trust**.

A non-technical user should always know:

```text
WHAT will change
WHERE it will change
WHAT will NOT change
```

This directly reinforces the assignment's central theme instead of adding some random feature.

---

# 18. Tests you absolutely need

The assignment explicitly requires focused automated tests for four areas. 

Write these early, not at midnight.

### Test 1 — AI selection authority

```text
Selected:
hero-title

AI returns:
hero-title + footer

Expected:
reject entire footer proposal
```

### Test 2 — Forbidden fields

```text
AI attempts:
element.id = "something-else"

Expected:
validation failure
```

### Test 3 — Viewport isolation

```text
Mobile title fontSize = 30

Desktop remains 64
Tablet remains 48
```

### Test 4 — Canvas ↔ code

```text
Change text on canvas
→ Code editor reflects it

Change valid JSON in code
→ Canvas reflects it
```

### Test 5 — invalid code

```text
Invalid JSON

→ show error
→ canonical state unchanged
```

### Test 6 — independent restore

```text
Heading modified
Button modified

Restore heading

Button remains unchanged
```

These tests strongly map to the rubric.

---

# 19. Your README will matter

Don't treat documentation as something you write five minutes before submission.

The assignment asks you to explain:

- canonical model
- commit boundary
- responsive resolution
- validation
- history
- template source
- dependencies
- deterministic examples
- one architecture trade-off

and has separate required `AI_USAGE.md` and `PRODUCT_NOTES.md`. Page 5 spells out the evidence expected in both documents, and page 6 lists all required submission artifacts. 

You should take screenshots while developing because they'll be useful for README and the walkthrough video.

---

# 20. How to use Codex / Claude Code for this assignment

Your approach of **AI writes → you inspect → you approve** is exactly appropriate because the assignment explicitly evaluates this AI-development process. 

Do not prompt:

```text
Build this complete assignment.
```

Instead use bounded tasks.

For example:

```text
Phase 1
Read assignment and critique my architecture.

Phase 2
Implement only the typed template model.
Do not implement UI.

Phase 3
Implement responsive resolver and tests.

Phase 4
Implement edit-command validation.

Phase 5
Implement canvas renderer.

Phase 6
Implement selection.

...
```

After every substantial AI change:

```text
git diff
↓
read important files
↓
run tests
↓
manually test
↓
accept / modify / reject
↓
commit
```

This also naturally gives you the content required for `AI_USAGE.md`.

---

# 21. Git strategy

Do meaningful commits.

For example:

```text
chore: scaffold editor application

feat: add canonical template document model

feat: implement responsive property resolution

feat: add stable element selection

feat: add canvas editing command pipeline

feat: add code editing with runtime validation

feat: implement deterministic AI proposal engine

feat: add granular revision history

test: cover scope isolation and independent recovery

feat: persist editor state locally

style: polish editor workspace and responsive previews

docs: add product notes and AI usage
```

Much stronger than:

```text
first commit
changes
final
```

The submission requirements specifically mention meaningful commits. 

---

# 22. What I would build today

Given your time constraint, I would prioritize in this order:

```text
1. Canonical JSON model
        ↓
2. Responsive resolver
        ↓
3. Template renderer
        ↓
4. Selection
        ↓
5. Inspector/manual editing
        ↓
6. Command validation + history
        ↓
7. Code editor
        ↓
8. Deterministic AI proposals
        ↓
9. Independent acceptance/recovery
        ↓
10. Persistence
        ↓
11. Tests
        ↓
12. UI polish
        ↓
13. Landing/template page
        ↓
14. README / PRODUCT_NOTES / AI_USAGE
        ↓
15. Vercel deployment
        ↓
16. 3–5 minute walkthrough
```

Do **not** start with the landing page.

---

# 23. Suggested time-box for today

Since it's around midday for you, I would structure the rest of the day approximately like this:

| Time | Goal |
|---|---|
| 12:45–1:30 | Finalize architecture + scaffold |
| 1:30–3:00 | Typed model, store, responsive resolver, persistence |
| 3:00–5:00 | Canvas renderer, selection, inspector |
| 5:00–6:00 | Code editing |
| 6:00–7:30 | AI deterministic engine + proposal UI |
| 7:30–8:30 | History + recovery |
| 8:30–9:30 | Tests |
| 9:30–10:30 | UI polish |
| 10:30–11:15 | Docs |
| 11:15–11:45 | Vercel + final testing |
| after | Optional walkthrough |

If something slips, cut landing-page polish before cutting editor correctness.

---

# 24. What I would specifically avoid

Do not spend today building:

- Clerk authentication
- MongoDB
- API routes
- real LLM integration
- collaboration
- multiple real templates
- complex file storage
- user accounts
- cloud synchronization
- full HTML/JSX compilation
- full Figma-style freeform canvas
- dozens of animation effects

All of them are attractive distractions.

---

# 25. The architecture I recommend

The final system should conceptually look like this:

```text
                         USER
                           │
                ┌──────────┴──────────┐
                │                     │
             Canvas               Code Panel
                │                     │
                └──────────┬──────────┘
                           │
                       EditCommand
                           │
                    Runtime Validator
                           │
                    Canonical Document
                     Typed JSON State
                           │
          ┌────────────────┼────────────────┐
          │                │                │
      Renderer       History Engine    Persistence
          │
    Responsive Resolver
          │
 Desktop / Tablet / Mobile


User Instruction
      │
      ▼
Deterministic AI Engine
      │
      ▼
Typed Proposal
      │
Selection + Scope Validator
      │
      ▼
Proposal Review
 │             │
Reject       Accept
                │
                ▼
            EditCommand
                │
                ▼
        Same commit pipeline
```

This is the architecture I would optimize the entire implementation around.

Your next step should be to send me the **UI references/designs/templates you mentioned**. Then we can decide the exact editor layout, component library choices, colors, canvas behavior, right-panel design, AI proposal UX, animations, and which UI ideas are worth implementing versus cutting.
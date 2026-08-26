# Architecture

## Intent

Build a safe editor in which every surface is a projection of one canonical typed document and every durable change crosses one validation and commit boundary.

## System overview

```text
Canvas controls -----\
Structured code ------> EditCommand -> validate -> apply -> history -> persist
Accepted AI proposal -/                       |
Restore action -------/                       v
                                      Canonical document
                                             |
                                  responsive resolver
                                             |
                                    React template renderer
```

Canvas and code do not synchronize directly. They read the same state and submit the same command shape.

## Canonical document

The exact TypeScript may evolve, but the schema must preserve these concepts:

```ts
type ElementId = string;
type Viewport = 'desktop' | 'tablet' | 'mobile';
type EditScope = 'all' | Viewport;
type EditSource = 'canvas' | 'code' | 'ai' | 'restore';

interface TemplateDocument {
  id: string;
  schemaVersion: number;
  revision: number;
  rootElementIds: ElementId[];
  elements: Record<ElementId, TemplateElement>;
  history: Record<ElementId, ElementRevision[]>;
}

interface TemplateElement {
  id: ElementId;
  type: ElementType;
  parentId: ElementId | null;
  childIds: ElementId[];
  base: EditableProperties;
  overrides: Partial<Record<Viewport, DeepPartial<EditableProperties>>>;
  revision: number;
}
```

The model must remain JSON-serializable. Do not store DOM nodes, React elements, functions, `Set`, `Map`, class instances, or browser events in the durable document.

## Editable property boundary

Use a constrained property schema instead of arbitrary CSS. A practical first boundary is:

- content: text and accessible label where applicable;
- typography: size, weight, line-height, alignment, text color;
- surface: background, border color/width, radius, opacity;
- spacing: padding, margin, gap;
- size: width, height, min/max constraints;
- position/layout: alignment, flex direction, translation within safe limits;
- structure: child order, duplicate, delete, move up/down.

Identity, parent linkage, schema version, history, and revision fields are never user-editable property patches.

## Edit command and commit boundary

```ts
interface EditCommand {
  id: string;
  source: EditSource;
  targetIds: ElementId[];
  scope: EditScope;
  baseRevision: number;
  changes: Record<ElementId, TypedPropertyPatch>;
  createdAt: string;
}
```

Validation order:

1. Parse the command shape at runtime.
2. Reject duplicate, empty, or unknown targets.
3. For AI commands, require every target to be in the current selection snapshot.
4. Reject fields outside the editable-property allowlist.
5. Validate values and structural invariants.
6. Compare `baseRevision` with current document revision.
7. Produce a new document without mutating the old document.
8. Append history only for affected element/scope pairs.
9. Increment revisions.
10. Persist only the valid committed result.

An invalid command returns a typed error and preserves the previous document reference and stored data.

## Responsive resolution

All edits write to `element.base`. View-specific edits write only to `element.overrides[viewport]`.

```text
resolved element = deepMerge(base, overrides[currentViewport] ?? {})
```

Resolution is deterministic and never copies one viewport override into another. A later shared/base edit is visible where an override does not replace that field. Where an override exists, the override wins until removed or changed.

Tests must compare all three resolved views before and after a scoped command.

## Selection authority

Selection lives in non-durable editor UI state as stable IDs:

```ts
interface EditorUiState {
  selectedIds: ElementId[];
  viewport: Viewport;
  editScope: EditScope;
  activePanel: 'design' | 'code' | 'ai' | 'history';
}
```

Do not infer selection from CSS classes, matching text, or DOM position. Multi-selection is an ordered or normalized collection of independent IDs. Keyboard and pointer actions must use the same selection actions.

## Code surface

The first version edits JSON for the selected element or selection, not arbitrary JSX.

```text
canonical selection -> formatted JSON draft
draft edit -> parse -> Zod validate -> diff to TypedPropertyPatch
-> EditCommand(source: code) -> shared commit pipeline
```

The draft is temporary UI state. Invalid JSON or schema errors remain in the draft with a nearby error message; canonical state and history do not change.

## Deterministic AI demo

```text
instruction + selected IDs + current selected values + scope
-> normalized scenario match
-> typed Proposal[]
-> proposal validator
-> independent review cards
```

Each proposal captures `baseRevision`, target ID, before values, after patch, and scope. Generation never commits. Accepting one valid proposal converts only that proposal into an `EditCommand` with source `ai`. Rejection changes proposal status only.

Scenario categories:

- content rewrite;
- style change;
- move/resize/reorder;
- mobile/tablet/desktop adjustment;
- multi-element consistency;
- unsupported instruction failure.

## Granular history and restore

Each committed target receives an entry containing at least:

```ts
interface ElementRevision {
  id: string;
  elementId: ElementId;
  scope: EditScope;
  source: EditSource;
  documentRevision: number;
  before: EditableProperties | DeepPartial<EditableProperties>;
  after: EditableProperties | DeepPartial<EditableProperties>;
  createdAt: string;
}
```

Restore reads a chosen entry and creates a new command for one element and one scope. It never rewinds the whole document and it adds a new history entry with source `restore`.

## Persistence

Use a versioned local-storage adapter. Validate stored data before hydration. If data is corrupt or from an unsupported schema, keep it isolated, show a recoverable message, and offer deliberate reset. Reset requires confirmation and loads a fresh initial document.

## State boundaries

- Document store: canonical document and commit action.
- UI store: selection, preview viewport, edit scope, panels, transient drafts.
- Proposal state: generated proposals and independent statuses.
- Persistence adapter: serialization, schema version, hydration, reset.
- Engine modules: pure validation, apply, resolve, history, scenario matching.

Avoid a single store action that can mutate arbitrary nested state.

## Main trade-off

Structured JSON editing is less flexible than arbitrary JSX/HTML editing, but it makes runtime validation, deterministic responsive resolution, selection-scoped AI patches, and recoverable history feasible within the assignment. This is an intentional safety-over-generality decision.


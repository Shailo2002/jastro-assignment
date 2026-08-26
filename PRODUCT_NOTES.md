# Product Notes

This document is a working submission draft. Replace TODO evidence with observed behavior before submission.

## Primary user, job, and safe completion

The primary user is a non-technical small-business owner adapting an existing responsive website. Their job is to make meaningful content, style, layout, and structural changes without accidentally changing unselected content or another screen size.

A safe completed edit means:

- the user can identify the target elements and viewport scope before committing;
- the requested values changed and protected values did not;
- the change crossed runtime validation;
- the user received visible confirmation or a useful error;
- history can restore each affected element/scope independently;
- refresh preserves the committed result.

## Product definitions

### Template selection

The default entry is a focused catalog containing the one original Aster Labs template. Selecting it opens the existing persisted editor project. Catalog filters and routing are transient UI state; they do not modify the template document or create history.

### Element

An element is a typed template node with a stable ID, type, parent/child relationship, base editable properties, optional viewport overrides, revision, and per-element history. It is not identified by CSS class, visible text, or DOM position.

### Group selection

A group is a set of independently selected stable element IDs. It grants authority to target those elements but does not merge their state or require the same proposal outcome for each element.

### Committed step

A committed step is one validated `EditCommand` applied to canonical state. It records source, target IDs, viewport scope, base revision, typed changes, and per-target history. Generating or rejecting an AI proposal is not a template commit.

### Viewport scope

Scope is `all`, `desktop`, `tablet`, or `mobile`. All writes shared/base values. A single viewport writes only that viewport's override. The UI displays scope separately from the viewport currently being previewed.

### Editable property boundary

Users may change approved content, typography, surface, spacing, size, safe position/layout, and bounded structure/order fields. Stable ID, parent linkage, schema metadata, revisions, and history are forbidden patch fields.

## Shared canvas and code state

Canvas and code are projections of the same canonical document. Canvas controls produce typed commands. The code panel parses validated structured JSON into the same command type. Neither surface writes state directly.

For a viewport, resolved values are a deep merge of base values followed by that viewport's override. A single-viewport edit never writes to base or another override.

## Deterministic AI safety

The demo engine matches reviewer-visible instruction paths using the instruction, current selected IDs and values, and chosen scope. It returns typed proposals rather than modifying the document. Runtime validation rejects unknown or unselected targets, forbidden fields, invalid values, incompatible element types, invalid scopes, and stale base revisions.

The same normalized input and state produces the same proposal. Unsupported requests fail safely and preserve canonical state.

## Review, partial acceptance, and recovery

Each target receives an independent proposal card with element identity, scope, before, after, and validation status. The user can accept or reject each card independently. Acceptance converts only that card into an AI-source command through the normal commit pipeline.

History is stored by element and viewport scope. Restore creates a new restore-source command for one element and one scope. It does not rewind the entire page or remove later history.

## Chosen improvement: Scope Lock

### User problem

Non-technical users may understand the requested edit but still fear collateral changes. Viewport preview alone does not prove which values the next action is authorized to change.

### Decision

Add a persistent Scope Lock indicator that states selected target count/names and active edit scope, plus protected views/elements during AI review.

### Why this improvement

It directly supports the assignment's central trust problem: the user should know what will change, where it will change, and what will remain protected before committing.

### Validation hypothesis

In a moderated five-task usability check, compare completion with and without Scope Lock. Evidence of value would be:

- fewer incorrect-scope commits;
- fewer repeated viewport checks before acceptance;
- higher answer accuracy when asked “what will this action change?”;
- improved confidence rating after the task.

Implementation evidence: TODO after Scope Lock step.

## Cuts and assumptions

- One original responsive template in an extensible catalog rather than pretending multiple working templates exist.
- No authentication, backend, database, or cloud sync.
- No real LLM; the application demo is deterministic.
- Structured JSON code editing rather than arbitrary JSX compilation.
- Additive multi-selection first; drag marquee only if core requirements and tests are complete.
- Bounded layout controls rather than a full freeform design canvas.
- LocalStorage persistence assumes one browser/device.

## Next three improvements

1. Add drag-marquee selection with equivalent keyboard commands and collision/accessibility tests.
2. Add a visual proposal diff overlay on the canvas while keeping pre-accept state isolated.
3. Add import/export of versioned template JSON with migration and corruption recovery.

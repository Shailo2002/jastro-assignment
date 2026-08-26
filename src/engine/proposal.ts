import { z } from 'zod'

import type { TemplateDocument } from '../model/document'
import { elementIdSchema, proposalIdSchema, type ElementId, type ProposalId } from '../model/ids'
import {
  editablePropertyPatchSchema,
  FORBIDDEN_PROPERTY_KEYS,
  type EditableProperties,
  type EditablePropertyPatch,
} from '../model/properties'
import { editScopeSchema, type EditScope } from '../model/viewport'
import { resolveElementProperties } from './responsive-resolver'
import { SCENARIO_IDS, type ScenarioId } from './scenario-catalog'

/**
 * A proposal.
 *
 * A proposal is a suggestion, never a change. It carries everything a reviewer
 * needs to judge it - which element, which scope, what the values are now, what
 * they would become - plus the two facts that make accepting it safe later: the
 * selection it was generated from and the document revision it was generated
 * against.
 *
 * Generating proposals cannot touch the document. Accepting one (Step 11) turns
 * exactly that proposal into an `EditCommand` with `source: 'ai'` and sends it
 * through the same validation and apply pipeline as every other edit; this
 * module is the runtime gate in front of that, not a second way in.
 */

export interface Proposal {
  /** Derived from scenario and element, so a run needs no random source. */
  readonly id: ProposalId
  readonly scenarioId: ScenarioId
  readonly elementId: ElementId
  readonly scope: EditScope
  readonly baseRevision: number
  /** The selection the run was generated from; an AI edit may not leave it. */
  readonly selectionSnapshot: readonly ElementId[]
  /** Current values for the fields the patch touches, for a before/after view. */
  readonly before: EditablePropertyPatch
  /** The patch itself: exactly what would be merged into the scope. */
  readonly after: EditablePropertyPatch
  readonly changedPaths: readonly string[]
  /** One plain sentence describing the change, e.g. for the review card. */
  readonly summary: string
}

/**
 * The runtime shape gate. `editablePropertyPatchSchema` is strict, so `id`,
 * `parentId`, `revision`, and every other protected key is rejected here rather
 * than being carried towards the commit pipeline.
 */
export const proposalSchema = z.strictObject({
  id: proposalIdSchema,
  scenarioId: z.enum(SCENARIO_IDS),
  elementId: elementIdSchema,
  scope: editScopeSchema,
  baseRevision: z.number().int().min(0),
  selectionSnapshot: z.array(elementIdSchema).min(1).max(200),
  before: editablePropertyPatchSchema,
  after: editablePropertyPatchSchema,
  changedPaths: z.array(z.string().max(200)).max(200),
  summary: z.string().min(1).max(500),
})

/* -------------------------------------------------------------------------- */
/* Typed errors                                                                */
/* -------------------------------------------------------------------------- */

export const PROPOSAL_ERROR_CODES = [
  'invalid-proposal',
  'unknown-scenario',
  'unknown-target',
  'target-not-selected',
  'forbidden-field',
  'invalid-value',
  'invalid-scope',
  'empty-change',
  'stale-revision',
] as const
export type ProposalErrorCode = (typeof PROPOSAL_ERROR_CODES)[number]

export interface ProposalError {
  readonly code: ProposalErrorCode
  readonly message: string
  readonly elementId?: ElementId | undefined
  readonly path?: readonly (string | number)[] | undefined
}

export type ProposalValidation =
  | { readonly ok: true; readonly proposal: Proposal }
  | { readonly ok: false; readonly errors: readonly ProposalError[] }

export interface ProposalContext {
  /**
   * The selection as it is RIGHT NOW. Supplying it is what enforces "AI may
   * only touch what the user selected"; omitting it falls back to the snapshot
   * the proposal carries, which is only safe for a freshly generated run.
   */
  readonly selectionSnapshot?: readonly ElementId[] | undefined
}

function error(
  code: ProposalErrorCode,
  message: string,
  extra: { elementId?: ElementId; path?: readonly (string | number)[] } = {},
): ProposalError {
  return { code, message, elementId: extra.elementId, path: extra.path }
}

const FORBIDDEN_KEY_SET: ReadonlySet<string> = new Set(FORBIDDEN_PROPERTY_KEYS)

/** Mirrors the command validator so both surfaces name the same failure. */
function fromSchemaIssues(issues: readonly z.core.$ZodIssue[]): ProposalError[] {
  return issues.map((issue) => {
    const path = issue.path.map((segment) =>
      typeof segment === 'number' ? segment : String(segment),
    )

    if (issue.code === 'unrecognized_keys') {
      const forbidden = issue.keys.filter((key) => FORBIDDEN_KEY_SET.has(key))
      return error(
        'forbidden-field',
        forbidden.length > 0
          ? `Protected field(s) ${forbidden.join(', ')} cannot be proposed by the AI surface.`
          : `Field(s) ${issue.keys.join(', ')} are outside the editable property allowlist.`,
        { path },
      )
    }

    if (issue.code === 'invalid_value' && path[0] === 'scenarioId') {
      return error('unknown-scenario', issue.message, { path })
    }

    const isPatchIssue = path[0] === 'before' || path[0] === 'after'
    return error(isPatchIssue ? 'invalid-value' : 'invalid-proposal', issue.message, { path })
  })
}

function hasAnyProperty(patch: EditablePropertyPatch): boolean {
  return Object.values(patch).some((group) => group !== undefined)
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Validates one untrusted proposal against the current document. Never throws
 * and never touches the document.
 *
 * Order: shape and field allowlist, target existence, selection authority,
 * scope coherence, non-empty change, then revision freshness.
 */
export function validateProposal(
  document: TemplateDocument,
  input: unknown,
  context: ProposalContext = {},
): ProposalValidation {
  const parsed = proposalSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, errors: fromSchemaIssues(parsed.error.issues) }
  }

  const proposal: Proposal = parsed.data
  const errors: ProposalError[] = []

  if (document.elements[proposal.elementId] === undefined) {
    errors.push(
      error('unknown-target', `Element "${proposal.elementId}" does not exist in the document.`, {
        elementId: proposal.elementId,
      }),
    )
  }

  // Selection authority, checked against both the snapshot the proposal carries
  // and the caller's current selection when it supplies one.
  if (!proposal.selectionSnapshot.includes(proposal.elementId)) {
    errors.push(
      error(
        'target-not-selected',
        `Proposal "${proposal.id}" targets "${proposal.elementId}", which is not in its own selection snapshot.`,
        { elementId: proposal.elementId },
      ),
    )
  }

  const currentSelection = context.selectionSnapshot
  if (currentSelection !== undefined && !currentSelection.includes(proposal.elementId)) {
    errors.push(
      error(
        'target-not-selected',
        `AI edits may only target selected elements; "${proposal.elementId}" is not selected.`,
        { elementId: proposal.elementId },
      ),
    )
  }

  if (!hasAnyProperty(proposal.after)) {
    errors.push(
      error('empty-change', `Proposal "${proposal.id}" does not change any property.`, {
        elementId: proposal.elementId,
      }),
    )
  }

  if (proposal.baseRevision !== document.revision) {
    errors.push(
      error(
        'stale-revision',
        `This proposal was generated against revision ${proposal.baseRevision}, but the document is now at revision ${document.revision}.`,
        { elementId: proposal.elementId },
      ),
    )
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }
  return { ok: true, proposal }
}

export interface ProposalBatchValidation {
  readonly valid: readonly Proposal[]
  /** Rejections keyed by the position of the input that produced them. */
  readonly rejected: readonly {
    readonly index: number
    readonly errors: readonly ProposalError[]
  }[]
}

/**
 * Validates each proposal independently: one bad proposal never invalidates a
 * good one, because each is accepted or rejected on its own later anyway.
 */
export function validateProposals(
  document: TemplateDocument,
  inputs: readonly unknown[],
  context: ProposalContext = {},
): ProposalBatchValidation {
  const valid: Proposal[] = []
  const rejected: { index: number; errors: readonly ProposalError[] }[] = []

  inputs.forEach((input, index) => {
    const result = validateProposal(document, input, context)
    if (result.ok) {
      valid.push(result.proposal)
    } else {
      rejected.push({ index, errors: result.errors })
    }
  })

  return { valid, rejected }
}

/** True when the document has moved on since the proposal was generated. */
export function isProposalStale(document: TemplateDocument, proposal: Proposal): boolean {
  return proposal.baseRevision !== document.revision
}

/* -------------------------------------------------------------------------- */
/* Freshness                                                                   */
/* -------------------------------------------------------------------------- */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The current value of exactly the fields a patch names.
 *
 * Shared by generation (to record `before`) and by review (to check that
 * `before` is still true), so the two can never disagree about which fields a
 * proposal is talking about. A field the element does not set is omitted, which
 * is how "unset -> 500" stays representable.
 */
export function projectPatchValues(
  current: EditableProperties,
  patch: EditablePropertyPatch,
): EditablePropertyPatch {
  const project = (currentValue: unknown, patchValue: unknown): unknown => {
    if (!isPlainObject(patchValue) || !isPlainObject(currentValue)) return currentValue

    const projected: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(patchValue)) {
      const value = currentValue[key]
      if (value === undefined) continue

      const result = project(value, child)
      // A group whose fields are all unset is dropped rather than shown as an
      // empty object, so "before: {}" reads as "nothing set yet".
      if (isPlainObject(child) && isPlainObject(result) && Object.keys(result).length === 0) {
        continue
      }
      projected[key] = result
    }
    return projected
  }

  // Safe by construction: the result is a subset of `current`, which the
  // property schema already validated, and every patch field is optional.
  return project(current, patch) as EditablePropertyPatch
}

/** The property set a scope reads: the shared base, or one viewport's resolution. */
export function currentPropertiesForScope(
  document: TemplateDocument,
  elementIdValue: ElementId,
  scope: EditScope,
): EditableProperties | undefined {
  const element = document.elements[elementIdValue]
  if (element === undefined) return undefined
  return scope === 'all' ? element.base : resolveElementProperties(element, scope)
}

/**
 * Whether the values a proposal was computed from are still the current values.
 *
 * This is deliberately finer-grained than `isProposalStale`. A document
 * revision is a whole-document counter, so under it a run of five proposals
 * would poison itself: accepting the first would "stale" the other four, and
 * independent per-element outcomes - a fixed requirement - would be impossible.
 *
 * Freshness instead asks the question that actually matters for one card: for
 * the exact fields this patch names, does the element still hold what the
 * proposal reported as `before`? An unrelated edit elsewhere therefore leaves
 * the proposal acceptable, while any edit to these fields makes it stale, which
 * is a stronger guarantee than a counter: it compares real values.
 *
 * Acceptance still goes through the ordinary command pipeline, which validates
 * the target, the fields, the scope, and the revision of the command it is
 * given.
 */
export function proposalFreshness(
  document: TemplateDocument,
  proposal: Proposal,
): { readonly fresh: boolean; readonly current: EditablePropertyPatch | undefined } {
  const current = currentPropertiesForScope(document, proposal.elementId, proposal.scope)
  if (current === undefined) return { fresh: false, current: undefined }

  const projected = projectPatchValues(current, proposal.after)
  return {
    fresh: JSON.stringify(projected) === JSON.stringify(proposal.before),
    current: projected,
  }
}

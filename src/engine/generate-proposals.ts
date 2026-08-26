import type { TemplateDocument } from '../model/document'
import { proposalId, type ElementId } from '../model/ids'
import { EDIT_SCOPES, type EditScope } from '../model/viewport'
import { diffChangedPaths } from './history'
import {
  currentPropertiesForScope,
  projectPatchValues,
  validateProposal,
  type Proposal,
  type ProposalError,
} from './proposal'
import {
  matchScenario,
  normalizeInstruction,
  scenarioExamples,
  type ProposalSkipReason,
  type ScenarioContext,
  type ScenarioDefinition,
  type ScenarioId,
  type ScenarioTarget,
} from './scenario-catalog'

/**
 * The deterministic proposal engine.
 *
 * Inputs are plain data: the document, the instruction text, the selected IDs,
 * and the chosen scope. There is no store handle, no setter, no clock, and no
 * random source, so the same inputs always produce a deeply equal result and
 * the function provably cannot change anything.
 *
 * The engine answers at two levels:
 *
 * - a RUN failure means nothing could be proposed at all - nothing selected, an
 *   unknown ID, the wrong scope for the scenario, or an instruction the catalog
 *   does not implement;
 * - a run that succeeds returns one proposal per element it can change and one
 *   SKIP per selected element it cannot, so a mixed selection still produces
 *   useful output and says plainly what it left alone.
 *
 * Every proposal it returns has already been through `validateProposal`.
 */

export interface ProposalRequest {
  readonly document: TemplateDocument
  readonly instruction: string
  readonly selectedIds: readonly ElementId[]
  readonly scope: EditScope
}

export interface ProposalSkip {
  readonly elementId: ElementId
  readonly reason: ProposalSkipReason
  readonly message: string
}

export interface ProposalRun {
  readonly scenarioId: ScenarioId
  readonly scenarioTitle: string
  /** The normalised instruction the match was made on, for the audit trail. */
  readonly normalizedInstruction: string
  readonly scope: EditScope
  readonly baseRevision: number
  readonly selectionSnapshot: readonly ElementId[]
  readonly proposals: readonly Proposal[]
  readonly skipped: readonly ProposalSkip[]
}

export const PROPOSAL_RUN_FAILURE_CODES = [
  'empty-instruction',
  'no-selection',
  'unknown-target',
  'unsupported-instruction',
  'scope-not-allowed',
  'not-enough-targets',
  'no-applicable-target',
  'invalid-proposal',
] as const
export type ProposalRunFailureCode = (typeof PROPOSAL_RUN_FAILURE_CODES)[number]

export interface ProposalRunFailure {
  readonly code: ProposalRunFailureCode
  readonly message: string
  readonly elementId?: ElementId | undefined
  /** Phrases the reviewer can type instead, present for an unsupported input. */
  readonly examples?: readonly string[] | undefined
  /** Set when a generated proposal failed its own validation - an engine bug. */
  readonly errors?: readonly ProposalError[] | undefined
  /** Per-element notes, so a rejected run still explains each target. */
  readonly skipped?: readonly ProposalSkip[] | undefined
}

export type ProposalRunResult =
  | { readonly ok: true; readonly run: ProposalRun }
  | { readonly ok: false; readonly failure: ProposalRunFailure }

function failure(
  code: ProposalRunFailureCode,
  message: string,
  extra: Omit<ProposalRunFailure, 'code' | 'message'> = {},
): ProposalRunResult {
  return { ok: false, failure: { code, message, ...extra } }
}

/* -------------------------------------------------------------------------- */
/* Generation                                                                  */
/* -------------------------------------------------------------------------- */

const VALID_SCOPES: ReadonlySet<string> = new Set(EDIT_SCOPES)

/** Preserves selection order while removing repeats, so output order is stable. */
function dedupe(ids: readonly ElementId[]): readonly ElementId[] {
  const seen = new Set<string>()
  const unique: ElementId[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }
  return unique
}

function checkRequirements(
  scenario: ScenarioDefinition,
  scope: EditScope,
  targetCount: number,
): ProposalRunResult | undefined {
  if (scenario.requirements.viewportScope === true && scope === 'all') {
    return failure(
      'scope-not-allowed',
      `"${scenario.title}" changes one view only. Choose Desktop, Tablet, or Mobile scope before running it.`,
    )
  }

  const minTargets = scenario.requirements.minTargets
  if (minTargets !== undefined && targetCount < minTargets) {
    return failure(
      'not-enough-targets',
      `"${scenario.title}" needs at least ${minTargets} selected elements; ${targetCount} ${targetCount === 1 ? 'is' : 'are'} selected.`,
    )
  }

  return undefined
}

export function generateProposals(request: ProposalRequest): ProposalRunResult {
  const { document, scope } = request

  const instruction = normalizeInstruction(request.instruction)
  if (instruction.words.length === 0) {
    return failure('empty-instruction', 'Type an instruction to generate proposals.', {
      examples: scenarioExamples(),
    })
  }

  const selectionSnapshot = dedupe(request.selectedIds)
  if (selectionSnapshot.length === 0) {
    return failure(
      'no-selection',
      'Select at least one element first. An AI edit may only target the current selection.',
    )
  }

  // The scope is typed, but the engine is a runtime boundary: a caller reading
  // scope from storage or a URL can still hand it something invented.
  if (!VALID_SCOPES.has(scope)) {
    return failure('scope-not-allowed', `"${String(scope)}" is not a valid edit scope.`)
  }

  // An unknown ID means the caller's selection and the document disagree; that
  // is a whole-run failure, never a partial result.
  const targets: ScenarioTarget[] = []
  for (const id of selectionSnapshot) {
    const element = document.elements[id]
    const current = currentPropertiesForScope(document, id, scope)
    if (element === undefined || current === undefined) {
      return failure('unknown-target', `Element "${id}" does not exist in the document.`, {
        elementId: id,
      })
    }
    targets.push({ id, type: element.type, current })
  }

  const scenario = matchScenario(instruction)
  if (scenario === undefined) {
    return failure(
      'unsupported-instruction',
      'This demo engine only implements a fixed set of instructions, and none of them matched. It is deterministic on purpose: there is no model behind it.',
      { examples: scenarioExamples() },
    )
  }

  const requirementFailure = checkRequirements(scenario, scope, targets.length)
  if (requirementFailure !== undefined) return requirementFailure

  const context: ScenarioContext = { scope, targetCount: targets.length }
  const proposals: Proposal[] = []
  const skipped: ProposalSkip[] = []
  const invalid: ProposalError[] = []

  for (const target of targets) {
    const outcome = scenario.build(target, context)
    if (!outcome.ok) {
      skipped.push({
        elementId: target.id,
        reason: outcome.reason,
        message: outcome.message,
      })
      continue
    }

    // The same projection review uses later to ask whether these values are
    // still current, so generation and review can never disagree.
    const before = projectPatchValues(target.current, outcome.patch)
    const candidate: Proposal = {
      id: proposalId(`${scenario.id}.${target.id}`),
      scenarioId: scenario.id,
      elementId: target.id,
      scope,
      baseRevision: document.revision,
      selectionSnapshot,
      before,
      after: outcome.patch,
      changedPaths: diffChangedPaths(before, outcome.patch),
      summary: outcome.summary,
    }

    // Nothing leaves this engine unvalidated, including its own output: a
    // scenario that produced an out-of-range value fails here rather than at
    // acceptance time.
    const validated = validateProposal(document, candidate, { selectionSnapshot })
    if (!validated.ok) {
      invalid.push(...validated.errors)
      continue
    }
    proposals.push(validated.proposal)
  }

  if (invalid.length > 0) {
    return failure(
      'invalid-proposal',
      'A generated proposal failed validation and was discarded. The template was not changed.',
      { errors: invalid, skipped },
    )
  }

  if (proposals.length === 0) {
    return failure(
      'no-applicable-target',
      `"${scenario.title}" found nothing to change in the current selection.`,
      { skipped },
    )
  }

  return {
    ok: true,
    run: {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      normalizedInstruction: instruction.text,
      scope,
      baseRevision: document.revision,
      selectionSnapshot,
      proposals,
      skipped,
    },
  }
}

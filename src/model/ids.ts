import { z } from 'zod'

/**
 * Stable identifiers for the canonical document.
 *
 * IDs are branded string subtypes so an arbitrary string cannot be passed where
 * an `ElementId` is expected. Every brand is produced through a validating
 * constructor or a runtime schema, so no unchecked cast is required anywhere.
 */

/** Human-readable, dot-separated, e.g. `hero.heading`, `features.card.1`. */
export const ELEMENT_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/

/** Slug-shaped identifiers for documents and history entries. */
export const SLUG_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/

const MAX_ID_LENGTH = 120

export type ElementId = string & { readonly __brand: 'ElementId' }
export type DocumentId = string & { readonly __brand: 'DocumentId' }
export type RevisionEntryId = string & { readonly __brand: 'RevisionEntryId' }
export type CommandId = string & { readonly __brand: 'CommandId' }
export type ProposalId = string & { readonly __brand: 'ProposalId' }

function matches(pattern: RegExp, value: string): boolean {
  return value.length > 0 && value.length <= MAX_ID_LENGTH && pattern.test(value)
}

export function isElementId(value: unknown): value is ElementId {
  return typeof value === 'string' && matches(ELEMENT_ID_PATTERN, value)
}

export function isDocumentId(value: unknown): value is DocumentId {
  return typeof value === 'string' && matches(SLUG_ID_PATTERN, value)
}

export function isRevisionEntryId(value: unknown): value is RevisionEntryId {
  return typeof value === 'string' && matches(SLUG_ID_PATTERN, value)
}

export function isCommandId(value: unknown): value is CommandId {
  return typeof value === 'string' && matches(SLUG_ID_PATTERN, value)
}

export function isProposalId(value: unknown): value is ProposalId {
  return typeof value === 'string' && matches(SLUG_ID_PATTERN, value)
}

/** Throws on an invalid identifier; use at trusted construction sites only. */
export function elementId(value: string): ElementId {
  if (!isElementId(value)) {
    throw new Error(
      `Invalid element id "${value}". Expected dot-separated lowercase segments such as "hero.cta.primary".`,
    )
  }
  return value
}

export function documentId(value: string): DocumentId {
  if (!isDocumentId(value)) {
    throw new Error(`Invalid document id "${value}".`)
  }
  return value
}

export function revisionEntryId(value: string): RevisionEntryId {
  if (!isRevisionEntryId(value)) {
    throw new Error(`Invalid revision entry id "${value}".`)
  }
  return value
}

export function commandId(value: string): CommandId {
  if (!isCommandId(value)) {
    throw new Error(`Invalid command id "${value}".`)
  }
  return value
}

/**
 * A proposal id is derived from the scenario and the element it targets, so the
 * demo engine needs no random source and the same run always produces the same
 * ids.
 */
export function proposalId(value: string): ProposalId {
  if (!isProposalId(value)) {
    throw new Error(`Invalid proposal id "${value}".`)
  }
  return value
}

export const elementIdSchema = z.custom<ElementId>(isElementId, {
  error:
    'Element ids must be dot-separated lowercase segments, for example "hero.cta.primary".',
})

export const documentIdSchema = z.custom<DocumentId>(isDocumentId, {
  error: 'Document ids must be lowercase slugs.',
})

export const revisionEntryIdSchema = z.custom<RevisionEntryId>(
  isRevisionEntryId,
  { error: 'Revision entry ids must be lowercase slugs.' },
)

export const commandIdSchema = z.custom<CommandId>(isCommandId, {
  error: 'Command ids must be lowercase slugs.',
})

export const proposalIdSchema = z.custom<ProposalId>(isProposalId, {
  error: 'Proposal ids must be lowercase slugs.',
})

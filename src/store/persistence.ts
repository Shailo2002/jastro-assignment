import { z } from 'zod'

import {
  parseTemplateDocument,
  SCHEMA_VERSION,
  type TemplateDocument,
} from '../model/document'

/**
 * Versioned local persistence.
 *
 * Only the canonical document is persisted. Selection, preview viewport, edit
 * scope, open panels, unsaved code drafts, and pending AI proposals are all
 * deliberately NOT persisted: they are transient editor state, and restoring a
 * pending proposal against a document that has moved on would be unsafe.
 *
 * Nothing is ever hydrated without runtime validation, and nothing invalid is
 * ever written. When stored data cannot be trusted it is copied to a quarantine
 * key and left in place, so the user can be offered a deliberate reset rather
 * than having their data silently deleted.
 */

export const STORAGE_KEY = 'scoped-ai-template-editor.project'
export const QUARANTINE_KEY = 'scoped-ai-template-editor.project.quarantine'

/** Envelope version. Bump when the envelope itself changes shape. */
export const STORAGE_VERSION = 1

/** The minimal storage surface used, so tests never depend on a real browser. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const storedProjectSchema = z.strictObject({
  storageVersion: z.number().int().min(1),
  documentSchemaVersion: z.number().int().min(1),
  savedAt: z.iso.datetime(),
  document: z.unknown(),
})

export interface StoredProject {
  readonly storageVersion: number
  readonly documentSchemaVersion: number
  readonly savedAt: string
  readonly document: TemplateDocument
}

/* -------------------------------------------------------------------------- */
/* Load                                                                        */
/* -------------------------------------------------------------------------- */

export type LoadResult =
  | { readonly status: 'empty' }
  | { readonly status: 'loaded'; readonly document: TemplateDocument; readonly savedAt: string }
  | { readonly status: 'corrupt'; readonly message: string; readonly quarantined: boolean }
  | {
      readonly status: 'unsupported-version'
      readonly message: string
      readonly found: number
      readonly expected: number
      readonly quarantined: boolean
    }
  | { readonly status: 'unavailable'; readonly message: string }

/** Copies untrusted data aside so a reset can be offered without losing it. */
function quarantine(storage: StorageLike, raw: string): boolean {
  try {
    storage.setItem(QUARANTINE_KEY, raw)
    return true
  } catch {
    return false
  }
}

export function loadStoredDocument(storage: StorageLike | undefined): LoadResult {
  if (storage === undefined) {
    return { status: 'unavailable', message: 'Browser storage is not available in this context.' }
  }

  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return {
      status: 'unavailable',
      message: 'Browser storage could not be read; this session will not be saved.',
    }
  }

  if (raw === null || raw === '') {
    return { status: 'empty' }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    return {
      status: 'corrupt',
      message: 'Saved project data is not valid JSON.',
      quarantined: quarantine(storage, raw),
    }
  }

  const envelope = storedProjectSchema.safeParse(parsedJson)
  if (!envelope.success) {
    return {
      status: 'corrupt',
      message: 'Saved project data does not match the expected format.',
      quarantined: quarantine(storage, raw),
    }
  }

  if (envelope.data.storageVersion !== STORAGE_VERSION) {
    return {
      status: 'unsupported-version',
      message: `Saved project uses storage version ${envelope.data.storageVersion}; this build expects ${STORAGE_VERSION}.`,
      found: envelope.data.storageVersion,
      expected: STORAGE_VERSION,
      quarantined: quarantine(storage, raw),
    }
  }

  if (envelope.data.documentSchemaVersion !== SCHEMA_VERSION) {
    return {
      status: 'unsupported-version',
      message: `Saved project uses document schema version ${envelope.data.documentSchemaVersion}; this build expects ${SCHEMA_VERSION}.`,
      found: envelope.data.documentSchemaVersion,
      expected: SCHEMA_VERSION,
      quarantined: quarantine(storage, raw),
    }
  }

  const document = parseTemplateDocument(envelope.data.document)
  if (!document.ok) {
    return {
      status: 'corrupt',
      message: `Saved project failed validation: ${document.issues[0]?.message ?? 'unknown problem'}`,
      quarantined: quarantine(storage, raw),
    }
  }

  return { status: 'loaded', document: document.value, savedAt: envelope.data.savedAt }
}

/* -------------------------------------------------------------------------- */
/* Save and clear                                                              */
/* -------------------------------------------------------------------------- */

export type SaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string }

export function saveDocument(
  storage: StorageLike | undefined,
  document: TemplateDocument,
  savedAt: string,
): SaveResult {
  if (storage === undefined) {
    return { ok: false, message: 'Browser storage is not available; changes are not being saved.' }
  }

  // Never write something that could not be hydrated again.
  const verified = parseTemplateDocument(document)
  if (!verified.ok) {
    return {
      ok: false,
      message: `Refusing to save an invalid document: ${verified.issues[0]?.message ?? 'unknown problem'}`,
    }
  }

  const envelope: StoredProject = {
    storageVersion: STORAGE_VERSION,
    documentSchemaVersion: SCHEMA_VERSION,
    savedAt,
    document,
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(envelope))
    return { ok: true }
  } catch {
    return { ok: false, message: 'Changes could not be saved to browser storage.' }
  }
}

/** Removes the project and any quarantined copy. Used only by a deliberate reset. */
export function clearStoredProject(storage: StorageLike | undefined): void {
  if (storage === undefined) return
  try {
    storage.removeItem(STORAGE_KEY)
    storage.removeItem(QUARANTINE_KEY)
  } catch {
    // Storage is unavailable; in-memory reset still proceeds.
  }
}

/** `window.localStorage` when it is usable, otherwise undefined. */
export function getBrowserStorage(): StorageLike | undefined {
  try {
    if (typeof window === 'undefined') return undefined
    const storage = window.localStorage
    // Safari private mode throws on write rather than on access.
    const probe = '__scoped_ai_probe__'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return undefined
  }
}

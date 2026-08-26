import { beforeEach, describe, expect, it } from 'vitest'

import { SCHEMA_VERSION } from '../model/document'
import { commandId, elementId } from '../model/ids'
import { createInitialTemplateDocument } from '../model/initial-template'
import { applyEditCommand } from '../engine/apply-edit-command'
import { createEditCommand } from '../engine/edit-command'
import {
  clearStoredProject,
  loadStoredDocument,
  QUARANTINE_KEY,
  saveDocument,
  STORAGE_KEY,
  STORAGE_VERSION,
  type StorageLike,
} from './persistence'

const SAVED_AT = '2026-08-26T10:00:00.000Z'
const HEADING = elementId('hero.heading')

class MemoryStorage implements StorageLike {
  readonly items = new Map<string, string>()
  failOnWrite = false

  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (this.failOnWrite) throw new Error('quota exceeded')
    this.items.set(key, value)
  }

  removeItem(key: string): void {
    this.items.delete(key)
  }
}

let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
})

function writeEnvelope(overrides: Record<string, unknown> = {}): void {
  storage.items.set(
    STORAGE_KEY,
    JSON.stringify({
      storageVersion: STORAGE_VERSION,
      documentSchemaVersion: SCHEMA_VERSION,
      savedAt: SAVED_AT,
      document: createInitialTemplateDocument(),
      ...overrides,
    }),
  )
}

describe('save', () => {
  it('writes a versioned envelope', () => {
    const result = saveDocument(storage, createInitialTemplateDocument(), SAVED_AT)

    expect(result.ok).toBe(true)
    const raw = storage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed: unknown = JSON.parse(raw ?? '{}')
    expect(parsed).toMatchObject({
      storageVersion: STORAGE_VERSION,
      documentSchemaVersion: SCHEMA_VERSION,
      savedAt: SAVED_AT,
    })
  })

  it('refuses to write a document that would not hydrate', () => {
    const document = createInitialTemplateDocument()
    const broken = { ...document, rootElementIds: [...document.rootElementIds, elementId('ghost.section')] }

    const result = saveDocument(storage, broken, SAVED_AT)

    expect(result.ok).toBe(false)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('reports a storage failure instead of throwing', () => {
    storage.failOnWrite = true
    const result = saveDocument(storage, createInitialTemplateDocument(), SAVED_AT)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/could not be saved/)
  })

  it('reports unavailable storage', () => {
    const result = saveDocument(undefined, createInitialTemplateDocument(), SAVED_AT)
    expect(result.ok).toBe(false)
  })
})

describe('round trip', () => {
  it('preserves the document and its history across a save and load', () => {
    const committed = applyEditCommand(
      createInitialTemplateDocument(),
      createEditCommand({
        id: commandId('cmd.1'),
        source: 'canvas',
        targetIds: [HEADING],
        scope: 'mobile',
        baseRevision: 0,
        changes: { [HEADING]: { typography: { fontSize: 21 } } },
        createdAt: SAVED_AT,
      }),
    )
    expect(committed.ok).toBe(true)
    if (!committed.ok) return

    saveDocument(storage, committed.document, SAVED_AT)
    const loaded = loadStoredDocument(storage)

    expect(loaded.status).toBe('loaded')
    if (loaded.status !== 'loaded') return
    expect(loaded.document).toEqual(committed.document)
    expect(loaded.document.revision).toBe(1)
    expect(loaded.document.history[HEADING]).toHaveLength(1)
    expect(loaded.document.elements[HEADING]?.overrides.mobile?.typography?.fontSize).toBe(21)
  })

  it('reports empty storage as empty, not as an error', () => {
    expect(loadStoredDocument(storage).status).toBe('empty')
    storage.items.set(STORAGE_KEY, '')
    expect(loadStoredDocument(storage).status).toBe('empty')
  })
})

describe('untrusted data', () => {
  it('rejects data that is not JSON and quarantines it', () => {
    storage.items.set(STORAGE_KEY, 'not json at all')
    const loaded = loadStoredDocument(storage)

    expect(loaded.status).toBe('corrupt')
    if (loaded.status !== 'corrupt') return
    expect(loaded.quarantined).toBe(true)
    expect(storage.getItem(QUARANTINE_KEY)).toBe('not json at all')
    // The original is kept so a deliberate reset can clear it.
    expect(storage.getItem(STORAGE_KEY)).toBe('not json at all')
  })

  it('rejects an envelope with the wrong shape', () => {
    storage.items.set(STORAGE_KEY, JSON.stringify({ document: {} }))
    expect(loadStoredDocument(storage).status).toBe('corrupt')
  })

  it('rejects an envelope carrying an invalid document', () => {
    writeEnvelope({ document: { id: 'x', schemaVersion: 1, revision: 0 } })
    const loaded = loadStoredDocument(storage)

    expect(loaded.status).toBe('corrupt')
    if (loaded.status !== 'corrupt') return
    expect(loaded.message).toMatch(/failed validation/)
  })

  it('rejects an unsupported storage version', () => {
    writeEnvelope({ storageVersion: STORAGE_VERSION + 1 })
    const loaded = loadStoredDocument(storage)

    expect(loaded.status).toBe('unsupported-version')
    if (loaded.status !== 'unsupported-version') return
    expect(loaded.found).toBe(STORAGE_VERSION + 1)
    expect(loaded.expected).toBe(STORAGE_VERSION)
    expect(loaded.quarantined).toBe(true)
  })

  it('rejects an unsupported document schema version', () => {
    writeEnvelope({ documentSchemaVersion: SCHEMA_VERSION + 1 })
    expect(loadStoredDocument(storage).status).toBe('unsupported-version')
  })

  it('reports unavailable storage rather than throwing', () => {
    expect(loadStoredDocument(undefined).status).toBe('unavailable')

    const throwing: StorageLike = {
      getItem() {
        throw new Error('blocked')
      },
      setItem() {
        /* not reached */
      },
      removeItem() {
        /* not reached */
      },
    }
    expect(loadStoredDocument(throwing).status).toBe('unavailable')
  })
})

describe('clear', () => {
  it('removes the project and the quarantined copy', () => {
    writeEnvelope()
    storage.items.set(QUARANTINE_KEY, 'old')

    clearStoredProject(storage)

    expect(storage.getItem(STORAGE_KEY)).toBeNull()
    expect(storage.getItem(QUARANTINE_KEY)).toBeNull()
    expect(loadStoredDocument(storage).status).toBe('empty')
  })

  it('is a no-op when storage is unavailable', () => {
    expect(() => {
      clearStoredProject(undefined)
    }).not.toThrow()
  })
})

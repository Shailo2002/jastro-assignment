import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SCHEMA_VERSION } from '../model/document'
import { commandId, elementId, revisionEntryId, type CommandId } from '../model/ids'
import { createInitialTemplateDocument } from '../model/initial-template'
import { listElementHistory } from '../engine/history'
import { createDocumentStore, type DocumentStore, type EditDraft } from './document-store'
import { QUARANTINE_KEY, STORAGE_KEY, STORAGE_VERSION, type StorageLike } from './persistence'

const HEADING = elementId('hero.heading')
const BUTTON = elementId('hero.cta.primary')

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

/** Deterministic clock and id source, so assertions can be exact. */
function deterministicOptions(): { now: () => string; nextCommandId: () => CommandId } {
  let tick = 0
  return {
    now: () => {
      tick += 1
      return `2026-08-26T10:0${tick}:00.000Z`
    },
    nextCommandId: (() => {
      let sequence = 0
      return () => {
        sequence += 1
        return commandId(`cmd.${sequence}`)
      }
    })(),
  }
}

function makeStore(overrides: Partial<Parameters<typeof createDocumentStore>[0]> = {}): DocumentStore {
  return createDocumentStore({ storage, ...deterministicOptions(), ...overrides })
}

const headingEdit: EditDraft = {
  source: 'canvas',
  targetIds: [HEADING],
  scope: 'all',
  changes: { [HEADING]: { typography: { fontSize: 40 } } },
}

describe('hydration', () => {
  it('starts from the fixture when storage is empty', () => {
    const store = makeStore()
    const state = store.getState()

    expect(state.hydration).toBe('initial')
    expect(state.recoveryMessage).toBeUndefined()
    expect(state.document.revision).toBe(0)
    expect(state.document.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('restores a previously saved project (the refresh path)', () => {
    const first = makeStore()
    first.commit(headingEdit)

    const second = makeStore()
    const state = second.getState()

    expect(state.hydration).toBe('restored')
    expect(state.document.revision).toBe(1)
    expect(state.document.elements[HEADING]?.base.typography?.fontSize).toBe(40)
    expect(listElementHistory(state.document, HEADING)).toHaveLength(1)
  })

  it('falls back to the fixture and explains itself when storage is corrupt', () => {
    storage.items.set(STORAGE_KEY, '{{{ not json')
    const state = makeStore().getState()

    expect(state.hydration).toBe('recovered-corrupt')
    expect(state.recoveryMessage).toMatch(/Reset the project/)
    expect(state.document.revision).toBe(0)
    expect(state.document.elements[HEADING]?.base.typography?.fontSize).toBe(56)
    // The untrusted copy is kept aside rather than silently deleted.
    expect(storage.getItem(QUARANTINE_KEY)).toBe('{{{ not json')
  })

  it('falls back to the fixture on an unsupported version', () => {
    storage.items.set(
      STORAGE_KEY,
      JSON.stringify({
        storageVersion: STORAGE_VERSION + 1,
        documentSchemaVersion: SCHEMA_VERSION,
        savedAt: '2026-08-26T10:00:00.000Z',
        document: createInitialTemplateDocument(),
      }),
    )
    const state = makeStore().getState()

    expect(state.hydration).toBe('recovered-unsupported')
    expect(state.recoveryMessage).toMatch(/storage version/)
    expect(state.document.revision).toBe(0)
  })

  it('still works when storage is unavailable', () => {
    const store = createDocumentStore({ storage: null, ...deterministicOptions() })

    expect(store.getState().hydration).toBe('storage-unavailable')
    const result = store.commit(headingEdit)
    expect(result.ok).toBe(true)
    expect(store.getState().document.revision).toBe(1)
  })
})

describe('commit delegates to the shared pipeline', () => {
  it('applies a valid edit and advances the document', () => {
    const store = makeStore()
    const result = store.commit(headingEdit)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.command.source).toBe('canvas')
    expect(result.command.id).toBe('cmd.1')
    expect(store.getState().document.revision).toBe(1)
    expect(store.getState().document.elements[HEADING]?.base.typography?.fontSize).toBe(40)
  })

  it('records history through the same pipeline', () => {
    const store = makeStore()
    store.commit(headingEdit)

    const entry = listElementHistory(store.getState().document, HEADING)[0]
    expect(entry?.source).toBe('canvas')
    expect(entry?.changedPaths).toEqual(['typography.fontSize'])
  })

  it('routes a viewport-scoped edit to that override only', () => {
    const store = makeStore()
    store.commit({ ...headingEdit, scope: 'mobile' })

    const heading = store.getState().document.elements[HEADING]
    expect(heading?.overrides.mobile?.typography?.fontSize).toBe(40)
    expect(heading?.base.typography?.fontSize).toBe(56)
    expect(heading?.overrides.desktop).toBeUndefined()
  })

  it('rejects an invalid edit and keeps the current document unchanged', () => {
    const store = makeStore()
    const before = store.getState()

    const result = store.commit({
      ...headingEdit,
      changes: { [HEADING]: { typography: { fontSize: 900 } } },
    })

    expect(result.ok).toBe(false)
    expect(store.getState()).toBe(before)
    expect(store.getState().document.revision).toBe(0)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('enforces AI selection authority through the store', () => {
    const store = makeStore()

    const rejected = store.commit(
      { ...headingEdit, source: 'ai' },
      { selectionSnapshot: [BUTTON] },
    )
    expect(rejected.ok).toBe(false)

    const accepted = store.commit(
      { ...headingEdit, source: 'ai' },
      { selectionSnapshot: [HEADING] },
    )
    expect(accepted.ok).toBe(true)
  })

  it('detects a stale edit when the caller passes the revision it captured', () => {
    const store = makeStore()
    const captured = store.getState().document.revision

    expect(store.commit(headingEdit).ok).toBe(true)

    const stale = store.commit({ ...headingEdit, baseRevision: captured })
    expect(stale.ok).toBe(false)
    if (stale.ok) return
    expect(stale.errors.map((issue) => issue.code)).toContain('stale-revision')
  })

  it('uses the current revision when the draft does not capture one', () => {
    const store = makeStore()
    expect(store.commit(headingEdit).ok).toBe(true)
    expect(store.commit(headingEdit).ok).toBe(true)
    expect(store.getState().document.revision).toBe(2)
  })

  it('notifies subscribers on commit but not on rejection', () => {
    const store = makeStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.commit(headingEdit)
    expect(listener).toHaveBeenCalledTimes(1)

    store.commit({ ...headingEdit, changes: { [HEADING]: {} } })
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    store.commit(headingEdit)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('keeps the document when persistence fails, and surfaces the problem', () => {
    const store = makeStore()
    storage.failOnWrite = true

    const result = store.commit(headingEdit)

    expect(result.ok).toBe(true)
    expect(store.getState().document.revision).toBe(1)
    expect(store.getState().persistError).toMatch(/could not be saved/)
  })
})

describe('restore through the store', () => {
  it('restores one element and scope and persists the result', () => {
    const store = makeStore()
    store.commit({ ...headingEdit, scope: 'mobile' })
    const revision = listElementHistory(store.getState().document, HEADING, 'mobile')[0]
    if (!revision) throw new Error('expected a history entry')

    const result = store.restore({ elementId: HEADING, revisionId: revision.id })

    expect(result.ok).toBe(true)
    expect(store.getState().document.elements[HEADING]?.overrides.mobile?.typography?.fontSize).toBe(32)
    expect(store.getState().document.revision).toBe(2)
    expect(listElementHistory(store.getState().document, HEADING)).toHaveLength(2)

    // And the restored state survives a refresh.
    expect(makeStore().getState().document.revision).toBe(2)
  })

  it('rejects an unknown revision without changing state', () => {
    const store = makeStore()
    const before = store.getState()

    const result = store.restore({
      elementId: HEADING,
      revisionId: revisionEntryId('rev.ghost'),
    })

    expect(result.ok).toBe(false)
    expect(store.getState()).toBe(before)
  })
})

describe('reset', () => {
  it('clears stored data and returns the initial fixture', () => {
    const store = makeStore()
    store.commit(headingEdit)
    storage.items.set(QUARANTINE_KEY, 'old copy')

    store.reset()
    const state = store.getState()

    expect(state.hydration).toBe('initial')
    expect(state.recoveryMessage).toBeUndefined()
    expect(state.document.revision).toBe(0)
    expect(state.document.history).toEqual({})
    expect(state.document.elements[HEADING]?.base.typography?.fontSize).toBe(56)
    expect(storage.getItem(QUARANTINE_KEY)).toBeNull()
  })

  it('persists the fresh document so a refresh does not resurrect the old one', () => {
    const store = makeStore()
    store.commit(headingEdit)
    store.reset()

    expect(makeStore().getState().document.revision).toBe(0)
  })

  it('notifies subscribers', () => {
    const store = makeStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.reset()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('mutation surface', () => {
  it('exposes only the three durable actions', () => {
    const store = makeStore()
    expect(Object.keys(store).sort()).toEqual([
      'commit',
      'getState',
      'reset',
      'restore',
      'subscribe',
    ])
  })

  it('does not hand out a mutable document', () => {
    const store = makeStore()
    const first = store.getState().document
    store.commit(headingEdit)

    // Committing replaces state rather than mutating what a caller already holds.
    expect(store.getState().document).not.toBe(first)
    expect(first.revision).toBe(0)
    expect(first.elements[HEADING]?.base.typography?.fontSize).toBe(56)
  })
})

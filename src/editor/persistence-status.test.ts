import { describe, expect, it } from 'vitest'

import { createInitialTemplateDocument } from '../model/initial-template'
import type { DocumentStoreState, HydrationStatus } from '../store/document-store'
import { describePersistenceStatus } from './persistence-status'

/**
 * The status wording is the only place the user learns whether their work is
 * being kept, so each hydration outcome is pinned rather than inferred.
 */

function stateOf(
  hydration: HydrationStatus,
  overrides: Partial<DocumentStoreState> = {},
): DocumentStoreState {
  return {
    document: createInitialTemplateDocument(),
    hydration,
    recoveryMessage: undefined,
    persistError: undefined,
    ...overrides,
  }
}

describe('describePersistenceStatus', () => {
  it('reports an untouched fixture as the original template, needing nothing', () => {
    const status = describePersistenceStatus(stateOf('initial'))

    expect(status.label).toBe('Original template')
    expect(status.tone).toBe('idle')
    expect(status.needsAttention).toBe(false)
  })

  it('reports a restored project as saved', () => {
    const status = describePersistenceStatus(stateOf('restored'))

    expect(status.label).toBe('Saved locally')
    expect(status.tone).toBe('saved')
    expect(status.needsAttention).toBe(false)
  })

  it('reports a fresh session that has since been edited as saved', () => {
    const document = { ...createInitialTemplateDocument(), revision: 2 }
    const status = describePersistenceStatus(stateOf('initial', { document }))

    expect(status.label).toBe('Saved locally')
    expect(status.tone).toBe('saved')
  })

  it('escalates corrupt recovery and repeats the store explanation', () => {
    const status = describePersistenceStatus(
      stateOf('recovered-corrupt', { recoveryMessage: 'Saved project data is not valid JSON.' }),
    )

    expect(status.label).toBe('Recovered')
    expect(status.needsAttention).toBe(true)
    expect(status.detail).toBe('Saved project data is not valid JSON.')
  })

  it('escalates an unsupported version', () => {
    const status = describePersistenceStatus(
      stateOf('recovered-unsupported', { recoveryMessage: 'storage version 2' }),
    )

    expect(status.label).toBe('Recovered')
    expect(status.needsAttention).toBe(true)
  })

  it('warns when the browser cannot store anything', () => {
    const status = describePersistenceStatus(stateOf('storage-unavailable'))

    expect(status.label).toBe('Not saved')
    expect(status.needsAttention).toBe(true)
  })

  it('lets a failing write outrank a clean hydration', () => {
    const status = describePersistenceStatus(
      stateOf('restored', { persistError: 'Changes could not be saved to browser storage.' }),
    )

    expect(status.label).toBe('Not saved')
    expect(status.tone).toBe('warning')
    expect(status.detail).toBe('Changes could not be saved to browser storage.')
  })
})

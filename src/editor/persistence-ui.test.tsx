import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { SCHEMA_VERSION } from '../model/document'
import { commandId, elementId } from '../model/ids'
import { createInitialTemplateDocument } from '../model/initial-template'
import { listElementHistory } from '../engine/history'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import {
  QUARANTINE_KEY,
  STORAGE_KEY,
  STORAGE_VERSION,
  type StorageLike,
} from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * Persistence as the user meets it.
 *
 * The store's own reload behaviour is covered in `document-store.test.ts`;
 * what is asserted here is the part a reviewer can see: a reopened editor shows
 * the work AND the history that were saved, the shell says which of those two
 * things happened, and untrusted stored data produces an explained, recoverable
 * editor rather than a blank screen.
 */

const HEADING = elementId('hero.heading')

class MemoryStorage implements StorageLike {
  readonly items = new Map<string, string>()
  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }
  setItem(key: string, value: string): void {
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

/** A store built the way a page load builds one: fresh, over the same storage. */
function newSession(): DocumentStore {
  let sequence = 0
  return createDocumentStore({
    storage,
    now: () => '2026-08-26T10:00:00.000Z',
    nextCommandId: () => {
      sequence += 1
      return commandId(`cmd.${sequence}`)
    },
  })
}

/**
 * A selection target on the canvas overlay, found by stable id.
 *
 * The canvas is the surface that is always on screen, so it is what these
 * tests select through. The Layers tree offers the identical targets from the
 * Layers dock; `layers-panel.test.tsx` holds that equivalence in place.
 */
function canvasTarget(id: string): HTMLElement {
  const node = screen
    .getByRole('listbox', { name: 'Selectable template elements' })
    .querySelector<HTMLElement>(`[data-target-id="${id}"]`)
  if (node === null) throw new Error(`No canvas target for "${id}".`)
  return node
}

async function editHeadingSize(
  user: ReturnType<typeof userEvent.setup>,
  value: string,
): Promise<void> {
  await user.click(canvasTarget('hero.heading'))
  const input = screen.getByLabelText(/Font size/)
  await user.clear(input)
  await user.type(input, `${value}{Enter}`)
}

describe('reopening the editor', () => {
  it('starts from the original template and says so', () => {
    render(<EditorShell store={newSession()} />)

    expect(screen.getByText('Original template')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the committed value and its history after a reload', async () => {
    const user = userEvent.setup()
    const first = newSession()
    const session = render(<EditorShell store={first} />)
    await editHeadingSize(user, '40')
    expect(first.getState().document.elements[HEADING]?.base.typography?.fontSize).toBe(40)
    session.unmount()

    // A second store over the same storage is exactly what a refresh produces.
    const reloaded = newSession()
    render(<EditorShell store={reloaded} />)

    expect(screen.getByText('Saved locally')).toBeInTheDocument()
    expect(reloaded.getState().document.elements[HEADING]?.base.typography?.fontSize).toBe(40)
    await user.click(canvasTarget('hero.heading'))
    expect(screen.getByLabelText(/Font size/)).toHaveValue(40)

    // History survives the reload with it, so recovery is still possible.
    expect(listElementHistory(reloaded.getState().document, HEADING)).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Restore/ })).toBeInTheDocument()
  })
})

describe('untrusted stored data', () => {
  it('renders an explained, recoverable editor instead of crashing', () => {
    storage.items.set(STORAGE_KEY, '{{{ not json')
    render(<EditorShell store={newSession()} />)

    // The template is on screen...
    expect(screen.getByRole('main', { name: 'Template preview' })).toBeInTheDocument()
    expect(canvasTarget('hero.heading')).toBeInTheDocument()
    // ...with a recoverable explanation and the one action that clears it.
    const notice = screen.getByRole('alert')
    expect(notice).toHaveTextContent('Attention')
    expect(notice).toHaveTextContent(/not valid JSON/)
    expect(within(notice).getByRole('button', { name: /Reset project/ })).toBeInTheDocument()
    // The unreadable copy is kept aside rather than silently deleted.
    expect(storage.getItem(QUARANTINE_KEY)).toBe('{{{ not json')
  })

  it('explains an unsupported storage version the same way', () => {
    storage.items.set(
      STORAGE_KEY,
      JSON.stringify({
        storageVersion: STORAGE_VERSION + 1,
        documentSchemaVersion: SCHEMA_VERSION,
        savedAt: '2026-08-26T10:00:00.000Z',
        document: createInitialTemplateDocument(),
      }),
    )
    render(<EditorShell store={newSession()} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/storage version/)
    expect(screen.getByText('Recovered')).toBeInTheDocument()
  })

  it('keeps editing available when the browser cannot store anything', async () => {
    const user = userEvent.setup()
    const offline = createDocumentStore({
      storage: null,
      now: () => '2026-08-26T10:00:00.000Z',
      nextCommandId: () => commandId('cmd.1'),
    })
    render(<EditorShell store={offline} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/not available|unavailable/i)

    await editHeadingSize(user, '40')
    expect(offline.getState().document.elements[HEADING]?.base.typography?.fontSize).toBe(40)
  })
})

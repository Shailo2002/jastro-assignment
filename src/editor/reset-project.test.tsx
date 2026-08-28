import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { listElementHistory } from '../engine/history'
import { commandId, elementId } from '../model/ids'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import { QUARANTINE_KEY, STORAGE_KEY, type StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * Reset, the one destructive action in the editor.
 *
 * Everything asserted here is about deliberateness: opening the confirmation
 * changes nothing, cancelling in any of the three ways changes nothing, and
 * only the confirm button discards work - at which point it must discard ALL of
 * it, including the transient drafts and proposals that were prepared against
 * the document being thrown away.
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
let store: DocumentStore

beforeEach(() => {
  storage = new MemoryStorage()
  let sequence = 0
  store = createDocumentStore({
    storage,
    now: () => '2026-08-26T10:00:00.000Z',
    nextCommandId: () => {
      sequence += 1
      return commandId(`cmd.${sequence}`)
    },
  })
})

type User = ReturnType<typeof userEvent.setup>

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

function codeEditor(): HTMLTextAreaElement {
  const node = screen.getByLabelText('Element properties (JSON)')
  if (!(node instanceof HTMLTextAreaElement)) throw new Error('The code editor is not a textarea.')
  return node
}

function resetButton(): HTMLElement {
  return within(screen.getByRole('banner')).getByRole('button', { name: /Reset project/ })
}

function dialog(): HTMLElement {
  return screen.getByRole('alertdialog', { name: 'Reset project?' })
}

async function openReset(user: User): Promise<void> {
  await user.click(resetButton())
}

async function confirmReset(user: User): Promise<void> {
  await user.click(within(dialog()).getByRole('button', { name: 'Reset project' }))
}

async function editHeadingSize(user: User, value: string): Promise<void> {
  await user.click(canvasTarget('hero.heading'))
  const input = screen.getByLabelText(/Font size/)
  await user.clear(input)
  await user.type(input, `${value}{Enter}`)
}

function headingSize(): number | undefined {
  return store.getState().document.elements[HEADING]?.base.typography?.fontSize
}

describe('opening the confirmation', () => {
  it('changes nothing on its own and offers Cancel first', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await editHeadingSize(user, '40')

    await openReset(user)

    expect(headingSize()).toBe(40)
    expect(store.getState().document.revision).toBe(1)
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull()
    // The safe choice holds focus, so Enter on an open confirmation is a no-op.
    expect(within(dialog()).getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('states exactly what will be lost', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openReset(user)

    expect(dialog()).toHaveTextContent(/revision history is cleared/i)
    expect(dialog()).toHaveTextContent(/code draft and any pending AI proposal/i)
    expect(dialog()).toHaveTextContent(/cannot be undone/i)
  })

  it('keeps Tab inside the confirmation', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openReset(user)

    await user.tab()
    expect(within(dialog()).getByRole('button', { name: 'Reset project' })).toHaveFocus()
    await user.tab()
    expect(within(dialog()).getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })
})

describe('cancelling', () => {
  it('preserves the document, its history, and storage', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await editHeadingSize(user, '40')
    const saved = storage.getItem(STORAGE_KEY)

    await openReset(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(headingSize()).toBe(40)
    expect(listElementHistory(store.getState().document, HEADING)).toHaveLength(1)
    expect(storage.getItem(STORAGE_KEY)).toBe(saved)
    // Focus returns to the control that opened it.
    expect(resetButton()).toHaveFocus()
    // The selection and the inspector are exactly as they were left.
    expect(screen.getByLabelText(/Font size/)).toHaveValue(40)
  })

  it('treats Escape as cancel', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await editHeadingSize(user, '40')
    await openReset(user)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(headingSize()).toBe(40)
    expect(resetButton()).toHaveFocus()
  })

  it('treats a click outside the confirmation as cancel', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await editHeadingSize(user, '40')
    await openReset(user)

    const backdrop = document.querySelector('.dialog-backdrop')
    if (backdrop === null) throw new Error('No backdrop.')
    fireEvent.mouseDown(backdrop)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(headingSize()).toBe(40)
  })
})

describe('confirming', () => {
  it('restores the fixture, clears history, and clears stored data', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await editHeadingSize(user, '40')
    storage.items.set(QUARANTINE_KEY, 'left over')

    await openReset(user)
    await confirmReset(user)

    const document = store.getState().document
    expect(headingSize()).toBe(56)
    expect(document.revision).toBe(0)
    expect(Object.keys(document.history)).toHaveLength(0)
    expect(listElementHistory(document, HEADING)).toHaveLength(0)
    expect(storage.getItem(QUARANTINE_KEY)).toBeNull()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Original template')).toBeInTheDocument()
  })

  it('does not leave the discarded project in storage for the next reload', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await editHeadingSize(user, '40')

    await openReset(user)
    await confirmReset(user)

    // Whatever is stored now must hydrate as the untouched fixture.
    const reloaded = createDocumentStore({ storage, now: () => '2026-08-26T10:00:00.000Z' })
    expect(reloaded.getState().document.revision).toBe(0)
    expect(reloaded.getState().document.elements[HEADING]?.base.typography?.fontSize).toBe(56)
  })

  it('discards an unapplied code draft', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(canvasTarget('hero.heading'))
    await user.click(screen.getByRole('button', { name: 'Code panel' }))

    fireEvent.change(codeEditor(), {
      target: { value: JSON.stringify({ [HEADING]: { typography: { fontSize: 44 } } }, null, 2) },
    })
    expect(codeEditor().value).toContain('44')

    await openReset(user)
    await confirmReset(user)

    // The dock returns to Design, and reopening Code shows the fixture again
    // rather than a draft written against the discarded document.
    expect(screen.getByRole('button', { name: 'Design panel' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(canvasTarget('hero.heading'))
    await user.click(screen.getByRole('button', { name: 'Code panel' }))
    expect(codeEditor().value).toContain('56')
    expect(codeEditor().value).not.toContain('44')
  })

  it('discards a pending AI proposal', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(canvasTarget('hero.heading'))
    await user.click(screen.getByRole('button', { name: 'Make the heading bolder' }))
    await user.click(screen.getByRole('button', { name: 'Run instruction' }))
    expect(document.querySelectorAll('.proposal-card')).toHaveLength(1)

    await openReset(user)
    await confirmReset(user)

    expect(document.querySelectorAll('.proposal-card')).toHaveLength(0)
    expect(store.getState().document.revision).toBe(0)
  })

  it('clears the selection so the fresh document is not edited by accident', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await editHeadingSize(user, '40')

    await openReset(user)
    await confirmReset(user)

    expect(screen.getByRole('status', { name: 'Selection' })).toHaveTextContent(
      'Nothing selected',
    )
    expect(screen.queryByRole('region', { name: 'Scope Lock' })).not.toBeInTheDocument()
  })
})

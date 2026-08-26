import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { listElementHistory } from '../engine/history'
import { commandId, elementId } from '../model/ids'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * The inspector under the keyboard.
 *
 * Inspector rows are remounted on every new revision so an uncontrolled control
 * always shows canonical values. That design has two keyboard consequences, and
 * both are pinned here:
 *
 * - tabbing THROUGH a field must commit nothing. Committing the value the
 *   document already holds would bump the revision, write an empty history
 *   entry, and rebuild the control under the moving focus - which lands focus
 *   back on the field being left, and is a keyboard trap;
 * - committing deliberately with Enter must leave focus on the field, so a
 *   keyboard user is not dropped to the top of the document after every edit.
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

let store: DocumentStore

beforeEach(() => {
  let sequence = 0
  store = createDocumentStore({
    storage: new MemoryStorage(),
    now: () => '2026-08-26T10:00:00.000Z',
    nextCommandId: () => {
      sequence += 1
      return commandId(`cmd.${sequence}`)
    },
  })
})

type User = ReturnType<typeof userEvent.setup>

function layer(id: string): HTMLElement {
  const node = screen
    .getByRole('tree', { name: 'Template layers' })
    .querySelector<HTMLElement>(`[data-target-id="${id}"]`)
  if (node === null) throw new Error(`No layer for "${id}".`)
  return node
}

async function selectHeading(user: User): Promise<void> {
  render(<EditorShell store={store} />)
  await user.click(layer('hero.heading'))
}

describe('moving through fields', () => {
  it('commits nothing when a field is left unchanged', async () => {
    const user = userEvent.setup()
    await selectHeading(user)

    const fontSize = screen.getByLabelText(/Font size/)
    fontSize.focus()
    await user.tab()

    expect(store.getState().document.revision).toBe(0)
    expect(listElementHistory(store.getState().document, HEADING)).toHaveLength(0)
    expect(fontSize).not.toHaveFocus()
  })

  it('commits nothing when the same value is retyped and confirmed', async () => {
    const user = userEvent.setup()
    await selectHeading(user)

    const fontSize = screen.getByLabelText(/Font size/)
    await user.clear(fontSize)
    await user.type(fontSize, '56{Enter}')

    expect(store.getState().document.revision).toBe(0)
    expect(listElementHistory(store.getState().document, HEADING)).toHaveLength(0)
  })

  it('commits nothing when a text field is tabbed through', async () => {
    const user = userEvent.setup()
    await selectHeading(user)

    screen.getByLabelText('Text').focus()
    await user.tab()

    expect(store.getState().document.revision).toBe(0)
  })
})

describe('committing from the keyboard', () => {
  it('applies the change and keeps focus on the field', async () => {
    const user = userEvent.setup()
    await selectHeading(user)

    const fontSize = screen.getByLabelText(/Font size/)
    await user.clear(fontSize)
    await user.type(fontSize, '40{Enter}')

    expect(store.getState().document.elements[HEADING]?.base.typography?.fontSize).toBe(40)
    expect(listElementHistory(store.getState().document, HEADING)).toHaveLength(1)
    // The rebuilt control shows the canonical value AND still has focus.
    expect(screen.getByLabelText(/Font size/)).toHaveValue(40)
    expect(screen.getByLabelText(/Font size/)).toHaveFocus()
  })

  it('does not pull focus back into the inspector after an edit from elsewhere', async () => {
    const user = userEvent.setup()
    await selectHeading(user)

    const fontSize = screen.getByLabelText(/Font size/)
    await user.clear(fontSize)
    await user.type(fontSize, '40{Enter}')
    expect(screen.getByLabelText(/Font size/)).toHaveFocus()

    // A commit from another surface rebuilds the same rows; focus must stay
    // where the user put it rather than jumping to the last edited field.
    const layers = layer('hero.subheading')
    layers.focus()
    act(() => {
      store.commit({
        source: 'code',
        targetIds: [HEADING],
        scope: 'all',
        changes: { [HEADING]: { typography: { fontSize: 48 } } },
      })
    })

    expect(screen.getByLabelText(/Font size/)).toHaveValue(48)
    expect(layers).toHaveFocus()
  })

  it('still rejects an invalid value without touching the document', async () => {
    const user = userEvent.setup()
    await selectHeading(user)

    const fontSize = screen.getByLabelText(/Font size/)
    await user.clear(fontSize)
    await user.type(fontSize, '900{Enter}')

    expect(store.getState().document.revision).toBe(0)
    // The message names the limit rather than saying "something went wrong".
    expect(screen.getByRole('alert')).toHaveTextContent(/200/)
  })
})

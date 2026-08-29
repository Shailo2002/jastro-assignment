import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { commandId, elementId } from '../model/ids'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * Previewing a pending proposal on the canvas.
 *
 * The promise under test is narrow and has two halves: the canvas SHOWS what
 * accepting would do, and the document does NOT. Accepting keeps the rendered
 * result; rejecting takes it back off the canvas; and while a proposal is
 * pending, nothing that reads the committed document - the revision, the
 * history, the stored element - has moved.
 */

const NAV = elementId('nav.section')
const HEADING = elementId('hero.heading')
const GREEN = 'rgb(34, 197, 94)'

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
    now: () => '2026-08-29T10:00:00.000Z',
    nextCommandId: () => {
      sequence += 1
      return commandId(`cmd.${sequence}`)
    },
  })
})

/** The rendered element inside the preview frame, not the overlay target. */
function rendered(id: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(
    `.preview__document [data-element-id="${id}"]`,
  )
  if (node === null) throw new Error(`No rendered element for "${id}".`)
  return node
}

function canvasTarget(id: string): HTMLElement {
  const node = screen
    .getByRole('listbox', { name: 'Selectable template elements' })
    .querySelector<HTMLElement>(`[data-target-id="${id}"]`)
  if (node === null) throw new Error(`No canvas target for "${id}".`)
  return node
}

function card(id: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`.proposal-card[data-target-id="${id}"]`)
  if (node === null) throw new Error(`No proposal card for "${id}".`)
  return node
}

async function runOn(
  user: ReturnType<typeof userEvent.setup>,
  id: string,
  instruction: string,
): Promise<void> {
  await user.click(canvasTarget(id))
  await user.clear(screen.getByLabelText('Instruction'))
  await user.type(screen.getByLabelText('Instruction'), instruction)
  await user.click(screen.getByRole('button', { name: 'Run instruction' }))
}

describe('previewing a pending proposal', () => {
  it('renders the proposed value while leaving the document untouched', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await runOn(user, NAV, 'Change the background to green')

    expect(rendered(NAV)).toHaveStyle({ backgroundColor: GREEN })

    // Nothing committed: the canvas is the only surface that has moved.
    const state = store.getState().document
    expect(state.revision).toBe(0)
    expect(state.elements[NAV]?.base.surface?.background).not.toBe('#22c55e')
    expect(Object.keys(state.history)).toHaveLength(0)
  })

  it('says on the canvas that what is on screen is not committed', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await runOn(user, NAV, 'Change the background to green')

    expect(screen.getByText(/Previewing 1 suggested change/)).toBeInTheDocument()
    // The version chip still names the committed revision, not the preview.
    expect(screen.getByText('Version 1')).toBeInTheDocument()
  })

  it('keeps the rendered result when the proposal is accepted', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await runOn(user, NAV, 'Change the background to green')
    await user.click(within(card(NAV)).getByRole('button', { name: /^Accept/ }))

    expect(rendered(NAV)).toHaveStyle({ backgroundColor: GREEN })
    expect(store.getState().document.elements[NAV]?.base.surface?.background).toBe('#22c55e')
    expect(screen.queryByText(/Previewing \d+ suggested change/)).not.toBeInTheDocument()
  })

  it('takes the change back off the canvas when the proposal is rejected', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    const before = rendered(NAV).style.backgroundColor
    await runOn(user, NAV, 'Change the background to green')
    expect(rendered(NAV)).toHaveStyle({ backgroundColor: GREEN })

    await user.click(within(card(NAV)).getByRole('button', { name: /^Reject/ }))

    expect(rendered(NAV).style.backgroundColor).toBe(before)
    expect(store.getState().document.revision).toBe(0)
    expect(screen.queryByText(/Previewing \d+ suggested change/)).not.toBeInTheDocument()
  })

  it('previews a size change the same way', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    const before = rendered(HEADING).style.fontSize
    await runOn(user, HEADING, 'Increase the font size')

    expect(rendered(HEADING).style.fontSize).not.toBe(before)
    expect(store.getState().document.revision).toBe(0)
  })
})

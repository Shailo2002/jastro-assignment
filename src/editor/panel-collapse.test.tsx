import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { commandId } from '../model/ids'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * Collapsible panels, and the icon controls that own them.
 *
 * A collapse must be free: DESIGN_SYSTEM requires both side panels to collapse,
 * and MANUAL_QA requires them to come back with selection and draft state
 * intact. That is why the panels are hidden rather than unmounted, and it is
 * exactly what these tests hold in place.
 */

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

function layersToggle(): HTMLElement {
  return screen.getByRole('button', { name: 'Layers panel' })
}

function sidebarToggle(): HTMLElement {
  return screen.getByRole('button', { name: 'Editing tools panel' })
}

function layer(id: string): HTMLElement {
  const node = screen
    .getByRole('tree', { name: 'Template layers' })
    .querySelector<HTMLElement>(`[data-target-id="${id}"]`)
  if (node === null) throw new Error(`No layer for "${id}".`)
  return node
}

async function selectHeading(user: User): Promise<void> {
  await user.click(layer('hero.heading'))
}

describe('panel toggles', () => {
  it('names both icon-only controls and gives each a tooltip', () => {
    render(<EditorShell store={store} />)

    for (const toggle of [layersToggle(), sidebarToggle()]) {
      expect(toggle).toHaveAccessibleName()
      expect(toggle).toHaveAttribute('title')
      // The glyph itself must never be announced.
      expect(toggle.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('exposes the panel it controls and whether it is expanded', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    expect(layersToggle()).toHaveAttribute('aria-expanded', 'true')
    expect(layersToggle()).toHaveAttribute('aria-controls', 'layers-panel')
    expect(document.getElementById('layers-panel')).not.toHaveAttribute('hidden')

    await user.click(layersToggle())

    expect(layersToggle()).toHaveAttribute('aria-expanded', 'false')
    expect(layersToggle()).toHaveAttribute('aria-pressed', 'false')
    expect(document.getElementById('layers-panel')).toHaveAttribute('hidden')
    // Hidden means gone from the accessibility tree, not merely invisible.
    expect(screen.queryByRole('tree', { name: 'Template layers' })).not.toBeInTheDocument()
  })

  it('keeps the canvas usable with both panels collapsed', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(layersToggle())
    await user.click(sidebarToggle())

    expect(screen.getByRole('main', { name: 'Template preview' })).toBeInTheDocument()
    expect(
      screen.getByRole('listbox', { name: 'Selectable template elements' }),
    ).toBeInTheDocument()
    // The toolbar keeps the two controls that state what an edit would do.
    expect(screen.getByRole('group', { name: 'Preview viewport' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Edit scope' })).toBeInTheDocument()
  })
})

describe('collapsing loses no state', () => {
  it('restores the selection and the inspector value', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)
    expect(screen.getByLabelText(/Font size/)).toHaveValue(56)

    await user.click(sidebarToggle())
    await user.click(sidebarToggle())

    expect(screen.getByRole('region', { name: 'Scope Lock' })).toHaveTextContent('1 selected')
    expect(screen.getByLabelText(/Font size/)).toHaveValue(56)
  })

  it('restores an unapplied code draft', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)
    await user.click(screen.getByRole('tab', { name: 'Code' }))

    const draft = JSON.stringify({ 'hero.heading': { typography: { fontSize: 44 } } }, null, 2)
    fireEvent.change(screen.getByLabelText('Element properties (JSON)'), {
      target: { value: draft },
    })

    await user.click(sidebarToggle())
    await user.click(sidebarToggle())

    const editor = screen.getByLabelText('Element properties (JSON)')
    expect(editor).toHaveValue(draft)
    // The draft is still only a draft: nothing was committed by the collapse.
    expect(store.getState().document.revision).toBe(0)
  })

  it('restores a pending AI proposal instead of discarding it', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)
    await user.click(screen.getByRole('tab', { name: 'AI' }))
    await user.click(screen.getByRole('button', { name: 'Make the heading bolder' }))
    await user.click(screen.getByRole('button', { name: 'Run instruction' }))
    expect(document.querySelectorAll('.proposal-card')).toHaveLength(1)

    await user.click(sidebarToggle())
    await user.click(sidebarToggle())

    expect(document.querySelectorAll('.proposal-card')).toHaveLength(1)
    expect(
      within(screen.getByRole('tablist', { name: 'Editing panels' })).getByRole('tab', {
        name: 'AI',
      }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('is reachable and operable from the keyboard alone', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    layersToggle().focus()
    await user.keyboard('{Enter}')
    expect(layersToggle()).toHaveAttribute('aria-expanded', 'false')

    await user.keyboard(' ')
    expect(layersToggle()).toHaveAttribute('aria-expanded', 'true')
    expect(layersToggle()).toHaveFocus()
  })
})

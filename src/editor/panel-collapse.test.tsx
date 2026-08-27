import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { commandId } from '../model/ids'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * The right-hand docks, and the toolbar controls that own them.
 *
 * Design and Layers are opened on demand rather than holding a permanent
 * column, so closing one must be free: DESIGN_SYSTEM requires both panels to
 * collapse, and MANUAL_QA requires them to come back with selection and draft
 * state intact. That is why a dock is hidden rather than unmounted, and it is
 * exactly what these tests hold in place - along with the keyboard contract a
 * disclosure owes: Escape closes, and focus lands back on the toggle.
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

function designToggle(): HTMLElement {
  return screen.getByRole('button', { name: 'Design' })
}

function layersToggle(): HTMLElement {
  return screen.getByRole('button', { name: 'Layers' })
}

/** A selection target on the canvas overlay, found by stable id. */
function canvasTarget(id: string): HTMLElement {
  const node = screen
    .getByRole('listbox', { name: 'Selectable template elements' })
    .querySelector<HTMLElement>(`[data-target-id="${id}"]`)
  if (node === null) throw new Error(`No canvas target for "${id}".`)
  return node
}

async function selectHeading(user: User): Promise<void> {
  await user.click(canvasTarget('hero.heading'))
}

describe('dock toggles', () => {
  it('names both controls and gives each a tooltip', () => {
    render(<EditorShell store={store} />)

    for (const toggle of [designToggle(), layersToggle()]) {
      expect(toggle).toHaveAccessibleName()
      expect(toggle).toHaveAttribute('title')
      // The glyph itself must never be announced.
      expect(toggle.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('exposes the panel it controls and whether it is expanded', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    expect(layersToggle()).toHaveAttribute('aria-expanded', 'false')
    expect(layersToggle()).toHaveAttribute('aria-controls', 'layers-panel')
    expect(document.getElementById('layers-panel')).toHaveAttribute('hidden')
    // Hidden means gone from the accessibility tree, not merely invisible.
    expect(screen.queryByRole('tree', { name: 'Template layers' })).not.toBeInTheDocument()

    await user.click(layersToggle())

    expect(layersToggle()).toHaveAttribute('aria-expanded', 'true')
    expect(layersToggle()).toHaveAttribute('aria-pressed', 'true')
    expect(document.getElementById('layers-panel')).not.toHaveAttribute('hidden')
    expect(screen.getByRole('tree', { name: 'Template layers' })).toBeInTheDocument()
  })

  it('starts with a focused canvas and opens Design for a canvas selection', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    expect(designToggle()).toHaveAttribute('aria-expanded', 'false')
    expect(designToggle()).toHaveAttribute('aria-controls', 'design-panel')

    await selectHeading(user)

    expect(designToggle()).toHaveAttribute('aria-expanded', 'true')

    await user.click(designToggle())

    expect(designToggle()).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('design-panel')).toHaveAttribute('hidden')
  })

  it('keeps the canvas usable with both docks closed', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(designToggle())

    expect(screen.getByRole('main', { name: 'Template preview' })).toBeInTheDocument()
    expect(
      screen.getByRole('listbox', { name: 'Selectable template elements' }),
    ).toBeInTheDocument()
    // The chrome keeps the two controls that state what an edit would do.
    expect(screen.getByRole('group', { name: 'Preview viewport' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Edit scope' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Scope Lock' })).toBeInTheDocument()
  })
})

describe('closing a dock loses no state', () => {
  it('restores the selection and the inspector value', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)
    expect(screen.getByLabelText(/Font size/)).toHaveValue(56)

    await user.click(designToggle())
    await user.click(designToggle())

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

    await user.click(designToggle())
    await user.click(designToggle())

    const editor = screen.getByLabelText('Element properties (JSON)')
    expect(editor).toHaveValue(draft)
    // The draft is still only a draft: nothing was committed by the collapse.
    expect(store.getState().document.revision).toBe(0)
  })

  it('keeps a pending AI proposal, which lives in the rail either way', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)
    await user.click(screen.getByRole('button', { name: 'Make the heading bolder' }))
    await user.click(screen.getByRole('button', { name: 'Run instruction' }))
    expect(document.querySelectorAll('.proposal-card')).toHaveLength(1)

    await user.click(layersToggle())
    await user.click(designToggle())

    expect(document.querySelectorAll('.proposal-card')).toHaveLength(1)
    expect(
      within(screen.getByRole('complementary', { name: 'History and AI' })).getByLabelText(
        'Instruction',
      ),
    ).toBeInTheDocument()
  })

  it('keeps the layers tree focus position across a close and reopen', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(layersToggle())

    const tree = screen.getByRole('tree', { name: 'Template layers' })
    const tabbable = (): string | null =>
      within(tree)
        .getAllByRole('treeitem')
        .find((item) => item.getAttribute('tabindex') === '0')
        ?.getAttribute('data-target-id') ?? null

    const rows = within(tree).getAllByRole('treeitem')
    rows[0]?.focus()
    await user.keyboard('{ArrowDown}')
    const moved = tabbable()

    await user.click(layersToggle())
    await user.click(layersToggle())

    expect(tabbable()).toBe(moved)
  })
})

describe('the keyboard contract of a dock', () => {
  it('toggles from the keyboard and keeps focus on the toggle', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    layersToggle().focus()
    await user.keyboard('{Enter}')
    expect(layersToggle()).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard(' ')
    expect(layersToggle()).toHaveAttribute('aria-expanded', 'false')
    expect(layersToggle()).toHaveFocus()
  })

  it('closes on Escape and returns focus to the toggle', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)

    screen.getByLabelText(/Font size/).focus()
    await user.keyboard('{Escape}')

    expect(designToggle()).toHaveAttribute('aria-expanded', 'false')
    expect(designToggle()).toHaveFocus()
  })

  it('closes from its own close button and returns focus to the toggle', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)

    await user.click(screen.getByRole('button', { name: 'Close Design panel' }))

    expect(designToggle()).toHaveAttribute('aria-expanded', 'false')
    expect(designToggle()).toHaveFocus()
  })

  it('lets the layers tree answer Escape before the dock does', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(layersToggle())

    const heading = screen
      .getByRole('tree', { name: 'Template layers' })
      .querySelector<HTMLElement>('[data-target-id="hero.heading"]')
    if (heading === null) throw new Error('No layer for "hero.heading".')

    await user.click(heading)
    expect(screen.getByRole('region', { name: 'Scope Lock' })).toHaveTextContent('1 selected')

    // Escape in the tree clears the selection; the dock stays open, because a
    // clearing Escape has already been handled.
    heading.focus()
    await user.keyboard('{Escape}')

    expect(screen.getByRole('region', { name: 'Scope Lock' })).toHaveTextContent(
      /Nothing selected/i,
    )
    expect(layersToggle()).toHaveAttribute('aria-expanded', 'true')
  })
})

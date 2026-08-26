import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { commandId } from '../model/ids'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * Layers tree behaviour. The tree and the canvas must agree on the selection at
 * all times, because both drive the same ID-keyed selection action.
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

function layers(): HTMLElement {
  return screen.getByRole('tree', { name: 'Template layers' })
}

function canvas(): HTMLElement {
  return screen.getByRole('listbox', { name: 'Selectable template elements' })
}

function layer(id: string): HTMLElement {
  const node = layers().querySelector<HTMLElement>(`[data-target-id="${id}"]`)
  if (node === null) throw new Error(`No layer for "${id}".`)
  return node
}

function selectedIds(surface: HTMLElement): string[] {
  return [...surface.querySelectorAll<HTMLElement>('[aria-selected="true"]')].map(
    (node) => node.getAttribute('data-target-id') ?? '',
  )
}

describe('layers tree semantics', () => {
  it('uses tree items with a depth level and a readable name', () => {
    render(<EditorShell store={store} />)

    const items = within(layers()).getAllByRole('treeitem')
    expect(items.length).toBe(Object.keys(store.getState().document.elements).length)

    expect(layer('hero.section')).toHaveAttribute('aria-level', '1')
    expect(layer('hero.heading')).toHaveAttribute('aria-level', '2')
    expect(layer('hero.heading')).toHaveAccessibleName(/^Heading: /)
  })

  it('keeps the stable id available on every row', () => {
    render(<EditorShell store={store} />)
    expect(layer('features.grid')).toHaveAttribute('title', 'features.grid')
  })

  it('starts with nothing selected', () => {
    render(<EditorShell store={store} />)
    expect(selectedIds(layers())).toEqual([])
  })
})

describe('layers selection', () => {
  it('selects one stable id on click and mirrors it on the canvas', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(layer('features.heading'))

    expect(selectedIds(layers())).toEqual(['features.heading'])
    expect(selectedIds(canvas())).toEqual(['features.heading'])
  })

  it('adds and removes with a modified click', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(layer('features.heading'))
    await user.keyboard('{Meta>}')
    await user.click(layer('footer.note'))
    expect(selectedIds(layers())).toEqual(['features.heading', 'footer.note'])

    await user.click(layer('features.heading'))
    await user.keyboard('{/Meta}')
    expect(selectedIds(layers())).toEqual(['footer.note'])
  })

  it('selects with Enter and Space from the keyboard', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    act(() => {
      layer('hero.eyebrow').focus()
    })
    await user.keyboard('{Enter}')
    expect(selectedIds(layers())).toEqual(['hero.eyebrow'])

    act(() => {
      layer('footer.note').focus()
    })
    await user.keyboard(' ')
    expect(selectedIds(layers())).toEqual(['footer.note'])
  })

  it('adds to the selection with a modified keyboard activation', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    act(() => {
      layer('hero.eyebrow').focus()
    })
    await user.keyboard('{Enter}')
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(selectedIds(layers())).toEqual([])

    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(selectedIds(layers())).toEqual(['hero.eyebrow'])
  })

  it('clears the selection with Escape', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(layer('features.heading'))
    await user.keyboard('{Escape}')

    expect(selectedIds(layers())).toEqual([])
    expect(selectedIds(canvas())).toEqual([])
  })
})

describe('layers keyboard navigation', () => {
  it('moves focus with the arrow keys without changing the selection', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    act(() => {
      layer('hero.section').focus()
    })
    await user.keyboard('{ArrowDown}')

    expect(document.activeElement).toBe(layer('hero.eyebrow'))
    expect(selectedIds(layers())).toEqual([])

    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(layer('hero.section'))
  })

  it('jumps to the first and last row with Home and End', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    const items = within(layers()).getAllByRole('treeitem')
    act(() => {
      items[0]?.focus()
    })
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(items.at(-1))

    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(items[0])
  })

  it('exposes exactly one tabbable row so Tab can leave the tree', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    const tabbable = (): HTMLElement[] =>
      within(layers())
        .getAllByRole('treeitem')
        .filter((item) => item.getAttribute('tabindex') === '0')

    expect(tabbable()).toHaveLength(1)

    act(() => {
      layer('cta.heading').focus()
    })
    await user.keyboard('{ArrowDown}')
    expect(tabbable()).toHaveLength(1)
  })
})

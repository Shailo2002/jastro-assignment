import { act, fireEvent, render, screen, within } from '@testing-library/react'
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

/**
 * Renders the shell with the Layers panel docked.
 *
 * The dock starts closed - the canvas already offers the same targets - so
 * every test here opens it first, the same way a reviewer would.
 */
function renderWithLayers(): void {
  render(<EditorShell store={store} />)
  fireEvent.click(screen.getByRole('button', { name: 'Layers panel' }))
}

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

function twisty(id: string): HTMLElement {
  const node = layer(id).querySelector<HTMLElement>('[data-twisty]')
  if (node === null) throw new Error(`No twisty for "${id}".`)
  return node
}

function visibleIds(): string[] {
  return [...layers().querySelectorAll<HTMLElement>('[data-target-id]')].map(
    (node) => node.getAttribute('data-target-id') ?? '',
  )
}

function isVisible(id: string): boolean {
  return layers().querySelector(`[data-target-id="${id}"]`) !== null
}

function selectedIds(surface: HTMLElement): string[] {
  return [...surface.querySelectorAll<HTMLElement>('[aria-selected="true"]')].map(
    (node) => node.getAttribute('data-target-id') ?? '',
  )
}

describe('layers tree semantics', () => {
  it('uses tree items with a depth level and a readable name', () => {
    renderWithLayers()

    const items = within(layers()).getAllByRole('treeitem')
    expect(items.length).toBe(Object.keys(store.getState().document.elements).length)

    expect(layer('hero.section')).toHaveAttribute('aria-level', '1')
    expect(layer('hero.heading')).toHaveAttribute('aria-level', '2')
    expect(layer('hero.heading')).toHaveAccessibleName(/^Heading: /)
  })

  it('keeps the stable id available on every row', () => {
    renderWithLayers()
    expect(layer('features.grid')).toHaveAttribute('title', 'features.grid')
  })

  it('starts with nothing selected', () => {
    renderWithLayers()
    expect(selectedIds(layers())).toEqual([])
  })
})

describe('layers selection', () => {
  it('selects one stable id on click and mirrors it on the canvas', async () => {
    const user = userEvent.setup()
    renderWithLayers()

    await user.click(layer('features.heading'))

    expect(selectedIds(layers())).toEqual(['features.heading'])
    expect(selectedIds(canvas())).toEqual(['features.heading'])
  })

  it('adds and removes with a modified click', async () => {
    const user = userEvent.setup()
    renderWithLayers()

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
    renderWithLayers()

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
    renderWithLayers()

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
    renderWithLayers()

    await user.click(layer('features.heading'))
    await user.keyboard('{Escape}')

    expect(selectedIds(layers())).toEqual([])
    expect(selectedIds(canvas())).toEqual([])
  })
})

describe('layers keyboard navigation', () => {
  it('moves focus with the arrow keys without changing the selection', async () => {
    const user = userEvent.setup()
    renderWithLayers()

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
    renderWithLayers()

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
    renderWithLayers()

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


describe('layers tree folding', () => {
  it('marks a branch as expanded and leaves a leaf without the state', () => {
    renderWithLayers()

    expect(layer('hero.section')).toHaveAttribute('aria-expanded', 'true')
    expect(layer('hero.actions')).toHaveAttribute('aria-expanded', 'true')
    expect(layer('hero.heading')).not.toHaveAttribute('aria-expanded')
  })

  it('states each row position within its own sibling group', () => {
    renderWithLayers()

    expect(layer('hero.eyebrow')).toHaveAttribute('aria-posinset', '1')
    expect(layer('hero.eyebrow')).toHaveAttribute('aria-setsize', '5')
    expect(layer('hero.image')).toHaveAttribute('aria-posinset', '5')
    expect(layer('hero.cta.primary')).toHaveAttribute('aria-setsize', '2')
  })

  it('hides descendants when a branch is folded from the twisty', async () => {
    const user = userEvent.setup()
    renderWithLayers()

    expect(isVisible('hero.heading')).toBe(true)
    await user.click(twisty('hero.section'))

    expect(layer('hero.section')).toHaveAttribute('aria-expanded', 'false')
    expect(isVisible('hero.heading')).toBe(false)
    expect(isVisible('hero.cta.primary')).toBe(false)
    // Siblings of the folded branch are untouched.
    expect(isVisible('features.section')).toBe(true)
  })

  it('leaves the canvas offering every element while a branch is folded', async () => {
    const user = userEvent.setup()
    renderWithLayers()

    const before = canvas().querySelectorAll('[data-target-id]').length
    await user.click(twisty('hero.section'))

    expect(canvas().querySelectorAll('[data-target-id]')).toHaveLength(before)
    expect(canvas().querySelector('[data-target-id="hero.heading"]')).not.toBeNull()
  })

  it('does not change the selection when the twisty is used', async () => {
    const user = userEvent.setup()
    renderWithLayers()

    await user.click(layer('features.heading'))
    await user.click(twisty('hero.section'))

    expect(selectedIds(layers())).toEqual(['features.heading'])
  })

  it('restores the inner fold when an outer branch is reopened', async () => {
    const user = userEvent.setup()
    renderWithLayers()

    await user.click(twisty('hero.actions'))
    await user.click(twisty('hero.section'))
    await user.click(twisty('hero.section'))

    expect(isVisible('hero.actions')).toBe(true)
    expect(isVisible('hero.cta.primary')).toBe(false)
  })

  it('reopens the branches above an element selected on the canvas', async () => {
    const user = userEvent.setup()
    renderWithLayers()

    await user.click(twisty('hero.section'))
    expect(isVisible('hero.cta.primary')).toBe(false)

    const target = canvas().querySelector<HTMLElement>('[data-target-id="hero.cta.primary"]')
    if (target === null) throw new Error('No canvas target for "hero.cta.primary".')
    await user.click(target)

    expect(isVisible('hero.cta.primary')).toBe(true)
    expect(layer('hero.section')).toHaveAttribute('aria-expanded', 'true')
  })

  it('folds and unfolds every branch from one control', async () => {
    const user = userEvent.setup()
    renderWithLayers()

    await user.click(screen.getByRole('button', { name: 'Collapse all' }))
    expect(visibleIds()).toEqual([
      'nav.section',
      'hero.section',
      'proof.section',
      'features.section',
      'metrics.section',
      'quote.section',
      'cta.section',
      'footer.section',
    ])

    await user.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(visibleIds().length).toBe(Object.keys(store.getState().document.elements).length)
  })
})

describe('layers tree keyboard folding', () => {
  it('closes a branch with ArrowLeft and opens it again with ArrowRight', async () => {
    const user = userEvent.setup()
    renderWithLayers()

    act(() => {
      layer('hero.section').focus()
    })
    await user.keyboard('{ArrowLeft}')
    expect(layer('hero.section')).toHaveAttribute('aria-expanded', 'false')
    expect(isVisible('hero.heading')).toBe(false)

    await user.keyboard('{ArrowRight}')
    expect(layer('hero.section')).toHaveAttribute('aria-expanded', 'true')
    expect(isVisible('hero.heading')).toBe(true)
  })

  it('steps into an open branch with ArrowRight and out to the parent with ArrowLeft', async () => {
    const user = userEvent.setup()
    renderWithLayers()

    act(() => {
      layer('hero.section').focus()
    })
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(layer('hero.eyebrow'))

    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(layer('hero.section'))
  })

  it('folds without selecting anything', async () => {
    const user = userEvent.setup()
    renderWithLayers()

    act(() => {
      layer('hero.section').focus()
    })
    await user.keyboard('{ArrowLeft}')

    expect(selectedIds(layers())).toEqual([])
    expect(selectedIds(canvas())).toEqual([])
  })

  it('keeps a tabbable row after every branch is folded', async () => {
    const user = userEvent.setup()
    renderWithLayers()

    act(() => {
      layer('hero.cta.primary').focus()
    })
    await user.click(screen.getByRole('button', { name: 'Collapse all' }))

    const tabbable = within(layers())
      .getAllByRole('treeitem')
      .filter((item) => item.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
  })
})

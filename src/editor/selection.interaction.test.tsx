import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { commandId } from '../model/ids'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * Canvas selection behaviour.
 *
 * Every assertion here is about stable element IDs, never about text matches,
 * CSS classes, or DOM position: a target is found by its `data-element-id`.
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

function canvas(): HTMLElement {
  return screen.getByRole('listbox', { name: 'Selectable template elements' })
}

/** The layers tree, docking its panel first if another one is showing. */
async function layers(user: User): Promise<HTMLElement> {
  const button = screen.getByRole('button', { name: 'Layers panel' })
  if (button.getAttribute('aria-pressed') !== 'true') await user.click(button)
  return screen.getByRole('tree', { name: 'Template layers' })
}

/** Finds a selection target by stable id inside a given surface. */
function target(surface: HTMLElement, id: string): HTMLElement {
  const node = surface.querySelector<HTMLElement>(`[data-target-id="${id}"]`)
  if (node === null) throw new Error(`No selection target for "${id}".`)
  return node
}

function selectedIds(surface: HTMLElement): string[] {
  return [...surface.querySelectorAll<HTMLElement>('[aria-selected="true"]')].map(
    (node) => node.getAttribute('data-target-id') ?? '',
  )
}

describe('canvas selection', () => {
  it('offers one selectable target per rendered element', () => {
    render(<EditorShell store={store} />)

    const options = within(canvas()).getAllByRole('option')
    expect(options.length).toBe(Object.keys(store.getState().document.elements).length)
    expect(target(canvas(), 'hero.heading')).toHaveAccessibleName(
      /^Heading: /,
    )
  })

  it('selects exactly one stable id on a plain click', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(target(canvas(), 'hero.heading'))

    expect(selectedIds(canvas())).toEqual(['hero.heading'])
  })

  it('replaces the selection when another element is clicked plainly', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(target(canvas(), 'hero.heading'))
    await user.click(target(canvas(), 'cta.button'))

    expect(selectedIds(canvas())).toEqual(['cta.button'])
  })

  it('adds a second element on a modified click without touching unrelated ids', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(target(canvas(), 'hero.heading'))
    await user.keyboard('{Shift>}')
    await user.click(target(canvas(), 'cta.button'))
    await user.keyboard('{/Shift}')

    expect(selectedIds(canvas())).toEqual(['hero.heading', 'cta.button'])
    expect(target(canvas(), 'hero.eyebrow')).toHaveAttribute('aria-selected', 'false')
  })

  it('removes one selected element on a second modified click', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(target(canvas(), 'hero.heading'))
    await user.keyboard('{Control>}')
    await user.click(target(canvas(), 'cta.button'))
    await user.click(target(canvas(), 'hero.heading'))
    await user.keyboard('{/Control}')

    expect(selectedIds(canvas())).toEqual(['cta.button'])
  })

  it('mirrors the canvas selection in the layers tree', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(target(canvas(), 'hero.heading'))
    await user.keyboard('{Shift>}')
    await user.click(target(canvas(), 'cta.button'))
    await user.keyboard('{/Shift}')

    expect(selectedIds(await layers(user))).toEqual(selectedIds(canvas()))
  })

  it('reports the selected count and readable names as text', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    const summary = (): HTMLElement => screen.getByRole('status', { name: 'Selection' })
    expect(summary()).toHaveTextContent('Nothing selected')

    await user.click(target(canvas(), 'hero.heading'))
    await user.keyboard('{Shift>}')
    await user.click(target(canvas(), 'cta.button'))
    await user.keyboard('{/Shift}')

    const status = summary()
    expect(status).toHaveTextContent('2 selected')
    expect(status).toHaveTextContent(/Heading: /)
    expect(status).toHaveTextContent(/Button: /)
  })

  it('marks the most recently added target as primary', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(target(canvas(), 'hero.heading'))
    await user.keyboard('{Shift>}')
    await user.click(target(canvas(), 'cta.button'))
    await user.keyboard('{/Shift}')

    expect(target(canvas(), 'cta.button')).toHaveAttribute('data-primary', 'true')
    expect(target(canvas(), 'hero.heading')).toHaveAttribute('data-primary', 'false')
  })
})

describe('keyboard selection', () => {
  it('produces the same selected id state as a click, and keeps focus visible', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    const first = within(canvas()).getAllByRole('option')[0]
    act(() => {
      first?.focus()
    })
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    const focused = document.activeElement as HTMLElement
    expect(focused.getAttribute('data-target-id')).toBe('nav.brand')
    expect(selectedIds(canvas())).toEqual(['nav.brand'])
  })

  it('adds to the selection with a modified Enter', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    act(() => {
      target(canvas(), 'hero.heading').focus()
    })
    await user.keyboard('{Enter}')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Shift>}{Enter}{/Shift}')

    expect(selectedIds(canvas())).toEqual(['hero.heading', 'hero.subheading'])
  })

  it('clears the selection with Escape', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(target(canvas(), 'hero.heading'))
    await user.keyboard('{Escape}')

    expect(selectedIds(canvas())).toEqual([])
  })

  it('clears the selection with Escape from outside the canvas', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(target(canvas(), 'hero.heading'))
    // Focus is parked on a control that knows nothing about selection, the way
    // it is after any trip through the chrome.
    screen.getByRole('button', { name: 'Reset project…' }).focus()
    await user.keyboard('{Escape}')

    expect(selectedIds(canvas())).toEqual([])
  })

  it('keeps Escape for a text field so a typed instruction is not lost', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(target(canvas(), 'hero.heading'))
    const instruction = screen.getByLabelText('Instruction')
    await user.type(instruction, 'Centre it')
    await user.keyboard('{Escape}')

    expect(selectedIds(canvas())).toEqual(['hero.heading'])
    expect(instruction).toHaveValue('Centre it')
    // The field steps out rather than clearing, so a second press deselects.
    expect(document.activeElement).not.toBe(instruction)
    await user.keyboard('{Escape}')
    expect(selectedIds(canvas())).toEqual([])
  })

  it('clears the selection when empty workspace is pressed', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(target(canvas(), 'hero.heading'))
    const frame = document.querySelector<HTMLElement>('.preview__frame')
    if (frame === null) throw new Error('No preview frame on screen.')
    await user.click(frame)

    expect(selectedIds(canvas())).toEqual([])
  })

  it('keeps exactly one tabbable target so focus is never trapped', () => {
    render(<EditorShell store={store} />)

    const tabbable = within(canvas())
      .getAllByRole('option')
      .filter((option) => option.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
  })
})

describe('selection is not a document change', () => {
  it('leaves the canonical document, its revision, and history untouched', async () => {
    const user = userEvent.setup()
    const listener = vi.fn()
    store.subscribe(listener)
    const before = store.getState().document

    render(<EditorShell store={store} />)
    await user.click(target(canvas(), 'hero.heading'))
    await user.keyboard('{Shift>}')
    await user.click(target(canvas(), 'cta.button'))
    await user.keyboard('{/Shift}')
    await user.click(target(await layers(user), 'features.grid'))

    const after = store.getState().document
    expect(after).toBe(before)
    expect(after.revision).toBe(before.revision)
    expect(after.history).toEqual(before.history)
    expect(listener).not.toHaveBeenCalled()
  })
})

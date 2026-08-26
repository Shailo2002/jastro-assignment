import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { commandId, elementId } from '../model/ids'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

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

function headingSize(container: HTMLElement): string | undefined {
  const node = container.querySelector('[data-element-id="hero.heading"]')
  return node instanceof HTMLElement ? node.style.fontSize : undefined
}

/**
 * Preview viewport and edit scope are two separate controls with deliberately
 * similar labels, so every query here names the group it means.
 */
function viewportButton(name: RegExp): HTMLElement {
  return within(screen.getByRole('group', { name: 'Preview viewport' })).getByRole('button', {
    name,
  })
}

describe('editor shell', () => {
  it('renders the template from canonical state', () => {
    render(<EditorShell store={store} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Scoped AI Template Editor' })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'Template preview' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Ship a landing page without breaking the one you already have.',
      }),
    ).toBeInTheDocument()
  })

  it('starts on desktop and reports the current preview in text', () => {
    render(<EditorShell store={store} />)

    expect(viewportButton(/Desktop/)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Previewing desktop at 1440px/)).toBeInTheDocument()
  })

  it('keeps the preview viewport separate from the edit scope', () => {
    render(<EditorShell store={store} />)

    const viewportGroup = screen.getByRole('group', { name: 'Preview viewport' })
    const scopeGroup = screen.getByRole('group', { name: 'Edit scope' })

    expect(viewportGroup).not.toBe(scopeGroup)
    expect(within(scopeGroup).getByRole('button', { name: /All views/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // Switching the preview must not move the edit scope.
    expect(within(viewportGroup).getByRole('button', { name: /Desktop/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it.each([
    ['tablet', '42px', '768px'],
    ['mobile', '32px', '375px'],
  ])('switching to %s resolves that viewport', async (viewport, expectedSize, expectedWidth) => {
    const user = userEvent.setup()
    const { container } = render(<EditorShell store={store} />)

    expect(headingSize(container)).toBe('56px')

    await user.click(viewportButton(new RegExp(viewport, 'i')))

    expect(headingSize(container)).toBe(expectedSize)
    expect(container.querySelector('.preview__frame')).toHaveStyle({ width: expectedWidth })
    expect(screen.getByText(new RegExp(`Previewing ${viewport}`))).toBeInTheDocument()
  })

  it('resolves the fixture grid to 3 / 2 / 1 columns across the three previews', async () => {
    const user = userEvent.setup()
    const { container } = render(<EditorShell store={store} />)

    const columns = (): string | undefined => {
      const node = container.querySelector('[data-element-id="features.grid"]')
      return node instanceof HTMLElement ? node.style.gridTemplateColumns : undefined
    }

    expect(columns()).toBe('repeat(3, minmax(0, 1fr))')
    await user.click(viewportButton(/Tablet/))
    expect(columns()).toBe('repeat(2, minmax(0, 1fr))')
    await user.click(viewportButton(/Mobile/))
    expect(columns()).toBe('repeat(1, minmax(0, 1fr))')
  })

  it('switching viewport changes the projection, never canonical state', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    const before = store.getState()
    const serialized = JSON.stringify(before.document)

    await user.click(viewportButton(/Mobile/))
    await user.click(viewportButton(/Tablet/))
    await user.click(viewportButton(/Desktop/))

    expect(store.getState()).toBe(before)
    expect(JSON.stringify(store.getState().document)).toBe(serialized)
    expect(store.getState().document.revision).toBe(0)
    expect(store.getState().document.history).toEqual({})
  })

  it('reflects a committed edit without a viewport change', async () => {
    const user = userEvent.setup()
    const { container } = render(<EditorShell store={store} />)

    act(() => {
      store.commit({
        source: 'canvas',
        targetIds: [HEADING],
        scope: 'all',
        changes: { [HEADING]: { typography: { fontSize: 44 } } },
      })
    })

    expect(await screen.findByText(/revision 1/)).toBeInTheDocument()
    expect(headingSize(container)).toBe('44px')
    await user.click(viewportButton(/Mobile/))
    // The mobile override still wins over the new base value.
    expect(headingSize(container)).toBe('32px')
  })

  it('offers a fit control that reports its own state', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    const fit = screen.getByRole('button', { name: /Fit to canvas/ })
    expect(fit).toHaveAttribute('aria-pressed', 'true')

    await user.click(fit)
    expect(fit).toHaveAttribute('aria-pressed', 'false')
  })
})

import { act, render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { commandId, elementId } from '../model/ids'
import { VIEWPORTS } from '../model/viewport'
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
 * The preview viewport is one button that cycles Desktop -> Tablet -> Mobile,
 * so a test asks for a viewport by pressing until the control reports it. The
 * edit scope stays a separate group with deliberately similar wording, which is
 * why nothing here queries by a bare "Tablet".
 */
function viewportControl(): HTMLElement {
  return screen.getByRole('button', { name: /^Preview viewport/ })
}

async function previewViewport(user: UserEvent, name: string): Promise<void> {
  for (let press = 0; press < VIEWPORTS.length; press += 1) {
    if (new RegExp(`^Preview viewport: ${name}`, 'i').test(accessibleName(viewportControl()))) {
      return
    }
    await user.click(viewportControl())
  }
  throw new Error(`The viewport control never reached "${name}".`)
}

function accessibleName(element: HTMLElement): string {
  return element.getAttribute('aria-label') ?? ''
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

    expect(viewportControl()).toHaveAccessibleName(/Desktop 1440px/)
    expect(screen.getByText(/Previewing desktop at 1440px/)).toBeInTheDocument()
  })

  it('keeps the preview viewport separate from the edit scope', () => {
    render(<EditorShell store={store} />)

    const scopeGroup = screen.getByRole('group', { name: 'Edit scope' })

    expect(scopeGroup).not.toContainElement(viewportControl())
    expect(within(scopeGroup).getByRole('button', { name: /All views/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // The two controls are worded apart: one names a preview, one names a write.
    expect(viewportControl()).toHaveAccessibleName(/Preview viewport: Desktop/)
  })

  it.each([
    ['tablet', '42px', '768px'],
    ['mobile', '32px', '375px'],
  ])('switching to %s resolves that viewport', async (viewport, expectedSize, expectedWidth) => {
    const user = userEvent.setup()
    const { container } = render(<EditorShell store={store} />)

    expect(headingSize(container)).toBe('56px')

    await previewViewport(user, viewport)

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
    await previewViewport(user, 'Tablet')
    expect(columns()).toBe('repeat(2, minmax(0, 1fr))')
    await previewViewport(user, 'Mobile')
    expect(columns()).toBe('repeat(1, minmax(0, 1fr))')
  })

  it('switching viewport changes the projection, never canonical state', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    const before = store.getState()
    const serialized = JSON.stringify(before.document)

    await previewViewport(user, 'Mobile')
    await previewViewport(user, 'Tablet')
    await previewViewport(user, 'Desktop')

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

    // Scoped to the preview: the rail's transcript now reports the same
    // revision number on the card the commit produced.
    expect(
      await within(screen.getByRole('main', { name: 'Template preview' })).findByText(
        /revision 1/,
      ),
    ).toBeInTheDocument()
    expect(headingSize(container)).toBe('44px')
    await previewViewport(user, 'Mobile')
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

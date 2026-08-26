import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { resolveDocument } from '../engine/responsive-resolver'
import { commandId, elementId } from '../model/ids'
import { VIEWPORTS, type Viewport } from '../model/viewport'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * View-specific isolation, asserted through the shell.
 *
 * Two claims live here that the resolver unit tests cannot make on their own.
 * First, the three previews are projections of ONE document: switching viewport
 * re-resolves, it never writes. Second, an edit made under a single-viewport
 * scope leaves the other two projections byte-for-byte identical - not merely
 * equal in the field that was edited, but identical in every field, and
 * identical in the DOM the reviewer actually looks at.
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

async function previewViewport(user: User, name: RegExp): Promise<void> {
  await user.click(
    within(screen.getByRole('group', { name: 'Preview viewport' })).getByRole('button', { name }),
  )
}

async function editScope(user: User, name: RegExp): Promise<void> {
  await user.click(
    within(screen.getByRole('group', { name: 'Edit scope' })).getByRole('button', { name }),
  )
}

/** The rendered template only, without the selection overlay or frame chrome. */
function projectedMarkup(): string {
  const node = screen
    .getByRole('main', { name: 'Template preview' })
    .querySelector('.preview__document')
  if (node === null) throw new Error('The preview does not render a template.')
  return node.innerHTML
}

/** Every resolved property of every element, as a stable string. */
function projectedState(viewport: Viewport): string {
  return JSON.stringify(resolveDocument(store.getState().document, viewport))
}

async function editFontSize(user: User, value: string): Promise<void> {
  const input = screen.getByLabelText(/Font size/)
  await user.clear(input)
  await user.type(input, value)
  await user.tab()
}

describe('the previews resolve one document', () => {
  it('renders every canonical element in all three viewports', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    const ids = Object.keys(store.getState().document.elements)
    expect(ids.length).toBeGreaterThan(0)

    for (const viewport of VIEWPORTS) {
      await previewViewport(user, new RegExp(`^${viewport}`, 'i'))
      const rendered = screen
        .getByRole('main', { name: 'Template preview' })
        .querySelectorAll('[data-element-id]')
      expect([...rendered].map((node) => node.getAttribute('data-element-id')).sort()).toEqual(
        [...ids].sort(),
      )
    }
  })

  it('switching viewport changes nothing about canonical state', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    const before = store.getState().document

    await previewViewport(user, /^Tablet/i)
    await previewViewport(user, /^Mobile/i)
    await previewViewport(user, /^Desktop/i)

    // Identity, not equality: no viewport switch produced a new document.
    expect(store.getState().document).toBe(before)
  })
})

describe('a single-viewport edit', () => {
  it('leaves the other two projections byte-for-byte identical', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(layer('hero.heading'))

    const desktopBefore = projectedState('desktop')
    const tabletBefore = projectedState('tablet')
    const mobileBefore = projectedState('mobile')

    await editScope(user, /Mobile only/)
    await editFontSize(user, '28')

    expect(projectedState('mobile')).not.toBe(mobileBefore)
    expect(projectedState('desktop')).toBe(desktopBefore)
    expect(projectedState('tablet')).toBe(tabletBefore)
  })

  it('leaves the other two previews rendering identical markup', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(layer('hero.heading'))

    const desktopBefore = projectedMarkup()
    await previewViewport(user, /^Tablet/i)
    const tabletBefore = projectedMarkup()
    await previewViewport(user, /^Mobile/i)
    const mobileBefore = projectedMarkup()

    // Edit mobile while previewing mobile, so the change is visible at once.
    await editScope(user, /Mobile only/)
    await editFontSize(user, '28')
    expect(projectedMarkup()).not.toBe(mobileBefore)

    await previewViewport(user, /^Desktop/i)
    expect(projectedMarkup()).toBe(desktopBefore)
    await previewViewport(user, /^Tablet/i)
    expect(projectedMarkup()).toBe(tabletBefore)
  })

  it('writes the override to one viewport slot and to no other', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(layer('hero.heading'))
    await editScope(user, /Tablet only/)
    await editFontSize(user, '38')

    const element = store.getState().document.elements[HEADING]
    expect(element?.overrides.tablet?.typography?.fontSize).toBe(38)
    expect(element?.overrides.desktop?.typography?.fontSize).toBeUndefined()
    expect(element?.overrides.mobile?.typography?.fontSize).toBe(32)
    expect(element?.base.typography?.fontSize).toBe(56)
  })
})

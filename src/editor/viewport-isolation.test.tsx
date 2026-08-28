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

/**
 * A selection target on the canvas overlay, found by stable id.
 *
 * The canvas is the surface that is always on screen, so it is what these
 * tests select through. The Layers tree offers the identical targets from the
 * Layers dock; `layers-panel.test.tsx` holds that equivalence in place.
 */
function canvasTarget(id: string): HTMLElement {
  const node = screen
    .getByRole('listbox', { name: 'Selectable template elements' })
    .querySelector<HTMLElement>(`[data-target-id="${id}"]`)
  if (node === null) throw new Error(`No canvas target for "${id}".`)
  return node
}

/**
 * The preview viewport is one cycling button, so a named viewport is reached by
 * pressing until the control reports it.
 */
async function previewViewport(user: User, name: string): Promise<void> {
  const control = (): HTMLElement => screen.getByRole('button', { name: /^Preview viewport/ })
  for (let press = 0; press < 3; press += 1) {
    if (new RegExp(`^Preview viewport: ${name}`, 'i').test(control().getAttribute('aria-label') ?? '')) {
      return
    }
    await user.click(control())
  }
  throw new Error(`The viewport control never reached "${name}".`)
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
      await previewViewport(user, viewport)
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

    await previewViewport(user, 'Tablet')
    await previewViewport(user, 'Mobile')
    await previewViewport(user, 'Desktop')

    // Identity, not equality: no viewport switch produced a new document.
    expect(store.getState().document).toBe(before)
  })
})

describe('a single-viewport edit', () => {
  it('leaves the other two projections byte-for-byte identical', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(canvasTarget('hero.heading'))

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
    await user.click(canvasTarget('hero.heading'))

    const desktopBefore = projectedMarkup()
    await previewViewport(user, 'Tablet')
    const tabletBefore = projectedMarkup()
    await previewViewport(user, 'Mobile')
    const mobileBefore = projectedMarkup()

    // Edit mobile while previewing mobile, so the change is visible at once.
    await editScope(user, /Mobile only/)
    await editFontSize(user, '28')
    expect(projectedMarkup()).not.toBe(mobileBefore)

    await previewViewport(user, 'Desktop')
    expect(projectedMarkup()).toBe(desktopBefore)
    await previewViewport(user, 'Tablet')
    expect(projectedMarkup()).toBe(tabletBefore)
  })

  it('writes the override to one viewport slot and to no other', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(canvasTarget('hero.heading'))
    await editScope(user, /Tablet only/)
    await editFontSize(user, '38')

    const element = store.getState().document.elements[HEADING]
    expect(element?.overrides.tablet?.typography?.fontSize).toBe(38)
    expect(element?.overrides.desktop?.typography?.fontSize).toBeUndefined()
    expect(element?.overrides.mobile?.typography?.fontSize).toBe(32)
    expect(element?.base.typography?.fontSize).toBe(56)
  })
})

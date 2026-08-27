import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { resolveDocument } from '../engine/responsive-resolver'
import { commandId, elementId, type ElementId } from '../model/ids'
import { VIEWPORTS, type Viewport } from '../model/viewport'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * Independent recovery, in the shape TEST_PLAN.md specifies.
 *
 * Two different elements are edited, one of them under a single-viewport scope.
 * Restoring one revision must move exactly one element in exactly one view: the
 * heading's other two views and EVERY value of the untouched button have to
 * come out the far side unchanged - asserted by whole-projection comparison and
 * by object identity, not by spot-checking the one field that was edited.
 */

const HEADING = elementId('hero.heading')
const BUTTON = elementId('hero.cta.primary')

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

async function openScope(user: User, name: RegExp): Promise<void> {
  await user.click(
    within(screen.getByRole('group', { name: 'Edit scope' })).getByRole('button', { name }),
  )
}

async function editFontSize(user: User, value: string): Promise<void> {
  const input = screen.getByLabelText(/Font size/)
  await user.clear(input)
  await user.type(input, value)
  await user.tab()
}

function newestCard(id: string): HTMLElement {
  const node = window.document.querySelector<HTMLElement>(
    `.revision-card[data-target-id="${id}"]`,
  )
  if (node === null) throw new Error(`No revision card for "${id}".`)
  return node
}

function fontSize(viewport: Viewport, id = HEADING): number | undefined {
  return resolveDocument(store.getState().document, viewport).elements[id]?.properties.typography
    ?.fontSize
}

/** Every resolved value of one element, per viewport, as a stable string. */
function allViews(id: ElementId): string {
  return JSON.stringify(
    VIEWPORTS.map(
      (viewport) => resolveDocument(store.getState().document, viewport).elements[id]?.properties,
    ),
  )
}

function historyLength(id: ElementId): number {
  return (store.getState().document.history[id] ?? []).length
}

describe('restoring one element and one scope', () => {
  /**
   * Edits two elements: the heading under Mobile only, the button under All
   * views. Both commits land before any restore, so a restore that reached too
   * far would have visible collateral.
   */
  async function editBoth(user: User): Promise<void> {
    render(<EditorShell store={store} />)

    await user.click(canvasTarget('hero.heading'))
    await openScope(user, /Mobile only/)
    await editFontSize(user, '44')

    await openScope(user, /All views/)
    await user.click(canvasTarget('hero.cta.primary'))
    await editFontSize(user, '20')
  }

  it('returns the restored pair and touches nothing else', async () => {
    const user = userEvent.setup()
    await editBoth(user)

    expect(fontSize('mobile')).toBe(44)
    expect(fontSize('desktop', BUTTON)).toBe(20)

    const buttonBefore = allViews(BUTTON)
    const buttonElementBefore = store.getState().document.elements[BUTTON]
    const desktopBefore = fontSize('desktop')
    const tabletBefore = fontSize('tablet')

    await user.click(canvasTarget('hero.heading'))
    const card = newestCard(HEADING)
    await user.click(within(card).getByRole('button', { name: /^Restore/ }))
    await user.click(
      within(within(card).getByRole('group', { name: 'Restore this revision?' })).getByRole(
        'button',
        { name: 'Restore' },
      ),
    )

    // The restored pair is back at its pre-edit value.
    expect(fontSize('mobile')).toBe(32)

    // The same element's other two views never moved.
    expect(fontSize('desktop')).toBe(desktopBefore)
    expect(fontSize('tablet')).toBe(tabletBefore)

    // The other element is untouched in every view, and by identity.
    expect(allViews(BUTTON)).toBe(buttonBefore)
    expect(store.getState().document.elements[BUTTON]).toBe(buttonElementBefore)
  })

  it('records the restore against the restored element alone', async () => {
    const user = userEvent.setup()
    await editBoth(user)

    expect(historyLength(HEADING)).toBe(1)
    expect(historyLength(BUTTON)).toBe(1)

    await user.click(canvasTarget('hero.heading'))
    const card = newestCard(HEADING)
    await user.click(within(card).getByRole('button', { name: /^Restore/ }))
    await user.click(
      within(within(card).getByRole('group', { name: 'Restore this revision?' })).getByRole(
        'button',
        { name: 'Restore' },
      ),
    )

    // A new entry for the heading; the button's history is not rewritten.
    expect(historyLength(HEADING)).toBe(2)
    expect(historyLength(BUTTON)).toBe(1)
    expect(newestCard(HEADING).dataset['source']).toBe('restore')
    expect(newestCard(HEADING).dataset['scope']).toBe('mobile')
  })

  it('offers the other element its own independent history', async () => {
    const user = userEvent.setup()
    await editBoth(user)

    // The button is still the selection, so only its revisions are listed.
    const cards = window.document.querySelectorAll('.revision-card')
    expect(cards).toHaveLength(1)
    expect(cards[0]?.getAttribute('data-target-id')).toBe(BUTTON)
    expect(cards[0]?.getAttribute('data-scope')).toBe('all')
  })
})

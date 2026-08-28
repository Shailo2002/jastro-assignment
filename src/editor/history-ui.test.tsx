import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { resolveDocument } from '../engine/responsive-resolver'
import { commandId, elementId } from '../model/ids'
import type { Viewport } from '../model/viewport'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * History and restore through the real shell.
 *
 * The promise under test is recovery WITHOUT collateral damage: a revision
 * belongs to one element and one scope, restoring it moves exactly that pair,
 * every other element and every other viewport is provably untouched, and the
 * restore is itself recorded rather than rewinding the document.
 */

const HEADING = elementId('hero.heading')
const SUBHEADING = elementId('hero.subheading')

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

/** Commits one font-size change from the inspector at the current scope. */
async function editFontSize(user: User, value: string): Promise<void> {
  const input = screen.getByLabelText(/Font size/)
  await user.clear(input)
  await user.type(input, value)
  await user.tab()
}

/** The history panel itself; several shell regions carry similar text. */
function panel(): HTMLElement {
  return screen.getByRole('region', { name: 'History' })
}

/**
 * Revision cards for one element, OLDEST first: the rail is a transcript, so
 * the newest entry is the one at the foot of it, next to the composer.
 */
function cards(id: string): readonly HTMLElement[] {
  return [
    ...window.document.querySelectorAll<HTMLElement>(`.revision-card[data-target-id="${id}"]`),
  ]
}

/** Every revision card on screen, whichever element it belongs to. */
function allCards(): readonly HTMLElement[] {
  return [...window.document.querySelectorAll<HTMLElement>('.revision-card')]
}

function newestCard(id: string): HTMLElement {
  const node = cards(id).at(-1)
  if (node === undefined) throw new Error(`No revision card for "${id}".`)
  return node
}

function fontSize(viewport: Viewport, id = HEADING): number | undefined {
  return resolveDocument(store.getState().document, viewport).elements[id]?.properties.typography
    ?.fontSize
}

function historyLength(id = HEADING): number {
  return (store.getState().document.history[id] ?? []).length
}

describe('history panel', () => {
  it('shows a manual commit with its source, scope, time, and value change', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(canvasTarget('hero.heading'))
    const fontSizeBefore = fontSize('desktop')
    await editFontSize(user, '44')

    const card = newestCard(HEADING)
    expect(card.dataset['source']).toBe('canvas')
    expect(card.dataset['scope']).toBe('all')
    expect(within(card).getByRole('heading', { name: 'Manual edit' })).toBeInTheDocument()
    expect(card).toHaveTextContent('All views')
    expect(card).toHaveTextContent('26 Aug 2026, 10:00 UTC')

    // The old and the new value are on the card itself: a field name alone
    // does not tell the reviewer what happened.
    const change = within(card).getByRole('listitem')
    expect(change).toHaveTextContent('typography.fontSize')
    expect(change).toHaveTextContent(String(fontSizeBefore))
    expect(change).toHaveTextContent('44')
  })

  it('explains what produces content when nothing has changed yet', () => {
    render(<EditorShell store={store} />)

    expect(within(panel()).getByText(/Nothing has changed yet/)).toBeInTheDocument()
    expect(allCards()).toHaveLength(0)
  })

  it('reads as the whole layout while nothing is selected', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(canvasTarget('hero.heading'))
    await editFontSize(user, '44')
    await user.click(canvasTarget('hero.subheading'))
    await editFontSize(user, '19')

    // Deselecting is not a reason to stop reporting: with no target chosen the
    // transcript is every element's history, oldest first.
    canvasTarget('hero.subheading').focus()
    await user.keyboard('{Escape}')

    expect(within(panel()).getByText('Whole layout')).toBeInTheDocument()
    expect(within(panel()).getByText('2 changes across 2 elements.')).toBeInTheDocument()
    expect(allCards().map((card) => card.dataset['targetId'])).toEqual([HEADING, SUBHEADING])
  })

  it('points at the element a card belongs to, by click and from the keyboard', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(canvasTarget('hero.heading'))
    await editFontSize(user, '44')
    await user.click(canvasTarget('hero.subheading'))
    await editFontSize(user, '19')
    canvasTarget('hero.subheading').focus()
    await user.keyboard('{Escape}')

    const selection = (): HTMLElement => screen.getByRole('status', { name: 'Selection' })
    expect(selection()).toHaveTextContent('Nothing selected')

    // Clicking the card body selects its element, so the canvas, Layers, and
    // the inspector all move to the thing the entry is about - and the
    // transcript narrows to that element's own history.
    const card = allCards()[0]
    if (card === undefined) throw new Error('No revision card on screen.')
    await user.click(within(card).getByText(/typography.fontSize/))

    expect(selection()).toHaveTextContent('1 selected')
    expect(selection()).toHaveTextContent(/Heading: /)
    expect(cards(SUBHEADING)).toHaveLength(0)

  })

  it('offers the same target as a real control, not a click area on a card', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(canvasTarget('hero.heading'))
    await editFontSize(user, '44')
    await user.click(canvasTarget('hero.subheading'))
    await editFontSize(user, '19')
    canvasTarget('hero.subheading').focus()
    await user.keyboard('{Escape}')

    // The element's name on the card is a button, so the move is reachable by
    // keyboard and announced, rather than a click target painted on a div.
    await user.click(within(panel()).getByRole('button', { name: /^Select Text: Aster Labs/ }))

    expect(screen.getByRole('status', { name: 'Selection' })).toHaveTextContent(
      /Text: Aster Labs/,
    )
    expect(cards(HEADING)).toHaveLength(0)
  })

  it('lists only the selected element, so a restore target is never inferred', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(canvasTarget('hero.heading'))
    await editFontSize(user, '44')
    await user.click(canvasTarget('hero.subheading'))
    await editFontSize(user, '19')

    expect(cards(SUBHEADING)).toHaveLength(1)
    expect(cards(HEADING)).toHaveLength(0)
  })
})

describe('restore', () => {
  /** Selects the heading, makes a mobile-only edit, and opens History. */
  async function mobileEdit(user: User): Promise<void> {
    render(<EditorShell store={store} />)
    await user.click(canvasTarget('hero.heading'))
    await openScope(user, /Mobile/)
    await editFontSize(user, '44')
  }

  it('confirms with the exact target, the scope, and a current-versus-revision preview', async () => {
    const user = userEvent.setup()
    await mobileEdit(user)

    const card = newestCard(HEADING)
    await user.click(within(card).getByRole('button', { name: /^Restore/ }))

    const confirm = within(card).getByRole('group', { name: 'Restore this revision?' })
    expect(confirm).toHaveTextContent('Mobile only')
    expect(confirm).toHaveTextContent('Ship a landing page')
    expect(confirm).toHaveTextContent('Desktop and Tablet keep their current values.')

    const row = within(confirm).getByRole('row', { name: /typography\.fontSize/ })
    expect(row).toHaveTextContent('44')
    expect(row).toHaveTextContent('32')

    // Opening the confirmation is not a commit.
    expect(store.getState().document.revision).toBe(1)
    expect(fontSize('mobile')).toBe(44)
  })

  it('restores exactly one element and one scope, and records the restore', async () => {
    const user = userEvent.setup()
    await mobileEdit(user)

    const before = store.getState().document
    const card = newestCard(HEADING)
    await user.click(within(card).getByRole('button', { name: /^Restore/ }))
    await user.click(
      within(within(card).getByRole('group', { name: 'Restore this revision?' })).getByRole(
        'button',
        { name: 'Restore' },
      ),
    )

    // The restored pair moved back.
    expect(fontSize('mobile')).toBe(32)
    // Every other viewport of the same element is untouched.
    expect(fontSize('desktop')).toBe(56)
    expect(fontSize('tablet')).toBe(42)
    // So is an unrelated element - by identity, not merely by value.
    expect(store.getState().document.elements[SUBHEADING]).toBe(before.elements[SUBHEADING])
    expect(historyLength(SUBHEADING)).toBe(0)

    // The restore is a new commit with its own entry; nothing was rewound.
    expect(store.getState().document.revision).toBe(before.revision + 1)
    expect(historyLength()).toBe(2)
    const newest = newestCard(HEADING)
    expect(newest.dataset['source']).toBe('restore')
    expect(newest.dataset['scope']).toBe('mobile')
    expect(within(panel()).getByRole('status')).toHaveTextContent(
      /Restored .* in Mobile only\./,
    )
  })

  it('cancelling changes nothing and returns focus to the button that opened it', async () => {
    const user = userEvent.setup()
    await mobileEdit(user)

    const card = newestCard(HEADING)
    const trigger = within(card).getByRole('button', { name: /^Restore/ })
    await user.click(trigger)
    await user.click(within(card).getByRole('button', { name: 'Cancel' }))

    expect(fontSize('mobile')).toBe(44)
    expect(store.getState().document.revision).toBe(1)
    expect(historyLength()).toBe(1)
    expect(within(card).queryByRole('group', { name: 'Restore this revision?' })).toBeNull()
    expect(within(card).getByRole('button', { name: /^Restore/ })).toHaveFocus()
  })

  it('closes the confirmation with Escape and keeps the document unchanged', async () => {
    const user = userEvent.setup()
    await mobileEdit(user)

    const card = newestCard(HEADING)
    await user.click(within(card).getByRole('button', { name: /^Restore/ }))
    await user.keyboard('{Escape}')

    expect(within(card).queryByRole('group', { name: 'Restore this revision?' })).toBeNull()
    expect(within(card).getByRole('button', { name: /^Restore/ })).toHaveFocus()
    expect(store.getState().document.revision).toBe(1)
  })

  it('can be driven from the keyboard alone, and lands focus on the card status', async () => {
    const user = userEvent.setup()
    await mobileEdit(user)

    const card = newestCard(HEADING)
    within(card).getByRole('button', { name: /^Restore/ }).focus()
    await user.keyboard('{Enter}')

    // Focus is moved into the confirmation rather than left behind it.
    expect(within(card).getByText('Restore this revision?')).toHaveFocus()

    const confirm = within(card).getByRole('group', { name: 'Restore this revision?' })
    within(confirm).getByRole('button', { name: 'Restore' }).focus()
    await user.keyboard('{Enter}')

    expect(fontSize('mobile')).toBe(32)
    expect(card.querySelector('.revision-card__status')).toHaveFocus()
  })

  it('offers no restore for a revision whose values already match current state', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(canvasTarget('hero.heading'))
    await editFontSize(user, '44')
    await editFontSize(user, '56')

    const oldest = cards(HEADING)[0]
    if (oldest === undefined) throw new Error('expected two revision cards')
    // The card itself stays terse; the reason a restore is unavailable is
    // carried by the control it applies to.
    const restore = within(oldest).getByRole('button', { name: /^Restore/ })
    expect(restore).toBeDisabled()
    expect(restore).toHaveAttribute('title', expect.stringContaining('nothing to restore'))
  })
})

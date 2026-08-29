import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { commandId, elementId } from '../model/ids'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * Proposal review through the real shell.
 *
 * The properties under test are the ones a reviewer is promised: generation
 * changes nothing, each card is decided on its own, a decision on one element
 * leaves every other element and its history untouched, and work that has been
 * overtaken cannot be applied.
 */

const HEADING = elementId('hero.heading')
const FEATURES_HEADING = elementId('features.heading')

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

/** The review card for one element, found by its stable id. */
function card(id: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`.proposal-card[data-target-id="${id}"]`)
  if (node === null) throw new Error(`No proposal card for "${id}".`)
  return node
}

/** A card's status line. Only a card that cannot be applied has one. */
function status(id: string): HTMLElement {
  const node = card(id).querySelector<HTMLElement>('.proposal-card__status')
  if (node === null) throw new Error(`No status line for "${id}".`)
  return node
}

/** The card's own title, which is where focus lands. */
function cardTitle(id: string): HTMLElement {
  const node = card(id).querySelector<HTMLElement>('h3')
  if (node === null) throw new Error(`No title for "${id}".`)
  return node
}

function queryCard(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.proposal-card[data-target-id="${id}"]`)
}

function cards(): readonly HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('.proposal-card')]
}

async function select(
  user: ReturnType<typeof userEvent.setup>,
  ...ids: readonly string[]
): Promise<void> {
  await user.click(canvasTarget(ids[0] ?? ''))
  for (const id of ids.slice(1)) {
    await user.keyboard('{Shift>}')
    await user.click(canvasTarget(id))
    await user.keyboard('{/Shift}')
  }
}

async function runInstruction(
  user: ReturnType<typeof userEvent.setup>,
  instruction: string,
): Promise<void> {
  await user.clear(screen.getByLabelText('Instruction'))
  await user.type(screen.getByLabelText('Instruction'), instruction)
  await user.click(screen.getByRole('button', { name: 'Run instruction' }))
}

const CENTER = 'Align the selected elements to center'

describe('running an instruction', () => {
  it('blocks running and states the empty selection with nothing selected', () => {
    render(<EditorShell store={store} />)

    // The prerequisite is not spelled out under the composer at all: every
    // control that would run is disabled, there is no Scope Lock to draw over
    // an empty selection, and the canvas states that selection once.
    expect(screen.getByRole('button', { name: 'Run instruction' })).toBeDisabled()
    expect(screen.getByRole('button', { name: CENTER })).toBeDisabled()
    expect(screen.queryByRole('region', { name: 'Scope Lock' })).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Selection' })).toHaveTextContent(
      'Nothing selected',
    )
  })

  it('offers the supported example instructions to the reviewer', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading')

    expect(screen.getByRole('button', { name: 'Make the heading bolder' })).toBeEnabled()
    expect(screen.getByRole('button', { name: CENTER })).toBeInTheDocument()
  })

  it('changes neither the document nor its history when generating', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading', 'features.heading')
    await runInstruction(user, CENTER)

    expect(cards()).toHaveLength(2)
    const state = store.getState().document
    expect(state.revision).toBe(0)
    expect(Object.keys(state.history)).toHaveLength(0)
    expect(state.elements[HEADING]?.base.typography?.textAlign).toBeUndefined()
  })

  it('shows target, scope, before and after on each card', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading')
    await runInstruction(user, 'Make the heading bolder')

    // The card names its target and scope the way a committed history entry
    // does, and sits at the end of the same list.
    const only = card(HEADING)
    expect(within(only).getByRole('heading', { name: 'Proposed AI edit' })).toBeInTheDocument()
    expect(within(only).getByText(/^Heading:/)).toBeInTheDocument()
    expect(within(only).getByText('All views')).toBeInTheDocument()

    const row = within(only).getByRole('row', { name: /typography.fontWeight/ })
    expect(within(row).getByText('700')).toBeInTheDocument()
    expect(within(row).getByText('800')).toBeInTheDocument()

    // An undecided card explains itself with its two buttons; there is no
    // status line until it is one that cannot be applied.
    expect(only.querySelector('.proposal-card__status')).toBeNull()
  })

  it('puts the undecided card at the foot of the history, after the last entry', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading')

    // One committed change first, so there is a transcript to sit at the end of.
    const size = screen.getByLabelText(/Font size/)
    await user.clear(size)
    await user.type(size, '64')
    await user.tab()

    await runInstruction(user, 'Make the heading bolder')

    const history = screen.getByRole('region', { name: 'History' })
    const pending = card(HEADING)
    expect(history).toContainElement(pending)

    // Document order: every committed entry, then the offer.
    const inRail = [...history.querySelectorAll('.revision-card, .proposal-card')]
    expect(inRail.at(-1)).toBe(pending)
    expect(inRail).toHaveLength(2)
  })

  it('fails safely on an unsupported instruction', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading')
    await runInstruction(user, 'Add a pricing table with three plans')

    // One short sentence, not the engine's account of itself.
    expect(screen.getByRole('alert')).toHaveTextContent(
      'That is not one of the supported instructions. Try an example below.',
    )
    expect(cards()).toHaveLength(0)
    expect(store.getState().document.revision).toBe(0)
  })

  it('names the elements a scenario left alone', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading', 'hero.section')
    await runInstruction(user, 'Make the heading bolder')

    expect(cards()).toHaveLength(1)
    expect(screen.getByText('Left alone: hero.section.')).toBeInTheDocument()
  })
})

describe('independent outcomes', () => {
  it('accepts one card and leaves the other element and its history untouched', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading', 'features.heading')
    await runInstruction(user, CENTER)

    await user.click(within(card(HEADING)).getByRole('button', { name: /^Accept/ }))

    const state = store.getState().document
    expect(state.elements[HEADING]?.base.typography?.textAlign).toBe('center')
    expect(state.elements[FEATURES_HEADING]?.base.typography?.textAlign).toBeUndefined()

    // One command, one target, one history entry - recorded as an AI edit.
    expect(state.revision).toBe(1)
    const entries = state.history[HEADING] ?? []
    expect(entries).toHaveLength(1)
    expect(entries[0]?.source).toBe('ai')
    expect(entries[0]?.scope).toBe('all')
    expect(state.history[FEATURES_HEADING]).toBeUndefined()

    // The accepted card leaves: the change it offered is now the last entry of
    // the history above it, and the sibling proposal is still on offer.
    expect(queryCard(HEADING)).toBeNull()
    expect(card(FEATURES_HEADING)).toBeInTheDocument()
    const committed = [...document.querySelectorAll('.revision-card')]
    expect(committed.at(-1)).toHaveAttribute('data-target-id', HEADING)
  })

  it('rejects one card without touching the document', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading', 'features.heading')
    await runInstruction(user, CENTER)

    await user.click(within(card(FEATURES_HEADING)).getByRole('button', { name: /^Reject/ }))

    const state = store.getState().document
    expect(state.revision).toBe(0)
    expect(state.elements[FEATURES_HEADING]?.base.typography?.textAlign).toBeUndefined()
    expect(state.history[FEATURES_HEADING]).toBeUndefined()

    // A rejected change never happened, so nothing records it: the card is
    // simply gone, and the other one is untouched.
    expect(queryCard(FEATURES_HEADING)).toBeNull()
    expect(card(HEADING)).toBeInTheDocument()
  })

  it('accepts one and rejects the other from the same run', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading', 'features.heading')
    await runInstruction(user, CENTER)

    await user.click(within(card(HEADING)).getByRole('button', { name: /^Accept/ }))
    await user.click(within(card(FEATURES_HEADING)).getByRole('button', { name: /^Reject/ }))

    const state = store.getState().document
    expect(state.revision).toBe(1)
    expect(state.elements[HEADING]?.base.typography?.textAlign).toBe('center')
    expect(state.elements[FEATURES_HEADING]?.base.typography?.textAlign).toBeUndefined()

    // Nothing is left to decide, so the run is finished and the rail is the
    // change log again - holding exactly the one change that was accepted.
    expect(cards()).toHaveLength(0)
    expect(document.querySelectorAll('.revision-card')).toHaveLength(1)
  })

  it('accepts both cards of one run as two independent commands', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading', 'features.heading')
    await runInstruction(user, CENTER)

    await user.click(within(card(HEADING)).getByRole('button', { name: /^Accept/ }))
    await user.click(within(card(FEATURES_HEADING)).getByRole('button', { name: /^Accept/ }))

    const state = store.getState().document
    expect(state.revision).toBe(2)
    expect(state.elements[HEADING]?.base.typography?.textAlign).toBe('center')
    expect(state.elements[FEATURES_HEADING]?.base.typography?.textAlign).toBe('center')
    expect((state.history[HEADING] ?? []).length).toBe(1)
    expect((state.history[FEATURES_HEADING] ?? []).length).toBe(1)
  })
})

describe('proposals that have been overtaken', () => {
  it('cannot be applied after the same field is edited elsewhere', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading')
    await runInstruction(user, 'Make the heading bolder')

    // A manual edit to the very field the proposal is about.
    const weight = screen.getByLabelText(/Font weight/)
    await user.selectOptions(weight, '600')

    expect(status(HEADING)).toHaveTextContent(/^Stale/)
    expect(within(card(HEADING)).getByRole('button', { name: /^Accept/ })).toBeDisabled()

    const state = store.getState().document
    expect(state.elements[HEADING]?.base.typography?.fontWeight).toBe(600)
    expect(state.revision).toBe(1)
  })

  it('cannot be applied once its target is no longer selected', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading', 'features.heading')
    await runInstruction(user, CENTER)

    // Narrow the selection to one element; the other proposal loses authority.
    await user.click(canvasTarget('features.heading'))

    expect(status(HEADING)).toHaveTextContent(/^Not applicable/)
    expect(within(card(HEADING)).getByRole('button', { name: /^Accept/ })).toBeDisabled()
    expect(within(card(FEATURES_HEADING)).getByRole('button', { name: /^Accept/ })).toBeEnabled()
  })

  it('survives an edit to an unrelated element', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading', 'features.heading')
    await runInstruction(user, CENTER)

    // Editing another element moves the document revision but says nothing
    // about these fields, so both cards stay decidable.
    await select(user, 'cta.heading')
    const size = screen.getByLabelText(/Font size/)
    await user.clear(size)
    await user.type(size, '30')
    await user.tab()

    await select(user, 'hero.heading', 'features.heading')

    expect(store.getState().document.revision).toBe(1)
    for (const node of cards()) {
      expect(within(node).getByRole('button', { name: /^Accept/ })).toBeEnabled()
    }
  })
})

describe('keyboard and announcements', () => {
  it('runs, inspects, accepts, and rejects without a pointer', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading', 'features.heading')

    const instruction = screen.getByLabelText('Instruction')
    instruction.focus()
    await user.keyboard(CENTER)
    await user.keyboard('{Enter}')

    // Generation moves focus to the first proposal, so the next Tab lands on
    // its own controls rather than back at the top of the rail.
    expect(document.activeElement).toBe(cardTitle(HEADING))
    expect(cards()).toHaveLength(2)

    const accept = within(card(HEADING)).getByRole('button', { name: /^Accept/ })
    accept.focus()
    await user.keyboard('{Enter}')

    // The card it used has just left, so focus moves to the next one still
    // awaiting a decision instead of being lost to the document body.
    expect(queryCard(HEADING)).toBeNull()
    expect(document.activeElement).toBe(cardTitle(FEATURES_HEADING))
    expect(store.getState().document.elements[HEADING]?.base.typography?.textAlign).toBe(
      'center',
    )

    const reject = within(card(FEATURES_HEADING)).getByRole('button', { name: /^Reject/ })
    reject.focus()
    await user.keyboard(' ')

    // Nothing is left to decide, so focus returns to where the next
    // instruction is written.
    expect(cards()).toHaveLength(0)
    expect(document.activeElement).toBe(screen.getByLabelText('Instruction'))
  })

  it('announces the outcome of the run politely', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading', 'features.heading')
    await runInstruction(user, CENTER)

    const status = screen.getByText(/2 proposals/)
    expect(status).toHaveAttribute('role', 'status')
    expect(status).toHaveTextContent('2 proposals: 2 awaiting review.')
  })

  it('keeps a run when the docked panel changes', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await select(user, 'hero.heading')
    await runInstruction(user, 'Make the heading bolder')

    // The composer lives in the rail, so the run is not even off screen while
    // the dock switches to the code panel - and it is still decidable.
    await user.click(screen.getByRole('button', { name: 'Code panel' }))

    expect(cards()).toHaveLength(1)
    expect(within(card(HEADING)).getByRole('button', { name: /^Accept/ })).toBeEnabled()
  })
})

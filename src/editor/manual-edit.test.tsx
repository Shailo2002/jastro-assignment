import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { resolveDocument } from '../engine/responsive-resolver'
import { commandId, elementId } from '../model/ids'
import type { Viewport } from '../model/viewport'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * Manual editing through the inspector.
 *
 * Every assertion checks the canonical document, not the rendered pixels: the
 * point of the pipeline is that a control commits a validated command, and that
 * a rejected one changes nothing at all.
 */

const HEADING = elementId('hero.heading')
const PRIMARY = elementId('hero.cta.primary')
const SECONDARY = elementId('hero.cta.secondary')
const ACTIONS = elementId('hero.actions')

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

function scopeButton(name: RegExp): HTMLElement {
  return within(screen.getByRole('group', { name: 'Edit scope' })).getByRole('button', { name })
}

function scopeLock(): HTMLElement {
  return screen.getByRole('region', { name: 'Scope Lock' })
}

/** Resolved font size of the heading in one viewport, from canonical state. */
function headingSize(viewport: Viewport): number | undefined {
  return resolveDocument(store.getState().document, viewport).elements[HEADING]?.properties
    .typography?.fontSize
}

/**
 * Text a control points at with `aria-describedby`.
 *
 * Several fields can be mixed or overridden at once, so a note is asserted
 * through the control that owns it rather than by a page-wide text match.
 */
function describedText(control: HTMLElement): string {
  return (control.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter((id) => id.length > 0)
    .map((id) => window.document.getElementById(id)?.textContent ?? '')
    .join(' ')
}

async function selectLayer(user: ReturnType<typeof userEvent.setup>, id: string): Promise<void> {
  await user.click(canvasTarget(id))
}

describe('inspector commits', () => {
  it('sends a canvas-source command through the shared pipeline and records history', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectLayer(user, 'hero.heading')

    const input = screen.getByLabelText(/Font size/)
    await user.clear(input)
    await user.type(input, '44')
    await user.tab()

    const document = store.getState().document
    expect(document.revision).toBe(1)
    expect(document.elements[HEADING]?.base.typography?.fontSize).toBe(44)

    const entries = document.history[HEADING] ?? []
    expect(entries).toHaveLength(1)
    expect(entries[0]?.source).toBe('canvas')
    expect(entries[0]?.scope).toBe('all')
    expect(entries[0]?.before.typography?.fontSize).toBe(56)
    expect(entries[0]?.after.typography?.fontSize).toBe(44)
  })

  it('commits a text edit and leaves other elements untouched', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectLayer(user, 'hero.heading')

    const before = store.getState().document
    const textarea = screen.getByLabelText(/^Text$/)
    await user.clear(textarea)
    await user.type(textarea, 'A calmer headline')
    await user.tab()

    const after = store.getState().document
    expect(after.elements[HEADING]?.base.content?.text).toBe('A calmer headline')
    // Untargeted elements keep their identity, not merely their value.
    expect(after.elements[PRIMARY]).toBe(before.elements[PRIMARY])
  })

  it('writes the same value to every element of a multi-selection', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await selectLayer(user, 'hero.cta.primary')
    await user.keyboard('{Shift>}')
    await user.click(canvasTarget('hero.cta.secondary'))
    await user.keyboard('{/Shift}')

    const input = screen.getByLabelText(/Font size/)
    await user.clear(input)
    await user.type(input, '18')
    await user.tab()

    const document = store.getState().document
    expect(document.elements[PRIMARY]?.base.typography?.fontSize).toBe(18)
    expect(document.elements[SECONDARY]?.base.typography?.fontSize).toBe(18)
    // One command, one revision - not one per target.
    expect(document.revision).toBe(1)
  })

  it('labels a differing multi-selection value as Mixed instead of guessing', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await selectLayer(user, 'hero.cta.primary')
    await user.keyboard('{Shift>}')
    await user.click(canvasTarget('hero.cta.secondary'))
    await user.keyboard('{/Shift}')

    // The two buttons have weight 600 and 500.
    const weight = screen.getByLabelText(/Font weight/)
    expect(weight).toHaveValue('')
    expect(describedText(weight)).toMatch(/Mixed across the selection/)

    // A field the two buttons agree on is not reported as mixed.
    expect(describedText(screen.getByLabelText(/Font size/))).not.toMatch(/Mixed/)
  })

  it('offers only fields shared by every selected type', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await selectLayer(user, 'hero.heading')
    expect(screen.getByLabelText(/^Text$/)).toBeInTheDocument()

    await user.keyboard('{Shift>}')
    await user.click(canvasTarget('hero.image'))
    await user.keyboard('{/Shift}')

    expect(screen.queryByLabelText(/^Text$/)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Corner radius/)).toBeInTheDocument()
  })
})

describe('invalid input preserves state', () => {
  it('rejects an out-of-range value through the schema and changes nothing', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectLayer(user, 'hero.heading')

    const before = store.getState()
    const input = screen.getByLabelText(/Font size/)
    await user.clear(input)
    await user.type(input, '9000')
    await user.tab()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(store.getState()).toBe(before)
    expect(store.getState().document.revision).toBe(0)
    expect(store.getState().document.history).toEqual({})
  })

  it('rejects input that is not a number before it reaches the document', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectLayer(user, 'hero.heading')

    const before = store.getState()
    const input = screen.getByLabelText(/Corner radius/)
    await user.clear(input)
    await user.type(input, 'wide')
    await user.tab()

    expect(store.getState()).toBe(before)
  })

  it('rejects an unsafe link and keeps the previous href', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectLayer(user, 'hero.cta.primary')

    const input = screen.getByLabelText(/^Link$/)
    await user.clear(input)
    await user.type(input, 'javascript:alert(1)')
    await user.tab()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(store.getState().document.revision).toBe(0)
    expect(store.getState().document.elements[PRIMARY]?.base.content?.href).toBe('#features')
  })

  it('treats a cleared numeric control as no change', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectLayer(user, 'hero.heading')

    const before = store.getState()
    await user.clear(screen.getByLabelText(/Font size/))
    await user.tab()

    expect(store.getState()).toBe(before)
  })
})

describe('scope isolation', () => {
  it('a mobile edit leaves desktop and tablet untouched', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectLayer(user, 'hero.heading')
    await user.click(scopeButton(/Mobile only/))

    expect(headingSize('desktop')).toBe(56)
    expect(headingSize('tablet')).toBe(42)
    expect(headingSize('mobile')).toBe(32)

    const input = screen.getByLabelText(/Font size/)
    await user.clear(input)
    await user.type(input, '28')
    await user.tab()

    expect(headingSize('mobile')).toBe(28)
    expect(headingSize('desktop')).toBe(56)
    expect(headingSize('tablet')).toBe(42)

    const element = store.getState().document.elements[HEADING]
    expect(element?.overrides.mobile?.typography?.fontSize).toBe(28)
    expect(element?.overrides.desktop?.typography?.fontSize).toBeUndefined()
    expect(element?.base.typography?.fontSize).toBe(56)
  })

  it('an All edit writes base and shows up wherever no override masks the field', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectLayer(user, 'hero.heading')

    const input = screen.getByLabelText(/Font size/)
    await user.clear(input)
    await user.type(input, '48')
    await user.tab()

    expect(store.getState().document.elements[HEADING]?.base.typography?.fontSize).toBe(48)
    expect(headingSize('desktop')).toBe(48)
    // Tablet and mobile override this exact field, so they keep their values.
    expect(headingSize('tablet')).toBe(42)
    expect(headingSize('mobile')).toBe(32)
  })

  it('shows the value of the scope being edited, not of the preview', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectLayer(user, 'hero.heading')

    // Previewing desktop the whole time; only the scope changes.
    expect(screen.getByLabelText(/Font size/)).toHaveValue(56)
    await user.click(scopeButton(/Mobile only/))
    expect(screen.getByLabelText(/Font size/)).toHaveValue(32)
    expect(describedText(screen.getByLabelText(/Font size/))).toMatch(
      /Already overridden for Mobile only/,
    )
  })
})

describe('scope lock', () => {
  it('tracks the target count and the scope as text', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    expect(within(scopeLock()).getByText('Nothing selected')).toBeInTheDocument()
    expect(within(scopeLock()).getByText('All views')).toBeInTheDocument()

    await selectLayer(user, 'hero.heading')
    expect(within(scopeLock()).getByText('1 selected')).toBeInTheDocument()

    await user.keyboard('{Shift>}')
    await user.click(canvasTarget('hero.cta.primary'))
    await user.keyboard('{/Shift}')
    expect(within(scopeLock()).getByText('2 selected')).toBeInTheDocument()

    await user.click(scopeButton(/Tablet only/))
    expect(within(scopeLock()).getByText('Tablet only')).toBeInTheDocument()
    expect(
      within(scopeLock()).getByText('Desktop and Mobile keep their current values.'),
    ).toBeInTheDocument()
  })

  it('lists the elements an edit would affect', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectLayer(user, 'hero.heading')

    expect(within(scopeLock()).getByText(/^Heading: /)).toBeInTheDocument()
  })
})

describe('order operation', () => {
  it('reorders siblings without restructuring the tree', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectLayer(user, 'hero.cta.secondary')

    const before = store.getState().document
    await user.click(screen.getByRole('button', { name: 'Move up' }))

    const after = store.getState().document
    expect(after.revision).toBe(1)
    // Order is a property; the parent's child list is untouched.
    expect(after.elements[ACTIONS]?.childIds).toEqual(before.elements[ACTIONS]?.childIds)
    expect(after.elements[ACTIONS]).toBe(before.elements[ACTIONS])
    expect(after.elements[SECONDARY]?.base.layout?.order).toBe(0)
    expect(after.elements[PRIMARY]?.base.layout?.order).toBe(1)

    // Both siblings are recorded independently, from the canvas.
    expect(after.history[SECONDARY]?.[0]?.source).toBe('canvas')
    expect(after.history[PRIMARY]?.[0]?.source).toBe('canvas')
  })

  it('moves the element in the layers tree, which follows visual order', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectLayer(user, 'hero.cta.secondary')

    // One dock, so the order is read from Layers and the move is made from
    // Design; the selection is what carries between them.
    const ids = async (): Promise<(string | null)[]> => {
      await user.click(screen.getByRole('button', { name: 'Layers panel' }))
      return within(screen.getByRole('tree', { name: 'Template layers' }))
        .getAllByRole('treeitem')
        .map((item) => item.getAttribute('data-target-id'))
    }

    const before = await ids()
    expect(before.indexOf('hero.cta.primary')).toBeLessThan(
      before.indexOf('hero.cta.secondary'),
    )

    await user.click(screen.getByRole('button', { name: 'Design panel' }))
    await user.click(screen.getByRole('button', { name: 'Move up' }))

    const after = await ids()
    expect(after.indexOf('hero.cta.secondary')).toBeLessThan(after.indexOf('hero.cta.primary'))
  })

  it('scopes a reorder to one viewport', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectLayer(user, 'hero.cta.secondary')
    await user.click(scopeButton(/Mobile only/))
    await user.click(screen.getByRole('button', { name: 'Move up' }))

    const element = store.getState().document.elements[SECONDARY]
    expect(element?.overrides.mobile?.layout?.order).toBe(0)
    expect(element?.base.layout?.order).toBeUndefined()
  })

  it('explains why a move is unavailable instead of failing silently', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    // With no selection the inspector explains that there is nothing to edit.
    expect(screen.queryByRole('button', { name: 'Move up' })).not.toBeInTheDocument()
    expect(screen.getByText(/Nothing is selected, so there is nothing to edit/)).toBeInTheDocument()

    await selectLayer(user, 'hero.cta.primary')
    expect(screen.getByRole('button', { name: 'Move up' })).toBeDisabled()
    expect(screen.getByText(/already first among its siblings/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move down' })).toBeEnabled()
  })
})

describe('keyboard operability', () => {
  it('commits a field with Enter, without a pointer', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    act(() => {
      canvasTarget('hero.heading').focus()
    })
    await user.keyboard('{Enter}')

    const input = screen.getByLabelText(/Font size/)
    act(() => {
      input.focus()
    })
    await user.keyboard('{Control>}a{/Control}')
    await user.keyboard('36{Enter}')

    expect(store.getState().document.elements[HEADING]?.base.typography?.fontSize).toBe(36)
  })
})

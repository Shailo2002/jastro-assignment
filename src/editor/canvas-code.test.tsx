import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { commandId, elementId } from '../model/ids'
import type { EditableProperties } from '../model/properties'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * Canvas and code over one canonical state.
 *
 * The two surfaces never talk to each other: they read the same document and
 * submit the same command shape. These tests assert that from both directions,
 * and that every way a draft can be wrong leaves the document byte-identical -
 * including the case where the document moved on while the draft was open.
 */

const HEADING = elementId('hero.heading')
const PRIMARY = elementId('hero.cta.primary')

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

function layer(id: string): HTMLElement {
  const node = screen
    .getByRole('tree', { name: 'Template layers' })
    .querySelector<HTMLElement>(`[data-target-id="${id}"]`)
  if (node === null) throw new Error(`No layer for "${id}".`)
  return node
}

function editor(): HTMLTextAreaElement {
  const node = screen.getByLabelText('Element properties (JSON)')
  if (!(node instanceof HTMLTextAreaElement)) throw new Error('The code editor is not a textarea.')
  return node
}

function draft(): Record<string, EditableProperties> {
  return JSON.parse(editor().value) as Record<string, EditableProperties>
}

/** Replaces the whole draft, the way a paste or a bulk retype would. */
function type(text: string): void {
  fireEvent.change(editor(), { target: { value: text } })
}

/** Rewrites one element's properties inside the current draft. */
function editDraft(edit: (current: Record<string, EditableProperties>) => void): void {
  const current = draft()
  edit(current)
  type(JSON.stringify(current, null, 2))
}

function applyButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Apply' })
}

async function openCode(
  user: ReturnType<typeof userEvent.setup>,
  ...ids: readonly string[]
): Promise<void> {
  await user.click(layer(ids[0] ?? ''))
  for (const id of ids.slice(1)) {
    await user.keyboard('{Shift>}')
    await user.click(layer(id))
    await user.keyboard('{/Shift}')
  }
  await user.click(screen.getByRole('tab', { name: 'Code' }))
}

function scopeButton(name: RegExp): HTMLElement {
  return within(screen.getByRole('group', { name: 'Edit scope' })).getByRole('button', { name })
}

describe('canvas and code share canonical state', () => {
  it('shows the canonical value, without identity or revision fields', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    const properties = draft()[HEADING]
    expect(properties?.typography?.fontSize).toBe(56)
    expect(Object.keys(draft())).toEqual([HEADING])
    expect(editor().value).not.toContain('"revision"')
    expect(editor().value).not.toContain('"parentId"')
  })

  it('reflects a canvas commit in the displayed code', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(layer('hero.heading'))

    const input = screen.getByLabelText(/Font size/)
    await user.clear(input)
    await user.type(input, '44')
    await user.tab()

    await user.click(screen.getByRole('tab', { name: 'Code' }))
    expect(draft()[HEADING]?.typography?.fontSize).toBe(44)
  })

  it('applies a valid draft through the pipeline and updates canvas and inspector', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    editDraft((current) => {
      const properties = current[HEADING]
      if (properties !== undefined) {
        properties.typography = { ...properties.typography, fontSize: 40 }
        properties.content = { ...properties.content, text: 'Ship it calmly' }
      }
    })
    await user.click(applyButton())

    const document = store.getState().document
    expect(document.revision).toBe(1)
    expect(document.elements[HEADING]?.base.typography?.fontSize).toBe(40)
    expect(document.elements[HEADING]?.base.content?.text).toBe('Ship it calmly')

    // The command travelled the shared boundary, so history knows who wrote it.
    const entries = document.history[HEADING] ?? []
    expect(entries).toHaveLength(1)
    expect(entries[0]?.source).toBe('code')
    expect(entries[0]?.scope).toBe('all')

    // The canvas renderer and the inspector both read the new canonical value.
    expect(screen.getAllByText('Ship it calmly').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('tab', { name: 'Design' }))
    expect(screen.getByLabelText(/Font size/)).toHaveValue(40)
  })

  it('writes only the changed element of a multi-selection draft', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.cta.primary', 'hero.cta.secondary')

    const before = store.getState().document
    editDraft((current) => {
      const properties = current[PRIMARY]
      if (properties !== undefined) {
        properties.surface = { ...properties.surface, borderRadius: 20 }
      }
    })
    await user.click(applyButton())

    const after = store.getState().document
    expect(after.elements[PRIMARY]?.base.surface?.borderRadius).toBe(20)
    expect(after.elements[elementId('hero.cta.secondary')]).toBe(
      before.elements[elementId('hero.cta.secondary')],
    )
  })

  it('writes a scoped draft to one viewport override only', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(layer('hero.heading'))
    await user.click(scopeButton(/Mobile only/))
    await user.click(screen.getByRole('tab', { name: 'Code' }))

    const before = store.getState().document.elements[HEADING]

    editDraft((current) => {
      const properties = current[HEADING]
      if (properties !== undefined) {
        properties.typography = { ...properties.typography, fontSize: 28 }
      }
    })
    await user.click(applyButton())

    const element = store.getState().document.elements[HEADING]
    expect(element?.overrides.mobile?.typography?.fontSize).toBe(28)
    // The shared base and the other viewports keep exactly what they had.
    expect(element?.base).toEqual(before?.base)
    expect(element?.overrides.desktop).toEqual(before?.overrides.desktop)
    expect(element?.overrides.tablet).toEqual(before?.overrides.tablet)
    expect(store.getState().document.history[HEADING]?.[0]?.scope).toBe('mobile')
  })
})

describe('an invalid draft preserves the last valid state', () => {
  it('reports invalid syntax with a location and commits nothing', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    const before = store.getState()
    type('{ "hero.heading": { "typography": { "fontSize": 40 "fontWeight": 700 } } }')

    expect(applyButton()).toBeDisabled()
    expect(screen.getByText(/not valid JSON/)).toBeInTheDocument()
    expect(store.getState()).toBe(before)
    // The bad draft stays on screen to be corrected.
    expect(editor().value).toContain('"fontSize": 40 "fontWeight"')
  })

  it('rejects a protected field and commits nothing', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    const before = store.getState()
    editDraft((current) => {
      current[HEADING] = { ...current[HEADING], id: 'hero.other' } as EditableProperties
    })

    expect(applyButton()).toBeDisabled()
    expect(screen.getByText(/Protected field\(s\) id cannot be set/)).toBeInTheDocument()
    expect(store.getState()).toBe(before)
  })

  it('rejects an out-of-range value and names the field path', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    const before = store.getState()
    editDraft((current) => {
      const properties = current[HEADING]
      if (properties !== undefined) {
        properties.typography = { ...properties.typography, fontSize: 5000 }
      }
    })

    expect(applyButton()).toBeDisabled()
    expect(screen.getByText(`${HEADING}.typography.fontSize`)).toBeInTheDocument()
    expect(store.getState()).toBe(before)
  })

  it('refuses to apply a draft that matches the current values', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    expect(applyButton()).toBeDisabled()
  })

  it('reverts an invalid draft back to the canonical values', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    type('{ not json')
    await user.click(screen.getByRole('button', { name: 'Revert' }))

    expect(draft()[HEADING]?.typography?.fontSize).toBe(56)
    expect(screen.queryByText(/not valid JSON/)).not.toBeInTheDocument()
  })
})

describe('a stale draft cannot overwrite a later edit', () => {
  it('is rejected against the newer revision and leaves the manual edit intact', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    // Prepared against revision 0.
    editDraft((current) => {
      const properties = current[HEADING]
      if (properties !== undefined) {
        properties.typography = { ...properties.typography, fontSize: 30 }
      }
    })

    // Someone commits a manual edit while the draft is open.
    await user.click(screen.getByRole('tab', { name: 'Design' }))
    const input = screen.getByLabelText(/Font size/)
    await user.clear(input)
    await user.type(input, '48')
    await user.tab()
    expect(store.getState().document.revision).toBe(1)

    await user.click(screen.getByRole('tab', { name: 'Code' }))
    expect(screen.getByText(/moved to revision 1/)).toBeInTheDocument()

    await user.click(applyButton())

    const document = store.getState().document
    expect(document.revision).toBe(1)
    expect(document.elements[HEADING]?.base.typography?.fontSize).toBe(48)
    expect(within(screen.getByRole('alert')).getByText(/revision 0/)).toBeInTheDocument()
  })

  it('tracks the canonical document while the draft is untouched', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    await user.click(screen.getByRole('tab', { name: 'Design' }))
    const input = screen.getByLabelText(/Font size/)
    await user.clear(input)
    await user.type(input, '48')
    await user.tab()

    await user.click(screen.getByRole('tab', { name: 'Code' }))
    expect(draft()[HEADING]?.typography?.fontSize).toBe(48)
    expect(screen.queryByText(/moved to revision/)).not.toBeInTheDocument()
  })
})

describe('draft lifetime', () => {
  it('keeps an unapplied draft across a panel switch', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    editDraft((current) => {
      const properties = current[HEADING]
      if (properties !== undefined) {
        properties.content = { ...properties.content, text: 'Still being written' }
      }
    })

    await user.click(screen.getByRole('tab', { name: 'Design' }))
    await user.click(screen.getByRole('tab', { name: 'Code' }))

    expect(draft()[HEADING]?.content?.text).toBe('Still being written')
    expect(store.getState().document.revision).toBe(0)
  })

  it('discards the draft when the selection changes', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    editDraft((current) => {
      const properties = current[HEADING]
      if (properties !== undefined) {
        properties.content = { ...properties.content, text: 'Not for this element' }
      }
    })

    await user.click(layer('hero.cta.primary'))
    expect(Object.keys(draft())).toEqual([PRIMARY])

    await user.click(layer('hero.heading'))
    expect(draft()[HEADING]?.content?.text).not.toBe('Not for this element')
  })

  it('discards the draft when the edit scope changes', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    editDraft((current) => {
      const properties = current[HEADING]
      if (properties !== undefined) {
        properties.typography = { ...properties.typography, fontSize: 33 }
      }
    })

    await user.click(scopeButton(/Mobile only/))
    expect(draft()[HEADING]?.typography?.fontSize).not.toBe(33)
  })
})

describe('keyboard behaviour', () => {
  it('moves focus from the editor to Apply on Escape', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    editDraft((current) => {
      const properties = current[HEADING]
      if (properties !== undefined) {
        properties.typography = { ...properties.typography, fontSize: 40 }
      }
    })
    editor().focus()
    await user.keyboard('{Escape}')

    expect(applyButton()).toHaveFocus()
  })

  it('always offers an escape target, even with nothing to apply', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    editor().focus()
    await user.keyboard('{Escape}')

    expect(screen.getByRole('button', { name: 'Revert' })).toHaveFocus()
  })

  it('does not trap Tab inside the editor', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await openCode(user, 'hero.heading')

    editor().focus()
    await user.tab()

    expect(editor()).not.toHaveFocus()
  })

  it('switches panels from the keyboard', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(layer('hero.heading'))

    const design = screen.getByRole('tab', { name: 'Design' })
    design.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Code' })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(screen.getByRole('tab', { name: 'Code' })).toHaveAttribute('aria-selected', 'true')
    expect(editor()).toBeInTheDocument()
  })
})

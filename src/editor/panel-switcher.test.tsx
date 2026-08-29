import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { commandId } from '../model/ids'
import { createDocumentStore, type DocumentStore } from '../store/document-store'
import type { StorageLike } from '../store/persistence'
import { EditorShell } from './EditorShell'

/**
 * The right-hand dock, and the switcher that chooses what it holds.
 *
 * Design, Code, and Layers are mutually exclusive: at most one is docked, and
 * the switcher reports at most one pressed control, so no two panels can ever
 * claim the right edge at once. Design is the resting choice, and any dock can
 * be dismissed from its own corner, which leaves none pressed. Moving between
 * panels must cost nothing - MANUAL_QA requires the selection, an unapplied
 * code draft, and the layers tree's focus position to survive - which is why a
 * dock is hidden rather than unmounted, and it is what these tests hold in
 * place.
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

/** One control of the panel switcher. */
function panelButton(name: 'Design' | 'Code' | 'Layers'): HTMLElement {
  return within(screen.getByRole('group', { name: 'Editor panel' })).getByRole('button', {
    name: `${name} panel`,
  })
}

function dock(id: string): HTMLElement {
  const node = window.document.getElementById(id)
  if (node === null) throw new Error(`No dock "${id}".`)
  return node
}

/** A selection target on the canvas overlay, found by stable id. */
function canvasTarget(id: string): HTMLElement {
  const node = screen
    .getByRole('listbox', { name: 'Selectable template elements' })
    .querySelector<HTMLElement>(`[data-target-id="${id}"]`)
  if (node === null) throw new Error(`No canvas target for "${id}".`)
  return node
}

async function selectHeading(user: User): Promise<void> {
  await user.click(canvasTarget('hero.heading'))
}

describe('the panel switcher', () => {
  it('offers one control per panel, each named and tooltipped', () => {
    render(<EditorShell store={store} />)

    for (const name of ['Design', 'Code', 'Layers'] as const) {
      const button = panelButton(name)
      expect(button).toHaveAccessibleName(`${name} panel`)
      expect(button).toHaveAttribute('title', `${name} panel`)
      // The glyph itself must never be announced.
      expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('opens with nothing docked, because nothing is selected yet', () => {
    render(<EditorShell store={store} />)

    for (const name of ['Design', 'Code', 'Layers'] as const) {
      expect(panelButton(name)).toHaveAttribute('aria-pressed', 'false')
    }
    expect(dock('design-panel')).toHaveAttribute('hidden')
    expect(dock('code-panel')).toHaveAttribute('hidden')
    expect(dock('layers-panel')).toHaveAttribute('hidden')
  })

  it('docks Design on the first selection, and marks exactly one control pressed', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await selectHeading(user)

    expect(panelButton('Design')).toHaveAttribute('aria-pressed', 'true')
    expect(panelButton('Code')).toHaveAttribute('aria-pressed', 'false')
    expect(panelButton('Layers')).toHaveAttribute('aria-pressed', 'false')
    expect(dock('design-panel')).not.toHaveAttribute('hidden')
    expect(dock('code-panel')).toHaveAttribute('hidden')
    expect(dock('layers-panel')).toHaveAttribute('hidden')
  })

  it('points each control at the dock it fills', () => {
    render(<EditorShell store={store} />)

    expect(panelButton('Design')).toHaveAttribute('aria-controls', 'design-panel')
    expect(panelButton('Code')).toHaveAttribute('aria-controls', 'code-panel')
    expect(panelButton('Layers')).toHaveAttribute('aria-controls', 'layers-panel')
  })

  it('shows one panel at a time, and hides the others from the a11y tree', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    expect(screen.queryByRole('tree', { name: 'Template layers' })).not.toBeInTheDocument()

    await user.click(panelButton('Layers'))

    expect(panelButton('Layers')).toHaveAttribute('aria-pressed', 'true')
    expect(panelButton('Design')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('tree', { name: 'Template layers' })).toBeInTheDocument()
    // Hidden means gone from the accessibility tree, not merely invisible.
    expect(screen.queryByLabelText(/Font size/)).not.toBeInTheDocument()
    expect(dock('design-panel')).toHaveAttribute('hidden')
  })

  it('is operable from the keyboard', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    panelButton('Layers').focus()
    await user.keyboard('{Enter}')

    expect(panelButton('Layers')).toHaveAttribute('aria-pressed', 'true')
    expect(panelButton('Layers')).toHaveFocus()
  })

  /**
   * Where the chrome lives is behaviour, not decoration. The split is by what a
   * control reframes: choosing a panel or a preview device changes the shape of
   * every region at once, so both sit in the top bar with the project; the scope a
   * commit writes to and the selection describe the edit about to be made, so
   * they stay beside the canvas they describe. This is the assertion
   * that keeps the two bands from drifting back together.
   */
  it('sits in the top bar, leaving the canvas its own edit chrome', () => {
    render(<EditorShell store={store} />)

    const main = screen.getByRole('main', { name: 'Template preview' })
    const banner = screen.getByRole('banner')

    // What reframes the whole shell sits above it.
    for (const control of [
      panelButton('Design'),
      screen.getByRole('button', { name: /^Preview viewport/ }),
    ]) {
      expect(banner).toContainElement(control)
      expect(main).not.toContainElement(control)
    }

    // What states the pending edit stays with the canvas.
    for (const control of [
      screen.getByRole('group', { name: 'Edit scope' }),
      screen.getByRole('status', { name: 'Selection' }),
    ]) {
      expect(main).toContainElement(control)
      expect(banner).not.toContainElement(control)
    }

    // Where the work stands rides the canvas it describes, like a watermark;
    // the one action that discards it stays above.
    expect(within(main).getByText('Original template')).toBeInTheDocument()
    expect(within(banner).queryByText('Original template')).toBeNull()
    expect(within(banner).getByRole('button', { name: /Reset project/ })).toBeInTheDocument()
  })

  it('keeps the canvas and the scope chrome usable whichever panel is docked', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    await user.click(panelButton('Code'))

    expect(screen.getByRole('main', { name: 'Template preview' })).toBeInTheDocument()
    expect(
      screen.getByRole('listbox', { name: 'Selectable template elements' }),
    ).toBeInTheDocument()
    // The chrome keeps the two controls that state what an edit would do.
    expect(screen.getByRole('button', { name: /^Preview viewport/ })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Edit scope' })).toBeInTheDocument()
    // With nothing selected there is no Scope Lock to draw: the canvas states
    // the empty selection, and the composer has nothing to promise about it.
    expect(screen.getByRole('status', { name: 'Selection' })).toHaveTextContent(
      'Nothing selected',
    )
  })
})

describe('switching panels loses no state', () => {
  it('keeps the selection and the inspector value', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)
    expect(screen.getByLabelText(/Font size/)).toHaveValue(56)

    await user.click(panelButton('Layers'))
    await user.click(panelButton('Design'))

    expect(screen.getByRole('region', { name: 'Scope Lock' })).toHaveTextContent('1 selected')
    expect(screen.getByLabelText(/Font size/)).toHaveValue(56)
  })

  it('keeps an unapplied code draft', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)
    await user.click(panelButton('Code'))

    const draft = JSON.stringify({ 'hero.heading': { typography: { fontSize: 44 } } }, null, 2)
    fireEvent.change(screen.getByLabelText('Element properties (JSON)'), {
      target: { value: draft },
    })

    await user.click(panelButton('Design'))
    await user.click(panelButton('Code'))

    const editor = screen.getByLabelText('Element properties (JSON)')
    expect(editor).toHaveValue(draft)
    // The draft is still only a draft: nothing was committed by the switch.
    expect(store.getState().document.revision).toBe(0)
  })

  it('keeps a pending AI proposal, which lives in the rail either way', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)
    await user.click(screen.getByRole('button', { name: 'Make the heading bolder' }))
    await user.click(screen.getByRole('button', { name: 'Run instruction' }))
    expect(document.querySelectorAll('.proposal-card')).toHaveLength(1)

    await user.click(panelButton('Layers'))
    await user.click(panelButton('Design'))

    expect(document.querySelectorAll('.proposal-card')).toHaveLength(1)
    expect(
      within(screen.getByRole('complementary', { name: 'History and AI' })).getByLabelText(
        'Instruction',
      ),
    ).toBeInTheDocument()
  })

  it('keeps the layers tree focus position across a switch away and back', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(panelButton('Layers'))

    const tree = screen.getByRole('tree', { name: 'Template layers' })
    const tabbable = (): string | null =>
      within(tree)
        .getAllByRole('treeitem')
        .find((item) => item.getAttribute('tabindex') === '0')
        ?.getAttribute('data-target-id') ?? null

    const rows = within(tree).getAllByRole('treeitem')
    rows[0]?.focus()
    await user.keyboard('{ArrowDown}')
    const moved = tabbable()

    await user.click(panelButton('Design'))
    await user.click(panelButton('Layers'))

    expect(tabbable()).toBe(moved)
  })
})

/**
 * The dock follows the selection. Design and Code describe one element, so
 * they arrive with one and leave with it; Layers reads the whole tree and is
 * one of the two ways to reach a selection, so it is never taken away.
 */
describe('the dock follows the selection', () => {
  it('closes Design again when the selection is cleared', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)
    expect(dock('design-panel')).not.toHaveAttribute('hidden')

    await user.keyboard('{Escape}')

    expect(screen.getByRole('status', { name: 'Selection' })).toHaveTextContent(
      'Nothing selected',
    )
    expect(dock('design-panel')).toHaveAttribute('hidden')
    expect(panelButton('Design')).toHaveAttribute('aria-pressed', 'false')
  })

  it('closes Code too, since it also describes one element', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)
    await user.click(panelButton('Code'))
    expect(dock('code-panel')).not.toHaveAttribute('hidden')

    await user.keyboard('{Escape}')

    expect(dock('code-panel')).toHaveAttribute('hidden')
    expect(panelButton('Code')).toHaveAttribute('aria-pressed', 'false')
  })

  it('leaves Layers docked with nothing selected, so the tree stays reachable', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(panelButton('Layers'))
    await selectHeading(user)

    // Choosing an element must not swap the panel the user is working in.
    expect(dock('layers-panel')).not.toHaveAttribute('hidden')
    expect(dock('design-panel')).toHaveAttribute('hidden')

    await user.keyboard('{Escape}')

    expect(screen.getByRole('status', { name: 'Selection' })).toHaveTextContent(
      'Nothing selected',
    )
    expect(dock('layers-panel')).not.toHaveAttribute('hidden')
    expect(panelButton('Layers')).toHaveAttribute('aria-pressed', 'true')
  })

  it('leaves a dock dismissed by hand closed while the selection moves', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)
    await user.click(closeButton('Design'))

    await user.click(canvasTarget('hero.subheading'))

    expect(screen.getByRole('region', { name: 'Scope Lock' })).toHaveTextContent('1 selected')
    expect(dock('design-panel')).toHaveAttribute('hidden')
  })
})

describe('a docked panel owns its own keys', () => {
  it('lets the layers tree clear the selection on Escape, and stays docked', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await user.click(panelButton('Layers'))

    const heading = screen
      .getByRole('tree', { name: 'Template layers' })
      .querySelector<HTMLElement>('[data-target-id="hero.heading"]')
    if (heading === null) throw new Error('No layer for "hero.heading".')

    await user.click(heading)
    expect(screen.getByRole('region', { name: 'Scope Lock' })).toHaveTextContent('1 selected')

    heading.focus()
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('region', { name: 'Scope Lock' })).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Selection' })).toHaveTextContent(
      'Nothing selected',
    )
    // Escape inside the tree belongs to the tree: it clears the selection and
    // must not also dismiss the dock the user is working in.
    expect(panelButton('Layers')).toHaveAttribute('aria-pressed', 'true')
    expect(dock('layers-panel')).not.toHaveAttribute('hidden')
  })
})

/** One dock's close control, named for the panel it dismisses. */
function closeButton(name: 'Design' | 'Code' | 'Layers'): HTMLElement {
  return screen.getByRole('button', { name: `Close ${name} panel` })
}

describe('dismissing the dock', () => {
  it('closes the panel, leaves none pressed, and gives focus back to its switch', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)

    expect(dock('design-panel')).not.toHaveAttribute('hidden')

    await user.click(closeButton('Design'))

    expect(dock('design-panel')).toHaveAttribute('hidden')
    for (const name of ['Design', 'Code', 'Layers'] as const) {
      expect(panelButton(name)).toHaveAttribute('aria-pressed', 'false')
    }
    // Focus must not be stranded on the hidden dock.
    expect(panelButton('Design')).toHaveFocus()
  })

  it('offers a close control on every panel', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)

    for (const name of ['Code', 'Layers'] as const) {
      await user.click(panelButton(name))
      expect(closeButton(name)).toBeInTheDocument()
      await user.click(closeButton(name))
      expect(panelButton(name)).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('keeps an unapplied code draft while the dock is closed', async () => {
    const user = userEvent.setup()
    render(<EditorShell store={store} />)
    await selectHeading(user)
    await user.click(panelButton('Code'))

    const editor = screen.getByRole('textbox', { name: /Element properties/ })
    const draft = JSON.stringify({ 'hero.heading': { typography: { fontSize: 41 } } }, null, 2)
    fireEvent.change(editor, { target: { value: draft } })

    await user.click(closeButton('Code'))
    await user.click(panelButton('Code'))

    expect(screen.getByRole('textbox', { name: /Element properties/ })).toHaveValue(draft)
    // Nothing was committed by opening or closing a dock.
    expect(store.getState().document.revision).toBe(0)
  })
})

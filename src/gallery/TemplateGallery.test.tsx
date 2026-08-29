import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TemplateGallery } from './TemplateGallery'

describe('template gallery', () => {
  it('shows all six original starter templates', () => {
    render(<TemplateGallery savedTemplateIds={new Set()} onSelectTemplate={vi.fn()} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Choose a starting point' })).toBeInTheDocument()
    for (const name of [
      'Aster Labs',
      'Nova Portfolio',
      'Orbit Metrics',
      'Luma Assistant',
      'Kindred Goods',
      'Waypoint Summit',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
    expect(screen.getByText('6 templates')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Use template/ })).toHaveLength(6)
  })

  it('filters by searchable template metadata and can recover from an empty result', async () => {
    const user = userEvent.setup()
    render(<TemplateGallery savedTemplateIds={new Set()} onSelectTemplate={vi.fn()} />)

    await user.type(screen.getByRole('searchbox', { name: 'Search templates' }), 'portfolio')
    expect(screen.getByRole('heading', { level: 2, name: 'Nova Portfolio' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Aster Labs' })).not.toBeInTheDocument()

    await user.clear(screen.getByRole('searchbox', { name: 'Search templates' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search templates' }), 'restaurant')
    expect(screen.getByRole('heading', { level: 2, name: 'No templates found' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Aster Labs' })).toBeInTheDocument()
  })

  it('opens a template with pointer or keyboard activation', async () => {
    const onSelectTemplate = vi.fn()
    const user = userEvent.setup()
    render(<TemplateGallery savedTemplateIds={new Set()} onSelectTemplate={onSelectTemplate} />)

    const card = screen.getByRole('heading', { level: 2, name: 'Nova Portfolio' }).closest('article')
    expect(card).not.toBeNull()
    const action = within(card as HTMLElement).getByRole('button', { name: /Use template/ })
    action.focus()
    await user.keyboard('{Enter}')

    expect(onSelectTemplate).toHaveBeenCalledExactlyOnceWith('nova-portfolio')
  })

  it('collapses the rail to icons without losing a control or its name', async () => {
    const user = userEvent.setup()
    render(<TemplateGallery savedTemplateIds={new Set()} onSelectTemplate={vi.fn()} />)

    const rail = screen.getByRole('complementary', { name: 'Template library' })
    expect(rail).toHaveAttribute('data-collapsed', 'false')

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(rail).toHaveAttribute('data-collapsed', 'true')
    // Collapsed hides labels visually only: every control keeps its name, so
    // the tab order and assistive-technology announcements do not change.
    expect(screen.getByRole('button', { name: /All templates/ })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search templates' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    expect(rail).toHaveAttribute('data-collapsed', 'false')
  })

  it('honours the search shortcut the field advertises', async () => {
    const user = userEvent.setup()
    render(<TemplateGallery savedTemplateIds={new Set()} onSelectTemplate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    await user.keyboard('{Meta>}k{/Meta}')

    const search = screen.getByRole('searchbox', { name: 'Search templates' })
    expect(search).toHaveFocus()
    // The shortcut also reopens the rail, so what is typed is visible.
    expect(screen.getByRole('complementary', { name: 'Template library' })).toHaveAttribute(
      'data-collapsed',
      'false',
    )
  })

  it('reports saved work in the rail and on the card', () => {
    render(
      <TemplateGallery savedTemplateIds={new Set(['luma-assistant'])} onSelectTemplate={vi.fn()} />,
    )

    const recents = screen.getByText('Recent work').parentElement
    expect(recents).not.toBeNull()
    expect(within(recents as HTMLElement).getByText('Luma Assistant')).toBeInTheDocument()

    // The card names the same state in the words of its one action, so the
    // saved state is never carried by the pill's fill alone.
    const card = screen.getByRole('heading', { level: 2, name: 'Luma Assistant' }).closest('article')
    expect(card).not.toBeNull()
    expect(
      within(card as HTMLElement).getByRole('button', { name: /Continue editing/ }),
    ).toBeInTheDocument()
  })

  it('opens the editor from a recent work entry', async () => {
    const user = userEvent.setup()
    const onSelectTemplate = vi.fn()
    render(
      <TemplateGallery
        savedTemplateIds={new Set(['luma-assistant'])}
        onSelectTemplate={onSelectTemplate}
      />,
    )

    const recents = screen.getByText('Recent work').parentElement
    await user.click(within(recents as HTMLElement).getByRole('button', { name: 'Luma Assistant' }))

    expect(onSelectTemplate).toHaveBeenCalledWith('luma-assistant')
  })

  it('names the local user in the rail without claiming an account service', () => {
    render(<TemplateGallery savedTemplateIds={new Set()} onSelectTemplate={vi.fn()} />)

    const rail = screen.getByRole('complementary', { name: 'Template library' })
    expect(within(rail).getByText('user')).toBeInTheDocument()
    expect(within(rail).getByText('user@gmail.com')).toBeInTheDocument()
    // The identity is a statement, so it adds no control to the tab order.
    expect(within(rail).queryByRole('button', { name: /user@gmail\.com/i })).toBeNull()
  })

  it('keeps the signed-in avatar and drops recent work when the rail collapses', async () => {
    const user = userEvent.setup()
    render(
      <TemplateGallery savedTemplateIds={new Set(['luma-assistant'])} onSelectTemplate={vi.fn()} />,
    )

    const rail = screen.getByRole('complementary', { name: 'Template library' })
    expect(within(rail).getByText('U')).toBeInTheDocument()
    expect(within(rail).getByText('Recent work')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

    // Who the rail belongs to survives the collapse; the list of project names
    // does not, because names cannot be read at icon width - and it leaves the
    // tab order with them rather than lingering as an unreadable row.
    expect(within(rail).getByText('U')).toBeInTheDocument()
    expect(within(rail).queryByText('Recent work')).toBeNull()
    expect(within(rail).queryByRole('button', { name: 'Luma Assistant' })).toBeNull()

    // The project itself is still one click away, on its own card.
    expect(screen.getByRole('button', { name: /Continue editing/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    expect(within(rail).getByRole('button', { name: 'Luma Assistant' })).toBeInTheDocument()
  })

  it('labels only the persisted template as a continuing project', () => {
    render(
      <TemplateGallery
        savedTemplateIds={new Set(['orbit-metrics'])}
        onSelectTemplate={vi.fn()}
      />,
    )
    expect(screen.getAllByRole('button', { name: /Continue editing/ })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /Use template/ })).toHaveLength(5)
  })
})

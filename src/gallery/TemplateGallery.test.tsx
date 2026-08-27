import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TemplateGallery } from './TemplateGallery'

describe('template gallery', () => {
  it('shows all four original starter templates', () => {
    render(<TemplateGallery savedTemplateIds={new Set()} onSelectTemplate={vi.fn()} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Choose a starting point' })).toBeInTheDocument()
    for (const name of ['Aster Labs', 'Nova Portfolio', 'Orbit Metrics', 'Luma Studio']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
    expect(screen.getByText('4 templates')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Use template/ })).toHaveLength(4)
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
      <TemplateGallery savedTemplateIds={new Set(['luma-studio'])} onSelectTemplate={vi.fn()} />,
    )

    const recents = screen.getByText('Recent work').parentElement
    expect(recents).not.toBeNull()
    expect(within(recents as HTMLElement).getByText('Luma Studio')).toBeInTheDocument()
    expect(screen.getByText('Saved locally')).toBeInTheDocument()
  })

  it('labels only the persisted template as a continuing project', () => {
    render(
      <TemplateGallery
        savedTemplateIds={new Set(['orbit-metrics'])}
        onSelectTemplate={vi.fn()}
      />,
    )
    expect(screen.getAllByRole('button', { name: /Continue editing/ })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /Use template/ })).toHaveLength(3)
  })
})

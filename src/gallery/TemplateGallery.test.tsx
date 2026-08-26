import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TemplateGallery } from './TemplateGallery'

describe('template gallery', () => {
  it('shows the one available original template', () => {
    render(<TemplateGallery hasSavedProject={false} onSelectTemplate={vi.fn()} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Choose a starting point' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Aster Labs' })).toBeInTheDocument()
    expect(screen.getByText('1 template')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Use template/ })).toBeInTheDocument()
  })

  it('filters by searchable template metadata and can recover from an empty result', async () => {
    const user = userEvent.setup()
    render(<TemplateGallery hasSavedProject={false} onSelectTemplate={vi.fn()} />)

    await user.type(screen.getByRole('searchbox', { name: 'Search templates' }), 'portfolio')
    expect(screen.getByRole('heading', { level: 2, name: 'No templates found' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Aster Labs' })).toBeInTheDocument()
  })

  it('opens a template with pointer or keyboard activation', async () => {
    const onSelectTemplate = vi.fn()
    const user = userEvent.setup()
    render(<TemplateGallery hasSavedProject={false} onSelectTemplate={onSelectTemplate} />)

    const action = screen.getByRole('button', { name: /Use template/ })
    action.focus()
    await user.keyboard('{Enter}')

    expect(onSelectTemplate).toHaveBeenCalledExactlyOnceWith('aster-labs')
  })

  it('labels a persisted project honestly', () => {
    render(<TemplateGallery hasSavedProject onSelectTemplate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Continue editing/ })).toBeInTheDocument()
  })
})


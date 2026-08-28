import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from './App'
import { createDocumentStore } from './store/document-store'

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#/templates')
  })

  it('starts in the template gallery', () => {
    // Storage is disabled so the smoke test never depends on, or writes to,
    // real browser state.
    render(<App store={createDocumentStore({ storage: null })} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Choose a starting point' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Aster Labs' })).toBeInTheDocument()
  })

  it('opens the selected template in the existing editor and returns to the gallery', async () => {
    const user = userEvent.setup()
    render(<App store={createDocumentStore({ storage: null })} />)

    await user.click(screen.getAllByRole('button', { name: 'Use template' })[0]!)

    expect(screen.getByRole('heading', { level: 1, name: 'Scoped AI Template Editor' })).toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'Template preview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Preview viewport/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to templates' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Choose a starting point' })).toBeInTheDocument()
  })

  it('opens a newly selected template with its own content', async () => {
    const user = userEvent.setup()
    render(<App />)

    const novaHeading = screen.getByRole('heading', { level: 2, name: 'Nova Portfolio' })
    const novaCard = novaHeading.closest('article')
    expect(novaCard).not.toBeNull()
    await user.click((novaCard as HTMLElement).querySelector('button')!)

    expect(window.location.hash).toBe('#/editor/nova-portfolio')
    expect(
      screen.getByRole('heading', { level: 2, name: 'Digital products with clarity and character.' }),
    ).toBeInTheDocument()
  })

  it('redirects an unknown template route to the gallery', async () => {
    window.history.replaceState(null, '', '#/editor/not-a-template')
    render(<App store={createDocumentStore({ storage: null })} />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Choose a starting point' }),
    ).toBeInTheDocument()
    expect(window.location.hash).toBe('#/templates')
  })
})

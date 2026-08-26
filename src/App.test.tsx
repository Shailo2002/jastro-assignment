import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from './App'
import { createDocumentStore } from './store/document-store'

describe('App', () => {
  it('renders the editor shell with the template preview', () => {
    // Storage is disabled so the smoke test never depends on, or writes to,
    // real browser state.
    render(<App store={createDocumentStore({ storage: null })} />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Scoped AI Template Editor' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'Template preview' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Preview viewport' })).toBeInTheDocument()
  })
})

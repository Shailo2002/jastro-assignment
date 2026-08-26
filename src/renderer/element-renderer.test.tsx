import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { resolveDocument, type ResolvedDocument } from '../engine/responsive-resolver'
import { elementId } from '../model/ids'
import { createInitialTemplateDocument } from '../model/initial-template'
import { RenderedTemplate } from './element-renderer'

function renderFixture(viewport: 'desktop' | 'tablet' | 'mobile' = 'desktop') {
  const document = createInitialTemplateDocument()
  return render(<RenderedTemplate document={resolveDocument(document, viewport)} />)
}

describe('element renderers', () => {
  it('renders headings as real heading elements with the document text', () => {
    renderFixture()

    expect(
      screen.getByRole('heading', {
        name: 'Ship a landing page without breaking the one you already have.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What you get' })).toBeInTheDocument()
  })

  it('derives heading levels from structure so no level is skipped', () => {
    renderFixture()

    // A section's own heading is h2; a heading nested deeper is h3.
    expect(screen.getByRole('heading', { level: 2, name: 'What you get' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'One canonical document' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('renders a call to action with a destination as a link', () => {
    renderFixture()

    const cta = screen.getByRole('link', { name: 'Use this template' })
    expect(cta).toHaveAttribute('href', '#features')
  })

  it('renders the image with its alternative text', () => {
    renderFixture()

    const image = screen.getByRole('img', {
      name: /Abstract preview of the Aster Labs editor/,
    })
    expect(image).toHaveAttribute('src', '/template/hero-preview.svg')
  })

  it('labels a section from its accessible label', () => {
    renderFixture()

    expect(screen.getByRole('region', { name: 'What you get' })).toBeInTheDocument()
  })

  it('renders children from stable relationships, in document order', () => {
    const { container } = renderFixture()
    const grid = container.querySelector('[data-element-id="features.grid"]')

    expect(grid).not.toBeNull()
    if (grid === null) return
    const cardIds = [...grid.children].map((child) => child.getAttribute('data-element-id'))
    expect(cardIds).toEqual(['features.card.1', 'features.card.2', 'features.card.3'])
    expect(within(grid as HTMLElement).getByText('One canonical document')).toBeInTheDocument()
  })

  it('renders every element in the fixture exactly once', () => {
    const document = createInitialTemplateDocument()
    const { container } = render(
      <RenderedTemplate document={resolveDocument(document, 'desktop')} />,
    )

    const rendered = container.querySelectorAll('[data-element-id]')
    expect(rendered).toHaveLength(Object.keys(document.elements).length)
  })

  it('applies resolved styles from the document', () => {
    const { container } = renderFixture()
    const heading = container.querySelector('[data-element-id="hero.heading"]')

    expect(heading).toHaveStyle({ fontSize: '56px', fontWeight: '700' })
  })
})

describe('invalid structure guards', () => {
  function withElements(mutate: (document: ResolvedDocument) => ResolvedDocument) {
    const resolved = resolveDocument(createInitialTemplateDocument(), 'desktop')
    return render(<RenderedTemplate document={mutate(resolved)} />)
  }

  it('skips a dangling child id and still renders the rest of the page', () => {
    const { container } = withElements((resolved) => {
      const grid = resolved.elements[elementId('features.grid')]
      if (grid === undefined) throw new Error('missing grid')
      return {
        ...resolved,
        elements: {
          ...resolved.elements,
          [elementId('features.grid')]: {
            ...grid,
            childIds: [...grid.childIds, elementId('features.card.ghost')],
          },
        },
      }
    })

    expect(screen.getByText('One canonical document')).toBeInTheDocument()
    expect(
      container.querySelector('[data-element-id="features.card.ghost"]'),
    ).toBeNull()
  })

  it('breaks a reference cycle instead of recursing forever', () => {
    expect(() =>
      withElements((resolved) => {
        const card = resolved.elements[elementId('features.card.1')]
        if (card === undefined) throw new Error('missing card')
        return {
          ...resolved,
          elements: {
            ...resolved.elements,
            [elementId('features.card.1')]: {
              ...card,
              childIds: [...card.childIds, elementId('features.grid')],
            },
          },
        }
      }),
    ).not.toThrow()

    // The page still rendered; the cyclic branch was simply not followed.
    expect(screen.getByRole('heading', { name: 'What you get' })).toBeInTheDocument()
  })

  it('skips an unknown root id', () => {
    const { container } = withElements((resolved) => ({
      ...resolved,
      rootElementIds: [...resolved.rootElementIds, elementId('ghost.section')],
    }))

    expect(container.querySelector('[data-element-id="ghost.section"]')).toBeNull()
    expect(screen.getByRole('heading', { name: 'What you get' })).toBeInTheDocument()
  })
})

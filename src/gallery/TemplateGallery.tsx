import { useMemo, useState, type JSX } from 'react'

import { TEMPLATE_CATALOG, type TemplateCatalogItem } from './template-catalog'
import { TemplateThumbnail } from './TemplateThumbnail'
import './template-gallery.css'

type CategoryFilter = 'All' | TemplateCatalogItem['category']

interface TemplateGalleryProps {
  readonly hasSavedProject: boolean
  readonly onSelectTemplate: (templateId: string) => void
}

function SearchIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  )
}

function GridIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function ArrowIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function TemplateGallery(props: TemplateGalleryProps): JSX.Element {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('All')

  const visibleTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return TEMPLATE_CATALOG.filter((template) => {
      const matchesCategory = category === 'All' || template.category === category
      const searchableText = [
        template.name,
        template.category,
        template.description,
        ...template.tags,
      ]
        .join(' ')
        .toLocaleLowerCase()
      return matchesCategory && searchableText.includes(normalizedQuery)
    })
  }, [category, query])

  return (
    <div className="gallery-page">
      <a className="skip-link" href="#template-results">
        Skip to templates
      </a>

      <aside className="gallery-sidebar" aria-label="Template filters">
        <a className="gallery-brand" href="#/templates" aria-label="Aster Studio templates">
          <span className="gallery-brand__mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>Aster Studio</span>
        </a>

        <div className="gallery-search">
          <label htmlFor="template-search">Search templates</label>
          <div className="gallery-search__field">
            <SearchIcon />
            <input
              id="template-search"
              type="search"
              value={query}
              placeholder="Try “marketing”"
              onChange={(event) => {
                setQuery(event.currentTarget.value)
              }}
            />
          </div>
        </div>

        <nav className="gallery-filters" aria-label="Template categories">
          <p>Browse</p>
          <button
            type="button"
            aria-pressed={category === 'All'}
            onClick={() => {
              setCategory('All')
            }}
          >
            <span className="gallery-filter__label">
              <GridIcon />
              All templates
            </span>
            <span
              aria-label={`${TEMPLATE_CATALOG.length} ${TEMPLATE_CATALOG.length === 1 ? 'template' : 'templates'}`}
            >
              {TEMPLATE_CATALOG.length}
            </span>
          </button>
          <button
            type="button"
            aria-pressed={category === 'Marketing'}
            onClick={() => {
              setCategory('Marketing')
            }}
          >
            <span className="gallery-filter__label">
              <span className="gallery-filter__dot" aria-hidden="true" />
              Marketing
            </span>
            <span aria-label="1 template">1</span>
          </button>
        </nav>

        <div className="gallery-sidebar__note">
          <strong>Start focused</strong>
          <span>One polished template now. The catalog is ready for more later.</span>
        </div>
      </aside>

      <main className="gallery-main" id="template-results">
        <header className="gallery-header">
          <p className="gallery-breadcrumb">Workspace / Templates</p>
          <div className="gallery-header__copy">
            <div>
              <p className="gallery-kicker">Template library</p>
              <h1>Choose a starting point</h1>
              <p>
                Select a responsive template, then edit its content and layout with viewport-safe
                controls.
              </p>
            </div>
            <span className="gallery-count" aria-live="polite">
              {visibleTemplates.length} {visibleTemplates.length === 1 ? 'template' : 'templates'}
            </span>
          </div>
        </header>

        {visibleTemplates.length === 0 ? (
          <section className="gallery-empty" aria-live="polite">
            <h2>No templates found</h2>
            <p>Try a different search or return to all templates.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setCategory('All')
              }}
            >
              Clear filters
            </button>
          </section>
        ) : (
          <section className="template-grid" aria-label="Available templates">
            {visibleTemplates.map((template) => {
              const previewDocument = template.createDocument()
              return (
                <article className="template-card" key={template.id}>
                  <div className="template-card__preview">
                    <TemplateThumbnail document={previewDocument} />
                    <span className="template-card__badge">Original</span>
                  </div>

                  <div className="template-card__body">
                    <div className="template-card__heading">
                      <div>
                        <p className="template-card__category">{template.category}</p>
                        <h2>{template.name}</h2>
                      </div>
                      <span className="template-card__status">Included</span>
                    </div>
                    <p>{template.description}</p>
                    <ul className="template-card__tags" aria-label="Template attributes">
                      {template.tags.map((tag) => (
                        <li key={tag}>{tag}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="template-card__action"
                      onClick={() => {
                        props.onSelectTemplate(template.id)
                      }}
                    >
                      {props.hasSavedProject ? 'Continue editing' : 'Use template'}
                      <ArrowIcon />
                    </button>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </main>
    </div>
  )
}

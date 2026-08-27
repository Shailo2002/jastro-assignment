import { useEffect, useMemo, useRef, useState, type JSX } from "react";

import { GalleryIcon, type GalleryIconName } from "./gallery-icons";
import { TEMPLATE_CATALOG, type TemplateCatalogItem } from "./template-catalog";
import { TemplateThumbnail } from "./TemplateThumbnail";
import "./template-gallery.css";

type CategoryFilter = "All" | TemplateCatalogItem["category"];

interface TemplateGalleryProps {
  readonly savedTemplateIds: ReadonlySet<string>;
  readonly onSelectTemplate: (templateId: string) => void;
}

const CATEGORIES: readonly TemplateCatalogItem["category"][] = [
  "Marketing",
  "Portfolio",
  "SaaS",
];

/** One icon per catalog category, so a filter row reads without its count. */
const CATEGORY_ICONS: Readonly<
  Record<TemplateCatalogItem["category"], GalleryIconName>
> = {
  Marketing: "megaphone",
  Portfolio: "portfolio",
  SaaS: "chart",
};

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "template" : "templates"}`;
}

/**
 * The search shortcut badge must name the key the reader actually has. This is
 * read once, defensively, because the gallery also renders under jsdom.
 */
function searchShortcutLabel(): string {
  const platform =
    typeof navigator === "undefined" ? "" : navigator.userAgent;
  return /Mac|iPhone|iPad/.test(platform) ? "⌘K" : "Ctrl K";
}

export function TemplateGallery(props: TemplateGalleryProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  /**
   * Rail width is view state, not catalog state: collapsing keeps every control
   * mounted and named, it only hides the labels, so the tab order and the
   * accessible names are identical in both widths.
   */
  const [railCollapsed, setRailCollapsed] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const shortcut = searchShortcutLabel();

  // The badge on the search field promises a shortcut, so the shortcut exists.
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent): void => {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      setRailCollapsed(false);
      searchRef.current?.focus();
      searchRef.current?.select();
    };

    window.addEventListener("keydown", focusSearch);
    return () => {
      window.removeEventListener("keydown", focusSearch);
    };
  }, []);

  const visibleTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return TEMPLATE_CATALOG.filter((template) => {
      const matchesCategory =
        category === "All" || template.category === category;
      const searchableText = [
        template.name,
        template.category,
        template.description,
        ...template.tags,
      ]
        .join(" ")
        .toLocaleLowerCase();
      return matchesCategory && searchableText.includes(normalizedQuery);
    });
  }, [category, query]);

  const savedTemplates = TEMPLATE_CATALOG.filter((template) =>
    props.savedTemplateIds.has(template.id),
  );

  return (
    <div className="gallery-page">
      <a className="skip-link" href="#template-results">
        Skip to templates
      </a>

      <aside
        className="gallery-sidebar"
        aria-label="Template library"
        data-collapsed={railCollapsed}
      >
        <div className="sidebar__head">
          <a
            className="sidebar__brand"
            href="#/templates"
            aria-label="Aster Studio templates"
          >
            <span className="sidebar__mark" aria-hidden="true" />
            <span className="sidebar__label sidebar__brand-name">
              Aster Studio
            </span>
          </a>
          <button
            type="button"
            className="sidebar__collapse"
            aria-pressed={railCollapsed}
            aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => {
              setRailCollapsed((current) => !current);
            }}
          >
            <GalleryIcon name="panel-left" />
          </button>
        </div>

        <p className="sidebar__workspace">
          <span className="sidebar__avatar" aria-hidden="true">
            AS
          </span>
          <span className="sidebar__label sidebar__workspace-name">
            Template library
          </span>
          <span className="sidebar__label sidebar__workspace-meta">
            {TEMPLATE_CATALOG.length}
          </span>
        </p>

        <div className="sidebar__search">
          <label className="sidebar__group-label" htmlFor="template-search">
            Search templates
          </label>
          <div className="sidebar__search-field">
            <GalleryIcon name="search" />
            <input
              id="template-search"
              ref={searchRef}
              onFocus={() => {
                // Reaching the field by keyboard while the rail is collapsed
                // opens it, so typing is never invisible.
                setRailCollapsed(false);
              }}
              type="search"
              value={query}
              placeholder="Try “marketing”"
              onChange={(event) => {
                setQuery(event.currentTarget.value);
              }}
            />
            <kbd className="sidebar__shortcut" aria-hidden="true">
              {shortcut}
            </kbd>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Template categories">
          <p className="sidebar__group-label">Browse</p>
          <button
            type="button"
            className="sidebar__item"
            aria-pressed={category === "All"}
            title="All templates"
            onClick={() => {
              setCategory("All");
            }}
          >
            <GalleryIcon name="grid" />
            <span className="sidebar__label">All templates</span>
            <span
              className="sidebar__label sidebar__count"
              aria-label={countLabel(TEMPLATE_CATALOG.length)}
            >
              {TEMPLATE_CATALOG.length}
            </span>
          </button>

          {CATEGORIES.map((categoryName) => {
            const count = TEMPLATE_CATALOG.filter(
              (template) => template.category === categoryName,
            ).length;
            return (
              <button
                type="button"
                className="sidebar__item"
                aria-pressed={category === categoryName}
                title={categoryName}
                key={categoryName}
                onClick={() => {
                  setCategory(categoryName);
                }}
              >
                <GalleryIcon name={CATEGORY_ICONS[categoryName]} />
                <span className="sidebar__label">{categoryName}</span>
                <span
                  className="sidebar__label sidebar__count"
                  aria-label={countLabel(count)}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Saved work is reported, not navigated: the card action below is the
            one route into a project, so this section adds no tab stop and no
            second way to open the same thing. */}
        <div className="sidebar__group">
          <p className="sidebar__group-label">Recent work</p>
          {savedTemplates.length === 0 ? (
            <p className="sidebar__note">
              No saved projects yet. Open a template to start one.
            </p>
          ) : (
            <ul className="sidebar__recents">
              {savedTemplates.map((template) => (
                <li key={template.id}>
                  <GalleryIcon name="clock" />
                  <span>{template.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sidebar__callout">
          <span className="sidebar__callout-badge" aria-hidden="true">
            <GalleryIcon name="bolt" />
          </span>
          <span className="sidebar__label">
            <span className="sidebar__callout-title">Scoped by default</span>
            <span className="sidebar__callout-text">
              Every edit names its target and viewport before it commits.
            </span>
          </span>
        </div>
      </aside>

      <main className="gallery-main" id="template-results">
        <div className="gallery-stage">
          <header className="gallery-header">
            <p className="gallery-kicker">Start a project</p>
            <div className="gallery-header__copy">
              <div>
                <h1>Choose a starting point</h1>
                <p>
                  Pick a responsive canvas, then shape it with scoped visual,
                  code, and AI edits.
                </p>
              </div>
              <p className="gallery-count">
                {countLabel(visibleTemplates.length)}
              </p>
            </div>
          </header>

          {visibleTemplates.length === 0 ? (
            <section className="gallery-empty" aria-live="polite">
              <h2>No templates found</h2>
              <p>Try a different search or return to all templates.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                }}
              >
                Clear filters
              </button>
            </section>
          ) : (
            <section className="template-grid" aria-label="Available templates">
              {visibleTemplates.map((template) => {
                const previewDocument = template.createDocument();
                const hasSavedProject = props.savedTemplateIds.has(template.id);
                return (
                  <article className="template-card" key={template.id}>
                    <div className="template-card__preview">
                      <TemplateThumbnail document={previewDocument} />
                      <span className="template-card__badge">Original</span>
                    </div>

                    <div className="template-card__body">
                      <div className="template-card__heading">
                        <div>
                          <p className="template-card__category">
                            {template.category}
                          </p>
                          <h2>{template.name}</h2>
                        </div>
                        <span
                          className="template-card__status"
                          data-saved={hasSavedProject}
                        >
                          {hasSavedProject ? "Saved locally" : "Ready to edit"}
                        </span>
                      </div>
                      <p>{template.description}</p>

                      <ul className="template-card__tags">
                        {template.tags.map((tag) => (
                          <li key={tag}>{tag}</li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        className="template-card__action"
                        onClick={() => {
                          props.onSelectTemplate(template.id);
                        }}
                      >
                        {hasSavedProject ? "Continue editing" : "Use template"}
                        <GalleryIcon name="arrow-right" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

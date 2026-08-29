import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type JSX } from "react";

import { BrandMark } from "../brand/BrandMark";
import { GalleryIcon, type GalleryIconName } from "./gallery-icons";
import { TEMPLATE_CATALOG, type TemplateCatalogItem } from "./template-catalog";
import { TemplateThumbnail } from "./TemplateThumbnail";

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

/** Rail widths. Motion animates between them; nothing else declares a width. */
const RAIL_WIDTH_OPEN = 248;
const RAIL_WIDTH_COLLAPSED = 76;

/**
 * A rail row: 44px tall, label between icon and count, with the pressed state
 * carried by fill, border, and weight together.
 */
const RAIL_ROW =
  "group/row flex min-h-touch cursor-pointer items-center gap-3 rounded-input border" +
  " border-transparent px-3 py-2 text-left text-sm tracking-[-0.01em] transition-colors" +
  " duration-instant hover:bg-surface-panel hover:text-primary active:bg-surface-hover" +
  " aria-pressed:border-default aria-pressed:bg-surface-elevated" +
  " aria-pressed:font-semibold aria-pressed:text-primary aria-pressed:shadow-hairline";

/**
 * Labels inside the rail. Collapsing hides them visually only: they keep their
 * accessible name and their place in the tab order, and the stacked layout
 * under 820px shows them again because there the rail is never narrow.
 */
const RAIL_LABEL =
  "group-data-[collapsed=true]/rail:sr-only" +
  " max-[820px]:group-data-[collapsed=true]/rail:not-sr-only";

/**
 * Text that fades instead of unmounting. Collapsing hides the words but keeps
 * their box, so the icons underneath stay on exactly the same baseline in both
 * widths; the rail's own overflow clips whatever no longer fits.
 */
const RAIL_FADE =
  "transition-opacity duration-normal motion-reduce:transition-none" +
  " group-data-[collapsed=true]/rail:pointer-events-none" +
  " group-data-[collapsed=true]/rail:opacity-0" +
  " max-[820px]:group-data-[collapsed=true]/rail:pointer-events-auto" +
  " max-[820px]:group-data-[collapsed=true]/rail:opacity-100";

/**
 * Section headings: one line at every rail width, because a heading that
 * rewrapped while the rail narrowed would move the rows beneath it.
 */
const RAIL_SECTION_LABEL = `${RAIL_FADE} whitespace-nowrap`;

/**
 * The signed-in name and address keep the width they have in the open rail
 * (224px of content minus the avatar column), so they never rewrap
 * mid-animation. Collapsing takes that width to zero rather than only fading
 * it: a 168px box left standing in a 52px rail would push the avatar out
 * through the rail's own overflow, which is the one part of this row that has
 * to stay visible at icon width.
 */
const RAIL_USER_TEXT =
  "flex w-[168px] min-w-0 shrink-0 flex-col gap-[1px] overflow-hidden" +
  " whitespace-nowrap transition-[width,opacity] duration-normal" +
  " motion-reduce:transition-none group-data-[collapsed=true]/rail:w-0" +
  " group-data-[collapsed=true]/rail:opacity-0";

/**
 * The rail names a local user, not an account service: this build has no
 * authentication, so the identity is a fixed value rather than a session
 * claim. One place to change it if the demo is handed to someone else.
 */
const CURRENT_USER = {
  name: "user",
  email: "user@gmail.com",
  initial: "U",
} as const;

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "template" : "templates"}`;
}

/**
 * The search shortcut badge must name the key the reader actually has. This is
 * read once, defensively, because the gallery also renders under jsdom.
 */
function searchShortcutLabel(): string {
  const platform = typeof navigator === "undefined" ? "" : navigator.userAgent;
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
  /**
   * Reduced motion removes the movement, not the state change: the rail still
   * collapses, the toggle still moves, both just arrive immediately.
   */
  const prefersReducedMotion = useReducedMotion();
  const railTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.26, ease: [0.22, 0.61, 0.36, 1] as const };

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

  /** One filter row, so the four of them cannot drift apart. */
  const filterRow = (
    label: string,
    icon: GalleryIconName,
    count: number,
    filter: CategoryFilter,
  ): JSX.Element => {
    const isActive = category === filter;
    return (
      <button
        type="button"
        key={filter}
        className={`${RAIL_ROW} ${isActive ? "text-primary" : "text-secondary"}`}
        aria-pressed={isActive}
        title={label}
        onClick={() => {
          setCategory(filter);
        }}
      >
        <GalleryIcon
          name={icon}
          className={
            isActive
              ? "text-primary"
              : "text-muted group-hover/row:text-secondary"
          }
        />
        <span className={RAIL_LABEL}>{label}</span>
        <span
          className={`${RAIL_LABEL} ml-auto text-xs tabular-nums ${
            isActive ? "font-semibold text-secondary" : "font-medium text-muted"
          }`}
          aria-label={countLabel(count)}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="grid min-h-screen grid-cols-[auto_minmax(0,1fr)] bg-surface-canvas max-[820px]:grid-cols-[minmax(0,1fr)]">
      <a
        className="fixed top-3 left-3 z-20 -translate-y-[160%] rounded-control bg-action-primary
          px-3 py-2 text-on-accent focus:translate-y-0"
        href="#template-results"
      >
        Skip to templates
      </a>

      {/*
        The rail. Motion owns its width, so nothing here declares one; the
        collapsed layout is read straight off `data-collapsed`, and `!w-full`
        beats Motion's inline width once the rail stacks under 820px.
      */}
      <motion.aside
        className="group/rail sticky top-0 flex h-screen flex-col gap-1 overflow-hidden
          border-r border-default bg-surface-canvas p-3 pb-4
          max-[820px]:static max-[820px]:h-auto max-[820px]:w-full! max-[820px]:border-r-0
          max-[820px]:border-b max-[820px]:px-4"
        aria-label="Template library"
        data-collapsed={railCollapsed}
        initial={false}
        animate={{
          width: railCollapsed ? RAIL_WIDTH_COLLAPSED : RAIL_WIDTH_OPEN,
        }}
        transition={railTransition}
      >
        <div
          className="mb-4 flex min-h-touch items-center justify-between gap-2 pl-2
            transition-[padding,column-gap] duration-normal motion-reduce:transition-none
            group-data-[collapsed=true]/rail:gap-0 group-data-[collapsed=true]/rail:pr-2
            group-data-[collapsed=true]/rail:pl-0
            max-[820px]:group-data-[collapsed=true]/rail:gap-2
            max-[820px]:group-data-[collapsed=true]/rail:pr-0
            max-[820px]:group-data-[collapsed=true]/rail:pl-2"
        >
          <a
            className={`${RAIL_FADE} inline-flex min-h-touch min-w-0 shrink items-center gap-3
              overflow-hidden text-md font-semibold tracking-[-0.02em] whitespace-nowrap
              text-primary no-underline`}
            href="#/templates"
            aria-label="Aster Studio templates"
          >
            {/* Never unmounted and never given a layout animation: the row
                keeps its height in both widths, so nothing below it moves. */}
            <BrandMark className="size-6.5" />
            <span>Aster Studio</span>
          </a>
          <button
            type="button"
            className="inline-flex size-touch shrink-0 cursor-pointer items-center justify-center
              rounded-input border border-transparent p-0 text-muted transition-colors duration-instant
              hover:bg-surface-elevated hover:text-primary active:bg-surface-hover
              aria-pressed:border-default aria-pressed:bg-surface-elevated aria-pressed:text-primary
              max-[820px]:hidden"
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

        <div className="mb-5 flex flex-col gap-2">
          <label
            className={`${RAIL_SECTION_LABEL} px-2 text-xs font-medium tracking-[0.01em] text-muted`}
            htmlFor="template-search"
          >
            Search templates
          </label>
          <div
            className="flex min-h-touch items-center gap-2 rounded-pill border border-default
              bg-surface-panel/70 pr-2 pl-3 text-muted duration-instant
              transition-[color,background-color,border-color,box-shadow]
              hover:border-strong focus-within:border-strong focus-within:bg-surface-panel
              has-[input:focus-visible]:border-focus-ring
              has-[input:focus-visible]:bg-surface-panel
              has-[input:focus-visible]:text-primary
              has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-focus-ring/35
              group-data-[collapsed=true]/rail:justify-center group-data-[collapsed=true]/rail:p-2"
          >
            <GalleryIcon name="search" className="size-[18px]" />
            <input
              id="template-search"
              ref={searchRef}
              className="h-10 w-full min-w-0 border-0 bg-transparent font-[inherit] text-sm
                text-primary outline-none focus-visible:outline-none! placeholder:text-muted
                group-data-[collapsed=true]/rail:sr-only
                max-[820px]:group-data-[collapsed=true]/rail:not-sr-only"
              onFocus={() => {
                setRailCollapsed(false);
              }}
              type="search"
              value={query}
              placeholder="Try “marketing”"
              onChange={(event) => {
                setQuery(event.currentTarget.value);
              }}
            />
            <kbd
              className={`${RAIL_LABEL} shrink-0 rounded-pill border border-default
                bg-surface-elevated px-2 py-[2px] font-[inherit] text-xs text-muted`}
              aria-hidden="true"
            >
              {shortcut}
            </kbd>
          </div>
        </div>

        <nav
          className="mb-5 flex flex-col gap-[2px] max-[820px]:mb-3 max-[820px]:grid
            max-[820px]:grid-cols-2 max-[820px]:gap-2 max-[540px]:grid-cols-1"
          aria-label="Template categories"
        >
          <p
            className={`${RAIL_SECTION_LABEL} mb-2 px-2 text-xs font-medium tracking-[0.01em] text-muted max-[820px]:hidden`}
          >
            Browse
          </p>
          {filterRow("All templates", "grid", TEMPLATE_CATALOG.length, "All")}
          {CATEGORIES.map((categoryName) =>
            filterRow(
              categoryName,
              CATEGORY_ICONS[categoryName],
              TEMPLATE_CATALOG.filter(
                (template) => template.category === categoryName,
              ).length,
              categoryName,
            ),
          )}
        </nav>

        {/* The one section the collapsed rail drops rather than reduces to
            icons: recent work is a list of names, and a stack of identical
            clocks names nothing. It unmounts instead of hiding, so a row the
            reader cannot read is not left in the tab order either; every
            project in it stays one click away on its own card, under
            Continue editing. */}
        {railCollapsed ? null : (
          <div className="mb-5 flex flex-col gap-[2px] max-[820px]:hidden">
            <p
              className={`${RAIL_SECTION_LABEL} mb-2 px-2 text-xs font-medium tracking-[0.01em] text-muted`}
            >
              Recent work
            </p>
            {savedTemplates.length === 0 ? (
              <p
                className={`${RAIL_LABEL} w-[200px] shrink-0 px-2 text-xs leading-relaxed text-muted`}
              >
                No saved projects yet. Open a template to start one.
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-[2px] p-0">
                {savedTemplates.map((template) => (
                  <li key={template.id}>
                    {/* The row is the route back into that project's editor -
                        the same destination the card's Continue editing opens. */}
                    <button
                      type="button"
                      className={`${RAIL_ROW} w-full text-secondary`}
                      title={`Continue ${template.name}`}
                      onClick={() => {
                        props.onSelectTemplate(template.id);
                      }}
                    >
                      <GalleryIcon
                        name="clock"
                        className="size-4 text-muted group-hover/row:text-secondary"
                      />
                      <span className={`${RAIL_LABEL} min-w-0 truncate`}>
                        {template.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* A statement, not a control: hairline rule, no panel, no menu. The
            avatar never unmounts and never moves: it stands in the same column
            as the filter icons above it, at both rail widths, so collapsing
            reads as the words leaving rather than the identity relocating.
            The inset is that column's arithmetic - a rail row sets its 20px
            glyph 13px in from the row edge (12px of padding over a 1px
            transparent border), putting the column centre at 23px, and a 36px
            avatar hangs 18px either side of that centre. */}
        <div
          className="mt-auto flex items-center gap-3 border-t border-default ps-[5px] pe-2 pt-4
            transition-[column-gap] duration-normal motion-reduce:transition-none
            group-data-[collapsed=true]/rail:gap-0
            max-[820px]:hidden"
        >
          <span
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full
              bg-accent-brand text-sm font-semibold text-white"
            aria-hidden="true"
          >
            {CURRENT_USER.initial}
          </span>
          <span className={RAIL_USER_TEXT}>
            <span className="truncate text-sm font-semibold text-primary">
              {CURRENT_USER.name}
            </span>
            <span className="truncate text-xs text-muted">
              {CURRENT_USER.email}
            </span>
          </span>
        </div>
      </motion.aside>

      <main
        className="relative min-w-0 bg-ambient p-8 max-[820px]:px-4 max-[820px]:py-6"
        id="template-results"
      >
        <div className="mx-auto max-w-[1180px]">
          <header className="mb-8">
            <h1
              className="m-0 mb-2 max-w-[720px] text-[clamp(var(--type-lg),2.6vw,var(--type-xl))]
                leading-[1.15] font-semibold tracking-[-0.03em] text-primary"
            >
              Choose a starting point
            </h1>
            <p className="m-0 max-w-[560px] text-sm leading-relaxed text-secondary">
              Pick a responsive canvas, then shape it with scoped visual, code,
              and AI edits.
            </p>
          </header>

          {visibleTemplates.length === 0 ? (
            <section
              className="mx-auto my-8 max-w-[560px] rounded-panel border border-default
                bg-surface-panel/70 p-8 text-center"
              aria-live="polite"
            >
              <h2 className="m-0 mb-2 text-md font-semibold">
                No templates found
              </h2>
              <p className="m-0 mb-5 text-sm text-secondary">
                Try a different search or return to all templates.
              </p>
              <button
                type="button"
                className="inline-flex min-h-touch cursor-pointer items-center justify-center gap-2
                  rounded-pill border border-default bg-surface-elevated/80 px-4 py-2 text-sm
                  font-semibold text-primary transition-colors duration-instant
                  hover:border-strong hover:bg-surface-hover active:translate-y-px"
                onClick={() => {
                  setQuery("");
                  setCategory("All");
                }}
              >
                Clear filters
              </button>
            </section>
          ) : (
            <section aria-label="Available templates">
              <p className="m-0 mb-4 text-xs font-medium text-muted">
                {countLabel(visibleTemplates.length)}
              </p>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-5 gap-y-8">
                {visibleTemplates.map((template) => {
                  const previewDocument = template.createDocument();
                  const hasSavedProject = props.savedTemplateIds.has(
                    template.id,
                  );
                  return (
                    <article
                      className="group/card flex min-w-0 flex-col"
                      key={template.id}
                    >
                      <div
                        className="relative rounded-card transition duration-fast
                          group-hover/card:-translate-y-0.5 group-hover/card:shadow-soft
                          group-focus-within/card:-translate-y-0.5 group-focus-within/card:shadow-soft
                          motion-reduce:transform-none motion-reduce:transition-none"
                      >
                        <TemplateThumbnail document={previewDocument} />
                      </div>

                      <div className="flex flex-1 flex-col gap-1 px-0.5 pt-3.5">
                        <h2 className="m-0 min-w-0 truncate text-sm leading-snug font-semibold tracking-[-0.01em] text-primary">
                          {template.name}
                        </h2>

                        <p className="m-0 line-clamp-2 text-xs leading-relaxed text-muted">
                          {template.description}
                        </p>

                        <div className="mt-auto flex pt-3">
                          <button
                            type="button"
                            className={`inline-flex h-9 cursor-pointer items-center gap-1.5
                              rounded-pill px-3.5 text-xs font-semibold transition-colors
                              duration-instant active:translate-y-px
                              max-[540px]:w-full max-[540px]:justify-center ${
                                hasSavedProject
                                  ? "border border-transparent bg-action-neutral text-on-neutral hover:bg-action-neutral-hover"
                                  : "border border-default bg-surface-elevated/80 text-primary hover:border-strong hover:bg-surface-hover"
                              }`}
                            onClick={() => {
                              props.onSelectTemplate(template.id);
                            }}
                          >
                            {hasSavedProject
                              ? "Continue editing"
                              : "Use template"}
                            <GalleryIcon
                              name="arrow-right"
                              className="size-3.5"
                            />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

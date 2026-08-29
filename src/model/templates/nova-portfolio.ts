import type { TemplateDocument } from '../document'
import { buildTemplateDocument, type ElementSeed } from '../template-builder'

/**
 * "Nova Portfolio" - a personal portfolio.
 *
 * Structurally its own page, not a re-skinned landing: a left-aligned intro
 * with no artwork, a two-column case-study grid whose covers are colored
 * blocks rather than images, a chrome-free services row, and a contact strip.
 */

const INK = '#0f1115'
const PANEL = '#151820'
const BORDER = '#343943'
const HEADING = '#fafafa'
const BODY = '#a3a3a3'
const ACCENT = '#fbbf24'

interface ProjectSeedInput {
  readonly index: number
  readonly cover: string
  readonly year: string
  readonly title: string
  readonly body: string
}

function projectCard(project: ProjectSeedInput): readonly ElementSeed[] {
  const cardId = `work.project.${project.index}`
  return [
    {
      id: cardId,
      type: 'card',
      parentId: 'work.grid',
      childIds: [`${cardId}.cover`, `${cardId}.title`, `${cardId}.body`, `${cardId}.link`],
      base: {
        surface: { background: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 14 },
        spacing: { padding: { top: 16, right: 16, bottom: 20, left: 16 }, gap: 10 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
      },
    },
    {
      id: `${cardId}.cover`,
      type: 'container',
      parentId: cardId,
      childIds: [`${cardId}.year`],
      base: {
        surface: { background: project.cover, borderRadius: 10 },
        size: { width: { value: 100, unit: '%' }, minHeight: { value: 160, unit: 'px' } },
        spacing: { padding: { top: 12, right: 12, bottom: 12, left: 12 } },
        layout: { display: 'flex', flexDirection: 'row', justifyContent: 'end', alignItems: 'start' },
      },
      overrides: { mobile: { size: { minHeight: { value: 120, unit: 'px' } } } },
    },
    {
      id: `${cardId}.year`,
      type: 'badge',
      parentId: `${cardId}.cover`,
      base: {
        content: { text: project.year },
        typography: { fontSize: 12, fontWeight: 600, color: '#050506' },
        surface: { background: '#fafafa', borderRadius: 999, opacity: 0.85 },
        spacing: { padding: { top: 4, right: 10, bottom: 4, left: 10 } },
      },
    },
    {
      id: `${cardId}.title`,
      type: 'heading',
      parentId: cardId,
      base: {
        content: { text: project.title },
        typography: { fontSize: 20, fontWeight: 600, lineHeight: 1.3, color: HEADING },
      },
    },
    {
      id: `${cardId}.body`,
      type: 'text',
      parentId: cardId,
      base: {
        content: { text: project.body },
        typography: { fontSize: 15, lineHeight: 1.6, color: BODY },
      },
    },
    {
      id: `${cardId}.link`,
      type: 'button',
      parentId: cardId,
      base: {
        content: { text: 'Read the case study', href: '#contact', accessibleLabel: `Read the ${project.title} case study` },
        typography: { fontSize: 14, fontWeight: 600, color: ACCENT },
        surface: { background: 'transparent', borderWidth: 0, borderColor: 'transparent', borderRadius: 6 },
        spacing: { padding: { top: 4, right: 0, bottom: 4, left: 0 } },
      },
    },
  ]
}

function serviceColumn(index: number, title: string, body: string): readonly ElementSeed[] {
  const columnId = `services.column.${index}`
  return [
    {
      id: columnId,
      type: 'container',
      parentId: 'services.row',
      childIds: [`${columnId}.title`, `${columnId}.body`],
      base: {
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
        spacing: { gap: 8 },
      },
    },
    {
      id: `${columnId}.title`,
      type: 'heading',
      parentId: columnId,
      base: {
        content: { text: title },
        typography: { fontSize: 17, fontWeight: 600, lineHeight: 1.3, color: HEADING },
      },
    },
    {
      id: `${columnId}.body`,
      type: 'text',
      parentId: columnId,
      base: {
        content: { text: body },
        typography: { fontSize: 14, lineHeight: 1.6, color: BODY },
      },
    },
  ]
}

function buildSeeds(): readonly ElementSeed[] {
  return [
    /* ------------------------------ intro ------------------------------ */
    {
      id: 'intro.section',
      type: 'section',
      parentId: null,
      childIds: ['intro.badge', 'intro.heading', 'intro.bio', 'intro.actions'],
      base: {
        surface: { background: INK },
        spacing: { padding: { top: 104, right: 96, bottom: 72, left: 96 }, gap: 20 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
        typography: { textAlign: 'left' },
      },
      overrides: {
        tablet: { spacing: { padding: { top: 72, right: 40, bottom: 56, left: 40 } } },
        mobile: { spacing: { padding: { top: 48, right: 20, bottom: 40, left: 20 }, gap: 16 } },
      },
    },
    {
      id: 'intro.badge',
      type: 'badge',
      parentId: 'intro.section',
      base: {
        content: { text: 'Nova Chen · Product designer' },
        typography: { fontSize: 13, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: ACCENT },
        surface: { background: 'transparent', borderColor: '#4d4530', borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 6, right: 14, bottom: 6, left: 14 } },
      },
    },
    {
      id: 'intro.heading',
      type: 'heading',
      parentId: 'intro.section',
      base: {
        content: { text: 'Digital products with clarity and character.' },
        typography: { fontSize: 52, fontWeight: 700, lineHeight: 1.12, color: HEADING },
        size: { maxWidth: { value: 700, unit: 'px' } },
      },
      overrides: {
        tablet: { typography: { fontSize: 40 } },
        mobile: { typography: { fontSize: 30, lineHeight: 1.2 } },
      },
    },
    {
      id: 'intro.bio',
      type: 'text',
      parentId: 'intro.section',
      base: {
        content: {
          text: 'I help early-stage teams turn complex ideas into focused interfaces people enjoy using. Currently taking on one new project for this autumn.',
        },
        typography: { fontSize: 17, lineHeight: 1.65, color: BODY },
        size: { maxWidth: { value: 560, unit: 'px' } },
      },
      overrides: { mobile: { typography: { fontSize: 15 } } },
    },
    {
      id: 'intro.actions',
      type: 'container',
      parentId: 'intro.section',
      childIds: ['intro.cta.work', 'intro.cta.contact'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
        spacing: { gap: 12, margin: { top: 4 } },
      },
      overrides: {
        mobile: {
          layout: { flexDirection: 'column', alignItems: 'stretch' },
          size: { width: { value: 100, unit: '%' } },
        },
      },
    },
    {
      id: 'intro.cta.work',
      type: 'button',
      parentId: 'intro.actions',
      base: {
        content: { text: 'View selected work', href: '#work', accessibleLabel: 'View selected work' },
        typography: { fontSize: 15, fontWeight: 600, color: '#050506' },
        surface: { background: ACCENT, borderRadius: 8, borderWidth: 0, borderColor: 'transparent' },
        spacing: { padding: { top: 11, right: 18, bottom: 11, left: 18 } },
        size: { minHeight: { value: 44, unit: 'px' } },
      },
    },
    {
      id: 'intro.cta.contact',
      type: 'button',
      parentId: 'intro.actions',
      base: {
        content: { text: 'Get in touch', href: '#contact' },
        typography: { fontSize: 15, fontWeight: 500, color: HEADING },
        surface: { background: 'transparent', borderColor: BORDER, borderWidth: 1, borderRadius: 8 },
        spacing: { padding: { top: 11, right: 18, bottom: 11, left: 18 } },
        size: { minHeight: { value: 44, unit: 'px' } },
      },
    },

    /* ------------------------------- work ------------------------------- */
    {
      id: 'work.section',
      type: 'section',
      parentId: null,
      childIds: ['work.heading', 'work.grid'],
      base: {
        content: { accessibleLabel: 'Selected work' },
        surface: { background: '#0b0d10' },
        spacing: { padding: { top: 64, right: 96, bottom: 72, left: 96 }, gap: 24 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
      },
      overrides: {
        tablet: { spacing: { padding: { top: 48, right: 40, bottom: 56, left: 40 } } },
        mobile: { spacing: { padding: { top: 40, right: 20, bottom: 44, left: 20 }, gap: 16 } },
      },
    },
    {
      id: 'work.heading',
      type: 'heading',
      parentId: 'work.section',
      base: {
        content: { text: 'Selected work' },
        typography: { fontSize: 32, fontWeight: 600, lineHeight: 1.2, color: HEADING },
      },
      overrides: { mobile: { typography: { fontSize: 24 } } },
    },
    {
      id: 'work.grid',
      type: 'container',
      parentId: 'work.section',
      childIds: ['work.project.1', 'work.project.2', 'work.project.3', 'work.project.4'],
      base: {
        layout: { display: 'grid', gridColumns: 2, alignItems: 'stretch' },
        spacing: { gap: 20 },
      },
      overrides: { mobile: { layout: { gridColumns: 1 }, spacing: { gap: 14 } } },
    },
    ...projectCard({
      index: 1,
      cover: '#3d3423',
      year: '2026',
      title: 'Northline',
      body: 'A calmer planning experience for distributed product teams.',
    }),
    ...projectCard({
      index: 2,
      cover: '#1f3238',
      year: '2025',
      title: 'Fable',
      body: 'A flexible identity and storefront for a modern publishing studio.',
    }),
    ...projectCard({
      index: 3,
      cover: '#332338',
      year: '2025',
      title: 'Goodday',
      body: 'A mobile-first wellbeing product shaped around simple daily rituals.',
    }),
    ...projectCard({
      index: 4,
      cover: '#20303f',
      year: '2024',
      title: 'Harbor',
      body: 'Clear onboarding and billing flows for a small logistics platform.',
    }),

    /* ----------------------------- services ----------------------------- */
    {
      id: 'services.section',
      type: 'section',
      parentId: null,
      childIds: ['services.heading', 'services.row'],
      base: {
        content: { accessibleLabel: 'How I can help' },
        surface: { background: INK },
        spacing: { padding: { top: 56, right: 96, bottom: 56, left: 96 }, gap: 20 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 40, right: 20, bottom: 40, left: 20 } } },
      },
    },
    {
      id: 'services.heading',
      type: 'heading',
      parentId: 'services.section',
      base: {
        content: { text: 'How I can help' },
        typography: { fontSize: 24, fontWeight: 600, lineHeight: 1.25, color: HEADING },
      },
    },
    {
      id: 'services.row',
      type: 'container',
      parentId: 'services.section',
      childIds: ['services.column.1', 'services.column.2', 'services.column.3'],
      base: {
        layout: { display: 'grid', gridColumns: 3, alignItems: 'start' },
        spacing: { gap: 28 },
      },
      overrides: {
        tablet: { layout: { gridColumns: 3 }, spacing: { gap: 20 } },
        mobile: { layout: { gridColumns: 1 }, spacing: { gap: 16 } },
      },
    },
    ...serviceColumn(1, 'Product strategy', 'Workshops that turn a roadmap of maybes into one clear next release.'),
    ...serviceColumn(2, 'Interface design', 'End-to-end flows, design systems, and the details in between.'),
    ...serviceColumn(3, 'Design partnership', 'A steady weekly cadence for teams without a designer on staff.'),

    /* ------------------------------ contact ------------------------------ */
    {
      id: 'contact.section',
      type: 'section',
      parentId: null,
      childIds: ['contact.heading', 'contact.body', 'contact.button', 'contact.note'],
      base: {
        content: { accessibleLabel: 'Contact' },
        surface: { background: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 16 },
        spacing: {
          padding: { top: 56, right: 64, bottom: 56, left: 64 },
          gap: 14,
          margin: { left: 64, right: 64 },
        },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        typography: { textAlign: 'center' },
      },
      overrides: {
        mobile: {
          spacing: { padding: { top: 32, right: 20, bottom: 32, left: 20 }, margin: { left: 16, right: 16 } },
          layout: { alignItems: 'stretch' },
        },
      },
    },
    {
      id: 'contact.heading',
      type: 'heading',
      parentId: 'contact.section',
      base: {
        content: { text: 'Let’s make something useful.' },
        typography: { fontSize: 30, fontWeight: 600, lineHeight: 1.2, color: HEADING },
      },
      overrides: { mobile: { typography: { fontSize: 24 } } },
    },
    {
      id: 'contact.body',
      type: 'text',
      parentId: 'contact.section',
      base: {
        content: { text: 'Have an ambitious product idea? I would love to hear about it.' },
        typography: { fontSize: 16, lineHeight: 1.6, color: BODY },
      },
    },
    {
      id: 'contact.button',
      type: 'button',
      parentId: 'contact.section',
      base: {
        content: { text: 'Start a conversation', href: 'https://example.com/contact', accessibleLabel: 'Start a conversation' },
        typography: { fontSize: 16, fontWeight: 600, color: '#050506' },
        surface: { background: ACCENT, borderRadius: 8, borderWidth: 0, borderColor: 'transparent' },
        spacing: { padding: { top: 12, right: 20, bottom: 12, left: 20 } },
        size: { minHeight: { value: 44, unit: 'px' } },
      },
    },
    {
      id: 'contact.note',
      type: 'text',
      parentId: 'contact.section',
      base: {
        content: { text: 'Nova Portfolio · Based in Porto, working everywhere.' },
        typography: { fontSize: 13, lineHeight: 1.6, color: '#737373' },
      },
    },
  ]
}

export function createNovaPortfolioDocument(): TemplateDocument {
  return buildTemplateDocument({
    documentId: 'nova-portfolio-showcase',
    rootElementIds: ['intro.section', 'work.section', 'services.section', 'contact.section'],
    seeds: buildSeeds(),
  })
}

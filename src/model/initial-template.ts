import type { TemplateDocument } from './document'
import { buildTemplateDocument, type ElementSeed } from './template-builder'

/**
 * The initial template fixture.
 *
 * "Aster Labs" is an original one-page business template written for this
 * assignment. The only asset is `public/template/hero-preview.svg`, also
 * authored here. No external template, image, or licensed material is used.
 *
 * The stable assignment ids (`hero.heading`, `features.grid`, `cta.button`,
 * ...) and their tested values are load-bearing across the test suite and the
 * e2e specs; the sections around them are free to evolve.
 *
 * This module exports a factory, never a mutable singleton: each call builds
 * fresh objects, so one caller can never mutate another caller's document.
 */

const HERO_IMAGE_SRC = '/template/hero-preview.svg'

/* Palette: deep ink surfaces with an electric blue accent. */
const BG = '#05060b'
const BG_RAISED = '#0b0d15'
const PANEL = '#10131d'
const BORDER = '#232839'
const BORDER_SOFT = '#1a1f2e'
const HEADING = '#f5f7ff'
const BODY = '#9aa3b8'
const MUTED = '#667085'
const ACCENT = '#5b8def'
const ACCENT_BRIGHT = '#8ab4ff'
const ACCENT_WASH = '#141d33'
const ACCENT_EDGE = '#2b3d63'

function navSeeds(): readonly ElementSeed[] {
  return [
    {
      id: 'nav.section',
      type: 'section',
      parentId: null,
      childIds: ['nav.brand', 'nav.links', 'nav.cta'],
      base: {
        content: { accessibleLabel: 'Site navigation' },
        surface: { background: BG, borderColor: BORDER_SOFT, borderWidth: 1 },
        spacing: { padding: { top: 18, right: 64, bottom: 18, left: 64 }, gap: 24 },
        layout: {
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 14, right: 20, bottom: 14, left: 20 }, gap: 12 } },
      },
    },
    {
      id: 'nav.brand',
      type: 'container',
      parentId: 'nav.section',
      childIds: ['nav.brand.mark', 'nav.brand.name'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
        spacing: { gap: 10 },
      },
    },
    {
      id: 'nav.brand.mark',
      type: 'badge',
      parentId: 'nav.brand',
      base: {
        content: { text: '✦' },
        typography: { fontSize: 14, fontWeight: 700, color: '#ffffff' },
        surface: { background: ACCENT, borderRadius: 8 },
        spacing: { padding: { top: 4, right: 9, bottom: 4, left: 9 } },
      },
    },
    {
      id: 'nav.brand.name',
      type: 'text',
      parentId: 'nav.brand',
      base: {
        content: { text: 'Aster Labs' },
        typography: { fontSize: 16, fontWeight: 600, color: HEADING, letterSpacing: 0.2 },
      },
    },
    {
      id: 'nav.links',
      type: 'container',
      parentId: 'nav.section',
      childIds: ['nav.link.product', 'nav.link.pricing', 'nav.link.changelog'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
        spacing: { gap: 28 },
      },
      overrides: { mobile: { spacing: { gap: 14 } } },
    },
    {
      id: 'nav.link.product',
      type: 'text',
      parentId: 'nav.links',
      base: {
        content: { text: 'Product' },
        typography: { fontSize: 14, fontWeight: 500, color: BODY },
      },
    },
    {
      id: 'nav.link.pricing',
      type: 'text',
      parentId: 'nav.links',
      base: {
        content: { text: 'Pricing' },
        typography: { fontSize: 14, fontWeight: 500, color: BODY },
      },
    },
    {
      id: 'nav.link.changelog',
      type: 'text',
      parentId: 'nav.links',
      base: {
        content: { text: 'Changelog' },
        typography: { fontSize: 14, fontWeight: 500, color: BODY },
      },
    },
    {
      id: 'nav.cta',
      type: 'button',
      parentId: 'nav.section',
      base: {
        content: { text: 'Get started', href: '#hero' },
        typography: { fontSize: 14, fontWeight: 600, color: '#ffffff' },
        surface: { background: ACCENT, borderRadius: 999, borderWidth: 0, borderColor: 'transparent' },
        spacing: { padding: { top: 8, right: 18, bottom: 8, left: 18 } },
      },
    },
  ]
}

function heroSeeds(): readonly ElementSeed[] {
  return [
    {
      id: 'hero.section',
      type: 'section',
      parentId: null,
      childIds: [
        'hero.eyebrow',
        'hero.heading',
        'hero.subheading',
        'hero.actions',
        'hero.image',
      ],
      base: {
        surface: { background: BG, shadow: 'glow' },
        spacing: { padding: { top: 96, right: 64, bottom: 96, left: 64 }, gap: 24 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        typography: { textAlign: 'center' },
      },
      overrides: {
        desktop: { spacing: { padding: { top: 112, right: 96, bottom: 104, left: 96 } } },
        tablet: { spacing: { padding: { top: 72, right: 40, bottom: 72, left: 40 } } },
        mobile: {
          spacing: { padding: { top: 48, right: 20, bottom: 48, left: 20 }, gap: 16 },
          layout: { alignItems: 'start' },
          typography: { textAlign: 'left' },
        },
      },
    },
    {
      id: 'hero.eyebrow',
      type: 'badge',
      parentId: 'hero.section',
      base: {
        content: { text: 'Scoped editing, by design' },
        typography: {
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: ACCENT_BRIGHT,
        },
        surface: { background: ACCENT_WASH, borderColor: ACCENT_EDGE, borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 7, right: 16, bottom: 7, left: 16 } },
      },
    },
    {
      id: 'hero.heading',
      type: 'heading',
      parentId: 'hero.section',
      base: {
        content: { text: 'Ship a landing page without breaking the one you already have.' },
        typography: { fontSize: 56, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.2, color: HEADING },
        size: { maxWidth: { value: 800, unit: 'px' } },
      },
      overrides: {
        tablet: { typography: { fontSize: 42 } },
        mobile: { typography: { fontSize: 32, lineHeight: 1.2, textAlign: 'left' } },
      },
    },
    {
      id: 'hero.subheading',
      type: 'text',
      parentId: 'hero.section',
      base: {
        content: {
          text: 'Aster Labs helps small teams edit content, style, and layout per breakpoint, with every change reviewable before it ships.',
        },
        typography: { fontSize: 18, lineHeight: 1.65, color: BODY },
        size: { maxWidth: { value: 620, unit: 'px' } },
      },
      overrides: { mobile: { typography: { fontSize: 16, textAlign: 'left' } } },
    },
    {
      id: 'hero.actions',
      type: 'container',
      parentId: 'hero.section',
      childIds: ['hero.cta.primary', 'hero.cta.secondary'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
        spacing: { gap: 14, margin: { top: 8 } },
      },
      overrides: {
        mobile: {
          layout: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'start' },
          size: { width: { value: 100, unit: '%' } },
        },
      },
    },
    {
      id: 'hero.cta.primary',
      type: 'button',
      parentId: 'hero.actions',
      base: {
        content: { text: 'Use this template', href: '#features', accessibleLabel: 'Use this template' },
        typography: { fontSize: 16, fontWeight: 600, color: '#ffffff' },
        surface: { background: ACCENT, borderRadius: 10, borderWidth: 0, borderColor: 'transparent', shadow: 'soft' },
        spacing: { padding: { top: 13, right: 26, bottom: 13, left: 26 } },
        size: { minHeight: { value: 46, unit: 'px' } },
      },
    },
    {
      id: 'hero.cta.secondary',
      type: 'button',
      parentId: 'hero.actions',
      base: {
        content: { text: 'See how scoping works', href: '#how-it-works' },
        typography: { fontSize: 16, fontWeight: 500, color: HEADING },
        surface: { background: 'transparent', borderColor: BORDER, borderWidth: 1, borderRadius: 10 },
        spacing: { padding: { top: 13, right: 24, bottom: 13, left: 24 } },
        size: { minHeight: { value: 46, unit: 'px' } },
      },
    },
    {
      id: 'hero.image',
      type: 'image',
      parentId: 'hero.section',
      base: {
        content: {
          imageSrc: HERO_IMAGE_SRC,
          imageAlt: 'Abstract preview of the Aster Labs editor split into desktop, tablet, and mobile frames.',
        },
        size: { width: { value: 100, unit: '%' }, maxWidth: { value: 960, unit: 'px' } },
        surface: { borderRadius: 16, borderColor: BORDER, borderWidth: 1, shadow: 'glow' },
        spacing: { margin: { top: 32 } },
      },
      overrides: { mobile: { spacing: { margin: { top: 16 } }, surface: { borderRadius: 10 } } },
    },
  ]
}

function proofSeeds(): readonly ElementSeed[] {
  const brands = ['northline', 'fable', 'goodday', 'harbor', 'amberline'] as const
  const labels: Readonly<Record<(typeof brands)[number], string>> = {
    northline: 'NORTHLINE',
    fable: 'Fable&Co',
    goodday: 'goodday',
    harbor: 'HARBOR',
    amberline: 'Amberline',
  }
  return [
    {
      id: 'proof.section',
      type: 'section',
      parentId: null,
      childIds: ['proof.caption', 'proof.row'],
      base: {
        content: { accessibleLabel: 'Teams using Aster Labs' },
        surface: { background: BG, borderColor: BORDER_SOFT, borderWidth: 1 },
        spacing: { padding: { top: 40, right: 64, bottom: 40, left: 64 }, gap: 20 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 28, right: 20, bottom: 28, left: 20 }, gap: 14 } },
      },
    },
    {
      id: 'proof.caption',
      type: 'text',
      parentId: 'proof.section',
      base: {
        content: { text: 'Trusted by product teams shipping every week' },
        typography: {
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: MUTED,
        },
      },
    },
    {
      id: 'proof.row',
      type: 'container',
      parentId: 'proof.section',
      childIds: brands.map((brand) => `proof.brand.${brand}`),
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
        spacing: { gap: 44 },
      },
      overrides: {
        tablet: { spacing: { gap: 28 } },
        mobile: { layout: { display: 'grid', gridColumns: 2 }, spacing: { gap: 16 } },
      },
    },
    ...brands.map(
      (brand): ElementSeed => ({
        id: `proof.brand.${brand}`,
        type: 'badge',
        parentId: 'proof.row',
        base: {
          content: { text: labels[brand] },
          typography: { fontSize: 17, fontWeight: 700, letterSpacing: 1, color: '#3d4358' },
          surface: { background: 'transparent' },
        },
      }),
    ),
  ]
}

function featureSeeds(): readonly ElementSeed[] {
  return [
    {
      id: 'features.section',
      type: 'section',
      parentId: null,
      childIds: ['features.eyebrow', 'features.heading', 'features.intro', 'features.grid'],
      base: {
        content: { accessibleLabel: 'What you get' },
        surface: { background: BG_RAISED },
        spacing: { padding: { top: 96, right: 64, bottom: 96, left: 64 }, gap: 20 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 56, right: 20, bottom: 56, left: 20 }, gap: 14 } },
      },
    },
    {
      id: 'features.eyebrow',
      type: 'badge',
      parentId: 'features.section',
      base: {
        content: { text: 'Why Aster' },
        typography: {
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: ACCENT_BRIGHT,
        },
        surface: { background: ACCENT_WASH, borderColor: ACCENT_EDGE, borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 6, right: 14, bottom: 6, left: 14 } },
      },
    },
    {
      id: 'features.heading',
      type: 'heading',
      parentId: 'features.section',
      base: {
        content: { text: 'What you get' },
        typography: { fontSize: 40, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.8, color: HEADING },
      },
      overrides: { mobile: { typography: { fontSize: 28 } } },
    },
    {
      id: 'features.intro',
      type: 'text',
      parentId: 'features.section',
      base: {
        content: {
          text: 'One validated document behind every surface, so the canvas, the code view, and the AI all agree.',
        },
        typography: { fontSize: 17, lineHeight: 1.6, color: BODY },
        size: { maxWidth: { value: 560, unit: 'px' } },
        spacing: { margin: { bottom: 16 } },
      },
    },
    {
      id: 'features.grid',
      type: 'container',
      parentId: 'features.section',
      childIds: ['features.card.1', 'features.card.2', 'features.card.3'],
      base: {
        layout: { display: 'grid', gridColumns: 3, alignItems: 'stretch' },
        spacing: { gap: 20 },
        size: { width: { value: 100, unit: '%' } },
      },
      overrides: {
        desktop: { layout: { gridColumns: 3 } },
        tablet: { layout: { gridColumns: 2 }, spacing: { gap: 16 } },
        mobile: { layout: { gridColumns: 1 }, spacing: { gap: 12 } },
      },
    },
    ...buildFeatureCard(
      1,
      'One canonical document',
      'Canvas, code, AI, and restore all write to the same validated JSON. No surface owns its own truth.',
    ),
    ...buildFeatureCard(
      2,
      'Per-breakpoint scope',
      'Choose All, Desktop, Tablet, or Mobile before you edit. A mobile change never touches desktop.',
    ),
    ...buildFeatureCard(
      3,
      'Recoverable by element',
      'Every commit records element-scoped history, so you can roll back one card without rolling back the page.',
    ),
  ]
}

function buildFeatureCard(index: number, title: string, body: string): readonly ElementSeed[] {
  const cardId = `features.card.${index}`
  return [
    {
      id: cardId,
      type: 'card',
      parentId: 'features.grid',
      childIds: [`${cardId}.index`, `${cardId}.title`, `${cardId}.body`],
      base: {
        surface: { background: PANEL, borderColor: BORDER, borderWidth: 1, borderRadius: 14, shadow: 'soft' },
        spacing: { padding: { top: 28, right: 28, bottom: 28, left: 28 }, gap: 12 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 18, right: 18, bottom: 18, left: 18 } } },
      },
    },
    {
      id: `${cardId}.index`,
      type: 'badge',
      parentId: cardId,
      base: {
        content: { text: `0${index}` },
        typography: { fontSize: 13, fontWeight: 700, letterSpacing: 0.5, color: ACCENT_BRIGHT },
        surface: { background: ACCENT_WASH, borderColor: ACCENT_EDGE, borderWidth: 1, borderRadius: 8 },
        spacing: { padding: { top: 6, right: 10, bottom: 6, left: 10 }, margin: { bottom: 4 } },
      },
    },
    {
      id: `${cardId}.title`,
      type: 'heading',
      parentId: cardId,
      base: {
        content: { text: title },
        typography: { fontSize: 20, fontWeight: 600, lineHeight: 1.3, color: HEADING },
      },
      overrides: { mobile: { typography: { fontSize: 18 } } },
    },
    {
      id: `${cardId}.body`,
      type: 'text',
      parentId: cardId,
      base: {
        content: { text: body },
        typography: { fontSize: 15, lineHeight: 1.65, color: BODY },
      },
    },
  ]
}

function metricSeeds(): readonly ElementSeed[] {
  const metrics = [
    { key: 'speed', value: '3×', label: 'faster page updates once edits stop needing a rebuild' },
    { key: 'breakpoints', value: '0', label: 'broken breakpoints shipped since scoping became the default' },
    { key: 'review', value: '100%', label: 'of AI proposals reviewed element by element before commit' },
  ] as const
  return [
    {
      id: 'metrics.section',
      type: 'section',
      parentId: null,
      childIds: ['metrics.grid'],
      base: {
        content: { accessibleLabel: 'Results' },
        surface: { background: BG },
        spacing: { padding: { top: 72, right: 64, bottom: 72, left: 64 } },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 40, right: 20, bottom: 40, left: 20 } } },
      },
    },
    {
      id: 'metrics.grid',
      type: 'container',
      parentId: 'metrics.section',
      childIds: metrics.map((metric) => `metrics.item.${metric.key}`),
      base: {
        layout: { display: 'grid', gridColumns: 3, alignItems: 'start' },
        spacing: { gap: 24 },
      },
      overrides: { mobile: { layout: { gridColumns: 1 }, spacing: { gap: 16 } } },
    },
    ...metrics.flatMap((metric): readonly ElementSeed[] => [
      {
        id: `metrics.item.${metric.key}`,
        type: 'card',
        parentId: 'metrics.grid',
        childIds: [`metrics.item.${metric.key}.value`, `metrics.item.${metric.key}.label`],
        base: {
          surface: { background: 'transparent', borderColor: BORDER_SOFT, borderWidth: 1, borderRadius: 14 },
          spacing: { padding: { top: 24, right: 24, bottom: 24, left: 24 }, gap: 8 },
          layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
        },
      },
      {
        id: `metrics.item.${metric.key}.value`,
        type: 'heading',
        parentId: `metrics.item.${metric.key}`,
        base: {
          content: { text: metric.value },
          typography: { fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: -1, color: ACCENT_BRIGHT },
        },
        overrides: { mobile: { typography: { fontSize: 36 } } },
      },
      {
        id: `metrics.item.${metric.key}.label`,
        type: 'text',
        parentId: `metrics.item.${metric.key}`,
        base: {
          content: { text: metric.label },
          typography: { fontSize: 14, lineHeight: 1.55, color: BODY },
        },
      },
    ]),
  ]
}

function quoteSeeds(): readonly ElementSeed[] {
  return [
    {
      id: 'quote.section',
      type: 'section',
      parentId: null,
      childIds: ['quote.text', 'quote.attribution'],
      base: {
        content: { accessibleLabel: 'Customer quote' },
        surface: { background: BG_RAISED },
        spacing: { padding: { top: 88, right: 64, bottom: 88, left: 64 }, gap: 28 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        typography: { textAlign: 'center' },
      },
      overrides: {
        mobile: {
          spacing: { padding: { top: 48, right: 20, bottom: 48, left: 20 }, gap: 20 },
          layout: { alignItems: 'start' },
          typography: { textAlign: 'left' },
        },
      },
    },
    {
      id: 'quote.text',
      type: 'heading',
      parentId: 'quote.section',
      base: {
        content: {
          text: '“We stopped fearing the mobile view. Every edit lands exactly where we aimed it, and nowhere else.”',
        },
        typography: { fontSize: 30, fontWeight: 500, lineHeight: 1.4, letterSpacing: -0.4, color: HEADING },
        size: { maxWidth: { value: 780, unit: 'px' } },
      },
      overrides: { tablet: { typography: { fontSize: 25 } }, mobile: { typography: { fontSize: 21 } } },
    },
    {
      id: 'quote.attribution',
      type: 'container',
      parentId: 'quote.section',
      childIds: ['quote.avatar', 'quote.author'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
        spacing: { gap: 12 },
      },
    },
    {
      id: 'quote.avatar',
      type: 'badge',
      parentId: 'quote.attribution',
      base: {
        content: { text: 'MR' },
        typography: { fontSize: 14, fontWeight: 700, color: '#ffffff' },
        surface: { background: ACCENT, borderRadius: 999 },
        spacing: { padding: { top: 9, right: 11, bottom: 9, left: 11 } },
      },
    },
    {
      id: 'quote.author',
      type: 'text',
      parentId: 'quote.attribution',
      base: {
        content: { text: 'Mara Reyes · Head of Web, Northline' },
        typography: { fontSize: 15, fontWeight: 500, color: BODY },
      },
    },
  ]
}

function ctaSeeds(): readonly ElementSeed[] {
  return [
    {
      id: 'cta.section',
      type: 'section',
      parentId: null,
      childIds: ['cta.heading', 'cta.body', 'cta.button'],
      base: {
        surface: { background: ACCENT, borderRadius: 20, shadow: 'glow' },
        spacing: {
          padding: { top: 72, right: 64, bottom: 72, left: 64 },
          gap: 16,
          margin: { top: 24, left: 64, right: 64, bottom: 24 },
        },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        typography: { textAlign: 'center' },
      },
      overrides: {
        mobile: {
          spacing: {
            padding: { top: 40, right: 20, bottom: 40, left: 20 },
            margin: { top: 12, left: 16, right: 16, bottom: 12 },
          },
          layout: { alignItems: 'stretch' },
        },
      },
    },
    {
      id: 'cta.heading',
      type: 'heading',
      parentId: 'cta.section',
      base: {
        content: { text: 'Edit with a safety net' },
        typography: { fontSize: 36, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.6, color: '#ffffff' },
      },
      overrides: { mobile: { typography: { fontSize: 26 } } },
    },
    {
      id: 'cta.body',
      type: 'text',
      parentId: 'cta.section',
      base: {
        content: { text: 'Review every proposed change per element before it becomes part of the page.' },
        typography: { fontSize: 17, lineHeight: 1.6, color: '#dbe6ff' },
        size: { maxWidth: { value: 520, unit: 'px' } },
      },
    },
    {
      id: 'cta.button',
      type: 'button',
      parentId: 'cta.section',
      base: {
        content: { text: 'Start editing', href: '#hero', accessibleLabel: 'Start editing this template' },
        typography: { fontSize: 16, fontWeight: 700, color: '#1d4ed8' },
        surface: { background: '#ffffff', borderRadius: 999, borderWidth: 0, borderColor: 'transparent', shadow: 'soft' },
        spacing: { padding: { top: 13, right: 28, bottom: 13, left: 28 }, margin: { top: 8 } },
        size: { minHeight: { value: 46, unit: 'px' } },
      },
    },
  ]
}

function footerSeeds(): readonly ElementSeed[] {
  return [
    {
      id: 'footer.section',
      type: 'section',
      parentId: null,
      childIds: ['footer.top', 'footer.note'],
      base: {
        surface: { background: BG, borderColor: BORDER_SOFT, borderWidth: 1 },
        spacing: { padding: { top: 40, right: 64, bottom: 40, left: 64 }, gap: 20 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        typography: { textAlign: 'center' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 28, right: 20, bottom: 28, left: 20 }, gap: 14 } },
      },
    },
    {
      id: 'footer.top',
      type: 'container',
      parentId: 'footer.section',
      childIds: ['footer.brand', 'footer.tagline'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
        spacing: { gap: 12 },
      },
      overrides: { mobile: { layout: { flexDirection: 'column' }, spacing: { gap: 6 } } },
    },
    {
      id: 'footer.brand',
      type: 'badge',
      parentId: 'footer.top',
      base: {
        content: { text: '✦ Aster Labs' },
        typography: { fontSize: 15, fontWeight: 700, color: HEADING },
        surface: { background: 'transparent' },
      },
    },
    {
      id: 'footer.tagline',
      type: 'text',
      parentId: 'footer.top',
      base: {
        content: { text: 'Every breakpoint, on purpose.' },
        typography: { fontSize: 14, fontWeight: 500, color: MUTED },
      },
    },
    {
      id: 'footer.note',
      type: 'text',
      parentId: 'footer.section',
      base: {
        content: { text: 'Aster Labs - an original demo template built for the Scoped AI Template Editor.' },
        typography: { fontSize: 13, lineHeight: 1.6, color: MUTED },
      },
    },
  ]
}

function buildSeeds(): readonly ElementSeed[] {
  return [
    ...navSeeds(),
    ...heroSeeds(),
    ...proofSeeds(),
    ...featureSeeds(),
    ...metricSeeds(),
    ...quoteSeeds(),
    ...ctaSeeds(),
    ...footerSeeds(),
  ]
}

export const INITIAL_DOCUMENT_ID = 'aster-labs-onepager'

export const INITIAL_ROOT_ELEMENT_IDS: readonly string[] = [
  'nav.section',
  'hero.section',
  'proof.section',
  'features.section',
  'metrics.section',
  'quote.section',
  'cta.section',
  'footer.section',
]

/**
 * Builds a fresh, fully validated initial document. Every call returns an
 * independent deep copy; nothing is shared between invocations.
 */
export function createInitialTemplateDocument(): TemplateDocument {
  return buildTemplateDocument({
    documentId: INITIAL_DOCUMENT_ID,
    rootElementIds: INITIAL_ROOT_ELEMENT_IDS,
    seeds: buildSeeds(),
  })
}

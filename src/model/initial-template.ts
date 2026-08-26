import { elementId, documentId, type ElementId } from './ids'
import type { ElementOverrides, ElementType, TemplateElement } from './element'
import type { EditableProperties } from './properties'
import { parseTemplateDocument, SCHEMA_VERSION, type TemplateDocument } from './document'

/**
 * The initial template fixture.
 *
 * "Aster Labs" is an original one-page business template written for this
 * assignment. The only asset is `public/template/hero-preview.svg`, also
 * authored here. No external template, image, or licensed material is used.
 *
 * This module exports a factory, never a mutable singleton: each call builds
 * fresh objects, so one caller can never mutate another caller's document.
 */

interface ElementSeed {
  readonly id: string
  readonly type: ElementType
  readonly parentId: string | null
  readonly childIds?: readonly string[]
  readonly base: EditableProperties
  readonly overrides?: ElementOverrides
}

const HERO_IMAGE_SRC = '/template/hero-preview.svg'

function buildSeeds(): readonly ElementSeed[] {
  return [
    /* ------------------------------- hero ------------------------------- */
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
        surface: { background: '#050506', shadow: 'glow' },
        spacing: { padding: { top: 96, right: 64, bottom: 96, left: 64 }, gap: 24 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        typography: { textAlign: 'center' },
      },
      overrides: {
        desktop: { spacing: { padding: { top: 120, right: 96, bottom: 120, left: 96 } } },
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
        typography: { fontSize: 13, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: '#8ab4ff' },
        surface: { background: 'transparent', borderColor: '#3f3f46', borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 6, right: 14, bottom: 6, left: 14 } },
      },
    },
    {
      id: 'hero.heading',
      type: 'heading',
      parentId: 'hero.section',
      base: {
        content: { text: 'Ship a landing page without breaking the one you already have.' },
        typography: { fontSize: 56, fontWeight: 700, lineHeight: 1.1, color: '#fafafa' },
        size: { maxWidth: { value: 760, unit: 'px' } },
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
        typography: { fontSize: 18, lineHeight: 1.6, color: '#a3a3a3' },
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
        spacing: { gap: 12, margin: { top: 8 } },
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
        surface: { background: '#5b8def', borderRadius: 8, borderWidth: 0, borderColor: 'transparent' },
        spacing: { padding: { top: 12, right: 20, bottom: 12, left: 20 } },
        size: { minHeight: { value: 44, unit: 'px' } },
      },
    },
    {
      id: 'hero.cta.secondary',
      type: 'button',
      parentId: 'hero.actions',
      base: {
        content: { text: 'See how scoping works', href: '#how-it-works' },
        typography: { fontSize: 16, fontWeight: 500, color: '#fafafa' },
        surface: { background: 'transparent', borderColor: '#3f3f46', borderWidth: 1, borderRadius: 8 },
        spacing: { padding: { top: 12, right: 20, bottom: 12, left: 20 } },
        size: { minHeight: { value: 44, unit: 'px' } },
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
        size: { width: { value: 100, unit: '%' }, maxWidth: { value: 880, unit: 'px' } },
        surface: { borderRadius: 12, borderColor: '#262626', borderWidth: 1 },
        spacing: { margin: { top: 24 } },
      },
      overrides: { mobile: { spacing: { margin: { top: 16 } }, surface: { borderRadius: 8 } } },
    },

    /* ----------------------------- features ----------------------------- */
    {
      id: 'features.section',
      type: 'section',
      parentId: null,
      childIds: ['features.heading', 'features.grid'],
      base: {
        content: { accessibleLabel: 'What you get' },
        surface: { background: '#09090b' },
        spacing: { padding: { top: 80, right: 64, bottom: 80, left: 64 }, gap: 32 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 48, right: 20, bottom: 48, left: 20 }, gap: 20 } },
      },
    },
    {
      id: 'features.heading',
      type: 'heading',
      parentId: 'features.section',
      base: {
        content: { text: 'What you get' },
        typography: { fontSize: 36, fontWeight: 600, lineHeight: 1.2, color: '#fafafa' },
      },
      overrides: { mobile: { typography: { fontSize: 26 } } },
    },
    {
      id: 'features.grid',
      type: 'container',
      parentId: 'features.section',
      childIds: ['features.card.1', 'features.card.2', 'features.card.3'],
      base: {
        layout: { display: 'grid', gridColumns: 3, alignItems: 'stretch' },
        spacing: { gap: 20 },
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

    /* -------------------------------- cta -------------------------------- */
    {
      id: 'cta.section',
      type: 'section',
      parentId: null,
      childIds: ['cta.heading', 'cta.body', 'cta.button'],
      base: {
        surface: { background: '#0f1013', borderRadius: 16, borderColor: '#262626', borderWidth: 1 },
        spacing: { padding: { top: 64, right: 64, bottom: 64, left: 64 }, gap: 16, margin: { left: 64, right: 64 } },
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
      id: 'cta.heading',
      type: 'heading',
      parentId: 'cta.section',
      base: {
        content: { text: 'Edit with a safety net' },
        typography: { fontSize: 32, fontWeight: 600, lineHeight: 1.2, color: '#fafafa' },
      },
      overrides: { mobile: { typography: { fontSize: 24 } } },
    },
    {
      id: 'cta.body',
      type: 'text',
      parentId: 'cta.section',
      base: {
        content: { text: 'Review every proposed change per element before it becomes part of the page.' },
        typography: { fontSize: 16, lineHeight: 1.6, color: '#a3a3a3' },
      },
    },
    {
      id: 'cta.button',
      type: 'button',
      parentId: 'cta.section',
      base: {
        content: { text: 'Start editing', href: '#hero', accessibleLabel: 'Start editing this template' },
        typography: { fontSize: 16, fontWeight: 600, color: '#ffffff' },
        surface: { background: '#5b8def', borderRadius: 8, borderWidth: 0, borderColor: 'transparent' },
        spacing: { padding: { top: 12, right: 20, bottom: 12, left: 20 } },
        size: { minHeight: { value: 44, unit: 'px' } },
      },
    },

    /* ------------------------------ footer ------------------------------ */
    {
      id: 'footer.section',
      type: 'section',
      parentId: null,
      childIds: ['footer.note'],
      base: {
        surface: { background: '#050506', borderColor: '#262626', borderWidth: 1 },
        spacing: { padding: { top: 32, right: 64, bottom: 32, left: 64 } },
        layout: { display: 'flex', flexDirection: 'row', justifyContent: 'center' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 24, right: 20, bottom: 24, left: 20 } } },
      },
    },
    {
      id: 'footer.note',
      type: 'text',
      parentId: 'footer.section',
      base: {
        content: { text: 'Aster Labs - an original demo template built for the Scoped AI Template Editor.' },
        typography: { fontSize: 14, lineHeight: 1.6, color: '#737373' },
      },
    },
  ]
}

function buildFeatureCard(index: number, title: string, body: string): readonly ElementSeed[] {
  const cardId = `features.card.${index}`
  return [
    {
      id: cardId,
      type: 'card',
      parentId: 'features.grid',
      childIds: [`${cardId}.title`, `${cardId}.body`],
      base: {
        surface: { background: '#0f1013', borderColor: '#262626', borderWidth: 1, borderRadius: 12 },
        spacing: { padding: { top: 24, right: 24, bottom: 24, left: 24 }, gap: 8 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'start' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 16, right: 16, bottom: 16, left: 16 } } },
      },
    },
    {
      id: `${cardId}.title`,
      type: 'heading',
      parentId: cardId,
      base: {
        content: { text: title },
        typography: { fontSize: 20, fontWeight: 600, lineHeight: 1.3, color: '#fafafa' },
      },
      overrides: { mobile: { typography: { fontSize: 18 } } },
    },
    {
      id: `${cardId}.body`,
      type: 'text',
      parentId: cardId,
      base: {
        content: { text: body },
        typography: { fontSize: 15, lineHeight: 1.6, color: '#a3a3a3' },
      },
    },
  ]
}

function toElement(seed: ElementSeed): TemplateElement {
  return {
    id: elementId(seed.id),
    type: seed.type,
    parentId: seed.parentId === null ? null : elementId(seed.parentId),
    childIds: (seed.childIds ?? []).map(elementId),
    base: seed.base,
    overrides: seed.overrides ?? {},
    revision: 0,
  }
}

export const INITIAL_DOCUMENT_ID = 'aster-labs-onepager'

export const INITIAL_ROOT_ELEMENT_IDS: readonly string[] = [
  'hero.section',
  'features.section',
  'cta.section',
  'footer.section',
]

/**
 * Builds a fresh, fully validated initial document. Every call returns an
 * independent deep copy; nothing is shared between invocations.
 */
export function createInitialTemplateDocument(): TemplateDocument {
  const elements: Record<ElementId, TemplateElement> = {}
  for (const seed of buildSeeds()) {
    elements[elementId(seed.id)] = toElement(seed)
  }

  const candidate = {
    id: documentId(INITIAL_DOCUMENT_ID),
    schemaVersion: SCHEMA_VERSION,
    revision: 0,
    rootElementIds: INITIAL_ROOT_ELEMENT_IDS.map(elementId),
    elements,
    history: {},
  }

  const result = parseTemplateDocument(candidate)
  if (!result.ok) {
    // A failure here is a programming error in the fixture, not user input.
    throw new Error(
      `Initial template fixture is invalid: ${result.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`,
    )
  }
  return result.value
}

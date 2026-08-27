import { mergeEditableProperties } from '../engine/responsive-resolver'
import { parseTemplateDocument, type TemplateDocument } from './document'
import type { TemplateElement } from './element'
import { documentId, type ElementId } from './ids'
import { createInitialTemplateDocument } from './initial-template'
import type { EditablePropertyPatch } from './properties'

interface TemplateVariant {
  readonly documentId: string
  readonly changes: Readonly<Record<string, EditablePropertyPatch>>
}

function createTemplateVariant(variant: TemplateVariant): TemplateDocument {
  const source = createInitialTemplateDocument()
  const elements: Record<ElementId, TemplateElement> = {}

  for (const element of Object.values(source.elements)) {
    const changes = variant.changes[element.id]
    elements[element.id] = {
      ...element,
      base: mergeEditableProperties(element.base, changes),
    }
  }

  const parsed = parseTemplateDocument({
    ...source,
    id: documentId(variant.documentId),
    revision: 0,
    elements,
    history: {},
  })

  if (!parsed.ok) {
    throw new Error(
      `Template variant ${variant.documentId} is invalid: ${parsed.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`,
    )
  }

  return parsed.value
}

function featureCopy(
  first: readonly [string, string],
  second: readonly [string, string],
  third: readonly [string, string],
): Readonly<Record<string, EditablePropertyPatch>> {
  return {
    'features.card.1.title': { content: { text: first[0] } },
    'features.card.1.body': { content: { text: first[1] } },
    'features.card.2.title': { content: { text: second[0] } },
    'features.card.2.body': { content: { text: second[1] } },
    'features.card.3.title': { content: { text: third[0] } },
    'features.card.3.body': { content: { text: third[1] } },
  }
}

function cardSurfaces(
  background: string,
  borderColor: string,
): Readonly<Record<string, EditablePropertyPatch>> {
  return Object.fromEntries(
    [1, 2, 3].map((index) => [
      `features.card.${index}`,
      { surface: { background, borderColor } },
    ]),
  )
}

export function createNovaPortfolioDocument(): TemplateDocument {
  return createTemplateVariant({
    documentId: 'nova-portfolio-onepager',
    changes: {
      'hero.section': { surface: { background: '#0f1115', shadow: 'soft' } },
      'hero.eyebrow': {
        content: { text: 'Product designer · Available' },
        typography: { color: '#fbbf24' },
        surface: { borderColor: '#4d4530' },
      },
      'hero.heading': { content: { text: 'Digital products with clarity and character.' } },
      'hero.subheading': {
        content: {
          text: 'I help early-stage teams turn complex ideas into focused interfaces people enjoy using.',
        },
      },
      'hero.cta.primary': {
        content: { text: 'View selected work', accessibleLabel: 'View selected work' },
        typography: { color: '#050506' },
        surface: { background: '#fbbf24' },
      },
      'hero.cta.secondary': { content: { text: 'Read my story' } },
      'hero.image': {
        content: {
          imageSrc: '/template/nova-portfolio.svg',
          imageAlt: 'A compact portfolio board with three featured design projects.',
        },
        surface: { borderColor: '#4d4530' },
      },
      'features.section': { surface: { background: '#0b0d10' } },
      'features.heading': { content: { text: 'Selected work' } },
      ...cardSurfaces('#151820', '#343943'),
      ...featureCopy(
        ['Northline', 'A calmer planning experience for distributed product teams.'],
        ['Fable', 'A flexible identity and storefront for a modern publishing studio.'],
        ['Goodday', 'A mobile-first wellbeing product shaped around simple daily rituals.'],
      ),
      'cta.section': { surface: { background: '#151820', borderColor: '#343943' } },
      'cta.heading': { content: { text: 'Let’s make something useful.' } },
      'cta.body': { content: { text: 'Have an ambitious product idea? I would love to hear about it.' } },
      'cta.button': {
        content: { text: 'Start a conversation', accessibleLabel: 'Start a conversation' },
        typography: { color: '#050506' },
        surface: { background: '#fbbf24' },
      },
      'footer.section': { surface: { background: '#0f1115', borderColor: '#343943' } },
      'footer.note': { content: { text: 'Nova Portfolio · Independent product designer.' } },
    },
  })
}

export function createOrbitMetricsDocument(): TemplateDocument {
  return createTemplateVariant({
    documentId: 'orbit-metrics-onepager',
    changes: {
      'hero.section': { surface: { background: '#06110d', shadow: 'glow' } },
      'hero.eyebrow': {
        content: { text: 'Product analytics · Live' },
        typography: { color: '#6ee7b7' },
        surface: { borderColor: '#23483b' },
      },
      'hero.heading': { content: { text: 'Your product signals, finally in one orbit.' } },
      'hero.subheading': {
        content: {
          text: 'Connect the events that matter, spot changes early, and give every team one clear view of growth.',
        },
      },
      'hero.cta.primary': {
        content: { text: 'Explore the dashboard', accessibleLabel: 'Explore the dashboard' },
        typography: { color: '#050506' },
        surface: { background: '#34d399' },
      },
      'hero.cta.secondary': { content: { text: 'See sample report' } },
      'hero.image': {
        content: {
          imageSrc: '/template/orbit-metrics.svg',
          imageAlt: 'A dark analytics dashboard with metrics, line charts, and an activity feed.',
        },
        surface: { borderColor: '#23483b' },
      },
      'features.section': { surface: { background: '#07130f' } },
      'features.heading': { content: { text: 'One view, fewer guesses' } },
      ...cardSurfaces('#0b1713', '#23483b'),
      ...featureCopy(
        ['Live signals', 'Follow activation, retention, and revenue as the numbers move.'],
        ['Shared context', 'Keep product, marketing, and founders aligned around the same facts.'],
        ['Useful alerts', 'Get a concise explanation when an important metric changes.'],
      ),
      'cta.section': { surface: { background: '#0b1713', borderColor: '#23483b' } },
      'cta.heading': { content: { text: 'See the story behind the numbers.' } },
      'cta.body': { content: { text: 'Start with the metrics your team already cares about.' } },
      'cta.button': {
        content: { text: 'Open a sample workspace', accessibleLabel: 'Open a sample workspace' },
        typography: { color: '#050506' },
        surface: { background: '#34d399' },
      },
      'footer.section': { surface: { background: '#06110d', borderColor: '#23483b' } },
      'footer.note': { content: { text: 'Orbit Metrics · Clear product analytics for small teams.' } },
    },
  })
}

export function createLumaStudioDocument(): TemplateDocument {
  return createTemplateVariant({
    documentId: 'luma-studio-onepager',
    changes: {
      'hero.section': { surface: { background: '#120911', shadow: 'glow' } },
      'hero.eyebrow': {
        content: { text: 'Independent creative studio' },
        typography: { color: '#f9a8d4' },
        surface: { borderColor: '#5d2f54' },
      },
      'hero.heading': { content: { text: 'A launch page as bold as the idea behind it.' } },
      'hero.subheading': {
        content: {
          text: 'Strategy, identity, and expressive digital design for teams ready to make a memorable first impression.',
        },
      },
      'hero.cta.primary': {
        content: { text: 'Plan a launch', accessibleLabel: 'Plan a launch' },
        typography: { color: '#050506' },
        surface: { background: '#f472b6' },
      },
      'hero.cta.secondary': { content: { text: 'See recent work' } },
      'hero.image': {
        content: {
          imageSrc: '/template/luma-studio.svg',
          imageAlt: 'A bright creative campaign board with gradient posters and geometric shapes.',
        },
        surface: { borderColor: '#5d2f54' },
      },
      'features.section': { surface: { background: '#10080f' } },
      'features.heading': { content: { text: 'Built for launch day' } },
      ...cardSurfaces('#1a0e18', '#4a2842'),
      ...featureCopy(
        ['Find the angle', 'Turn the strongest product truth into a sharp campaign idea.'],
        ['Shape the system', 'Build a visual language that stays recognizable across every touchpoint.'],
        ['Make it move', 'Bring the story to life with responsive layouts and purposeful motion.'],
      ),
      'cta.section': { surface: { background: '#1a0e18', borderColor: '#4a2842' } },
      'cta.heading': { content: { text: 'Ready to make some noise?' } },
      'cta.body': { content: { text: 'Tell us what you are launching and where you want it to go.' } },
      'cta.button': {
        content: { text: 'Book a studio call', accessibleLabel: 'Book a studio call' },
        typography: { color: '#050506' },
        surface: { background: '#f472b6' },
      },
      'footer.section': { surface: { background: '#120911', borderColor: '#4a2842' } },
      'footer.note': { content: { text: 'Luma Studio · Brands and launch experiences.' } },
    },
  })
}

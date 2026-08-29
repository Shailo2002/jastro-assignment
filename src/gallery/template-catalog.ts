import type { TemplateDocument } from '../model/document'
import { createInitialTemplateDocument } from '../model/initial-template'
import { createKindredGoodsDocument } from '../model/templates/kindred-goods'
import { createLumaAssistantDocument } from '../model/templates/luma-assistant'
import { createNovaPortfolioDocument } from '../model/templates/nova-portfolio'
import { createOrbitMetricsDocument } from '../model/templates/orbit-metrics'
import { createWaypointSummitDocument } from '../model/templates/waypoint-summit'

/**
 * App-level template metadata. This is configuration, not durable editor state:
 * a catalog entry points to a factory that creates a valid canonical document.
 *
 * Each catalog entry is a structurally different page - landing page,
 * portfolio, dashboard, chat interface, storefront, event site - built from
 * its own element tree, not a re-skin of one shared layout.
 */
export type TemplateCategory =
  | 'Marketing'
  | 'Portfolio'
  | 'SaaS'
  | 'AI'
  | 'Commerce'
  | 'Event'

export interface TemplateCatalogItem {
  readonly id: string
  readonly name: string
  readonly category: TemplateCategory
  readonly description: string
  readonly tags: readonly string[]
  readonly createDocument: () => TemplateDocument
}

export const TEMPLATE_CATALOG: readonly TemplateCatalogItem[] = [
  {
    id: 'aster-labs',
    name: 'Aster Labs',
    category: 'Marketing',
    description:
      'A dark AI product landing page with nav, hero, social proof, metrics, testimonial, and call to action.',
    tags: ['Landing page', 'Responsive'],
    createDocument: createInitialTemplateDocument,
  },
  {
    id: 'nova-portfolio',
    name: 'Nova Portfolio',
    category: 'Portfolio',
    description: 'A personal portfolio with a case-study grid, services row, and contact card.',
    tags: ['Portfolio', 'Case studies'],
    createDocument: createNovaPortfolioDocument,
  },
  {
    id: 'orbit-metrics',
    name: 'Orbit Metrics',
    category: 'SaaS',
    description: 'An analytics dashboard with a KPI row, growth chart, and live activity feed.',
    tags: ['Dashboard', 'Analytics'],
    createDocument: createOrbitMetricsDocument,
  },
  {
    id: 'luma-assistant',
    name: 'Luma Assistant',
    category: 'AI',
    description: 'An AI chat interface with a message thread, suggested prompts, and composer.',
    tags: ['Chatbot', 'Conversational'],
    createDocument: createLumaAssistantDocument,
  },
  {
    id: 'kindred-goods',
    name: 'Kindred Goods',
    category: 'Commerce',
    description: 'A warm storefront with an announcement bar, product grid, and newsletter strip.',
    tags: ['Storefront', 'Light'],
    createDocument: createKindredGoodsDocument,
  },
  {
    id: 'waypoint-summit',
    name: 'Waypoint Summit',
    category: 'Event',
    description:
      'A night-sky conference site with tracks, a day-one agenda, speakers, and tiered ticket passes.',
    tags: ['Agenda', 'Tickets'],
    createDocument: createWaypointSummitDocument,
  },
]

export function getTemplate(templateId: string): TemplateCatalogItem | undefined {
  return TEMPLATE_CATALOG.find((template) => template.id === templateId)
}

import type { TemplateDocument } from '../model/document'
import { createInitialTemplateDocument } from '../model/initial-template'
import {
  createLumaStudioDocument,
  createNovaPortfolioDocument,
  createOrbitMetricsDocument,
} from '../model/template-variants'

/**
 * App-level template metadata. This is configuration, not durable editor state:
 * a catalog entry points to a factory that creates a valid canonical document.
 */
export type TemplateCategory = 'Marketing' | 'Portfolio' | 'SaaS'

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
    description: 'A responsive AI product landing page with hero, features, call to action, and footer.',
    tags: ['Responsive', 'Original'],
    createDocument: createInitialTemplateDocument,
  },
  {
    id: 'nova-portfolio',
    name: 'Nova Portfolio',
    category: 'Portfolio',
    description: 'A compact personal portfolio for product designers and independent creatives.',
    tags: ['Responsive', 'Minimal'],
    createDocument: createNovaPortfolioDocument,
  },
  {
    id: 'orbit-metrics',
    name: 'Orbit Metrics',
    category: 'SaaS',
    description: 'A focused analytics landing page with a dashboard-led product story.',
    tags: ['Responsive', 'Dashboard'],
    createDocument: createOrbitMetricsDocument,
  },
  {
    id: 'luma-studio',
    name: 'Luma Studio',
    category: 'Marketing',
    description: 'A vibrant studio landing page for launches, campaigns, and creative services.',
    tags: ['Responsive', 'Creative'],
    createDocument: createLumaStudioDocument,
  },
]

export function getTemplate(templateId: string): TemplateCatalogItem | undefined {
  return TEMPLATE_CATALOG.find((template) => template.id === templateId)
}

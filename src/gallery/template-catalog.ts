import type { TemplateDocument } from '../model/document'
import { createInitialTemplateDocument } from '../model/initial-template'

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
]

export function getTemplate(templateId: string): TemplateCatalogItem | undefined {
  return TEMPLATE_CATALOG.find((template) => template.id === templateId)
}

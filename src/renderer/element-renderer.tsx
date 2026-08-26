import type { JSX, ReactNode } from 'react'

import type { ResolvedDocument, ResolvedElement } from '../engine/responsive-resolver'
import type { ElementId } from '../model/ids'
import { propertiesToStyle } from './style-mapping'

/**
 * Element renderers.
 *
 * The canonical document is rendered through ordinary typed React components,
 * one per allowed element type. Nothing here compiles or evaluates source from
 * the document: an element type outside the closed set simply is not rendered.
 *
 * Children come from `childIds`, i.e. the stable relationships in the document,
 * never from DOM position. Invalid structures - a missing child, a cycle, or
 * absurd nesting - are guarded rather than allowed to crash the editor.
 */

/** Depth guard; the fixture nests four levels, so this is generous. */
const MAX_DEPTH = 24

interface RenderContext {
  readonly document: ResolvedDocument
  /** Ids on the current path, used to break reference cycles. */
  readonly ancestors: ReadonlySet<ElementId>
  readonly depth: number
}

/**
 * Heading level from structure, not from data.
 *
 * The editor shell owns the page `h1`; the previewed template starts at `h2`
 * for a section's own heading and uses `h3` deeper, so no level is skipped.
 */
function headingTag(element: ResolvedElement, context: RenderContext): 'h2' | 'h3' {
  const parentId = element.parentId
  if (parentId !== null && context.document.rootElementIds.includes(parentId)) return 'h2'
  return 'h3'
}

function renderChildren(element: ResolvedElement, context: RenderContext): ReactNode {
  if (element.childIds.length === 0) return null

  const nested: RenderContext = {
    document: context.document,
    ancestors: new Set([...context.ancestors, element.id]),
    depth: context.depth + 1,
  }

  return element.childIds.map((childId) => (
    <RenderedElement key={childId} elementId={childId} context={nested} />
  ))
}

function TemplateSection(props: { element: ResolvedElement; context: RenderContext }): JSX.Element {
  const { element, context } = props
  const label = element.properties.content?.accessibleLabel
  return (
    <section
      data-element-id={element.id}
      style={propertiesToStyle(element.properties)}
      {...(label === undefined ? {} : { 'aria-label': label })}
    >
      {renderChildren(element, context)}
    </section>
  )
}

function TemplateContainer(props: {
  element: ResolvedElement
  context: RenderContext
}): JSX.Element {
  const { element, context } = props
  return (
    <div data-element-id={element.id} style={propertiesToStyle(element.properties)}>
      {renderChildren(element, context)}
    </div>
  )
}

function TemplateHeading(props: {
  element: ResolvedElement
  context: RenderContext
}): JSX.Element {
  const { element, context } = props
  const Tag = headingTag(element, context)
  return (
    <Tag data-element-id={element.id} style={propertiesToStyle(element.properties)}>
      {element.properties.content?.text ?? ''}
    </Tag>
  )
}

function TemplateText(props: { element: ResolvedElement }): JSX.Element {
  const { element } = props
  return (
    <p data-element-id={element.id} style={propertiesToStyle(element.properties)}>
      {element.properties.content?.text ?? ''}
    </p>
  )
}

function TemplateBadge(props: { element: ResolvedElement }): JSX.Element {
  const { element } = props
  return (
    <span data-element-id={element.id} style={propertiesToStyle(element.properties)}>
      {element.properties.content?.text ?? ''}
    </span>
  )
}

function TemplateButton(props: { element: ResolvedElement }): JSX.Element {
  const { element } = props
  const content = element.properties.content
  const style = propertiesToStyle(element.properties)
  const label = content?.accessibleLabel
  const text = content?.text ?? ''

  // A call to action with a destination is a link; without one it is a button.
  if (content?.href !== undefined) {
    return (
      <a
        data-element-id={element.id}
        href={content.href}
        style={{
          ...style,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          // A call-to-action renders as a button, not as inline body copy.
          textDecoration: 'none',
        }}
        {...(label === undefined ? {} : { 'aria-label': label })}
      >
        {text}
      </a>
    )
  }

  return (
    <button
      type="button"
      data-element-id={element.id}
      style={style}
      {...(label === undefined ? {} : { 'aria-label': label })}
    >
      {text}
    </button>
  )
}

function TemplateImage(props: { element: ResolvedElement }): JSX.Element | null {
  const { element } = props
  const content = element.properties.content
  if (content?.imageSrc === undefined) return null

  return (
    <img
      data-element-id={element.id}
      src={content.imageSrc}
      alt={content.imageAlt ?? ''}
      style={propertiesToStyle(element.properties)}
    />
  )
}

function RenderedElement(props: {
  elementId: ElementId
  context: RenderContext
}): JSX.Element | null {
  const { elementId, context } = props

  if (context.depth > MAX_DEPTH) return null
  // A child that points back into its own ancestry would recurse forever.
  if (context.ancestors.has(elementId)) return null

  const element = context.document.elements[elementId]
  // A dangling child id is skipped; the rest of the page still renders.
  if (element === undefined) return null

  switch (element.type) {
    case 'section':
      return <TemplateSection element={element} context={context} />
    case 'container':
    case 'card':
      return <TemplateContainer element={element} context={context} />
    case 'heading':
      return <TemplateHeading element={element} context={context} />
    case 'text':
      return <TemplateText element={element} />
    case 'badge':
      return <TemplateBadge element={element} />
    case 'button':
      return <TemplateButton element={element} />
    case 'image':
      return <TemplateImage element={element} />
  }
}

/** Renders one resolved document, roots first, in document order. */
export function RenderedTemplate(props: { document: ResolvedDocument }): JSX.Element {
  const context: RenderContext = {
    document: props.document,
    ancestors: new Set<ElementId>(),
    depth: 0,
  }

  return (
    <>
      {props.document.rootElementIds.map((rootId) => (
        <RenderedElement key={rootId} elementId={rootId} context={context} />
      ))}
    </>
  )
}

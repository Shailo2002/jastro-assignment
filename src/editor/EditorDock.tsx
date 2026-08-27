import type { JSX, ReactNode } from 'react'

import { Icon } from './Icon'

/**
 * A right-hand dock.
 *
 * Design and Layers are opened on demand from the toolbar rather than holding a
 * permanent column, so the preview keeps the width it needs. Each dock is a
 * disclosure, not a modal: the canvas underneath stays selectable while a dock
 * is open, focus is never stolen when one opens, and both docks can be open at
 * once.
 *
 * The dock is hidden rather than unmounted, so opening and closing it can never
 * discard the panel's own state - the layers tree keeps its roving focus
 * position and scroll offset, and the inspector keeps its pending error.
 *
 * Closing is available three ways: the toolbar toggle, the close button, and
 * Escape. All three return focus to the toggle that owns the dock, so a
 * keyboard user is never left on a control that has just left the page. Escape
 * is ignored when the panel inside has already handled it - clearing a
 * selection from the layers tree must not also close the tree.
 */
export function EditorDock(props: {
  /** Id the owning toolbar toggle points at with `aria-controls`. */
  id: string
  /** Id of the heading rendered by the panel inside; names the dock. */
  labelledBy: string
  /** Visible title of the panel, used for the close button's name. */
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}): JSX.Element {
  return (
    <aside
      className="dock"
      id={props.id}
      aria-labelledby={props.labelledBy}
      hidden={!props.open}
      onKeyDown={(event) => {
        // `defaultPrevented` means the panel inside already answered Escape.
        if (event.key !== 'Escape' || event.defaultPrevented) return
        event.preventDefault()
        props.onClose()
      }}
    >
      <div className="dock__chrome">
        <button
          type="button"
          className="icon-button dock__close"
          aria-label={`Close ${props.title}`}
          title={`Close ${props.title}`}
          onClick={props.onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="dock__body">{props.children}</div>
    </aside>
  )
}

import type { JSX, ReactNode } from 'react'

import { IconButton } from './controls'

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
      className="pointer-events-auto relative flex w-[min(320px,calc(100vw-var(--space-4)))]
        min-h-0 flex-col overflow-hidden rounded-panel border border-default bg-surface-shell
        shadow-raised max-[900px]:w-full max-[900px]:rounded-none"
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
      {/* The close control floats over the corner rather than taking a row of
          its own, so the panel's own heading stays the first thing in the dock. */}
      <div className="absolute end-2 top-2 z-[1]">
        <IconButton
          type="button"
          icon="close"
          aria-label={`Close ${props.title}`}
          title={`Close ${props.title}`}
          onClick={props.onClose}
        />
      </div>
      {/* Panel headings inside keep clear of the floating close control. */}
      <div className="min-h-0 flex-1 overflow-auto p-4 [&_h2]:pe-touch">{props.children}</div>
    </aside>
  )
}

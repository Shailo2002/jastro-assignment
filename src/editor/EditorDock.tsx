import type { JSX, ReactNode } from 'react'

import { IconButton } from './controls'

/**
 * A right-hand dock.
 *
 * One dock is shown at a time, chosen by the toolbar's panel switcher, so the
 * preview keeps one predictable width. A dock is a disclosure, not a modal: the
 * canvas underneath stays selectable while it is open, and focus is never
 * stolen when one opens.
 *
 * The dock is hidden rather than unmounted, so opening and closing it can never
 * discard the panel's own state - the layers tree keeps its roving focus
 * position and scroll offset, and the inspector keeps its pending error.
 *
 * A dock that can be dismissed is given `onClose`, and then closing is
 * available two ways - the close button and Escape - both of which return focus
 * to the control that owns the dock, so a keyboard user is never left on a
 * control that has just left the page. Escape is ignored when the panel inside
 * has already handled it - clearing a selection from the layers tree must not
 * also close the tree. Without `onClose` the dock is a permanent region of the
 * shell and renders no close control at all.
 */
export function EditorDock(props: {
  /** Id the owning toolbar toggle points at with `aria-controls`. */
  id: string
  /** Id of the heading rendered by the panel inside; names the dock. */
  labelledBy: string
  /** Visible title of the panel, used for the close button's name. */
  title: string
  open: boolean
  /** Omitted when the dock is always present and only its contents change. */
  onClose?: () => void
  /** Wider dock for a panel that holds code rather than controls. */
  wide?: boolean
  children: ReactNode
}): JSX.Element {
  const width = props.wide
    ? 'w-[min(440px,calc(100vw-var(--space-4)))]'
    : 'w-[min(320px,calc(100vw-var(--space-4)))]'
  return (
    <aside
      className={`pointer-events-auto relative flex ${width}
        min-h-0 flex-col overflow-hidden rounded-panel border border-default bg-surface-shell
        shadow-raised max-[900px]:w-full max-[900px]:rounded-none`}
      id={props.id}
      aria-labelledby={props.labelledBy}
      hidden={!props.open}
      onKeyDown={(event) => {
        // `defaultPrevented` means the panel inside already answered Escape.
        const { onClose } = props
        if (onClose === undefined || event.key !== 'Escape' || event.defaultPrevented) return
        event.preventDefault()
        onClose()
      }}
    >
      {/* The close control floats over the corner rather than taking a row of
          its own, so the panel's own heading stays the first thing in the dock. */}
      {props.onClose === undefined ? null : (
        <div className="absolute end-2 top-2 z-[1]">
          <IconButton
            type="button"
            icon="close"
            aria-label={`Close ${props.title}`}
            title={`Close ${props.title}`}
            onClick={props.onClose}
          />
        </div>
      )}
      {/* Panel headings inside keep clear of the floating close control. */}
      <div
        className={`min-h-0 flex-1 overflow-auto p-4 ${
          props.onClose === undefined ? '' : '[&_h2]:pe-touch'
        }`}
      >
        {props.children}
      </div>
    </aside>
  )
}

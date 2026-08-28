import type { JSX, ReactNode } from 'react'

import { IconButton } from './controls'

/**
 * A right-hand dock.
 *
 * One dock is shown at a time, chosen by the toolbar's panel switcher. Every
 * dock is the SAME width, whatever it holds, so the canvas beside it never
 * changes size as the reviewer moves between panels - a preview that resized
 * under them would make two panels hard to compare. A dock is a disclosure, not a modal: the
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
  children: ReactNode
}): JSX.Element {
  /**
   * Closing hides this element, so the focus it holds would be stranded on a
   * hidden node. Focus goes back to the toolbar control that points at this
   * dock, found by that `aria-controls` rather than by a shared ref, so the
   * dock needs to know nothing about the switcher that owns it.
   */
  const close = (): void => {
    const { id, onClose } = props
    if (onClose === undefined) return
    onClose()
    const owner = window.document.querySelector(`[aria-controls="${id}"]`)
    if (owner instanceof HTMLElement) owner.focus()
  }

  return (
    <aside
      className={`pointer-events-auto relative flex w-[min(360px,calc(100vw-var(--space-4)))]
        min-h-0 flex-col overflow-hidden rounded-panel border border-default bg-surface-shell
        shadow-raised max-[900px]:w-full max-[900px]:rounded-none`}
      id={props.id}
      aria-labelledby={props.labelledBy}
      hidden={!props.open}
      onKeyDown={(event) => {
        // `defaultPrevented` means the panel inside already answered Escape.
        if (props.onClose === undefined || event.key !== 'Escape' || event.defaultPrevented) {
          return
        }
        event.preventDefault()
        close()
      }}
    >
      {/* The close control floats over the corner rather than taking a row of
          its own, so the panel's own heading stays the first thing in the dock. */}
      {props.onClose === undefined ? null : (
        <div className="absolute end-1 top-1 z-[1]">
          <IconButton
            type="button"
            variant="chrome"
            icon="close"
            aria-label={`Close ${props.title}`}
            title={`Close ${props.title}`}
            onClick={close}
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

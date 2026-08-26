import { useEffect, useRef, type JSX, type KeyboardEvent } from 'react'

/**
 * Reset confirmation.
 *
 * Reset is the one destructive action in the editor: it deletes the saved
 * project, every element's history, and any pending draft or proposal. So it is
 * deliberate by construction - the button only opens this dialog, and only
 * "Reset project" inside it reaches the store. Cancel, Escape, and the backdrop
 * all resolve to "nothing happened".
 *
 * Implemented as a focus-managed `role="alertdialog"` rather than `<dialog>`:
 * the behaviour that matters (initial focus on the safe choice, a trapped Tab
 * ring, Escape, and focus returning to the trigger) is then explicit and
 * testable in jsdom rather than delegated to varying platform support.
 */
export function ResetProjectDialog(props: {
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Whatever opened the dialog gets focus back when it closes, so a
    // keyboard user is returned to the toolbar rather than to the document.
    const opener = document.activeElement
    cancelRef.current?.focus()
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      props.onCancel()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button')
    if (focusable === undefined || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (first === undefined || last === undefined) return

    // Tab cannot leave a modal; without this the ring escapes into the editor
    // behind it, which is both an a11y failure and a way to edit "through" a
    // confirmation that is still open.
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={props.onCancel}>
      <div
        ref={dialogRef}
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-description"
        onKeyDown={onKeyDown}
        onMouseDown={(event) => {
          event.stopPropagation()
        }}
      >
        <h2 className="dialog__title" id="reset-dialog-title">
          Reset project?
        </h2>
        <div className="dialog__body" id="reset-dialog-description">
          <p>The original template is loaded and this browser&rsquo;s saved copy is deleted.</p>
          <ul className="dialog__list">
            <li>Every element edit and viewport override is discarded.</li>
            <li>All revision history is cleared, so nothing can be restored afterwards.</li>
            <li>Any unapplied code draft and any pending AI proposal are discarded.</li>
          </ul>
          <p className="dialog__note">This cannot be undone.</p>
        </div>
        <div className="dialog__actions">
          <button type="button" className="toolbar-button" ref={cancelRef} onClick={props.onCancel}>
            Cancel
          </button>
          <button type="button" className="dialog__danger" onClick={props.onConfirm}>
            Reset project
          </button>
        </div>
      </div>
    </div>
  )
}

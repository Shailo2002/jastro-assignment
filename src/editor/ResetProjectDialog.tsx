import { useEffect, useRef, type JSX, type KeyboardEvent } from 'react'

import { ToolbarButton } from './controls'

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
    // `dialog-backdrop` carries no styling; it is the tests' query hook.
    <div
      className="dialog-backdrop fixed inset-0 z-40 flex items-center justify-center
        bg-overlay-scrim p-4"
      onMouseDown={props.onCancel}
    >
      <div
        ref={dialogRef}
        className="w-[min(440px,100%)] rounded-panel border border-default bg-surface-panel
          p-6 shadow-raised"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-description"
        onKeyDown={onKeyDown}
        onMouseDown={(event) => {
          event.stopPropagation()
        }}
      >
        <h2 className="m-0 mb-3 text-md font-semibold text-primary" id="reset-dialog-title">
          Reset project?
        </h2>
        <div
          className="text-[13px] text-secondary [&>p]:m-0 [&>p]:mb-3"
          id="reset-dialog-description"
        >
          <p>The original template is loaded and this browser&rsquo;s saved copy is deleted.</p>
          <ul className="m-0 mb-3 list-disc ps-5 [&>li]:mb-1">
            <li>Every element edit and viewport override is discarded.</li>
            <li>All revision history is cleared, so nothing can be restored afterwards.</li>
            <li>Any unapplied code draft and any pending AI proposal are discarded.</li>
          </ul>
          <p className="text-primary">This cannot be undone.</p>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <ToolbarButton type="button" ref={cancelRef} onClick={props.onCancel}>
            Cancel
          </ToolbarButton>
          {/* Danger styling appears here only - at confirmation time, never on
              the routine toolbar control that opens this dialog. */}
          <button
            type="button"
            className="min-h-touch cursor-pointer rounded-control border border-status-danger
              bg-status-danger px-4 text-[13px] font-semibold text-on-accent
              hover:brightness-110 active:translate-y-px active:brightness-95"
            onClick={props.onConfirm}
          >
            Reset project
          </button>
        </div>
      </div>
    </div>
  )
}

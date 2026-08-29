import type { JSX } from 'react'

import type { PersistenceStatus } from './persistence-status'

/**
 * Where the work stands: which revision is on screen, and whether it is safely
 * on disk.
 *
 * It sits in the top bar beside the reset action, with the identity of the
 * project rather than with the canvas: saving is a fact about the document, not
 * about the view of it, and this is the one place a reviewer looks to answer
 * "is my work kept?" before closing the tab.
 *
 * The dot repeats the tone, never carries it: the label beside it always states
 * the state in words, and the fuller sentence stays in the accessible name, so
 * the chip survives greyscale and reads completely by ear.
 */
export function PersistenceChip(props: {
  status: PersistenceStatus
  revision: number
}): JSX.Element {
  const { status } = props

  return (
    <p
      className="group/persist m-0 inline-flex flex-none items-center gap-1.5 rounded-pill
        border border-default px-2 py-0.5 text-[11px] whitespace-nowrap text-secondary
        data-[tone=warning]:border-status-warning data-[tone=warning]:text-primary"
      data-tone={status.tone}
    >
      <span
        className="size-1.5 rounded-pill bg-muted
          group-data-[tone=saved]/persist:bg-status-success
          group-data-[tone=warning]/persist:bg-status-warning"
        aria-hidden="true"
      />
      <span aria-hidden="true">rev {props.revision} &middot; </span>
      {status.label}
      <span className="sr-only">. {status.detail}</span>
    </p>
  )
}

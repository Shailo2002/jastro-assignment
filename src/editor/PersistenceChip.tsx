import type { JSX } from 'react'

import type { PersistenceStatus } from './persistence-status'

/**
 * Where the work stands: which revision is on screen, and whether it is safely
 * on disk.
 *
 * It rides the bottom-right corner of the preview, the way a brand watermark
 * sits on the artwork it belongs to: the revision is a fact about the DOCUMENT
 * on screen, so it stays with the rendered document rather than up in the
 * chrome, and it is the one place a reviewer looks to answer "is my work kept?"
 * before closing the tab. It floats over the canvas and takes no pointer input,
 * so it never stands between a click and the element under it.
 *
 * The dot repeats the tone, never carries it: the saved state is stated in
 * words inside the accessible name, and anything that needs a decision is
 * escalated into the recovery notice, so nothing here rests on colour alone.
 */
export function PersistenceChip(props: {
  status: PersistenceStatus
  revision: number
  /** Placement, supplied by whatever the chip is floating over. */
  className?: string
}): JSX.Element {
  const { status } = props

  return (
    <p
      className={`group/persist pointer-events-none m-0 inline-flex flex-none items-center
        gap-1.5 rounded-pill border border-default bg-surface-shell/80 px-2 py-0.5
        text-[11px] whitespace-nowrap text-secondary shadow-hairline backdrop-blur-[18px]
        data-[tone=warning]:border-status-warning data-[tone=warning]:text-primary
        ${props.className ?? ''}`}
      data-tone={status.tone}
    >
      <span
        className="size-1.5 rounded-pill bg-muted
          group-data-[tone=saved]/persist:bg-status-success
          group-data-[tone=warning]/persist:bg-status-warning"
        aria-hidden="true"
      />
      {/* The chip names the version on screen; how it is stored is a
          secondary fact, so the label and the full sentence move into the
          accessible name rather than crowding the bar. Revision 0 is the
          template as it shipped, which reads as version 1. */}
      <span aria-hidden="true">Version {props.revision + 1}</span>
      <span className="sr-only">
        Version {props.revision + 1}. <span>{status.label}</span>. {status.detail}
      </span>
    </p>
  )
}

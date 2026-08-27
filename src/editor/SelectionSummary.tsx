import type { JSX } from 'react'

import type { ElementId } from '../model/ids'
import type { ElementTreeRow } from './element-tree'

/**
 * Text equivalent of the current selection.
 *
 * Selection must never be communicated by colour alone, so the count and the
 * readable names are always available as text and announced politely when they
 * change. Step 8 extends this into the full Scope Lock indicator.
 */
export function SelectionSummary(props: {
  rows: readonly ElementTreeRow[]
  selectedIds: readonly ElementId[]
}): JSX.Element {
  const { rows, selectedIds } = props

  // Selection order, not document order: the last entry is the primary target.
  const names = selectedIds.flatMap((id) => {
    const row = rows.find((candidate) => candidate.id === id)
    return row === undefined ? [] : [row.descriptor.accessibleName]
  })

  return (
    // Named, because the rail's history panel owns a live region too and the
    // two must be distinguishable to anyone listing them.
    <p
      className="m-0 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px]"
      role="status"
      aria-live="polite"
      aria-label="Selection"
    >
      <span className="font-semibold text-primary">
        {selectedIds.length === 0 ? 'Nothing selected' : `${selectedIds.length} selected`}
      </span>
      <span className="min-w-0 truncate text-muted">
        {names.length === 0 ? 'Choose an element on the canvas or in Layers.' : names.join(', ')}
      </span>
    </p>
  )
}

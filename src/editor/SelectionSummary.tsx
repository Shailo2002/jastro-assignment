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
    <p className="selection-summary" role="status" aria-live="polite" aria-label="Selection">
      <span className="selection-summary__count">
        {selectedIds.length === 0 ? 'Nothing selected' : `${selectedIds.length} selected`}
      </span>
      <span className="selection-summary__names">
        {names.length === 0 ? 'Choose an element on the canvas or in Layers.' : names.join(', ')}
      </span>
    </p>
  )
}

import { useCallback, useMemo, useState } from 'react'

import type { ElementId } from '../model/ids'
import {
  EMPTY_SELECTION,
  applySelection,
  isSelected as isSelectedIn,
  normalizeSelection,
  primarySelectionId,
} from './selection'

/**
 * The editor's selection slice.
 *
 * This is UI state, deliberately separate from the document store: it is not
 * committed, not versioned, and not persisted, so selecting can never produce a
 * document revision or a history entry.
 */
export interface SelectionApi {
  readonly selectedIds: readonly ElementId[]
  /** The most recently added target, or `undefined`. */
  readonly primaryId: ElementId | undefined
  isSelected(id: ElementId): boolean
  /** The one transition used by both pointer and keyboard activation. */
  select(id: ElementId, additive: boolean): void
  clear(): void
}

export function useSelection(knownIds: ReadonlySet<ElementId>): SelectionApi {
  const [rawSelection, setRawSelection] = useState<readonly ElementId[]>(EMPTY_SELECTION)

  // Derived rather than synchronised: ids the document no longer contains drop
  // out immediately, and no effect can leave a stale id selected for a frame.
  const selectedIds = useMemo(
    () => normalizeSelection(rawSelection, knownIds),
    [rawSelection, knownIds],
  )

  const select = useCallback((id: ElementId, additive: boolean): void => {
    setRawSelection((current) => applySelection(current, id, additive))
  }, [])

  const clear = useCallback((): void => {
    setRawSelection(EMPTY_SELECTION)
  }, [])

  const isSelected = useCallback(
    (id: ElementId): boolean => isSelectedIn(selectedIds, id),
    [selectedIds],
  )

  return {
    selectedIds,
    primaryId: primarySelectionId(selectedIds),
    isSelected,
    select,
    clear,
  }
}

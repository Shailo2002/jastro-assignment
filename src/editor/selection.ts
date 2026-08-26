import type { ElementId } from '../model/ids'

/**
 * Selection algebra.
 *
 * Selection is a normalized, ordered list of stable element IDs and nothing
 * else: no DOM nodes, no CSS classes, no text matches, no tree positions. Every
 * function here is pure, so pointer handlers, keyboard handlers and tests all
 * drive selection through exactly the same transitions.
 *
 * Order carries meaning: the LAST entry is the primary (active) target, which
 * is the one the canvas gives a stronger handle treatment. Re-adding an already
 * selected id in additive mode removes it, so a modified click is a true toggle.
 */

export const EMPTY_SELECTION: readonly ElementId[] = Object.freeze([])

export function isSelected(selection: readonly ElementId[], id: ElementId): boolean {
  return selection.includes(id)
}

/** The most recently added target, or `undefined` when nothing is selected. */
export function primarySelectionId(selection: readonly ElementId[]): ElementId | undefined {
  return selection.at(-1)
}

/** Replaces the whole selection with one id. */
export function selectOnly(id: ElementId): readonly ElementId[] {
  return [id]
}

/** Adds an unselected id (as the new primary) or removes a selected one. */
export function toggleSelected(
  selection: readonly ElementId[],
  id: ElementId,
): readonly ElementId[] {
  if (isSelected(selection, id)) {
    return selection.filter((selectedId) => selectedId !== id)
  }
  return [...selection, id]
}

/**
 * The single selection transition used by every surface.
 *
 * `additive` is true for Shift/Ctrl/Cmd activation, whether that came from a
 * pointer or from the keyboard.
 */
export function applySelection(
  selection: readonly ElementId[],
  id: ElementId,
  additive: boolean,
): readonly ElementId[] {
  return additive ? toggleSelected(selection, id) : selectOnly(id)
}

/**
 * Drops ids the document no longer contains.
 *
 * Selection outlives individual renders but must never outlive the elements it
 * points at, and it must never resurrect an id. Returns the same array
 * reference when nothing changed so memoized consumers do not re-render.
 */
export function normalizeSelection(
  selection: readonly ElementId[],
  knownIds: ReadonlySet<ElementId>,
): readonly ElementId[] {
  const kept = selection.filter((id) => knownIds.has(id))
  return kept.length === selection.length ? selection : kept
}

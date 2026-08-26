import type { JSX, KeyboardEvent } from 'react'

import type { ElementId } from '../model/ids'
import type { ElementTreeRow } from './element-tree'
import { isAdditiveEvent } from './roving-focus'
import type { SelectionApi } from './use-selection'
import { useRovingFocus } from './use-roving-focus'

/**
 * Layers tree.
 *
 * The same flattened element list the canvas overlay uses, presented as a tree
 * of real buttons. Both surfaces call the identical selection action, so canvas
 * and layers can never drift into two different notions of what is selected.
 */
export function LayersPanel(props: {
  rows: readonly ElementTreeRow[]
  selection: SelectionApi
}): JSX.Element {
  const { rows, selection } = props
  const roving = useRovingFocus(rows.length)

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: ElementId): void => {
    if (roving.handleNavigationKey(event)) return

    if (event.key === 'Escape') {
      event.preventDefault()
      selection.clear()
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selection.select(id, isAdditiveEvent(event))
    }
  }

  return (
    <section className="layers" aria-labelledby="layers-heading">
      <h2 className="layers__heading" id="layers-heading">
        Layers
      </h2>

      {rows.length === 0 ? (
        <p className="layers__empty">This template has no editable elements yet.</p>
      ) : (
        <ul className="layers__tree" role="tree" aria-multiselectable="true" aria-label="Template layers">
          {rows.map((row, index) => {
            const selected = selection.isSelected(row.id)
            const primary = selection.primaryId === row.id

            return (
              <li key={row.id} role="none">
                <button
                  ref={roving.register(index)}
                  type="button"
                  role="treeitem"
                  aria-level={row.level}
                  aria-selected={selected}
                  aria-label={row.descriptor.accessibleName}
                  title={row.id}
                  className="layers__item"
                  data-target-id={row.id}
                  data-selected={selected}
                  data-primary={primary}
                  tabIndex={roving.tabIndexFor(index)}
                  // Indentation is presentation; `aria-level` carries the depth.
                  style={{ paddingInlineStart: `calc(var(--space-2) + ${row.level - 1} * var(--space-4))` }}
                  onFocus={() => {
                    roving.onItemFocus(index)
                  }}
                  onKeyDown={(event) => {
                    onKeyDown(event, row.id)
                  }}
                  onClick={(event) => {
                    selection.select(row.id, isAdditiveEvent(event))
                  }}
                >
                  <span className="layers__type">{row.descriptor.typeLabel}</span>
                  <span className="layers__name">{row.descriptor.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <p className="layers__hint">
        Arrow keys move, Enter or Space selects, Shift or Ctrl adds and removes, Escape clears.
      </p>
    </section>
  )
}

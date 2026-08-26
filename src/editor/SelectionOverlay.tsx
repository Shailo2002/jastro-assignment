import type { JSX, KeyboardEvent } from 'react'

import type { ElementId } from '../model/ids'
import type { ElementTreeRow } from './element-tree'
import { isAdditiveEvent } from './roving-focus'
import type { SelectionApi } from './use-selection'
import type { OverlayRect } from './use-element-rects'
import { useRovingFocus } from './use-roving-focus'

/**
 * Canvas selection overlay.
 *
 * The overlay sits above the rendered template inside the same scaled frame and
 * carries one hit target per element. The template's own markup is never given
 * editor attributes, handlers, or tabstops, so the canvas stays a read-only
 * projection of the canonical document and selection remains purely ID-keyed.
 *
 * The targets carry `data-target-id`, never `data-element-id`: that attribute
 * belongs to the rendered template alone, so measuring the canvas can never
 * accidentally measure the overlay that sits on top of it.
 *
 * Geometry is optional on purpose: before the first measurement - and anywhere
 * measurement is unavailable - the targets still render, so keyboard users and
 * assistive technology are never left without a way to select.
 */
export function SelectionOverlay(props: {
  rows: readonly ElementTreeRow[]
  rects: ReadonlyMap<ElementId, OverlayRect>
  selection: SelectionApi
}): JSX.Element {
  const { rows, rects, selection } = props
  const roving = useRovingFocus(rows.length)

  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    id: ElementId,
  ): void => {
    if (roving.handleNavigationKey(event)) return

    if (event.key === 'Escape') {
      event.preventDefault()
      selection.clear()
      return
    }

    // Handled here rather than through the synthetic click so that pointer and
    // keyboard reach the same action with the same modifier reading.
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selection.select(id, isAdditiveEvent(event))
    }
  }

  return (
    <div
      className="selection-overlay"
      role="listbox"
      aria-multiselectable="true"
      aria-label="Selectable template elements"
    >
      {rows.map((row, index) => {
        const rect = rects.get(row.id)
        const selected = selection.isSelected(row.id)
        const primary = selection.primaryId === row.id

        return (
          <button
            key={row.id}
            ref={roving.register(index)}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={row.descriptor.accessibleName}
            title={`${row.descriptor.accessibleName} (${row.id})`}
            className="selection-target"
            data-target-id={row.id}
            data-selected={selected}
            data-primary={primary}
            data-measured={rect !== undefined}
            tabIndex={roving.tabIndexFor(index)}
            style={
              rect === undefined
                ? { zIndex: row.depth + 1 }
                : {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                    // Deeper elements sit above their ancestors, so clicking a
                    // heading selects the heading and not its section.
                    zIndex: row.depth + 1,
                  }
            }
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
            <span className="selection-target__label">{row.descriptor.name}</span>
          </button>
        )
      })}
    </div>
  )
}

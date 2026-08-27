import type { JSX, KeyboardEvent } from 'react'

import type { ElementId } from '../model/ids'
import type { ElementTreeRow } from './element-tree'
import { isAdditiveEvent } from './roving-focus'
import type { SelectionApi } from './use-selection'
import { PanelHeading, PanelHint } from './controls'
import { useRovingFocus } from './use-roving-focus'

/**
 * Layers tree.
 *
 * The same flattened element list the canvas overlay uses, presented as a tree
 * of real buttons. Both surfaces call the identical selection action, so canvas
 * and layers can never drift into two different notions of what is selected.
 *
 * Visibility belongs to the dock that holds this panel, not to the panel: the
 * dock is what the toolbar toggle points at, and hiding it there keeps this
 * component's markup free of any notion of being collapsed.
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
    <div className="flex min-w-0 flex-col gap-2">
      <PanelHeading id="layers-heading">Layers</PanelHeading>

      {rows.length === 0 ? (
        <PanelHint>This template has no editable elements yet.</PanelHint>
      ) : (
        <ul
          className="m-0 flex min-w-0 list-none flex-col gap-0.5 p-0"
          role="tree"
          aria-multiselectable="true"
          aria-label="Template layers"
        >
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
                  /* Focus is a dashed ring and selection is a solid border, so
                     the two states never read as the same thing. */
                  className="group/layer flex min-h-8 w-full min-w-0 cursor-pointer items-baseline
                    gap-2 rounded-control border-2 border-transparent py-1 pe-2 text-start
                    text-[13px] text-secondary hover:bg-surface-hover hover:text-primary
                    focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-focus-ring focus-visible:outline-dashed
                    aria-selected:border-selection aria-selected:bg-selection-fill
                    aria-selected:text-primary"
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
                  <span className="flex-none text-[11px] tracking-[0.04em] text-muted uppercase">
                    {row.descriptor.typeLabel}
                  </span>
                  {/* The primary target of a multi-selection is marked in text
                      as well as in weight, so it reads without colour. */}
                  <span
                    className="min-w-0 truncate group-data-[primary=true]/layer:after:text-muted
                      group-data-[primary=true]/layer:after:content-['_•_active']"
                  >
                    {row.descriptor.name}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <PanelHint>
        Arrow keys move, Enter or Space selects, Shift or Ctrl adds and removes, Escape clears.
      </PanelHint>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState, type JSX, type KeyboardEvent } from 'react'

import type { ElementId } from '../model/ids'
import type { ElementTreeRow } from './element-tree'
import { Icon } from './Icon'
import {
  ancestorIdsOf,
  branchIds,
  buildLayerRows,
  parentRowIndex,
  type LayerRow,
} from './layer-tree'
import { isAdditiveEvent } from './roving-focus'
import type { SelectionApi } from './use-selection'
import { PanelHeading, PanelHint, ToolbarButton } from './controls'
import { useRovingFocus } from './use-roving-focus'

/**
 * Layers tree.
 *
 * The same flattened element list the canvas overlay uses, presented as a tree
 * of real buttons. Both surfaces call the identical selection action, so canvas
 * and layers can never drift into two different notions of what is selected.
 *
 * Folding is presentation and lives here, not in the store and not in the
 * flattening: a folded branch is still on the canvas, still selectable, still
 * in the document, and folding one has no revision, no history entry, and no
 * effect on any other surface. What it must not do is hide a selection made
 * elsewhere, so selecting an element opens the branches above it.
 *
 * The tree is flat markup with `aria-level`, `aria-posinset`, and
 * `aria-setsize` rather than nested `role="group"` lists. That keeps roving
 * focus a single index over the rows a reviewer can actually see, and lets the
 * depth be drawn as guide rails - computed per row in `layer-tree` - instead of
 * a dozen nested containers each with its own scroll and padding.
 *
 * Visibility of the PANEL belongs to the dock that holds it, not to the panel:
 * the dock is what the toolbar toggle points at, and hiding it there keeps this
 * component's markup free of any notion of being closed.
 */

/** Width of one indent column; a guide rail and a twisty each occupy one. */
const COLUMN = 'w-4'

/**
 * A rail has to cross the seam between two rows, and each row contributes 2px
 * of transparent selection border plus half the list's 2px gap. Overhanging by
 * that much at each end is what makes a sibling chain read as one line instead
 * of a column of dashes.
 */
const RAIL_BLEED = '3px'

/**
 * The vertical line and elbow that carry depth.
 *
 * Purely decorative - `aria-level` and `aria-posinset` already state the shape
 * to assistive technology - so the whole rail is hidden from the accessibility
 * tree rather than described twice.
 */
function GuideRails(props: {
  guides: readonly boolean[]
  isLastSibling: boolean
}): JSX.Element {
  return (
    <span aria-hidden="true" className="flex flex-none self-stretch">
      {props.guides.map((continues, depth) => (
        <span key={depth} className={`relative flex-none ${COLUMN}`}>
          {continues ? (
            <span
              className="absolute start-1/2 w-px bg-default"
              style={{ top: `-${RAIL_BLEED}`, bottom: `-${RAIL_BLEED}` }}
            />
          ) : null}
        </span>
      ))}
      {/* The elbow column: the line arrives from the parent above and turns in
          towards this row. It carries on downwards only while more siblings
          follow, which is what makes the last child read as the end of a run. */}
      <span className={`relative flex-none ${COLUMN}`}>
        <span
          className="absolute start-1/2 w-px bg-default"
          style={
            props.isLastSibling
              ? { top: `-${RAIL_BLEED}`, height: `calc(50% + ${RAIL_BLEED})` }
              : { top: `-${RAIL_BLEED}`, bottom: `-${RAIL_BLEED}` }
          }
        />
        <span className="absolute start-1/2 top-1/2 h-px w-1/2 bg-default" />
      </span>
    </span>
  )
}

export function LayersPanel(props: {
  rows: readonly ElementTreeRow[]
  selection: SelectionApi
}): JSX.Element {
  const { rows, selection } = props
  const { selectedIds } = selection

  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<ElementId>>(() => new Set())
  const treeRef = useRef<HTMLUListElement | null>(null)

  const visible = useMemo(() => buildLayerRows(rows, collapsedIds), [rows, collapsedIds])
  const branches = useMemo(() => branchIds(rows), [rows])
  const roving = useRovingFocus(visible.length)

  /**
   * A selection can be made on the canvas, by the AI rail, or from a history
   * card, none of which know this panel exists. Opening the branches above the
   * new target keeps "what is selected" answerable here at all times, and only
   * ever removes ids from the fold, so nothing the reviewer opened is re-closed.
   */
  useEffect(() => {
    setCollapsedIds((current) => {
      if (current.size === 0) return current
      const ancestors = ancestorIdsOf(rows, new Set(selectedIds))
      if (ancestors.size === 0) return current

      const next = new Set(current)
      let changed = false
      for (const id of ancestors) {
        if (next.delete(id)) changed = true
      }
      return changed ? next : current
    })
  }, [rows, selectedIds])

  const setCollapsed = (id: ElementId, collapsed: boolean): void => {
    setCollapsedIds((current) => {
      const next = new Set(current)
      if (collapsed) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const allCollapsed = branches.length > 0 && branches.every((id) => collapsedIds.has(id))

  const toggleAll = (): void => {
    const holdsFocus = treeRef.current?.contains(document.activeElement) ?? false
    setCollapsedIds(allCollapsed ? new Set() : new Set(branches))
    // Folding everything unmounts whatever row was focused; without this the
    // keyboard user would be dropped back to the document body mid-tree.
    if (holdsFocus && !allCollapsed) roving.focusAt(0)
  }

  /**
   * Tree keys, per the ARIA tree pattern: Right opens a closed branch and then
   * steps into it, Left closes an open one and then steps out to its parent.
   * Only this panel reads them that way - the canvas overlay is a flat listbox
   * and keeps Left/Right as previous/next - so the interception happens here
   * rather than in the shared roving arithmetic.
   */
  const handleTreeKey = (event: KeyboardEvent<HTMLButtonElement>, index: number): boolean => {
    const row = visible[index]
    if (row === undefined) return false

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      if (row.hasChildren && !row.expanded) setCollapsed(row.element.id, false)
      else if (row.expanded) roving.focusAt(index + 1)
      return true
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      if (row.expanded) {
        setCollapsed(row.element.id, true)
        return true
      }
      const parent = parentRowIndex(visible, index)
      if (parent !== undefined) roving.focusAt(parent)
      return true
    }

    return false
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number, id: ElementId): void => {
    if (handleTreeKey(event, index)) return
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

      {branches.length === 0 ? null : (
        <div className="flex justify-end">
          <ToolbarButton
            type="button"
            variant="chrome"
            onClick={toggleAll}
            title={allCollapsed ? 'Expand every branch' : 'Collapse every branch'}
          >
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </ToolbarButton>
        </div>
      )}

      {rows.length === 0 ? (
        <PanelHint>This template has no editable elements yet.</PanelHint>
      ) : (
        <ul
          ref={treeRef}
          className="m-0 flex min-w-0 list-none flex-col gap-0.5 p-0"
          role="tree"
          aria-multiselectable="true"
          aria-label="Template layers"
        >
          {visible.map((row: LayerRow, index) => {
            const { id, descriptor, level } = row.element
            const selected = selection.isSelected(id)
            const primary = selection.primaryId === id

            return (
              <li key={id} role="none">
                <button
                  ref={roving.register(index)}
                  type="button"
                  role="treeitem"
                  aria-level={level}
                  aria-posinset={row.positionInSet}
                  aria-setsize={row.setSize}
                  aria-selected={selected}
                  {...(row.hasChildren ? { 'aria-expanded': row.expanded } : {})}
                  aria-label={descriptor.accessibleName}
                  title={id}
                  /* Focus is a dashed ring and selection is a solid border, so
                     the two states never read as the same thing. */
                  className="group/layer flex min-h-8 w-full min-w-0 cursor-pointer items-stretch
                    rounded-control border-2 border-transparent pe-2 ps-2 text-start
                    text-[13px] text-secondary hover:bg-surface-hover hover:text-primary
                    focus-visible:outline-2 focus-visible:outline-offset-2
                    focus-visible:outline-focus-ring focus-visible:outline-dashed
                    aria-selected:border-selection aria-selected:bg-selection-fill
                    aria-selected:text-primary"
                  data-target-id={id}
                  data-selected={selected}
                  data-primary={primary}
                  tabIndex={roving.tabIndexFor(index)}
                  onFocus={() => {
                    roving.onItemFocus(index)
                  }}
                  onKeyDown={(event) => {
                    onKeyDown(event, index, id)
                  }}
                  onClick={(event) => {
                    selection.select(id, isAdditiveEvent(event))
                  }}
                >
                  {level > 1 ? (
                    <GuideRails guides={row.guides} isLastSibling={row.isLastSibling} />
                  ) : null}

                  {/* The twisty is a pointer shortcut for what Right and Left
                      already do on the row itself, so it is a hit area inside
                      the row's button rather than a second focus stop nested in
                      it - a button inside a button is invalid, and a second tab
                      stop per row would double the length of the tree for a
                      keyboard user. `aria-expanded` above carries the state. */}
                  <span
                    aria-hidden="true"
                    data-twisty={row.hasChildren ? 'true' : 'false'}
                    className={`flex flex-none items-center justify-center self-stretch ${COLUMN}`}
                    onClick={
                      row.hasChildren
                        ? (event) => {
                            event.stopPropagation()
                            setCollapsed(id, row.expanded)
                          }
                        : undefined
                    }
                  >
                    {row.hasChildren ? (
                      <Icon
                        name={row.expanded ? 'chevron-down' : 'chevron-right'}
                        className="size-[14px] text-muted group-hover/layer:text-secondary"
                      />
                    ) : null}
                  </span>

                  <span className="flex min-w-0 flex-1 items-baseline gap-2 py-1 ps-1">
                    <span className="flex-none text-[11px] tracking-[0.04em] text-muted uppercase">
                      {descriptor.typeLabel}
                    </span>
                    {/* The primary target of a multi-selection is marked in text
                        as well as in weight, so it reads without colour. */}
                    <span
                      className="min-w-0 truncate group-data-[primary=true]/layer:after:text-muted
                        group-data-[primary=true]/layer:after:content-['_•_active']"
                    >
                      {descriptor.name}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <PanelHint>
        Arrow keys move, Right and Left open and close a branch, Enter or Space selects, Shift or
        Ctrl adds and removes, Escape clears.
      </PanelHint>
    </div>
  )
}

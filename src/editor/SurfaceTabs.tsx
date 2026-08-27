import type { JSX } from 'react'

import { Icon, type IconName } from './Icon'
import { useRovingFocus } from './use-roving-focus'

/**
 * The main-surface switcher.
 *
 * A real tablist: one tab is tabbable, arrows move between them, and the panel
 * each tab owns is labelled by it. It chooses which surface fills the centre of
 * the shell - the rendered preview, or the structured code view - and nothing
 * else. It never changes the document, the selection, or the edit scope.
 *
 * The icon beside each label is decorative; the label carries the meaning, so
 * the accessible name is exactly the visible text.
 */

export interface SurfaceTab<Id extends string> {
  readonly id: Id
  readonly label: string
  readonly icon: IconName
}

export function SurfaceTabs<Id extends string>(props: {
  tabs: readonly SurfaceTab<Id>[]
  value: Id
  onChange: (id: Id) => void
  /** Accessible name of the tablist. */
  label: string
  /** Namespace for the generated tab and panel ids. */
  idPrefix: string
}): JSX.Element {
  const { tabs, value, onChange, idPrefix } = props
  const roving = useRovingFocus(tabs.length)

  return (
    <div
      className="flex gap-1 rounded-input border border-default bg-surface-panel p-0.5 shadow-hairline"
      role="tablist"
      aria-label={props.label}
      onKeyDown={(event) => {
        roving.handleNavigationKey(event)
      }}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            className="inline-flex min-h-touch cursor-pointer items-center gap-2 rounded-control
              border border-transparent px-3 py-1 text-xs font-semibold text-secondary
              transition-colors duration-instant hover:bg-surface-hover hover:text-primary
              aria-selected:border-selection aria-selected:bg-surface-hover
              aria-selected:text-primary"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={roving.tabIndexFor(index)}
            ref={roving.register(index)}
            onFocus={() => {
              roving.onItemFocus(index)
            }}
            onClick={() => {
              onChange(tab.id)
            }}
          >
            <Icon name={tab.icon} className="size-4" />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

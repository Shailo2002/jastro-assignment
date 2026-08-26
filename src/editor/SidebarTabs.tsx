import type { JSX } from 'react'

import { useRovingFocus } from './use-roving-focus'

/**
 * Sidebar panel switcher.
 *
 * A real tablist: one tab is tabbable, arrows move between them, and the panel
 * is labelled by its tab. Panels are unmounted rather than hidden, which is
 * what keeps a code draft from being edited while it is off screen.
 */

export interface SidebarTab<Id extends string> {
  readonly id: Id
  readonly label: string
}

export function SidebarTabs<Id extends string>(props: {
  tabs: readonly SidebarTab<Id>[]
  value: Id
  onChange: (id: Id) => void
}): JSX.Element {
  const { tabs, value, onChange } = props
  const roving = useRovingFocus(tabs.length)

  return (
    <div
      className="sidebar-tabs"
      role="tablist"
      aria-label="Editing panels"
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
            id={`sidebar-tab-${tab.id}`}
            className="sidebar-tabs__tab"
            aria-selected={selected}
            aria-controls={`sidebar-panel-${tab.id}`}
            tabIndex={roving.tabIndexFor(index)}
            ref={roving.register(index)}
            onFocus={() => {
              roving.onItemFocus(index)
            }}
            onClick={() => {
              onChange(tab.id)
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

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
      className="surface-tabs"
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
            className="surface-tabs__tab"
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
            <Icon name={tab.icon} className="surface-tabs__icon" />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

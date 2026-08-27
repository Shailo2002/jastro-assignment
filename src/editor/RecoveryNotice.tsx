import type { JSX } from 'react'

import { Icon } from './Icon'
import { ToolbarButton } from './controls'
import type { PersistenceStatus } from './persistence-status'

/**
 * Persistence recovery notice.
 *
 * Shown only when `describePersistenceStatus` reports something the user has to
 * decide about: unreadable saved data, data from another version, or a browser
 * that refuses to store anything. The editor keeps working in every one of
 * those cases - the notice explains what happened to the document on screen and
 * offers the one deliberate action that can clear it.
 *
 * It carries an explicit "Attention" word and a glyph, so the state is never
 * signalled by colour alone.
 */
export function RecoveryNotice(props: {
  status: PersistenceStatus
  onReset: () => void
}): JSX.Element {
  return (
    <div
      className="flex items-center gap-3 border-b border-status-warning bg-surface-elevated px-4 py-3"
      role="alert"
      data-tone={props.status.tone}
    >
      <Icon name="warning" className="text-status-warning" />
      <p className="m-0 flex-1 text-[13px] text-secondary">
        <strong className="text-primary">Attention &mdash; {props.status.label}.</strong>{' '}
        {props.status.detail}
      </p>
      <ToolbarButton type="button" onClick={props.onReset}>
        Reset project&hellip;
      </ToolbarButton>
    </div>
  )
}

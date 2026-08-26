import { useId, useRef, useState, type JSX, type KeyboardEvent } from 'react'

import type { ElementId } from '../model/ids'
import type { EditablePropertyPatch } from '../model/properties'
import type { EditScope } from '../model/viewport'
import {
  prepareCodeEdit,
  serializeCodeDraft,
  type CodeDraftError,
  type CodeTarget,
} from './code-document'
import { EDIT_SCOPE_LABELS } from './edit-scope'
import { describeElement } from './element-names'
import type { EditTarget } from './inspector-model'

/**
 * The structured code panel.
 *
 * The draft is transient UI state and the canonical document is never written
 * from the textarea. Apply translates the draft into a patch and hands it to
 * the same validated command pipeline the inspector uses; an invalid draft
 * stays on screen, editable, with the document untouched.
 *
 * Draft freshness is explicit. While the draft is untouched it tracks the
 * canonical document, so a canvas edit is visible here immediately. Once the
 * user types, the draft keeps the revision it was based on: if the document
 * moves on underneath, the commit is rejected as stale rather than quietly
 * overwriting the newer edit.
 *
 * The draft itself is owned by the editor shell, not by this component, so
 * switching to another panel and back does not silently discard unapplied
 * work - and so the shell can discard it deliberately when the selection or
 * scope changes.
 */

/** An unapplied draft: the text, and the revision it was written against. */
export interface CodeDraft {
  readonly revision: number
  readonly text: string
}

function ErrorList(props: { id: string; errors: readonly CodeDraftError[] }): JSX.Element {
  return (
    <ul className="code-panel__errors" id={props.id}>
      {props.errors.map((error, index) => (
        <li className="code-panel__error" key={`${error.code}:${error.path ?? index}`}>
          {error.path === undefined ? null : (
            <span className="code-panel__error-path">{error.path}</span>
          )}
          <span>{error.message}</span>
        </li>
      ))}
    </ul>
  )
}

export function CodePanel(props: {
  targets: readonly EditTarget[]
  scope: EditScope
  /** Current canonical document revision. */
  revision: number
  /** Unapplied draft for the current selection and scope, if there is one. */
  draft: CodeDraft | undefined
  onDraftChange: (draft: CodeDraft | undefined) => void
  onApply: (input: {
    targetIds: readonly ElementId[]
    changes: Readonly<Record<ElementId, EditablePropertyPatch>>
    baseRevision: number
  }) => readonly string[]
}): JSX.Element {
  const { targets, scope, revision, draft } = props
  const [commitErrors, setCommitErrors] = useState<readonly string[]>([])
  const applyRef = useRef<HTMLButtonElement | null>(null)
  const revertRef = useRef<HTMLButtonElement | null>(null)
  const fieldId = useId()

  const codeTargets: readonly CodeTarget[] = targets.map((target) => ({
    id: target.element.id,
    displayed: target.displayed,
  }))

  if (targets.length === 0) {
    return (
      <section className="code-panel" aria-labelledby="code-heading">
        <h2 className="inspector__heading" id="code-heading">
          Structured code
        </h2>
        <p className="inspector__empty">
          Nothing is selected, so there is no code to show. Choose an element on the canvas
          or in Layers.
        </p>
      </section>
    )
  }

  const canonicalText = serializeCodeDraft(codeTargets)
  const text = draft?.text ?? canonicalText
  const baseRevision = draft?.revision ?? revision
  const isDirty = draft !== undefined
  const isStale = draft !== undefined && draft.revision !== revision

  const prepared = prepareCodeEdit({ text, targets: codeTargets })
  // "Nothing to apply" is the resting state of a clean draft, not a mistake to
  // report; every other failure is worth showing while the user types.
  const draftErrors =
    prepared.ok || (prepared.errors[0]?.code === 'no-change' && !isDirty)
      ? []
      : prepared.errors
  const errorsId = `${fieldId}-errors`
  const helpId = `${fieldId}-help`

  const apply = (): void => {
    if (!prepared.ok) return
    const messages = props.onApply({
      targetIds: prepared.targetIds,
      changes: prepared.changes,
      baseRevision,
    })
    setCommitErrors(messages)
    // A rejected draft stays exactly as typed so it can be corrected; an
    // accepted one is released back to tracking the canonical document.
    if (messages.length === 0) props.onDraftChange(undefined)
  }

  const revert = (): void => {
    props.onDraftChange(undefined)
    setCommitErrors([])
  }

  /**
   * Escape leaves the editing surface without needing to Tab through the text.
   * It lands on Apply when there is something to apply, and on Revert
   * otherwise, so the shortcut always has a target.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    const target = prepared.ok ? applyRef.current : revertRef.current
    target?.focus()
  }

  return (
    <section className="code-panel" aria-labelledby="code-heading">
      <h2 className="inspector__heading" id="code-heading">
        Structured code
      </h2>

      <p className="inspector__hint" id={helpId}>
        Validated JSON for the selected element{targets.length === 1 ? '' : 's'}, keyed by
        stable id, for scope <strong>{EDIT_SCOPE_LABELS[scope]}</strong>. This is structured
        data, not JSX or CSS: only allowlisted properties are accepted, and identity, revision
        and history fields cannot be set here. Press Escape to move focus from the editor to
        the panel actions; Tab also leaves the editor normally.
      </p>

      <ul className="code-panel__targets">
        {targets.map((target) => {
          const descriptor = describeElement({
            id: target.element.id,
            type: target.element.type,
            properties: target.displayed,
          })
          return (
            <li className="code-panel__target" key={target.element.id}>
              <span className="code-panel__target-name">{descriptor.accessibleName}</span>
              <code className="code-panel__target-id">{target.element.id}</code>
            </li>
          )
        })}
      </ul>

      <label className="field__label" htmlFor={fieldId}>
        Element properties (JSON)
      </label>
      <textarea
        className="code-panel__editor"
        id={fieldId}
        spellCheck={false}
        rows={18}
        value={text}
        aria-invalid={draftErrors.length > 0}
        aria-describedby={draftErrors.length > 0 ? `${helpId} ${errorsId}` : helpId}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          props.onDraftChange({ revision: baseRevision, text: event.target.value })
          setCommitErrors([])
        }}
      />

      <p className="field__note">
        {isDirty
          ? `Unapplied draft, prepared against revision ${baseRevision}.`
          : `Showing revision ${revision}. Canvas edits appear here automatically.`}
      </p>

      {isStale && (
        <p className="code-panel__notice" role="status">
          The document moved to revision {revision} while this draft was open. Applying it
          will be rejected; revert to load the current values.
        </p>
      )}

      {draftErrors.length > 0 && <ErrorList id={errorsId} errors={draftErrors} />}

      {commitErrors.length > 0 && (
        <div role="alert">
          <p className="field__error">
            The edit was rejected and nothing changed. {commitErrors.join(' ')}
          </p>
        </div>
      )}

      <div className="code-panel__actions">
        <button
          type="button"
          className="toolbar-button"
          ref={applyRef}
          disabled={!prepared.ok}
          onClick={apply}
        >
          Apply
        </button>
        {/* Never disabled: it is the editor's guaranteed keyboard exit, and
            reloading the canonical values is meaningful even when clean. */}
        <button type="button" className="toolbar-button" ref={revertRef} onClick={revert}>
          Revert
        </button>
      </div>
    </section>
  )
}

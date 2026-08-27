import { useRef, useState, type JSX } from 'react'

import type { ResolvedDocument } from '../engine/responsive-resolver'
import type { ElementId } from '../model/ids'
import type { EditablePropertyPatch } from '../model/properties'
import type { EditScope } from '../model/viewport'
import { InspectorFieldRow } from './InspectorFieldRow'
import { PanelHeading, PanelHint, ToolbarButton } from './controls'
import {
  INSPECTOR_SECTION_LABELS,
  fieldsForTypes,
  patchForField,
  readField,
  sectionsForFields,
  type EditTarget,
  type FieldValue,
  type InspectorField,
} from './inspector-model'
import { planReorder, type ReorderDirection } from './reorder'

/**
 * The inspector.
 *
 * Controls are derived from the selection's element types, so a field is only
 * offered when every selected element supports it. Nothing here writes to the
 * document: each control hands a patch to `onCommit`, which runs the same
 * validated command pipeline the code surface and AI proposals use. A rejected
 * commit shows its message beside the field and leaves the document untouched.
 */
export function InspectorPanel(props: {
  resolved: ResolvedDocument
  targets: readonly EditTarget[]
  scope: EditScope
  /** Document revision; changing it remounts controls onto the new values. */
  revision: number
  onCommit: (input: {
    targetIds: readonly ElementId[]
    changes: Readonly<Record<ElementId, EditablePropertyPatch>>
  }) => readonly string[]
}): JSX.Element {
  const { resolved, targets, scope, revision } = props
  const [error, setError] = useState<{ fieldId: string; message: string } | undefined>(
    undefined,
  )
  /**
   * The field whose remounted row should take focus back after a keyboard
   * commit. A ref, not state: it is written during the commit and consumed by
   * the next mount, so it never causes a render of its own and can never leak
   * focus into the inspector after a commit from the canvas, code, or AI.
   */
  const pendingFocusFieldId = useRef<string | undefined>(undefined)

  const targetIds = targets.map((target) => target.element.id)
  const fields = fieldsForTypes(targets.map((target) => target.element.type))
  const sections = sectionsForFields(fields)

  const commitField = (
    field: InspectorField,
    value: FieldValue,
    options: { readonly keepFocus: boolean },
  ): void => {
    const changes: Record<ElementId, EditablePropertyPatch> = {}
    for (const id of targetIds) {
      changes[id] = patchForField(field, value)
    }

    const messages = props.onCommit({ targetIds, changes })
    if (messages.length === 0 && options.keepFocus) {
      pendingFocusFieldId.current = field.id
    }
    setError(
      messages.length === 0
        ? undefined
        : { fieldId: field.id, message: messages.join(' ') },
    )
  }

  /* ---------------------------------------------------------------------- */
  /* Order                                                                   */
  /* ---------------------------------------------------------------------- */

  const singleTargetId = targetIds.length === 1 ? targetIds[0] : undefined
  const reorderPlans = {
    up: singleTargetId === undefined ? undefined : planReorder(resolved, singleTargetId, 'up'),
    down:
      singleTargetId === undefined ? undefined : planReorder(resolved, singleTargetId, 'down'),
  }

  const move = (direction: ReorderDirection): void => {
    const result = reorderPlans[direction]
    if (result === undefined || !result.ok) return

    const messages = props.onCommit({
      targetIds: result.plan.targetIds,
      changes: result.plan.changes,
    })
    setError(
      messages.length === 0 ? undefined : { fieldId: 'order', message: messages.join(' ') },
    )
  }

  const orderReason = (direction: ReorderDirection): string | undefined => {
    if (singleTargetId === undefined) {
      return 'Select exactly one element to change its order.'
    }
    const result = reorderPlans[direction]
    return result === undefined || result.ok ? undefined : result.reason
  }

  if (targets.length === 0) {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <PanelHeading id="inspector-heading">Design</PanelHeading>
        <PanelHint>
          Nothing is selected, so there is nothing to edit. Choose an element on the canvas
          or in Layers.
        </PanelHint>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <PanelHeading id="inspector-heading">Design</PanelHeading>

      {sections.map((section) => (
        <fieldset
          className="m-0 flex min-w-0 flex-col gap-3 rounded-control border border-default p-3"
          key={section}
        >
          <legend className="px-2 text-xs font-semibold text-secondary">
            {INSPECTOR_SECTION_LABELS[section]}
          </legend>
          {fields
            .filter((field) => field.section === section)
            .map((field) => (
              <InspectorFieldRow
                // Remounting on a new revision is what keeps an uncontrolled
                // control showing the canonical value after every commit.
                key={`${field.id}:${scope}:${revision}:${targetIds.join(',')}`}
                field={field}
                reading={readField(targets, field, scope)}
                scope={scope}
                error={error?.fieldId === field.id ? error.message : undefined}
                claimFocus={() => {
                  if (pendingFocusFieldId.current !== field.id) return false
                  pendingFocusFieldId.current = undefined
                  return true
                }}
                onCommit={(value, options) => {
                  commitField(field, value, options)
                }}
                onInvalid={(message) => {
                  setError({ fieldId: field.id, message })
                }}
              />
            ))}
        </fieldset>
      ))}

      <fieldset className="m-0 flex min-w-0 flex-col gap-3 rounded-control border border-default p-3">
        <legend className="px-2 text-xs font-semibold text-secondary">
          {INSPECTOR_SECTION_LABELS.order}
        </legend>
        <PanelHint>
          Moves the element among its siblings for the current scope. The template tree is
          not restructured.
        </PanelHint>
        <div className="flex flex-wrap gap-2">
          {(['up', 'down'] as const).map((direction) => {
            const reason = orderReason(direction)
            return (
              <ToolbarButton
                key={direction}
                type="button"
                disabled={reason !== undefined}
                aria-describedby={reason === undefined ? undefined : `order-${direction}-reason`}
                onClick={() => {
                  move(direction)
                }}
              >
                Move {direction}
              </ToolbarButton>
            )
          })}
        </div>
        {(['up', 'down'] as const).map((direction) => {
          const reason = orderReason(direction)
          return reason === undefined ? null : (
            <p
              className="m-0 text-[11px] leading-[1.45] text-muted"
              key={direction}
              id={`order-${direction}-reason`}
            >
              Move {direction}: {reason}
            </p>
          )
        })}
        {error?.fieldId === 'order' && (
          <p
            className="m-0 text-[11px] leading-[1.45] text-status-danger before:content-['\26A0__']"
            role="alert"
          >
            {error.message}
          </p>
        )}
      </fieldset>
    </div>
  )
}

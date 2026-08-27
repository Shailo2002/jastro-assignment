import { useEffect, useRef, type JSX } from 'react'

import type { DimensionUnit } from '../model/properties'
import { DIMENSION_UNITS } from '../model/properties'
import type { EditScope } from '../model/viewport'
import { EDIT_SCOPE_LABELS } from './edit-scope'
import {
  composeDimension,
  dimensionParts,
  isDimensionUnit,
  parseFieldInput,
  type FieldReading,
  type FieldValue,
  type InspectorField,
} from './inspector-model'

/**
 * One inspector control.
 *
 * Every field carries a persistent visible label, its unit, the scope it will
 * write to, and inline validation. Placeholders are never used as labels.
 *
 * Text-like controls are uncontrolled and commit on blur or Enter, so a single
 * edit produces a single history entry instead of one per keystroke. The parent
 * remounts the row when the canonical value changes, which is what keeps the
 * control in step with the document without a synchronising effect.
 *
 * Two consequences of that remount are handled here rather than left to the
 * user. A blur that carries the value the document already holds commits
 * NOTHING: otherwise merely tabbing through a field would bump the revision,
 * write an empty history entry, and remount the control under the moving focus
 * - a keyboard trap. And a deliberate Enter commit asks the parent to hand
 * focus back to the rebuilt control, so committing does not drop the user out
 * of the panel.
 */
export function InspectorFieldRow(props: {
  field: InspectorField
  reading: FieldReading
  scope: EditScope
  error: string | undefined
  onCommit: (value: FieldValue, options: { readonly keepFocus: boolean }) => void
  /** Input that is not even the right shape; never reaches the document. */
  onInvalid: (message: string) => void
  /**
   * Asks the parent whether this freshly mounted row is the one that just
   * committed from the keyboard. Consumes the claim, so exactly one row can
   * take focus back.
   */
  claimFocus?: (() => boolean) | undefined
}): JSX.Element {
  const { field, reading, scope, error } = props
  const amountRef = useRef<HTMLInputElement>(null)
  const unitRef = useRef<HTMLSelectElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  /** True while an Enter keypress is driving the blur that commits. */
  const committingWithEnter = useRef(false)

  const claimFocus = props.claimFocus
  useEffect(() => {
    // This row may be a remount of one that was just committed from the
    // keyboard; if so it takes focus back. The claim is consumed, so no later
    // commit from another surface can pull focus into the inspector.
    if (claimFocus === undefined || !claimFocus()) return
    const control = rowRef.current?.querySelector<HTMLElement>('.field__control')
    control?.focus()
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
      control.select()
    }
    // Mount-only on purpose: the row is keyed by scope, revision, and targets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** A value the document already holds is not an edit. */
  const isUnchanged = (value: FieldValue): boolean =>
    reading.state === 'value' && JSON.stringify(reading.value) === JSON.stringify(value)

  const mixed = reading.state === 'mixed'
  const describedBy = [
    field.help === undefined ? undefined : `${field.id}-help`,
    mixed ? `${field.id}-mixed` : undefined,
    reading.overridden ? `${field.id}-scope` : undefined,
    error === undefined ? undefined : `${field.id}-error`,
  ].filter((id): id is string => id !== undefined)

  const commitRaw = (raw: string): void => {
    const parsed = parseFieldInput(field, raw)
    if (!parsed.ok) {
      // A cleared control means "no change"; anything else is a shape error the
      // schema would only report in less specific terms.
      if (parsed.message !== undefined) props.onInvalid(parsed.message)
      return
    }
    if (isUnchanged(parsed.value)) return
    props.onCommit(parsed.value, { keepFocus: committingWithEnter.current })
  }

  const commitDimension = (rawAmount: string, unit: DimensionUnit): void => {
    const parsed = parseFieldInput(field, rawAmount)
    if (!parsed.ok) {
      if (parsed.message !== undefined) props.onInvalid(parsed.message)
      return
    }
    const amount = parsed.value
    const value = composeDimension(amount === 'auto' ? 'auto' : Number(amount), unit)
    if (isUnchanged(value)) return
    props.onCommit(value, { keepFocus: committingWithEnter.current })
  }

  const shared = {
    id: field.id,
    'aria-describedby': describedBy.length === 0 ? undefined : describedBy.join(' '),
    'aria-invalid': error === undefined ? undefined : true,
    // `field__control` is a query hook for the focus helper above, not a
    // style: everything visual is in the utilities beside it.
    className: 'field__control w-full min-w-0 min-h-9 rounded-input border border-default bg-surface-canvas p-2 font-[inherit] text-[13px] text-primary hover:border-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring aria-invalid:border-status-danger data-[mixed=true]:placeholder:text-muted data-[mixed=true]:placeholder:italic',
    'data-mixed': mixed,
  } as const

  const stringValue =
    reading.state === 'value' && typeof reading.value !== 'object'
      ? String(reading.value)
      : ''

  const renderControl = (): JSX.Element => {
    if (field.kind === 'select') {
      return (
        <select
          {...shared}
          defaultValue={mixed ? '' : stringValue}
          onChange={(event) => {
            if (event.target.value === '') return
            // A select commits on change, and focus stays on it by itself.
            committingWithEnter.current = true
            commitRaw(event.target.value)
            committingWithEnter.current = false
          }}
        >
          {(mixed || reading.state === 'empty') && <option value="">Mixed or unset</option>}
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    if (field.kind === 'multiline') {
      return (
        <textarea
          {...shared}
          rows={3}
          defaultValue={stringValue}
          placeholder={mixed ? 'Mixed' : undefined}
          onBlur={(event) => {
            commitRaw(event.target.value)
          }}
        />
      )
    }

    if (field.kind === 'dimension') {
      const parts = dimensionParts(reading.value)
      return (
        <span className="flex min-w-0 items-center gap-2">
          <input
            {...shared}
            ref={amountRef}
            type="text"
            inputMode="decimal"
            defaultValue={mixed ? '' : parts.amount}
            placeholder={mixed ? 'Mixed' : 'auto'}
            onBlur={(event) => {
              const unit = unitRef.current?.value ?? 'px'
              commitDimension(event.target.value, isDimensionUnit(unit) ? unit : 'px')
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              committingWithEnter.current = true
              event.currentTarget.blur()
              committingWithEnter.current = false
            }}
          />
          <label htmlFor={`${field.id}-unit`}>
            <span className="sr-only">{field.label} unit</span>
            <select
              id={`${field.id}-unit`}
              ref={unitRef}
              className="min-h-9 rounded-control border border-default bg-surface-canvas
                px-2 py-1 font-[inherit] text-[13px] text-primary
                focus-visible:outline-2 focus-visible:outline-offset-1
                focus-visible:outline-focus-ring"
              defaultValue={parts.unit}
              onChange={(event) => {
                const amount = amountRef.current?.value ?? ''
                const unit = event.target.value
                committingWithEnter.current = true
                commitDimension(amount, isDimensionUnit(unit) ? unit : 'px')
                committingWithEnter.current = false
              }}
            >
              {DIMENSION_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
        </span>
      )
    }

    return (
      <input
        {...shared}
        type={field.kind === 'number' ? 'number' : 'text'}
        {...(field.kind === 'number'
          ? { min: field.min, max: field.max, step: field.step }
          : {})}
        defaultValue={mixed ? '' : stringValue}
        placeholder={mixed ? 'Mixed' : undefined}
        onBlur={(event) => {
          commitRaw(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          committingWithEnter.current = true
          event.currentTarget.blur()
          committingWithEnter.current = false
        }}
      />
    )
  }

  return (
    <div
      className="flex min-w-0 flex-col gap-1"
      ref={rowRef}
      data-invalid={error !== undefined}
    >
      {/* Labels are persistent and visible; a placeholder is never the label. */}
      <label className="text-xs font-semibold text-secondary" htmlFor={field.id}>
        {field.label}
        {field.unit === undefined ? null : (
          <span className="font-normal text-muted"> ({field.unit})</span>
        )}
      </label>

      {renderControl()}

      {mixed && (
        <p className="m-0 text-[11px] leading-[1.45] text-muted" id={`${field.id}-mixed`}>
          Mixed across the selection. Entering a value sets it on every selected element.
        </p>
      )}
      {reading.overridden && (
        <p className="m-0 text-[11px] leading-[1.45] text-muted" id={`${field.id}-scope`}>
          Already overridden for {EDIT_SCOPE_LABELS[scope]}.
        </p>
      )}
      {field.help !== undefined && (
        <p className="m-0 text-[11px] leading-[1.45] text-muted" id={`${field.id}-help`}>
          {field.help}
        </p>
      )}
      {error !== undefined && (
        <p
          className="m-0 text-[11px] leading-[1.45] text-status-danger before:content-['\26A0__']"
          id={`${field.id}-error`}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  )
}

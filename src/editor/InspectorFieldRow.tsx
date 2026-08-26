import { useRef, type JSX } from 'react'

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
 */
export function InspectorFieldRow(props: {
  field: InspectorField
  reading: FieldReading
  scope: EditScope
  error: string | undefined
  onCommit: (value: FieldValue) => void
  /** Input that is not even the right shape; never reaches the document. */
  onInvalid: (message: string) => void
}): JSX.Element {
  const { field, reading, scope, error } = props
  const amountRef = useRef<HTMLInputElement>(null)
  const unitRef = useRef<HTMLSelectElement>(null)

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
    props.onCommit(parsed.value)
  }

  const commitDimension = (rawAmount: string, unit: DimensionUnit): void => {
    const parsed = parseFieldInput(field, rawAmount)
    if (!parsed.ok) {
      if (parsed.message !== undefined) props.onInvalid(parsed.message)
      return
    }
    const amount = parsed.value
    props.onCommit(composeDimension(amount === 'auto' ? 'auto' : Number(amount), unit))
  }

  const shared = {
    id: field.id,
    'aria-describedby': describedBy.length === 0 ? undefined : describedBy.join(' '),
    'aria-invalid': error === undefined ? undefined : true,
    className: 'field__control',
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
            commitRaw(event.target.value)
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
        <span className="field__dimension">
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
              event.currentTarget.blur()
            }}
          />
          <label className="field__unit-label" htmlFor={`${field.id}-unit`}>
            <span className="visually-hidden">{field.label} unit</span>
            <select
              id={`${field.id}-unit`}
              ref={unitRef}
              className="field__unit"
              defaultValue={parts.unit}
              onChange={(event) => {
                const amount = amountRef.current?.value ?? ''
                const unit = event.target.value
                commitDimension(amount, isDimensionUnit(unit) ? unit : 'px')
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
          event.currentTarget.blur()
        }}
      />
    )
  }

  return (
    <div className="field" data-invalid={error !== undefined}>
      <label className="field__label" htmlFor={field.id}>
        {field.label}
        {field.unit === undefined ? null : (
          <span className="field__unit-hint"> ({field.unit})</span>
        )}
      </label>

      {renderControl()}

      {mixed && (
        <p className="field__note" id={`${field.id}-mixed`}>
          Mixed across the selection. Entering a value sets it on every selected element.
        </p>
      )}
      {reading.overridden && (
        <p className="field__note" id={`${field.id}-scope`}>
          Already overridden for {EDIT_SCOPE_LABELS[scope]}.
        </p>
      )}
      {field.help !== undefined && (
        <p className="field__help" id={`${field.id}-help`}>
          {field.help}
        </p>
      )}
      {error !== undefined && (
        <p className="field__error" id={`${field.id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

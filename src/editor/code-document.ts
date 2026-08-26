import type { ElementId } from '../model/ids'
import {
  EDITABLE_PROPERTY_GROUPS,
  editablePropertiesSchema,
  FORBIDDEN_PROPERTY_KEYS,
  type EditableProperties,
  type EditablePropertyPatch,
} from '../model/properties'

/**
 * The structured code surface, as pure functions.
 *
 * The code panel edits validated JSON, never JSX or CSS: a draft is an object
 * keyed by selected element id whose values are editable property sets. Nothing
 * here touches the document. `prepareCodeEdit` turns a draft into the same
 * `changes` map a canvas control produces, and the shared command pipeline
 * still validates it afterwards - this module is a translation layer, not a
 * second validation authority.
 *
 * Two things are deliberately absent from the editable text:
 *
 * - `revision`, because a draft must not be able to claim it is fresh. The
 *   panel captures the revision it serialized and passes it to the commit, so
 *   an edit prepared before someone else's change is rejected as stale.
 * - `scope`, because Scope Lock already owns it. Two places to choose the same
 *   thing is how a "mobile only" edit quietly lands on every viewport.
 */

/** One selected element as the code surface sees it. */
export interface CodeTarget {
  readonly id: ElementId
  /** Base for scope `all`; base merged with the override for a viewport. */
  readonly displayed: EditableProperties
}

export const CODE_DRAFT_ERROR_CODES = [
  'syntax',
  'shape',
  'unknown-target',
  'missing-target',
  'forbidden-field',
  'invalid-value',
  'field-removal',
  'no-change',
] as const
export type CodeDraftErrorCode = (typeof CODE_DRAFT_ERROR_CODES)[number]

export interface CodeDraftError {
  readonly code: CodeDraftErrorCode
  readonly message: string
  /** Dotted field path, e.g. `hero.heading > typography.fontSize`. */
  readonly path?: string | undefined
  /** 1-based caret position, present for syntax errors. */
  readonly line?: number | undefined
  readonly column?: number | undefined
}

export type CodeDraftResult =
  | {
      readonly ok: true
      /** Only the targets that actually changed; an unchanged target is dropped. */
      readonly targetIds: readonly ElementId[]
      readonly changes: Readonly<Record<ElementId, EditablePropertyPatch>>
    }
  | { readonly ok: false; readonly errors: readonly CodeDraftError[] }

/* -------------------------------------------------------------------------- */
/* Serialization                                                               */
/* -------------------------------------------------------------------------- */

/** Formats the current selection as the draft the user edits. */
export function serializeCodeDraft(targets: readonly CodeTarget[]): string {
  const draft: Record<string, EditableProperties> = {}
  for (const target of targets) {
    draft[target.id] = target.displayed
  }
  return `${JSON.stringify(draft, null, 2)}\n`
}

/* -------------------------------------------------------------------------- */
/* JSON parsing                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Turns a byte offset into a 1-based line and column so the panel can point at
 * the bad character instead of saying "invalid JSON" and leaving the user to
 * hunt for it.
 */
function locate(text: string, offset: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(offset, text.length))
  const before = text.slice(0, clamped)
  const lines = before.split('\n')
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 }
}

/**
 * Reads the caret out of a `SyntaxError` message.
 *
 * Runtimes disagree: some report `at position 42`, some `(line 3 column 5)`,
 * and some report neither. When there is nothing to read the panel still shows
 * the engine's message - a location is an improvement, not a promise.
 */
function positionFromSyntaxError(
  text: string,
  message: string,
): { line: number; column: number } | undefined {
  const lineColumn = /line (\d+) column (\d+)/.exec(message)
  if (lineColumn?.[1] !== undefined && lineColumn[2] !== undefined) {
    return { line: Number(lineColumn[1]), column: Number(lineColumn[2]) }
  }

  const offset = /position (\d+)/.exec(message)
  if (offset?.[1] === undefined) return undefined
  const parsed = Number.parseInt(offset[1], 10)
  return Number.isNaN(parsed) ? undefined : locate(text, parsed)
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; error: CodeDraftError } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'The draft is not valid JSON.'
    const position = positionFromSyntaxError(text, message)
    return {
      ok: false,
      error: {
        code: 'syntax',
        message:
          position === undefined
            ? `The draft is not valid JSON: ${message}`
            : `The draft is not valid JSON at line ${position.line}, column ${position.column}: ${message}`,
        path: undefined,
        line: position?.line,
        column: position?.column,
      },
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/* -------------------------------------------------------------------------- */
/* Schema validation                                                           */
/* -------------------------------------------------------------------------- */

const FORBIDDEN_KEY_SET: ReadonlySet<string> = new Set(FORBIDDEN_PROPERTY_KEYS)

function validateProperties(
  id: ElementId,
  value: unknown,
): { ok: true; properties: EditableProperties } | { ok: false; errors: CodeDraftError[] } {
  const parsed = editablePropertiesSchema.safeParse(value)
  if (parsed.success) {
    return { ok: true, properties: parsed.data }
  }

  const errors = parsed.error.issues.map((issue): CodeDraftError => {
    const path = [id, ...issue.path.map((segment) => String(segment))].join('.')

    if (issue.code === 'unrecognized_keys') {
      const forbidden = issue.keys.filter((key) => FORBIDDEN_KEY_SET.has(key))
      return {
        code: 'forbidden-field',
        message:
          forbidden.length > 0
            ? `Protected field(s) ${forbidden.join(', ')} cannot be set from the code surface.`
            : `Field(s) ${issue.keys.join(', ')} are outside the editable property allowlist.`,
        path,
        line: undefined,
        column: undefined,
      }
    }

    return {
      code: 'invalid-value',
      message: issue.message,
      path,
      line: undefined,
      column: undefined,
    }
  })

  return { ok: false, errors }
}

/* -------------------------------------------------------------------------- */
/* Diffing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Fields whose object value merges field-by-field rather than as a whole.
 *
 * Everything else is compared atomically on purpose. A `size.width` dimension
 * is `{ value, unit }` and is only valid complete, so emitting a half of it
 * would produce a patch the command schema rejects. Box spacing is different:
 * every side is independently optional and `mergeEditableProperties` overlays
 * it side by side, so a one-side change should stay a one-side patch.
 */
const MERGEABLE_NESTED_FIELDS: Readonly<Record<string, readonly string[]>> = {
  spacing: ['padding', 'margin'],
}

function isDeepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

interface GroupDiff {
  readonly changed: Record<string, unknown>
  readonly removed: readonly string[]
}

function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  pathPrefix: string,
  mergeableFields: readonly string[],
): GroupDiff {
  const changed: Record<string, unknown> = {}
  const removed: string[] = []
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of keys) {
    const beforeValue = before[key]
    const afterValue = after[key]

    if (afterValue === undefined) {
      if (beforeValue !== undefined) removed.push(`${pathPrefix}.${key}`)
      continue
    }

    if (
      mergeableFields.includes(key) &&
      isPlainObject(beforeValue) &&
      isPlainObject(afterValue)
    ) {
      const nested = diffFields(beforeValue, afterValue, `${pathPrefix}.${key}`, [])
      removed.push(...nested.removed)
      if (Object.keys(nested.changed).length > 0) changed[key] = nested.changed
      continue
    }

    if (!isDeepEqual(beforeValue, afterValue)) changed[key] = afterValue
  }

  return { changed, removed }
}

/**
 * Difference between what the scope currently holds and what the draft says.
 *
 * Removals are reported rather than applied: a code commit merges, so dropping
 * a key from the draft could not remove the field, and pretending otherwise
 * would be a silent no-op. Clearing a field back to an earlier state is what
 * restore is for.
 */
export function diffCodeProperties(
  id: ElementId,
  before: EditableProperties,
  after: EditableProperties,
): { readonly patch: EditablePropertyPatch; readonly removed: readonly string[] } {
  const patch: Record<string, unknown> = {}
  const removed: string[] = []

  for (const group of EDITABLE_PROPERTY_GROUPS) {
    const beforeGroup = before[group]
    const afterGroup = after[group]

    if (afterGroup === undefined) {
      if (beforeGroup !== undefined) {
        for (const key of Object.keys(beforeGroup)) removed.push(`${id}.${group}.${key}`)
      }
      continue
    }

    const diff = diffFields(
      beforeGroup ?? {},
      afterGroup,
      `${id}.${group}`,
      MERGEABLE_NESTED_FIELDS[group] ?? [],
    )
    removed.push(...diff.removed)
    if (Object.keys(diff.changed).length > 0) patch[group] = diff.changed
  }

  // The shape is checked against the property schema by the caller before this
  // runs, and again by the command pipeline afterwards.
  return { patch, removed }
}

/* -------------------------------------------------------------------------- */
/* Preparation                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Translates draft text into the change map a commit needs.
 *
 * Failure is total: one bad element leaves the whole draft unapplied, so a
 * partially understood draft can never half-write the document.
 */
export function prepareCodeEdit(input: {
  readonly text: string
  readonly targets: readonly CodeTarget[]
}): CodeDraftResult {
  const parsed = parseJson(input.text)
  if (!parsed.ok) return { ok: false, errors: [parsed.error] }

  if (!isPlainObject(parsed.value)) {
    return {
      ok: false,
      errors: [
        {
          code: 'shape',
          message:
            'The draft must be a JSON object keyed by element id, for example { "hero.heading": { "typography": { "fontSize": 44 } } }.',
          path: undefined,
          line: undefined,
          column: undefined,
        },
      ],
    }
  }

  const draft = parsed.value
  const errors: CodeDraftError[] = []
  const byId = new Map(input.targets.map((target) => [String(target.id), target]))

  for (const key of Object.keys(draft)) {
    if (!byId.has(key)) {
      errors.push({
        code: 'unknown-target',
        message: `"${key}" is not one of the selected elements, so it cannot be edited here.`,
        path: key,
        line: undefined,
        column: undefined,
      })
    }
  }

  for (const target of input.targets) {
    if (!Object.hasOwn(draft, String(target.id))) {
      errors.push({
        code: 'missing-target',
        message: `The draft is missing selected element "${target.id}". Revert to reload the current values.`,
        path: String(target.id),
        line: undefined,
        column: undefined,
      })
    }
  }

  if (errors.length > 0) return { ok: false, errors }

  const changes: Record<ElementId, EditablePropertyPatch> = {}
  const targetIds: ElementId[] = []
  const removed: string[] = []

  for (const target of input.targets) {
    const validated = validateProperties(target.id, draft[String(target.id)])
    if (!validated.ok) {
      errors.push(...validated.errors)
      continue
    }

    const diff = diffCodeProperties(target.id, target.displayed, validated.properties)
    removed.push(...diff.removed)
    if (Object.keys(diff.patch).length > 0) {
      changes[target.id] = diff.patch
      targetIds.push(target.id)
    }
  }

  if (errors.length > 0) return { ok: false, errors }

  if (removed.length > 0) {
    return {
      ok: false,
      errors: removed.map((path) => ({
        code: 'field-removal' as const,
        message:
          'Removing a field is not supported from the code surface, which only sets values. Put the field back, or use History to restore an earlier state.',
        path,
        line: undefined,
        column: undefined,
      })),
    }
  }

  if (targetIds.length === 0) {
    return {
      ok: false,
      errors: [
        {
          code: 'no-change',
          message: 'The draft matches the current values, so there is nothing to apply.',
          path: undefined,
          line: undefined,
          column: undefined,
        },
      ],
    }
  }

  return { ok: true, targetIds, changes }
}

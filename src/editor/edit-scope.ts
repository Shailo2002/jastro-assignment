import { VIEWPORTS, type EditScope, type Viewport } from '../model/viewport'

/**
 * Scope Lock text.
 *
 * The reviewer must be able to read, before committing, exactly what an edit
 * will touch and what it will leave alone. That statement is derived here as
 * plain strings so it can be asserted in tests and can never drift from the
 * scope the commit actually uses.
 */

export const EDIT_SCOPE_LABELS: Readonly<Record<EditScope, string>> = {
  all: 'All views',
  desktop: 'Desktop only',
  tablet: 'Tablet only',
  mobile: 'Mobile only',
}

const VIEWPORT_LABELS: Readonly<Record<Viewport, string>> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
}

/** Views an edit at this scope provably cannot change. */
export function protectedViewports(scope: EditScope): readonly Viewport[] {
  if (scope === 'all') return []
  return VIEWPORTS.filter((viewport) => viewport !== scope)
}

/** `Desktop and Tablet` / `Desktop, Tablet and Mobile`. */
export function joinWithAnd(values: readonly string[]): string {
  if (values.length === 0) return ''
  if (values.length === 1) return values[0] ?? ''
  return `${values.slice(0, -1).join(', ')} and ${values.at(-1) ?? ''}`
}

export interface ScopeLockDescription {
  /** e.g. `2 selected` or `Nothing selected`. */
  readonly targetText: string
  /** e.g. `Mobile only`. */
  readonly scopeText: string
  /** e.g. `Desktop and Tablet keep their current values.` */
  readonly protectionText: string
  /** Readable names of everything this edit would touch. */
  readonly targetNames: readonly string[]
  readonly protectedViewports: readonly Viewport[]
  /** False when there is nothing to edit, so the UI can explain the block. */
  readonly canEdit: boolean
}

export function describeScopeLock(input: {
  readonly scope: EditScope
  readonly targetNames: readonly string[]
}): ScopeLockDescription {
  const { scope, targetNames } = input
  const guarded = protectedViewports(scope)

  return {
    targetText:
      targetNames.length === 0 ? 'Nothing selected' : `${targetNames.length} selected`,
    scopeText: EDIT_SCOPE_LABELS[scope],
    protectionText:
      scope === 'all'
        ? 'Writes the shared value. A view that overrides a field keeps its own value for that field.'
        : `${joinWithAnd(guarded.map((viewport) => VIEWPORT_LABELS[viewport]))} keep their current values.`,
    targetNames,
    protectedViewports: guarded,
    canEdit: targetNames.length > 0,
  }
}

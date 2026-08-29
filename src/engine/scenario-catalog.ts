import type { ElementType } from '../model/element'
import type { ElementId } from '../model/ids'
import {
  FONT_WEIGHTS,
  type BoxSpacing,
  type Dimension,
  type EditableProperties,
  type EditablePropertyPatch,
} from '../model/properties'
import type { EditScope } from '../model/viewport'

/**
 * The deterministic scenario catalog.
 *
 * There is no model and no network here. An instruction is normalised to
 * lowercase words, matched against an ordered list of hand-written scenarios,
 * and the matched scenario derives a patch from the element's CURRENT resolved
 * values. The same instruction, selection, values, and scope therefore always
 * produce byte-identical output, which is what makes the demo reviewable.
 *
 * Nothing in this file reads a clock, a random source, the DOM, or the store,
 * and no function here receives a setter or mutation callback. Every builder is
 * a pure `(target, context) -> outcome`.
 *
 * Matching is first-match-wins over `SCENARIOS` in declaration order, and that
 * order is also the order the composer offers its example chips - so the
 * scenarios worth demonstrating first are declared first.
 *
 * Two precedences are load-bearing rather than cosmetic. The responsive
 * scenario stays ahead of the size and content scenarios, so "reduce the mobile
 * padding" is a viewport edit rather than a resize; and it stays ahead of the
 * content rewrite, which also owns the word "tighter". The colour scenarios lead
 * because they additionally require a palette colour by name, which no other
 * scenario looks at, so nothing else can be swallowed by them.
 */

export const SCENARIO_IDS = [
  'color-background',
  'color-text',
  'viewport-compact',
  'size-grow',
  'size-shrink',
  'content-tighten',
  'order-front',
  'multi-center',
  'style-emphasis',
] as const
export type ScenarioId = (typeof SCENARIO_IDS)[number]

/** Why one selected element produced no proposal while others did. */
export const PROPOSAL_SKIP_REASONS = ['incompatible-type', 'no-change'] as const
export type ProposalSkipReason = (typeof PROPOSAL_SKIP_REASONS)[number]

/** One selected element as the engine sees it: identity, type, current values. */
export interface ScenarioTarget {
  readonly id: ElementId
  readonly type: ElementType
  /**
   * The property set this scope reads: `element.base` for scope `all`, and the
   * viewport's resolved values for a viewport scope. The engine never sees the
   * raw element, so it cannot reach `overrides` for a scope it was not given.
   */
  readonly current: EditableProperties
}

export interface ScenarioContext {
  readonly scope: EditScope
  readonly targetCount: number
  /**
   * The normalised instruction. Only the colour scenarios read it: the colour
   * they set is named in the instruction itself, not fixed by the scenario.
   */
  readonly instruction: NormalizedInstruction
}

export type ScenarioOutcome =
  | {
      readonly ok: true
      readonly patch: EditablePropertyPatch
      readonly summary: string
    }
  | {
      readonly ok: false
      readonly reason: ProposalSkipReason
      readonly message: string
    }

export interface ScenarioRequirements {
  /** The scenario is only meaningful for a single viewport, not for `all`. */
  readonly viewportScope?: boolean
  /** Minimum number of selected elements, e.g. a consistency edit needs two. */
  readonly minTargets?: number
}

export interface ScenarioDefinition {
  readonly id: ScenarioId
  readonly title: string
  /** A phrase a reviewer can type verbatim and see this scenario run. */
  readonly example: string
  readonly description: string
  readonly requirements: ScenarioRequirements
  readonly matches: (instruction: NormalizedInstruction) => boolean
  readonly build: (target: ScenarioTarget, context: ScenarioContext) => ScenarioOutcome
}

/* -------------------------------------------------------------------------- */
/* Instruction normalisation                                                   */
/* -------------------------------------------------------------------------- */

export interface NormalizedInstruction {
  /** Lowercased, punctuation-stripped, single-spaced. */
  readonly text: string
  readonly words: readonly string[]
}

/**
 * Normalisation is the only "understanding" step: case, punctuation, and
 * spacing are removed so that `Make the HERO heading bigger!` and
 * `make the hero heading bigger` are the same input. Nothing is stemmed or
 * guessed; every accepted word appears literally in a scenario's word list.
 */
export function normalizeInstruction(raw: string): NormalizedInstruction {
  const text = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return { text, words: text === '' ? [] : text.split(' ') }
}

function hasAny(instruction: NormalizedInstruction, candidates: readonly string[]): boolean {
  return instruction.words.some((word) => candidates.includes(word))
}

const VIEWPORT_WORDS = ['mobile', 'tablet', 'desktop', 'viewport', 'breakpoint'] as const
const COMPACT_WORDS = [
  'compact',
  'tighter',
  'tighten',
  'denser',
  'spacing',
  'padding',
  'condense',
] as const
const REWRITE_VERBS = [
  'rewrite',
  'reword',
  'shorten',
  'tighten',
  'trim',
  'concise',
  'punchier',
  'punchy',
] as const
const COPY_NOUNS = [
  'copy',
  'text',
  'wording',
  'words',
  'message',
  'headline',
  'heading',
  'label',
  'sentence',
] as const
const MOVE_VERBS = ['move', 'bring', 'put', 'reorder', 'promote'] as const
const FRONT_WORDS = ['front', 'first', 'ahead', 'order', 'earlier'] as const
const GROW_WORDS = ['bigger', 'larger', 'grow', 'enlarge', 'increase', 'scale'] as const
const SHRINK_WORDS = ['smaller', 'shrink', 'decrease', 'reduce', 'downsize'] as const
const BACKGROUND_WORDS = ['background', 'backdrop', 'bg', 'fill'] as const
const TEXT_COLOR_WORDS = ['text', 'font', 'type', 'letters', 'words', 'foreground'] as const
const CENTER_WORDS = ['center', 'centre', 'centered', 'centred', 'align', 'consistent'] as const
const EMPHASIS_WORDS = [
  'bold',
  'bolder',
  'boldest',
  'emphasis',
  'emphasise',
  'emphasize',
  'stronger',
  'heavier',
  'stand',
] as const

/**
 * The colours the demo understands, by name.
 *
 * A fixed palette rather than free-form input: every value here already
 * satisfies the colour schema, so a named colour can never produce a proposal
 * that fails validation.
 */
const NAMED_COLORS: Readonly<Record<string, string>> = {
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#eab308',
  orange: '#f97316',
  purple: '#a855f7',
  pink: '#ec4899',
  teal: '#14b8a6',
  black: '#000000',
  white: '#ffffff',
  grey: '#6b7280',
  gray: '#6b7280',
  transparent: 'transparent',
}

interface NamedColor {
  readonly name: string
  readonly value: string
}

/** The first palette colour named in the instruction, in the order typed. */
function namedColorIn(instruction: NormalizedInstruction): NamedColor | undefined {
  for (const word of instruction.words) {
    const value = NAMED_COLORS[word]
    if (value !== undefined) return { name: word, value }
  }
  return undefined
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                              */
/* -------------------------------------------------------------------------- */

const TEXT_TYPES: readonly ElementType[] = ['heading', 'text', 'badge', 'button']
const BOX_TYPES: readonly ElementType[] = ['section', 'container', 'card', 'image']

function isTextType(type: ElementType): boolean {
  return TEXT_TYPES.includes(type)
}

function skip(reason: ProposalSkipReason, message: string): ScenarioOutcome {
  return { ok: false, reason, message }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Scales a dimension, keeping its unit; `auto` has nothing to scale. */
function scaleDimension(dimension: Dimension | undefined, factor: number): Dimension | undefined {
  if (dimension === undefined || dimension === 'auto') return undefined
  const scaled = clamp(Math.round(dimension.value * factor * 100) / 100, -4000, 4000)
  if (scaled === dimension.value) return undefined
  return { value: scaled, unit: dimension.unit }
}

/** Scales only the sides that are actually set, so an unset side stays unset. */
function scaleBoxSpacing(box: BoxSpacing | undefined, factor: number): BoxSpacing | undefined {
  if (box === undefined) return undefined
  const scaled: BoxSpacing = {}
  let changed = false
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const value = box[side]
    if (value === undefined) continue
    const next = clamp(Math.round(value * factor), -512, 512)
    scaled[side] = next
    if (next !== value) changed = true
  }
  return changed ? scaled : undefined
}

/* -------------------------------------------------------------------------- */
/* Content rewrite                                                             */
/* -------------------------------------------------------------------------- */

const CONDENSE_WORD_BUDGET = 12
const TRAILING_CONJUNCTIONS = ['and', 'or', 'but', 'with', 'plus', 'so'] as const

function countWords(value: string): number {
  return value.split(/\s+/).filter((word) => word.length > 0).length
}

/**
 * A mechanical condense, not a language model.
 *
 * Two rules, applied in order, and both of them only ever REMOVE text:
 *
 * 1. keep the first sentence;
 * 2. while the result is over the word budget and still has more than one
 *    comma-separated clause, drop the last clause.
 *
 * A sentence that is already short enough comes back unchanged, and the caller
 * reports that honestly as a skip rather than inventing a different sentence.
 * Nothing is ever added, so the rewrite cannot introduce a claim the template
 * did not already make.
 */
export function condenseText(input: string): string {
  const collapsed = input.replace(/\s+/g, ' ').trim()
  if (collapsed === '') return collapsed

  const terminator = /[.!?]$/.exec(collapsed)?.[0] ?? ''
  const firstSentence = /^(.*?[.!?])(\s|$)/.exec(collapsed)?.[1] ?? collapsed

  let body = firstSentence.replace(/[.!?]+$/, '').trim()
  const clauses = body.split(',').map((clause) => clause.trim())

  let kept = clauses.length
  while (kept > 1 && countWords(clauses.slice(0, kept).join(', ')) > CONDENSE_WORD_BUDGET) {
    kept -= 1
  }
  body = clauses.slice(0, kept).join(', ')

  // Dropping a clause can leave a dangling `and`/`with`; remove it rather than
  // publishing a sentence that reads as if it were cut off.
  let words = body.split(' ').filter((word) => word.length > 0)
  while (
    words.length > 1 &&
    (TRAILING_CONJUNCTIONS as readonly string[]).includes(
      (words.at(-1) ?? '').toLowerCase(),
    )
  ) {
    words = words.slice(0, -1)
  }
  body = words.join(' ').replace(/[\s,;]+$/, '')

  const ending = terminator === '' ? '' : terminator
  return `${body}${ending}`
}

function buildContentTighten(target: ScenarioTarget): ScenarioOutcome {
  const text = target.current.content?.text
  if (typeof text !== 'string' || text.trim() === '') {
    return skip(
      'incompatible-type',
      `"${target.id}" carries no editable text, so there is nothing to rewrite.`,
    )
  }

  const condensed = condenseText(text)
  if (condensed === text.replace(/\s+/g, ' ').trim()) {
    return skip('no-change', `"${target.id}" is already one short sentence.`)
  }

  return {
    ok: true,
    patch: { content: { text: condensed } },
    summary: `Condenses the copy to "${condensed}".`,
  }
}

/* -------------------------------------------------------------------------- */
/* Style                                                                       */
/* -------------------------------------------------------------------------- */

type FontWeight = (typeof FONT_WEIGHTS)[number]

const DEFAULT_FONT_WEIGHT: FontWeight = 400

function nextFontWeight(current: number): FontWeight | undefined {
  return FONT_WEIGHTS.find((weight) => weight > current)
}

function buildStyleEmphasis(target: ScenarioTarget): ScenarioOutcome {
  if (!isTextType(target.type)) {
    return skip(
      'incompatible-type',
      `Font weight applies to text elements; "${target.id}" is a ${target.type}.`,
    )
  }

  // An unset weight resolves to the renderer's 400, so that is the value the
  // proposal reasons from; the patch still writes an explicit number.
  const current = target.current.typography?.fontWeight ?? DEFAULT_FONT_WEIGHT
  const next = nextFontWeight(current)
  if (next === undefined) {
    return skip('no-change', `"${target.id}" is already at the heaviest weight (${current}).`)
  }

  return {
    ok: true,
    patch: { typography: { fontWeight: next } },
    summary: `Raises font weight from ${current} to ${next}.`,
  }
}

/* -------------------------------------------------------------------------- */
/* Size                                                                        */
/* -------------------------------------------------------------------------- */

const GROW_FACTOR = 1.25

function buildSizeGrow(target: ScenarioTarget): ScenarioOutcome {
  if (isTextType(target.type)) {
    const fontSize = target.current.typography?.fontSize
    if (fontSize === undefined) {
      return skip(
        'no-change',
        `"${target.id}" has no explicit font size to scale. Set one first, then run this again.`,
      )
    }
    const next = clamp(Math.round(fontSize * GROW_FACTOR), 8, 200)
    if (next === fontSize) {
      return skip('no-change', `"${target.id}" is already at the largest supported size.`)
    }
    return {
      ok: true,
      patch: { typography: { fontSize: next } },
      summary: `Grows font size from ${fontSize} to ${next}.`,
    }
  }

  if (BOX_TYPES.includes(target.type)) {
    const width = target.current.size?.width
    const next = scaleDimension(width, GROW_FACTOR)
    if (width === undefined || width === 'auto' || next === undefined || next === 'auto') {
      return skip(
        'no-change',
        `"${target.id}" has no fixed width to scale, so growing it would not be a definite change.`,
      )
    }
    return {
      ok: true,
      patch: { size: { width: next } },
      summary: `Grows width from ${width.value}${width.unit} to ${next.value}${next.unit}.`,
    }
  }

  return skip('incompatible-type', `"${target.id}" has no size this scenario can scale.`)
}

const SHRINK_FACTOR = 0.8

function buildSizeShrink(target: ScenarioTarget): ScenarioOutcome {
  if (isTextType(target.type)) {
    const fontSize = target.current.typography?.fontSize
    if (fontSize === undefined) {
      return skip(
        'no-change',
        `"${target.id}" has no explicit font size to scale. Set one first, then run this again.`,
      )
    }
    const next = clamp(Math.round(fontSize * SHRINK_FACTOR), 8, 200)
    if (next === fontSize) {
      return skip('no-change', `"${target.id}" is already at the smallest supported size.`)
    }
    return {
      ok: true,
      patch: { typography: { fontSize: next } },
      summary: `Shrinks font size from ${fontSize} to ${next}.`,
    }
  }

  if (BOX_TYPES.includes(target.type)) {
    const width = target.current.size?.width
    const next = scaleDimension(width, SHRINK_FACTOR)
    if (width === undefined || width === 'auto' || next === undefined || next === 'auto') {
      return skip(
        'no-change',
        `"${target.id}" has no fixed width to scale, so shrinking it would not be a definite change.`,
      )
    }
    return {
      ok: true,
      patch: { size: { width: next } },
      summary: `Shrinks width from ${width.value}${width.unit} to ${next.value}${next.unit}.`,
    }
  }

  return skip('incompatible-type', `"${target.id}" has no size this scenario can scale.`)
}

/* -------------------------------------------------------------------------- */
/* Colour                                                                      */
/* -------------------------------------------------------------------------- */

const BACKGROUND_TYPES: readonly ElementType[] = [
  'section',
  'container',
  'card',
  'badge',
  'button',
]

function buildBackgroundColor(
  target: ScenarioTarget,
  context: ScenarioContext,
): ScenarioOutcome {
  const chosen = namedColorIn(context.instruction)
  if (chosen === undefined) {
    return skip('no-change', 'Name one of the demo colours, such as green, blue, or white.')
  }
  if (!BACKGROUND_TYPES.includes(target.type)) {
    return skip(
      'incompatible-type',
      `A background applies to boxes, badges, and buttons; "${target.id}" is a ${target.type}.`,
    )
  }
  if (target.current.surface?.background === chosen.value) {
    return skip('no-change', `"${target.id}" already has a ${chosen.name} background.`)
  }
  return {
    ok: true,
    patch: { surface: { background: chosen.value } },
    summary: `Sets the background to ${chosen.name} (${chosen.value}).`,
  }
}

function buildTextColor(target: ScenarioTarget, context: ScenarioContext): ScenarioOutcome {
  const chosen = namedColorIn(context.instruction)
  if (chosen === undefined) {
    return skip('no-change', 'Name one of the demo colours, such as green, blue, or white.')
  }
  if (!isTextType(target.type)) {
    return skip(
      'incompatible-type',
      `Text colour applies to text elements; "${target.id}" is a ${target.type}.`,
    )
  }
  if (target.current.typography?.color === chosen.value) {
    return skip('no-change', `"${target.id}" is already ${chosen.name}.`)
  }
  return {
    ok: true,
    patch: { typography: { color: chosen.value } },
    summary: `Sets the text colour to ${chosen.name} (${chosen.value}).`,
  }
}

/* -------------------------------------------------------------------------- */
/* Reorder                                                                     */
/* -------------------------------------------------------------------------- */

const MIN_ORDER = -50

/**
 * Reordering is a property edit, not a tree rewrite: it moves the element one
 * step earlier among its siblings via CSS `order`, so it is validated,
 * versioned, scopeable, and restorable like every other change.
 */
function buildOrderFront(target: ScenarioTarget): ScenarioOutcome {
  const current = target.current.layout?.order ?? 0
  if (current <= MIN_ORDER) {
    return skip('no-change', `"${target.id}" is already as far forward as ordering allows.`)
  }
  const next = current - 1
  return {
    ok: true,
    patch: { layout: { order: next } },
    summary: `Moves one step forward among siblings (order ${current} to ${next}).`,
  }
}

/* -------------------------------------------------------------------------- */
/* Responsive compaction                                                       */
/* -------------------------------------------------------------------------- */

const COMPACT_FACTOR = 0.75

function buildViewportCompact(
  target: ScenarioTarget,
  context: ScenarioContext,
): ScenarioOutcome {
  const spacing = target.current.spacing
  const padding = scaleBoxSpacing(spacing?.padding, COMPACT_FACTOR)
  const gap =
    spacing?.gap === undefined
      ? undefined
      : clamp(Math.round(spacing.gap * COMPACT_FACTOR), 0, 256)

  const patch: EditablePropertyPatch = {}
  const changed: string[] = []

  if (padding !== undefined) {
    patch.spacing = { ...(patch.spacing ?? {}), padding }
    changed.push('padding')
  }
  if (gap !== undefined && gap !== spacing?.gap) {
    patch.spacing = { ...(patch.spacing ?? {}), gap }
    changed.push('gap')
  }

  if (changed.length === 0) {
    return skip(
      'incompatible-type',
      `"${target.id}" sets no padding or gap for this view, so there is nothing to compact.`,
    )
  }

  return {
    ok: true,
    patch,
    summary: `Reduces ${changed.join(' and ')} by 25% for ${context.scope} only.`,
  }
}

/* -------------------------------------------------------------------------- */
/* Multi-element consistency                                                   */
/* -------------------------------------------------------------------------- */

function buildMultiCenter(target: ScenarioTarget): ScenarioOutcome {
  if (isTextType(target.type)) {
    if (target.current.typography?.textAlign === 'center') {
      return skip('no-change', `"${target.id}" is already centred.`)
    }
    return {
      ok: true,
      patch: { typography: { textAlign: 'center' } },
      summary: 'Centres the text.',
    }
  }

  if (BOX_TYPES.includes(target.type)) {
    if (target.current.layout?.alignItems === 'center') {
      return skip('no-change', `"${target.id}" already centres its contents.`)
    }
    return {
      ok: true,
      patch: { layout: { alignItems: 'center' } },
      summary: 'Centres the contents of the container.',
    }
  }

  return skip('incompatible-type', `"${target.id}" has no alignment this scenario can set.`)
}

/* -------------------------------------------------------------------------- */
/* The catalog                                                                 */
/* -------------------------------------------------------------------------- */

export const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: 'color-background',
    title: 'Recolour the background',
    example: 'Change the background to green',
    description:
      'Sets `surface.background` to the demo colour named in the instruction: green, red, blue, yellow, orange, purple, pink, teal, black, white, grey, or transparent.',
    requirements: {},
    matches: (instruction) =>
      hasAny(instruction, BACKGROUND_WORDS) && namedColorIn(instruction) !== undefined,
    build: buildBackgroundColor,
  },
  {
    id: 'color-text',
    title: 'Recolour the text',
    example: 'Make the text blue',
    description: 'Sets `typography.color` to the demo colour named in the instruction.',
    requirements: {},
    matches: (instruction) =>
      hasAny(instruction, TEXT_COLOR_WORDS) && namedColorIn(instruction) !== undefined,
    build: buildTextColor,
  },
  {
    id: 'viewport-compact',
    title: 'Compact spacing for one view',
    example: 'Make the mobile spacing more compact',
    description:
      'Reduces the padding and gap this one viewport resolves to by 25%, writing only to that viewport.',
    requirements: { viewportScope: true },
    matches: (instruction) =>
      hasAny(instruction, VIEWPORT_WORDS) && hasAny(instruction, COMPACT_WORDS),
    build: buildViewportCompact,
  },
  {
    id: 'size-grow',
    title: 'Make it bigger',
    example: 'Increase the font size',
    description:
      'Scales the current font size by 1.25 for text elements, or the current fixed width for boxes.',
    requirements: {},
    matches: (instruction) => hasAny(instruction, GROW_WORDS),
    build: (target) => buildSizeGrow(target),
  },
  {
    id: 'size-shrink',
    title: 'Make it smaller',
    example: 'Decrease the font size',
    description:
      'Scales the current font size by 0.8 for text elements, or the current fixed width for boxes.',
    requirements: {},
    matches: (instruction) => hasAny(instruction, SHRINK_WORDS),
    build: (target) => buildSizeShrink(target),
  },
  {
    id: 'content-tighten',
    title: 'Tighten the copy',
    example: 'Rewrite the copy to be shorter',
    description:
      'Keeps the first sentence and drops trailing clauses over a twelve-word budget. Text is only ever removed, never invented.',
    requirements: {},
    matches: (instruction) =>
      hasAny(instruction, REWRITE_VERBS) && hasAny(instruction, COPY_NOUNS),
    build: (target) => buildContentTighten(target),
  },
  {
    id: 'order-front',
    title: 'Move forward',
    example: 'Move this to the front',
    description:
      'Lowers `layout.order` by one so the element moves a step earlier among its siblings.',
    requirements: {},
    matches: (instruction) =>
      hasAny(instruction, MOVE_VERBS) && hasAny(instruction, FRONT_WORDS),
    build: (target) => buildOrderFront(target),
  },
  {
    id: 'multi-center',
    title: 'Centre the selection',
    example: 'Align the selected elements to center',
    description:
      'Centres every selected element: text alignment for text, item alignment for containers.',
    requirements: { minTargets: 2 },
    matches: (instruction) => hasAny(instruction, CENTER_WORDS),
    build: (target) => buildMultiCenter(target),
  },
  {
    id: 'style-emphasis',
    title: 'Add emphasis',
    example: 'Make the heading bolder',
    description: 'Raises the current font weight one step for each selected text element.',
    requirements: {},
    matches: (instruction) => hasAny(instruction, EMPHASIS_WORDS),
    build: (target) => buildStyleEmphasis(target),
  },
]

/** First match wins, in declaration order. `undefined` means unsupported. */
export function matchScenario(instruction: NormalizedInstruction): ScenarioDefinition | undefined {
  if (instruction.words.length === 0) return undefined
  return SCENARIOS.find((scenario) => scenario.matches(instruction))
}

export function findScenario(id: ScenarioId): ScenarioDefinition {
  const scenario = SCENARIOS.find((candidate) => candidate.id === id)
  if (scenario === undefined) {
    throw new Error(`Unknown scenario "${id}".`)
  }
  return scenario
}

/** The reviewer-visible example phrases, in catalog order. */
export function scenarioExamples(): readonly string[] {
  return SCENARIOS.map((scenario) => scenario.example)
}

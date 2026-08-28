import { useId, type JSX } from 'react'

import { scenarioExamples } from '../engine/scenario-catalog'
import type { EditScope } from '../model/viewport'
import { IconButton } from './controls'
import { ScopeLock } from './ScopeLock'

/**
 * The instruction composer.
 *
 * It is docked at the foot of the rail and never scrolls away, the way a chat
 * composer does: the transcript above it moves, this does not. The seam between
 * the two is a fade rather than a rule - the transcript runs out under the
 * composer instead of being cut off by a line drawn across the rail. Enter runs the
 * instruction, so the whole loop - type, run, review - needs no reach for the
 * pointer and no second tab stop.
 *
 * The layout is one box: the Scope Lock statement on top once there is a
 * selection to lock, then the field, then the control that starts the run. Scope Lock lives here rather than in the top
 * bar because this is where an instruction is written, and what it would touch
 * - and provably would not - is half of what that instruction means. It governs
 * every surface, so it is drawn once, on the one that never scrolls away. The supported instructions
 * sit above the box as one scrolling row of chips rather than behind a
 * disclosure - they are the fastest way to a correct instruction, and a
 * deterministic engine only answers to a fixed set of them, so hiding them
 * hides the product's actual vocabulary.
 *
 * The composer holds no state of its own. The instruction text belongs to the
 * shell, so leaving the editor's other surfaces cannot discard half-typed work,
 * and running is the caller's decision, not this component's.
 */
export function AiComposer(props: {
  instruction: string
  scope: EditScope
  /** Readable names of what an instruction would target; empty blocks the run. */
  targetNames: readonly string[]
  /**
   * False with nothing selected. Nothing spells the block out in prose here:
   * every control in the box is visibly disabled until it changes, and the
   * canvas states the empty selection once, above the thing being selected.
   */
  canRun: boolean
  onInstructionChange: (instruction: string) => void
  onRun: (instruction: string) => void
}): JSX.Element {
  const fieldId = useId()

  return (
    <div
      className="relative flex min-w-0 flex-none flex-col gap-2 bg-surface-shell px-3 py-2.5
        before:pointer-events-none before:absolute before:inset-x-0 before:-top-10
        before:h-10 before:bg-gradient-to-t before:from-surface-shell before:to-transparent"
    >
      {/* One row that scrolls sideways rather than a block that wraps: the
          composer must keep its height, whatever the catalog grows to.

          The row itself is a tab stop. A scrollable region must be reachable by
          keyboard, and with nothing selected every chip inside it is disabled -
          so without this, the only way to reach the far end of the row would be
          a pointer. */}
      <ul
        className="m-0 flex min-w-0 list-none gap-1.5 overflow-x-auto rounded-pill p-0
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2
          focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        aria-label="Example instructions"
        tabIndex={0}
      >
        {scenarioExamples().map((example) => (
          <li className="flex-none" key={example}>
            {/* The button keeps the full 44px target; the span inside it paints
                a 30px pill, so the row reads light without the control
                shrinking below the size a finger needs. */}
            <button
              type="button"
              className="group/chip flex min-h-touch cursor-pointer items-center rounded-pill
                px-0 text-secondary transition-colors duration-instant
                hover:not-disabled:text-primary focus-visible:outline-2
                focus-visible:outline-offset-2 focus-visible:outline-focus-ring
                disabled:cursor-not-allowed disabled:text-muted"
              disabled={!props.canRun}
              onClick={() => {
                props.onRun(example)
              }}
            >
              <span
                className={`flex min-h-[30px] items-center rounded-pill border border-default
                  bg-surface-panel px-3 text-xs whitespace-nowrap transition-colors
                  duration-instant ${
                    props.canRun
                      ? 'group-hover/chip:bg-surface-elevated'
                      : 'border-dashed'
                  }`}
              >
                {example}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div
        className="flex min-w-0 flex-col gap-1.5 rounded-card border border-default
          bg-surface-panel p-2 focus-within:border-selection
          focus-within:ring-2 focus-within:ring-selection-fill"
      >
        {/* Scope Lock itself, not a second summary of it: what an edit would
            touch and what it provably would not, at the head of the surface
            that writes the next one. It is drawn only when there is something
            to lock: with nothing selected it would print `Nothing selected` in
            the one place that has nothing to protect, and the canvas already
            states the empty selection while every control here is disabled. */}
        {props.canRun ? (
          <ScopeLock scope={props.scope} targetNames={props.targetNames} />
        ) : null}

        {/* The visible affordance is the placeholder; the name the field is
            announced by is this label, so it never rests on placeholder text. */}
        <label className="sr-only" htmlFor={fieldId}>
          Instruction
        </label>
        <input
          className="min-h-8 w-full min-w-0 rounded-input border border-transparent
            bg-transparent px-2 font-[inherit] text-[13px] text-primary
            focus-visible:outline-2 focus-visible:outline-offset-1
            focus-visible:outline-focus-ring"
          id={fieldId}
          type="text"
          autoComplete="off"
          placeholder="Describe the change…"
          value={props.instruction}
          onChange={(event) => {
            props.onInstructionChange(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            props.onRun(props.instruction)
          }}
        />

        <div className="flex min-w-0 items-center gap-2">
          {/* The send control is a glyph, as it is in a chat composer, and it
              keeps the full 44px target with its accessible name spelled out. */}
          <IconButton
            type="button"
            variant="chrome"
            tone="primary"
            icon="send"
            className="ms-auto flex-none"
            disabled={!props.canRun}
            aria-label="Run instruction"
            title="Run instruction"
            onClick={() => {
              props.onRun(props.instruction)
            }}
          />
        </div>
      </div>
    </div>
  )
}

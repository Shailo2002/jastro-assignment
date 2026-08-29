import { useEffect, useId, useRef, type JSX } from 'react'

import { scenarioExamples } from '../engine/scenario-catalog'
import type { EditScope } from '../model/viewport'
import { CHIP_FOCUS_SKIN, CHIP_FOCUS_TARGET, IconButton } from './controls'
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
 * selection to lock, then the field, then the control that starts the run. The
 * box draws the field's focus itself - one ring around the whole composer
 * rather than a second one around the text inside it, which is one boundary too
 * many for a control that fills its container edge to edge. Scope Lock lives here rather than in the top
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
  const hintId = `${fieldId}-hint`

  /**
   * The field grows with what is typed instead of scrolling a single line out
   * of sight: an instruction is a sentence, and a reviewer editing one should
   * be able to read all of it. It stops at five lines and scrolls after that,
   * so a long paste can never push the composer over the transcript. The height
   * is derived from the value the shell holds, so it is correct after an
   * external change - a chip run, a reset - and not only after a keystroke.
   */
  const fieldRef = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const node = fieldRef.current
    if (node === null) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, 132)}px`
  }, [props.instruction])

  return (
    <div
      className="relative flex min-w-0 flex-none flex-col gap-2 bg-surface-shell px-3 pt-2 pb-2.5
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
              className={`group/chip flex min-h-touch cursor-pointer items-center rounded-pill
                px-0 text-secondary transition-colors duration-instant
                hover:not-disabled:text-primary disabled:cursor-not-allowed
                disabled:text-muted ${CHIP_FOCUS_TARGET}`}
              disabled={!props.canRun}
              onClick={() => {
                props.onRun(example)
              }}
            >
              <span
                className={`flex min-h-[30px] items-center rounded-pill border border-default
                  bg-surface-panel px-3 text-xs whitespace-nowrap transition-colors
                  duration-instant ${CHIP_FOCUS_SKIN} ${
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
        {/* A textarea, not a single line: instructions wrap. Enter still runs,
            because that is the shortcut the whole loop is built on, so the
            newline moves to Shift+Enter, stated in the field's description
            rather than printed under it. Escape hands focus back to the editor
            instead of trapping it here; the shell's own Escape then clears the
            selection, so leaving and deselecting are the same key twice. */}
        <textarea
          className="max-h-[132px] min-h-8 w-full min-w-0 resize-none bg-transparent px-2
            py-1 font-[inherit] text-[13px] leading-normal text-primary
            placeholder:text-muted focus-ring-container"
          id={fieldId}
          ref={fieldRef}
          rows={1}
          autoComplete="off"
          aria-describedby={hintId}
          placeholder="Describe the change…"
          value={props.instruction}
          onChange={(event) => {
            props.onInstructionChange(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.currentTarget.blur()
              return
            }
            if (event.key !== 'Enter' || event.shiftKey) return
            event.preventDefault()
            props.onRun(props.instruction)
          }}
        />

        <div className="flex min-w-0 items-center gap-2">
          {/* The shortcuts are not printed under the field: a line of standing
              instruction sits there for every reading of the composer, and the
              behaviour is the one a chat composer already has. It stays in the
              field's description, where anyone who cannot infer it is told. */}
          <p className="sr-only" id={hintId}>
            Enter runs the instruction. Shift and Enter adds a line.
          </p>

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

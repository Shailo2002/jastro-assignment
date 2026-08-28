import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ViewportSwitcher } from './ViewportSwitcher'

/** The control is icon-only, so its whole state lives in its accessible name. */
function control(): HTMLElement {
  return screen.getByRole('button', { name: /^Preview viewport/ })
}

describe('viewport switcher', () => {
  it('names the current preview and its nominal width', () => {
    render(<ViewportSwitcher value="desktop" onChange={vi.fn()} />)

    expect(control()).toHaveAccessibleName(/Desktop 1440px/)
  })

  it('says what one press will change the preview to', () => {
    render(<ViewportSwitcher value="tablet" onChange={vi.fn()} />)

    expect(control()).toHaveAccessibleName(/Tablet 768px/)
    expect(control()).toHaveAccessibleName(/Switch to Mobile/)
  })

  it('shows the device the current preview stands for', () => {
    const { rerender } = render(<ViewportSwitcher value="desktop" onChange={vi.fn()} />)
    expect(control().querySelector('[data-icon="monitor"]')).toBeInTheDocument()

    rerender(<ViewportSwitcher value="tablet" onChange={vi.fn()} />)
    expect(control().querySelector('[data-icon="tablet"]')).toBeInTheDocument()

    rerender(<ViewportSwitcher value="mobile" onChange={vi.fn()} />)
    expect(control().querySelector('[data-icon="smartphone"]')).toBeInTheDocument()
  })

  it.each([
    ['desktop', 'tablet'],
    ['tablet', 'mobile'],
    // The cycle closes, so the widest preview is always one press away.
    ['mobile', 'desktop'],
  ] as const)('advances %s to %s on click', async (from, to) => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ViewportSwitcher value={from} onChange={onChange} />)

    await user.click(control())

    expect(onChange).toHaveBeenCalledExactlyOnceWith(to)
  })

  it('is operable by keyboard alone', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ViewportSwitcher value="desktop" onChange={onChange} />)

    await user.tab()
    expect(control()).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledExactlyOnceWith('tablet')
  })
})

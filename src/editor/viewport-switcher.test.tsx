import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ViewportSwitcher } from './ViewportSwitcher'

describe('viewport switcher', () => {
  it('exposes a labelled group of viewport controls', () => {
    render(<ViewportSwitcher value="desktop" onChange={vi.fn()} />)

    const group = screen.getByRole('group', { name: 'Preview viewport' })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Desktop/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tablet/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mobile/ })).toBeInTheDocument()
  })

  it('names each control with its nominal width', () => {
    render(<ViewportSwitcher value="desktop" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Desktop\s*1440px/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tablet\s*768px/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mobile\s*375px/ })).toBeInTheDocument()
  })

  it('marks exactly one control as pressed', () => {
    render(<ViewportSwitcher value="tablet" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Tablet/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Desktop/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /Mobile/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports the chosen viewport on click', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ViewportSwitcher value="desktop" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /Mobile/ }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('mobile')
  })

  it('is operable by keyboard alone', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ViewportSwitcher value="desktop" onChange={onChange} />)

    await user.tab()
    expect(screen.getByRole('button', { name: /Desktop/ })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: /Tablet/ })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledExactlyOnceWith('tablet')
  })
})

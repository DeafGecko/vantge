import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DateTimeField from './DateTimeField'

describe('DateTimeField', () => {
  it('shows the placeholder when empty', () => {
    render(<DateTimeField value="" onChange={() => {}} placeholder="Pick a date and time" />)
    expect(screen.getByRole('button', { name: /Pick a date and time/ })).toBeInTheDocument()
  })

  it('shows a readable date for a saved value', () => {
    render(<DateTimeField value="2026-11-22T12:00" onChange={() => {}} />)
    expect(screen.getByText('November 22, 2026 · 12:00 PM')).toBeInTheDocument()
  })

  it('keeps the time when a new day is picked', () => {
    const onChange = vi.fn()
    render(<DateTimeField value="2026-11-22T12:00" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /November 22, 2026 · 12:00 PM/ }))
    fireEvent.click(screen.getByRole('button', { name: 'November 15' }))
    expect(onChange).toHaveBeenCalledWith('2026-11-15T12:00')
  })
})

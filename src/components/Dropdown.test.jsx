import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Dropdown from './Dropdown'

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

describe('Dropdown', () => {
  it('shows the chosen option', () => {
    render(<Dropdown value="b" onChange={() => {}} options={options} />)
    expect(screen.getByRole('button', { name: /Beta/ })).toBeInTheDocument()
  })

  it('opens the list and chooses an option', () => {
    const onChange = vi.fn()
    render(<Dropdown value="a" onChange={onChange} options={options} />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    fireEvent.click(screen.getByRole('option', { name: 'Beta' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('closes when Escape is pressed', () => {
    render(<Dropdown value="a" onChange={() => {}} options={options} />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

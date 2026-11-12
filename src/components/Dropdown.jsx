import { useState, useEffect, useRef } from 'react'

// Our own dropdown menu, so it looks the same on every browser and device.
// Built for readability (WCAG AA contrast, large text) and for keyboard use.
export default function Dropdown({ value, onChange, options, className = '', wrapClassName = 'relative', label = 'Choose an option' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const triggerRef = useRef(null)

  // Close when the user clicks outside the menu, or presses Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selected = String(value ?? '')
  const current = options.find(o => String(o.value) === selected) ?? options[0]

  function choose(v) {
    onChange(v)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div ref={ref} className={wrapClassName}>
      <button ref={triggerRef} type="button" onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${current?.label ?? ''}`}
        className={`w-full flex items-center text-left pr-10 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A18] focus-visible:ring-offset-2 ${className}`}>
        <span className="truncate">{current?.label ?? ''}</span>
      </button>
      <svg className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#1A1A18]" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {open && (
        <ul role="listbox" aria-label={label}
          className="absolute z-50 mt-2 w-full min-w-full bg-white border-2 border-[#1A1A18] rounded-xl shadow-2xl py-1.5 max-h-72 overflow-auto">
          {options.map(o => {
            const isOn = String(o.value) === selected
            return (
              <li key={String(o.value)} role="option" aria-selected={isOn} tabIndex={0}
                onClick={() => choose(o.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(o.value) } }}
                className={`mx-1.5 my-0.5 px-4 py-3 text-base rounded-lg cursor-pointer flex items-center justify-between gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A18] ${
                  isOn ? 'bg-[#1A1A18] text-white font-bold' : 'text-[#1A1A18] font-semibold hover:bg-[#E8E4DA]'
                }`}>
                <span>{o.label}</span>
                {isOn && <span aria-hidden="true" className="text-base">✓</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

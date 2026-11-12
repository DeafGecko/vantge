import { useState, useEffect, useRef } from 'react'

// Simple date and time picker of our own: big numbers, clear selected day and time
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const pad = n => String(n).padStart(2, '0')

// Text like "2026-11-22T12:00" -> parts, or null when empty
function parse(v) {
  if (!v || !v.includes('T')) return null
  const [d, t] = v.split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [h, mi] = t.split(':').map(Number)
  if ([y, m, day, h, mi].some(n => Number.isNaN(n))) return null
  return { y, m: m - 1, day, h, mi }
}

function toValue(o) {
  return `${o.y}-${pad(o.m + 1)}-${pad(o.day)}T${pad(o.h)}:${pad(o.mi)}`
}

function label(o) {
  const h12 = o.h % 12 || 12
  return `${MONTHS[o.m]} ${o.day}, ${o.y} · ${h12}:${pad(o.mi)} ${o.h < 12 ? 'AM' : 'PM'}`
}

export default function DateTimeField({ value, onChange, disabled = false, placeholder = 'Pick a date and time' }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const t = new Date()
    return { y: t.getFullYear(), m: t.getMonth() }
  })
  const ref = useRef(null)
  const sel = parse(value)
  const today = new Date()
  // What the time and day buttons change: the chosen value, or today at 12:00 PM
  const base = sel ?? { y: today.getFullYear(), m: today.getMonth(), day: today.getDate(), h: 12, mi: 0 }

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function openPicker() {
    if (disabled) return
    const start = sel ?? { y: today.getFullYear(), m: today.getMonth() }
    setView({ y: start.y, m: start.m })
    setOpen(o => !o)
  }

  function shiftMonth(by) {
    setView(v => {
      const d = new Date(v.y, v.m + by, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  function pickDay(day) {
    onChange(toValue({ ...base, y: view.y, m: view.m, day }))
  }

  function setHour12(h12) {
    const isPM = base.h >= 12
    onChange(toValue({ ...base, h: (h12 % 12) + (isPM ? 12 : 0) }))
  }

  function setMinute(mi) {
    onChange(toValue({ ...base, mi }))
  }

  function setPeriod(pm) {
    const h12 = base.h % 12
    onChange(toValue({ ...base, h: h12 + (pm ? 12 : 0) }))
  }

  // Calendar cells for the viewed month
  const firstWeekday = new Date(view.y, view.m, 1).getDay()
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const isToday = (d) => today.getFullYear() === view.y && today.getMonth() === view.m && today.getDate() === d
  const isChosen = (d) => sel && sel.y === view.y && sel.m === view.m && sel.day === d

  const h12Now = base.h % 12 || 12
  const pmNow = base.h >= 12

  const btn = (on) => `rounded-lg text-base font-bold py-2 transition-colors ${on ? 'bg-[#1A1A18] text-white' : 'bg-white text-[#1A1A18] border-2 border-[#D9D4C5] hover:border-[#1A1A18]'}`

  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled} onClick={openPicker} aria-haspopup="dialog" aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 rounded-xl border-2 border-[#D9D4C5] bg-white px-4 py-3 text-base text-left text-[#1A1A18] hover:border-[#1A1A18] disabled:opacity-40 disabled:bg-[#F4F3F0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A18]">
        <span className={sel ? 'font-semibold' : 'text-[#5A5A52]'}>{sel ? label(sel) : placeholder}</span>
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {open && (
        <div role="dialog" aria-label="Pick a date and time"
          className="absolute z-50 mt-2 left-0 w-[min(340px,90vw)] bg-white border-2 border-[#1A1A18] rounded-2xl shadow-2xl p-4">
          {/* Month */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}
              className="w-10 h-10 rounded-full text-xl font-bold text-[#1A1A18] hover:bg-[#E8E4DA]">‹</button>
            <p className="text-base font-black text-[#1A1A18]">{MONTHS[view.m]} {view.y}</p>
            <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}
              className="w-10 h-10 rounded-full text-xl font-bold text-[#1A1A18] hover:bg-[#E8E4DA]">›</button>
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEK.map((w, i) => <span key={i} className="text-center text-xs font-bold text-[#4A4A44]">{w}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => d === null ? <span key={i} /> : (
              <button key={i} type="button" onClick={() => pickDay(d)} aria-label={`${MONTHS[view.m]} ${d}`}
                className={`h-10 rounded-full text-base font-semibold transition-colors ${
                  isChosen(d) ? 'bg-[#1A1A18] text-white'
                  : isToday(d) ? 'border-2 border-[#1A1A18] text-[#1A1A18] hover:bg-[#E8E4DA]'
                  : 'text-[#1A1A18] hover:bg-[#E8E4DA]'}`}>
                {d}
              </button>
            ))}
          </div>

          {/* Time */}
          <div className="mt-4 pt-4 border-t border-[#E8E4DA] space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-[#4A4A44]">Hour</p>
            <div className="grid grid-cols-6 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                <button key={h} type="button" onClick={() => setHour12(h)} className={btn(h === h12Now && !!sel)}>{h}</button>
              ))}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#4A4A44]">Minute</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 15, 30, 45].map(mi => (
                <button key={mi} type="button" onClick={() => setMinute(mi)} className={btn(base.mi === mi && !!sel)}>{pad(mi)}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setPeriod(false)} className={btn(!pmNow && !!sel)}>AM</button>
              <button type="button" onClick={() => setPeriod(true)} className={btn(pmNow && !!sel)}>PM</button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center mt-4">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }}
              className="text-base font-bold text-[#8A1C16] underline underline-offset-4 px-2 py-2">Clear</button>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-full bg-[#1A1A18] text-white text-base font-bold px-6 py-2.5 hover:bg-black">Done</button>
          </div>
        </div>
      )}
    </div>
  )
}

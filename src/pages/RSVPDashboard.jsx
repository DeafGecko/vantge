// src/pages/RSVPDashboard.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../hooks/useAuth'
import { useHostEvent } from '../hooks/useHostEvent'
import { supabase } from '../lib/supabase'
import VantgeLogo from '../components/VantgeLogo'
import { getAllThemes } from '../lib/themes'
import { getFontsByCategory, getFont, getAllFonts, getGoogleFontsUrl, DEFAULT_FONT_ID } from '../lib/fonts'
import { EVENT_TYPES, getEventType } from '../lib/eventTypes'
import BackgroundUploader from '../components/BackgroundUploader'
import LogoUploader from '../components/LogoUploader'

// ── Design tokens (match HostDashboard) ──────────────────────
function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl border border-[#E0D8C6] shadow-sm ${className}`}>{children}</div>
}
function SectionLabel({ children }) {
  return <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">{children}</p>
}
function Toggle({ checked, onChange, label, sublabel }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <div>
        {label && <p className="text-sm font-semibold text-[#1A1A18]">{label}</p>}
        {sublabel && <p className="text-xs text-[#88887E]">{sublabel}</p>}
      </div>
      <button
        role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-[#1A1A18]' : 'bg-[#D4CFBC]'}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-5' : 'left-1'}`} />
      </button>
    </label>
  )
}
function TextInput({ value, onChange, placeholder, type = 'text', rows }) {
  const cls = "w-full rounded-xl border border-[#E0D8C6] px-4 py-2.5 text-sm text-[#1A1A18] placeholder-[#B0AFA5] focus:outline-none focus:border-[#C9BFA8] bg-white"
  if (rows) return <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={cls + ' resize-none'} />
  return <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
}
function InfoTip({ text }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center ml-1.5">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-4 h-4 rounded-full bg-[#E8E4DA] hover:bg-[#D4CFBC] flex items-center justify-center transition-colors shrink-0"
        aria-label="More info"
      >
        <svg width="8" height="8" fill="none" stroke="#88887E" strokeWidth="2.5" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="8" strokeWidth="3" strokeLinecap="round"/>
          <line x1="12" y1="12" x2="12" y2="16" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute left-6 top-0 z-50 w-56 bg-[#1A1A18] text-white text-[11px] leading-relaxed rounded-xl px-3 py-2.5 shadow-xl">
          {text}
          <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 bg-[#1A1A18] rotate-45 rounded-sm" />
        </div>
      )}
    </span>
  )
}
function FieldRow({ label, children, info }) {
  return (
    <div>
      <div className="flex items-center mb-1.5">
        <p className="text-xs font-bold text-[#88887E] uppercase tracking-widest">{label}</p>
        {info && <InfoTip text={info} />}
      </div>
      {children}
    </div>
  )
}
function Sel({ value, onChange, options }) {
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}
      className="w-full rounded-xl border border-[#E0D8C6] px-4 py-2.5 text-sm text-[#1A1A18] bg-white focus:outline-none focus:border-[#C9BFA8]">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { id: 'setup',     label: 'Event Setup' },
  { id: 'design',    label: 'Design' },
  { id: 'food',      label: 'Food Sign-up' },
  { id: 'responses', label: 'Responses' },
]

const ALL_THEMES = getAllThemes()
const FONT_CATEGORIES = getFontsByCategory()

// Pre-load all Google Fonts (same as GalleryDashboard)
getAllFonts().forEach((font) => {
  const id = `font-loader-${font.id}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id; link.rel = 'stylesheet'; link.href = getGoogleFontsUrl(font.id)
  document.head.appendChild(link)
})

// ── Setup Tab ─────────────────────────────────────────────────
function SetupTab({ event, onSaved }) {
  const DRAFT_KEY = `rsvp_setup_draft_${event.id}`

  function baseForm() {
    return {
      rsvp_enabled:           event.rsvp_enabled ?? false,
      rsvp_status:            event.rsvp_status ?? 'draft',
      rsvp_mode:              event.rsvp_mode ?? 'rsvp_only',
      rsvp_host_display_name: event.rsvp_host_display_name ?? '',
      rsvp_description:       event.rsvp_description ?? '',
      rsvp_location:          event.rsvp_location ?? '',
      rsvp_event_date:        event.rsvp_event_date ? event.rsvp_event_date.slice(0, 16) : '',
      rsvp_end_time:          event.rsvp_end_time   ? event.rsvp_end_time.slice(0, 16)   : '',
      rsvp_timezone:          event.rsvp_timezone ?? 'America/New_York',
      rsvp_deadline:          event.rsvp_deadline ? event.rsvp_deadline.slice(0, 16) : '',
      rsvp_attendance_limit:  event.rsvp_attendance_limit ?? '',
      rsvp_collect_email:     event.rsvp_collect_email ?? false,
      rsvp_allow_maybe:       event.rsvp_allow_maybe ?? true,
      rsvp_headcount_mode:    event.rsvp_headcount_mode ?? 'headcount',
      food_enabled:           event.food_enabled ?? false,
      food_heading:           event.food_heading ?? 'Food Sign-up',
      food_allow_suggestions: event.food_allow_suggestions ?? true,
      food_show_contributors: event.food_show_contributors ?? true,
    }
  }

  const [form, setForm] = useState(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) return { ...baseForm(), ...JSON.parse(draft) }
    } catch {}
    return baseForm()
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [hasDraft, setHasDraft] = useState(() => !!localStorage.getItem(DRAFT_KEY))

  // Auto-save to localStorage on every change
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    setHasDraft(true)
  }, [form])

  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setSaving(true); setError(null)
    const u = { ...form }
    u.rsvp_event_date       = u.rsvp_event_date  ? new Date(u.rsvp_event_date).toISOString()  : null
    u.rsvp_end_time         = u.rsvp_end_time    ? new Date(u.rsvp_end_time).toISOString()    : null
    u.rsvp_deadline         = u.rsvp_deadline    ? new Date(u.rsvp_deadline).toISOString()    : null
    u.rsvp_attendance_limit = u.rsvp_attendance_limit ? parseInt(u.rsvp_attendance_limit) : null
    const { error: err } = await supabase.from('events').update(u).eq('id', event.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    localStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
    setSaved(true); onSaved?.(u); setTimeout(() => setSaved(false), 2500)
  }

  const timezones = [
    { value: 'America/New_York',    label: 'Eastern (ET)' },
    { value: 'America/Chicago',     label: 'Central (CT)' },
    { value: 'America/Denver',      label: 'Mountain (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
    { value: 'America/Anchorage',   label: 'Alaska (AKT)' },
    { value: 'Pacific/Honolulu',    label: 'Hawaii (HT)' },
    { value: 'UTC',                 label: 'UTC' },
  ]

  const showFood = form.rsvp_mode === 'food_only' || form.rsvp_mode === 'rsvp_and_food'

  return (
    <div className="space-y-4">

      {/* Status banner */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <SectionLabel>Invitation Status</SectionLabel>
            <p className="text-sm text-[#5A5A52] mt-1">
              {form.rsvp_status === 'draft'     && 'Draft — not visible to guests yet.'}
              {form.rsvp_status === 'published' && 'Published — guests can RSVP.'}
              {form.rsvp_status === 'closed'    && 'Closed — no new RSVPs accepted.'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['draft','published','closed'].map(s => (
              <button key={s} onClick={() => set('rsvp_status')(s)}
                className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-3.5 py-1.5 border transition-all ${
                  form.rsvp_status === s
                    ? 'bg-[#1A1A18] text-white border-[#1A1A18]'
                    : 'border-[#E0D8C6] text-[#88887E] hover:border-[#1A1A18] hover:text-[#1A1A18]'
                }`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#F4F3F0]">
          <Toggle label="Enable RSVP feature" sublabel="Must be on for the invitation page to work"
            checked={form.rsvp_enabled} onChange={set('rsvp_enabled')} />
        </div>
      </Card>

      {/* Event details */}
      <Card className="p-5 space-y-4">
        <SectionLabel>Event Details</SectionLabel>
        <FieldRow label="Host display name">
          <TextInput value={form.rsvp_host_display_name} onChange={set('rsvp_host_display_name')} placeholder="e.g. The Johnson Family" />
        </FieldRow>
        <FieldRow label="Description (optional)" info="This message appears on your invitation page — use it to greet guests, share dress code, parking notes, or anything they need to know before RSVPing.">
          <TextInput value={form.rsvp_description} onChange={set('rsvp_description')} placeholder="A short note for your guests…" rows={2} />
        </FieldRow>
        <FieldRow label="Location">
          <TextInput value={form.rsvp_location} onChange={set('rsvp_location')} placeholder="Spring Hill, Tennessee" />
        </FieldRow>
      </Card>

      {/* Date & time */}
      <Card className="p-5 space-y-4">
        <SectionLabel>Date & Time</SectionLabel>

        {/* Row 1 — Start + End time */}
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Start time">
            <input type="datetime-local" value={form.rsvp_event_date} onChange={e => set('rsvp_event_date')(e.target.value)}
              className="w-full rounded-xl border border-[#E0D8C6] px-3 py-2.5 text-sm text-[#1A1A18] focus:outline-none focus:border-[#C9BFA8]" />
          </FieldRow>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <input type="checkbox" id="show_end_time"
                checked={!!form.rsvp_end_time}
                onChange={e => { if (!e.target.checked) set('rsvp_end_time')('') }}
                className="w-3.5 h-3.5 rounded accent-[#1A1A18] cursor-pointer" />
              <label htmlFor="show_end_time" className="text-xs font-bold text-[#88887E] uppercase tracking-widest cursor-pointer">End time</label>
            </div>
            {form.rsvp_end_time !== undefined && (
              <input type="datetime-local" value={form.rsvp_end_time}
                onChange={e => set('rsvp_end_time')(e.target.value)}
                disabled={!form.rsvp_end_time && form.rsvp_end_time !== ' '}
                onClick={() => { if (!form.rsvp_end_time) set('rsvp_end_time')(' ') }}
                className="w-full rounded-xl border border-[#E0D8C6] px-3 py-2.5 text-sm text-[#1A1A18] focus:outline-none focus:border-[#C9BFA8] disabled:opacity-40 disabled:bg-[#F4F3F0]" />
            )}
          </div>
        </div>

        {/* Row 2 — Timezone + RSVP deadline */}
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Timezone">
            <Sel value={form.rsvp_timezone} onChange={set('rsvp_timezone')} options={timezones} />
          </FieldRow>
          <FieldRow label="RSVP deadline (optional)">
            <input type="datetime-local" value={form.rsvp_deadline} onChange={e => set('rsvp_deadline')(e.target.value)}
              className="w-full rounded-xl border border-[#E0D8C6] px-3 py-2.5 text-sm text-[#1A1A18] focus:outline-none focus:border-[#C9BFA8]" />
          </FieldRow>
        </div>
      </Card>

      {/* RSVP options */}
      <Card className="p-5 space-y-4">
        <SectionLabel>RSVP Options</SectionLabel>
        <FieldRow label="What to collect">
          <Sel value={form.rsvp_mode} onChange={set('rsvp_mode')} options={[
            { value: 'rsvp_only',      label: 'RSVP only' },
            { value: 'food_only',      label: 'Food sign-up only' },
            { value: 'rsvp_and_food',  label: 'RSVP + Food sign-up' },
          ]} />
        </FieldRow>
        <FieldRow label="Attendance limit (optional)">
          <TextInput type="number" value={form.rsvp_attendance_limit} onChange={set('rsvp_attendance_limit')} placeholder="Leave blank for unlimited" />
        </FieldRow>
        <FieldRow label="Headcount style">
          <Sel value={form.rsvp_headcount_mode} onChange={set('rsvp_headcount_mode')} options={[
            { value: 'headcount', label: 'Number only' },
            { value: 'names',     label: 'Guest names only' },
            { value: 'both',      label: 'Number + guest names' },
          ]} />
        </FieldRow>
        <div className="space-y-3 pt-1">
          <Toggle label="Collect email address" checked={form.rsvp_collect_email} onChange={set('rsvp_collect_email')} />
          <Toggle label='Allow "Maybe" response' checked={form.rsvp_allow_maybe} onChange={set('rsvp_allow_maybe')} />
        </div>
      </Card>

      {/* Food sign-up */}
      {showFood && (
        <Card className="p-5 space-y-4">
          <SectionLabel>Food Sign-up</SectionLabel>
          <Toggle label="Enable food sign-up section" checked={form.food_enabled} onChange={set('food_enabled')} />
          {form.food_enabled && (
            <>
              <FieldRow label="Section heading">
                <TextInput value={form.food_heading} onChange={set('food_heading')} placeholder="Food Sign-up" />
              </FieldRow>
              <div className="space-y-3">
                <Toggle label="Allow guests to suggest items" checked={form.food_allow_suggestions} onChange={set('food_allow_suggestions')} />
                <Toggle label="Show contributor names to guests" checked={form.food_show_contributors} onChange={set('food_show_contributors')} />
              </div>
            </>
          )}
        </Card>
      )}

      {hasDraft && !saved && (
        <p className="text-xs text-[#88887E] text-center">You have unsaved changes</p>
      )}
      {error && <p className="text-sm text-[#C84A44] text-center">{error}</p>}

      <button onClick={save} disabled={saving}
        className="w-full bg-[#1A1A18] text-white text-[11px] font-bold uppercase tracking-widest rounded-full py-3.5 hover:bg-black transition-all disabled:opacity-50">
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save settings'}
      </button>
    </div>
  )
}

// ── Responses Tab ─────────────────────────────────────────────
function ResponsesTab({ event }) {
  const [subTab, setSubTab]       = useState('guests')
  const [responses, setResponses] = useState([])
  const [foodClaims, setFoodClaims] = useState([])
  const [foodItems, setFoodItems]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')

  const load = useCallback(async () => {
    const [{ data: rData }, { data: cData }, { data: iData }] = await Promise.all([
      supabase.from('rsvp_responses').select('*').eq('event_id', event.id).order('created_at', { ascending: false }),
      supabase.from('food_claims').select('*, food_items(name, category)').eq('event_id', event.id).order('created_at', { ascending: false }),
      supabase.from('food_items').select('*').eq('event_id', event.id).order('sort_order').order('created_at'),
    ])
    setResponses(rData || [])
    setFoodClaims(cData || [])
    setFoodItems(iData || [])
    setLoading(false)
  }, [event.id])

  useEffect(() => { load() }, [load])

  async function remove(id) {
    if (!window.confirm('Remove this RSVP response?')) return
    await supabase.from('rsvp_responses').delete().eq('id', id)
    setResponses(r => r.filter(x => x.id !== id))
  }

  function exportCSV() {
    const rows = [['Name', 'Response', 'Party Size', 'Guest Names', 'Note', 'Date']]
    responses.forEach(r => rows.push([
      r.guest_name, r.response, r.party_size,
      r.guest_names || '', r.note || '',
      new Date(r.created_at).toLocaleDateString(),
    ]))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `rsvp-${event.event_slug}.csv`; a.click()
  }

  const going    = responses.filter(r => r.response === 'going')
  const maybe    = responses.filter(r => r.response === 'maybe')
  const notGoing = responses.filter(r => r.response === 'not_going')
  const totalAttendees = going.reduce((s, r) => s + r.party_size, 0)
  const filtered = filter === 'all' ? responses : responses.filter(r => r.response === filter)

  // Group food claims by item
  const claimsByItem = foodItems.map(item => ({
    item,
    claims: foodClaims.filter(c => c.food_item_id === item.id),
  }))

  if (loading) return <div className="py-10 text-center text-sm text-[#88887E]">Loading…</div>

  return (
    <div className="space-y-4">

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Going',        count: going.length,    sub: `${totalAttendees} attending`, color: '#1A1A18' },
          { label: 'Maybe',        count: maybe.length,    sub: 'responses',                   color: '#B29746' },
          { label: "Can't attend", count: notGoing.length, sub: 'responses',                   color: '#C84A44' },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl font-black leading-tight" style={{ color: s.color }}>{s.count}</p>
            <p className="text-xs font-bold text-[#1A1A18] mt-0.5">{s.label}</p>
            <p className="text-[10px] text-[#88887E]">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Sub-tab switcher */}
      <div className="flex gap-1 bg-[#F4F3F0] rounded-xl p-1">
        {[
          { id: 'guests', label: 'Guest List' },
          { id: 'food',   label: 'Food Sign-up' },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${
              subTab === t.id ? 'bg-white text-[#1A1A18] shadow-sm' : 'text-[#88887E] hover:text-[#1A1A18]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Guest List sub-tab */}
      {subTab === 'guests' && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-wrap gap-2">
            <SectionLabel>All Responses ({responses.length})</SectionLabel>
            <div className="flex items-center gap-2">
              <select value={filter} onChange={e => setFilter(e.target.value)}
                className="text-xs font-bold border border-[#E0D8C6] rounded-full px-3 py-1.5 bg-white text-[#1A1A18] focus:outline-none">
                <option value="all">All</option>
                <option value="going">Going</option>
                <option value="maybe">Maybe</option>
                <option value="not_going">Can't attend</option>
              </select>
              {responses.length > 0 && (
                <button onClick={exportCSV}
                  className="text-xs font-bold text-[#1A1A18] border border-[#E0D8C6] rounded-full px-3 py-1.5 hover:bg-[#F4F3F0] transition-colors">
                  Export CSV
                </button>
              )}
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-[#88887E]">{responses.length === 0 ? 'No responses yet.' : 'None in this filter.'}</p>
          ) : (
            <div className="divide-y divide-[#F4F3F0]">
              {filtered.map(r => (
                <div key={r.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#1A1A18]">{r.guest_name}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        r.response === 'going'  ? 'bg-green-100 text-green-800' :
                        r.response === 'maybe'  ? 'bg-yellow-100 text-yellow-800' :
                                                  'bg-red-100 text-red-800'
                      }`}>
                        {r.response === 'going' ? 'Going' : r.response === 'maybe' ? 'Maybe' : "Can't attend"}
                      </span>
                      {r.party_size > 1 && (
                        <span className="text-xs text-[#88887E]">+{r.party_size - 1} guest{r.party_size > 2 ? 's' : ''}</span>
                      )}
                    </div>
                    {r.guest_names && <p className="text-xs text-[#88887E] mt-0.5">{r.guest_names}</p>}
                    {r.note && <p className="text-xs text-[#5A5A52] italic mt-0.5">"{r.note}"</p>}
                    <p className="text-[10px] text-[#B0AFA5] mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => remove(r.id)} className="text-[#C84A44] hover:text-red-700 text-xs font-bold shrink-0 transition-colors">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Food sign-up sub-tab */}
      {subTab === 'food' && (
        <Card className="overflow-hidden">
          <div className="px-5 pt-4 pb-3">
            <SectionLabel>Who's Bringing What ({foodClaims.length} claim{foodClaims.length !== 1 ? 's' : ''})</SectionLabel>
          </div>
          {foodItems.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-[#88887E]">No food items set up yet. Add items in the Food Sign-up tab.</p>
          ) : foodClaims.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-[#88887E]">No one has claimed a food item yet.</p>
          ) : (
            <div className="divide-y divide-[#F4F3F0]">
              {claimsByItem.filter(g => g.claims.length > 0).map(({ item, claims }) => (
                <div key={item.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-bold text-[#1A1A18]">{item.name}</p>
                    {item.category && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#88887E] border border-[#E0D8C6] rounded-full px-2 py-0.5">{item.category}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 pl-2">
                    {claims.map(c => (
                      <div key={c.id} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#C9BFA8] mt-1.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-[#1A1A18]">{c.guest_name}</p>
                          {c.description && <p className="text-xs text-[#88887E]">{c.description}</p>}
                          {c.quantity > 1 && <p className="text-xs text-[#B0AFA5]">×{c.quantity}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

// ── Food Sign-up Tab ──────────────────────────────────────────
function FoodTab({ event }) {
  const [items,  setItems]  = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]  = useState(false)
  const [newItem, setNewItem] = useState({ name: '', category: '', notes: '', spots_total: '' })
  const [saving, setSaving]  = useState(false)

  const load = useCallback(async () => {
    const [{ data: i }, { data: c }] = await Promise.all([
      supabase.from('food_items').select('*').eq('event_id', event.id).order('sort_order').order('created_at'),
      supabase.from('food_claims').select('*').eq('event_id', event.id),
    ])
    setItems(i || []); setClaims(c || []); setLoading(false)
  }, [event.id])

  useEffect(() => { load() }, [load])

  async function addItem() {
    if (!newItem.name.trim()) return
    setSaving(true)
    await supabase.from('food_items').insert({
      event_id: event.id,
      name: newItem.name.trim(),
      category: newItem.category.trim() || null,
      notes: newItem.notes.trim() || null,
      spots_total: newItem.spots_total ? parseInt(newItem.spots_total) : null,
      sort_order: items.length,
    })
    setNewItem({ name: '', category: '', notes: '', spots_total: '' })
    setAdding(false); setSaving(false); load()
  }

  async function deleteItem(id) {
    if (!window.confirm('Remove this item and all its claims?')) return
    await supabase.from('food_items').delete().eq('id', id)
    load()
  }

  function exportCSV() {
    const rows = [['Item', 'Category', 'Spots', 'Claimed by', 'Description', 'Date']]
    items.forEach(item => {
      const itemClaims = claims.filter(c => c.food_item_id === item.id)
      if (itemClaims.length === 0) {
        rows.push([item.name, item.category || '', item.spots_total ?? 'Unlimited', '', '', ''])
      } else {
        itemClaims.forEach(c => rows.push([
          item.name, item.category || '', item.spots_total ?? 'Unlimited',
          c.guest_name, c.description || '', new Date(c.created_at).toLocaleDateString(),
        ]))
      }
    })
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `food-${event.event_slug}.csv`; a.click()
  }

  if (loading) return <div className="py-10 text-center text-sm text-[#88887E]">Loading…</div>

  if (!event.food_enabled) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-bold text-[#1A1A18] mb-1">Food sign-up is off</p>
        <p className="text-xs text-[#88887E]">Go to Event Setup → RSVP Options to enable it.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-wrap gap-2">
          <SectionLabel>{event.food_heading || 'Food Items'} ({items.length})</SectionLabel>
          {items.length > 0 && (
            <button onClick={exportCSV}
              className="text-xs font-bold text-[#1A1A18] border border-[#E0D8C6] rounded-full px-3 py-1.5 hover:bg-[#F4F3F0] transition-colors">
              Export CSV
            </button>
          )}
        </div>

        {items.length === 0 && !adding && (
          <p className="px-5 pb-4 text-sm text-[#88887E]">No items yet. Add items for guests to claim.</p>
        )}

        <div className="divide-y divide-[#F4F3F0]">
          {items.map(item => {
            const itemClaims = claims.filter(c => c.food_item_id === item.id)
            const claimed = itemClaims.reduce((s, c) => s + c.quantity, 0)
            return (
              <div key={item.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#1A1A18]">{item.name}</p>
                      {item.is_suggestion && (
                        <span className="text-[10px] font-bold bg-[#FEF9EC] text-[#8B7224] border border-[#F5D97A] rounded-full px-2 py-0.5">Guest suggestion</span>
                      )}
                    </div>
                    {item.category && <p className="text-xs text-[#88887E]">{item.category}</p>}
                    {item.notes    && <p className="text-xs text-[#88887E] italic">{item.notes}</p>}
                    <p className="text-xs text-[#88887E] mt-0.5">
                      {item.spots_total ? `${claimed} / ${item.spots_total} spots claimed` : `${claimed} claimed · unlimited spots`}
                    </p>
                  </div>
                  <button onClick={() => deleteItem(item.id)} className="text-[#C84A44] text-xs font-bold hover:text-red-700 shrink-0 transition-colors">Remove</button>
                </div>
                {itemClaims.length > 0 && (
                  <div className="mt-2 space-y-1 pl-2 border-l-2 border-[#E0D8C6]">
                    {itemClaims.map(c => (
                      <p key={c.id} className="text-xs text-[#5A5A52]">
                        <span className="font-semibold">{c.guest_name}</span>
                        {c.description ? ` — ${c.description}` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Add item form */}
        {adding ? (
          <div className="px-5 pb-5 pt-3 border-t border-[#F4F3F0] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FieldRow label="Item name *">
                  <TextInput value={newItem.name} onChange={v => setNewItem(f => ({ ...f, name: v }))} placeholder="Main dish" />
                </FieldRow>
              </div>
              <FieldRow label="Category">
                <TextInput value={newItem.category} onChange={v => setNewItem(f => ({ ...f, category: v }))} placeholder="Side dish" />
              </FieldRow>
              <FieldRow label="Spots (blank = unlimited)">
                <TextInput type="number" value={newItem.spots_total} onChange={v => setNewItem(f => ({ ...f, spots_total: v }))} placeholder="e.g. 2" />
              </FieldRow>
              <div className="col-span-2">
                <FieldRow label="Notes">
                  <TextInput value={newItem.notes} onChange={v => setNewItem(f => ({ ...f, notes: v }))} placeholder="Dietary notes…" />
                </FieldRow>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addItem} disabled={saving || !newItem.name.trim()}
                className="flex-1 bg-[#1A1A18] text-white text-xs font-bold uppercase tracking-widest rounded-full py-2.5 disabled:opacity-50 hover:bg-black transition-all">
                {saving ? 'Adding…' : 'Add item'}
              </button>
              <button onClick={() => setAdding(false)} className="px-4 text-xs font-bold text-[#88887E] hover:text-[#1A1A18]">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-4 pt-2 border-t border-[#F4F3F0]">
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A18] hover:text-black transition-colors">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add item
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Design Tab ────────────────────────────────────────────────
function DesignTab({ event, design, onChange, onSaved, onLocalUpdate }) {
  const [savingName, setSavingName]   = useState(false)
  const [localName,  setLocalName]    = useState(event.event_name ?? '')
  const [localType,  setLocalType]    = useState(event.event_type ?? '')
  const [localBgMobile,   setLocalBgMobile]   = useState(event.background_image ?? null)
  const [localBgDesktop,  setLocalBgDesktop]  = useState(event.background_image_desktop ?? null)
  const [localBgPosition, setLocalBgPosition] = useState(event.background_position ?? 50)
  const [localBgTint,     setLocalBgTint]     = useState(event.background_tint ?? 0)
  const [localLogoUrl,    setLocalLogoUrl]    = useState(event.logo_url ?? null)
  const [localTitlePos,   setLocalTitlePos]   = useState(event.rsvp_title_position ?? 50)
  const [localTitlePosD,  setLocalTitlePosD]  = useState(event.rsvp_title_position_desktop ?? 50)
  const [saving, setSaving]     = useState(false)
  const [saved,  setSaved]      = useState(false)

  async function saveField(fields) {
    await supabase.from('events').update(fields).eq('id', event.id)
    onLocalUpdate?.(fields)
  }

  async function saveDesign() {
    setSaving(true)
    const { error } = await supabase.from('events').update({
      rsvp_theme: design.themeId,
      rsvp_font:  design.fontId,
    }).eq('id', event.id)
    setSaving(false)
    if (!error) {
      onSaved?.()
      onLocalUpdate?.({ rsvp_theme: design.themeId, rsvp_font: design.fontId })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    }
  }

  const catLabels = { elegant: 'Elegant & Script', modern: 'Modern & Clean', display: 'Display & Bold' }
  const currentTheme = ALL_THEMES.find(t => t.id === design.themeId)

  return (
    <div className="space-y-4">

      {/* Logo | Display Name | Event Type | Title Position */}
      <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-sm">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Logo</p>
            <LogoUploader
              eventId={event.id}
              currentLogoUrl={localLogoUrl}
              onSaved={(url) => { setLocalLogoUrl(url); onLocalUpdate?.({ logo_url: url }) }}
            />
          </div>
          {/* Display Name + Event Type */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Display Name</p>
                {savingName && <span className="text-[10px] font-bold text-[#C84A44] animate-pulse">Saving…</span>}
              </div>
              <textarea
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={async () => {
                  if (localName === event.event_name) return
                  setSavingName(true)
                  await saveField({ event_name: localName })
                  setSavingName(false)
                }}
                placeholder="e.g. The Johnson Family"
                style={{ height: 68 }}
                className="w-full bg-[#F7F5F0] border-2 border-[#E8E4DA] rounded-xl px-3 py-2.5 text-sm font-bold text-[#1A1A18] focus:outline-none focus:border-[#1A1A18] transition-colors placeholder:text-[#C0BFB5] placeholder:font-normal resize-none leading-snug"
              />
            </div>
            <div>
              <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-1.5">Event Type</p>
              <div className="relative">
                <select
                  value={localType}
                  onChange={async (e) => {
                    const val = e.target.value
                    setLocalType(val)
                    await saveField({ event_type: val || null })
                  }}
                  className="w-full appearance-none bg-[#F7F5F0] border-2 border-[#E8E4DA] rounded-xl px-3 py-2.5 text-sm font-bold text-[#1A1A18] focus:outline-none focus:border-[#1A1A18] transition-colors pr-8 cursor-pointer"
                >
                  <option value="">— None —</option>
                  {EVENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#B0AFA5]" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Title Position sliders */}
        <div className="mt-3 border-t border-[#F0EDE6] pt-3 flex flex-col gap-2">
          {/* Mobile */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeWidth="2.5"/></svg>
                <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Title Position</p>
              </div>
              <span className="text-[9px] font-bold text-[#88887E]">{localTitlePos == 0 ? 'Top' : localTitlePos == 100 ? 'Bottom' : localTitlePos == 50 ? 'Center' : `${localTitlePos}%`}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-[#B0AFA5]">Top</span>
              <input type="range" min={0} max={100} step={1} value={localTitlePos}
                onChange={async (e) => { const val = e.target.value; setLocalTitlePos(val); await saveField({ rsvp_title_position: val }) }}
                className="flex-1 accent-[#1A1A18] h-1.5 rounded-full cursor-pointer"
              />
              <span className="text-[8px] text-[#B0AFA5]">Bottom</span>
            </div>
          </div>
          {/* Desktop */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" strokeLinecap="round"/></svg>
                <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Title Position</p>
              </div>
              <span className="text-[9px] font-bold text-[#88887E]">{localTitlePosD == 0 ? 'Top' : localTitlePosD == 100 ? 'Bottom' : localTitlePosD == 50 ? 'Center' : `${localTitlePosD}%`}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-[#B0AFA5]">Top</span>
              <input type="range" min={0} max={100} step={1} value={localTitlePosD}
                onChange={async (e) => { const val = e.target.value; setLocalTitlePosD(val); await saveField({ rsvp_title_position_desktop: val }) }}
                className="flex-1 accent-[#1A1A18] h-1.5 rounded-full cursor-pointer"
              />
              <span className="text-[8px] text-[#B0AFA5]">Bottom</span>
            </div>
          </div>
        </div>
      </div>

      {/* Background Photo — Mobile Portrait + Desktop Landscape */}
      <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-sm overflow-hidden">
        <BackgroundUploader
          eventId={event.id}
          currentImageUrl={localBgMobile}
          currentImageDesktopUrl={localBgDesktop}
          currentPosition={localBgPosition}
          currentTint={localBgTint}
          accentColor={currentTheme?.colors?.accent}
          eventTypeId={localType}
          onSaved={(url, pos, tint) => {
            setLocalBgMobile(url); setLocalBgPosition(pos); setLocalBgTint(tint)
            onLocalUpdate?.({ background_image: url, background_position: pos, background_tint: tint })
          }}
          onSavedDesktop={(url) => {
            setLocalBgDesktop(url)
            onLocalUpdate?.({ background_image_desktop: url })
          }}
        />
      </div>

      {/* Font + Color side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        <div className="bg-white rounded-2xl border border-[#E8E4DA] shadow-sm overflow-hidden flex flex-col">
          <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] px-4 pt-4 pb-3 shrink-0">Title Font</p>
          <div className="flex flex-col divide-y-2 divide-[#F0EDE6]">
            {Object.entries(FONT_CATEGORIES).map(([catKey, fonts], idx) => (
              <div key={catKey} className={`px-4 py-3${idx > 0 ? ' pt-[22px]' : ''}`}>
                <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#B0AFA5] mb-2">{catLabels[catKey]}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {fonts.map((font) => {
                    const selected = design.fontId === font.id
                    return (
                      <button key={font.id} onClick={() => onChange({ ...design, fontId: font.id })}
                        className={`rounded-xl border-2 p-2 flex flex-col items-center gap-1 transition-all ${
                          selected ? 'border-[#1A1A18] bg-[#F4F3F0]' : 'border-[#E8E4DA] hover:border-[#C9BFA8]'
                        }`}>
                        <span style={{ fontFamily: font.cssFamily, fontSize: 20, lineHeight: 1, fontWeight: font.weight }}>Aa</span>
                        <span className="text-[7px] font-bold text-[#88887E] uppercase tracking-wider text-center leading-tight">{font.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E4DA] shadow-sm overflow-hidden flex flex-col">
          <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] px-4 pt-4 pb-3 shrink-0">Color Palette</p>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            {ALL_THEMES.map(theme => {
              const selected = design.themeId === theme.id
              return (
                <button key={theme.id} onClick={() => onChange({ ...design, themeId: theme.id })}
                  className={`flex flex-col items-start gap-1.5 rounded-2xl border-2 px-3 py-3 text-left transition-all ${
                    selected ? 'border-[#1A1A18] bg-[#F4F3F0]' : 'border-[#E8E4DA] hover:border-[#C9BFA8] bg-white'
                  }`}>
                  <div className="flex gap-1 shrink-0">
                    {[theme.colors.accent, theme.colors.bg, theme.colors.text].map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full border border-black/10" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-[#1A1A18] uppercase tracking-wider leading-tight">{theme.name}</span>
                </button>
              )
            })}
          </div>
        </div>

      </div>

      <button onClick={saveDesign} disabled={saving}
        className="w-full bg-[#1A1A18] text-white text-[11px] font-bold uppercase tracking-widest rounded-full py-3.5 hover:bg-black transition-all disabled:opacity-50">
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save design'}
      </button>
    </div>
  )
}

// ── Shared preview screen renderer ───────────────────────────
function PreviewScreen({ step, event, bgImage, theme, fontCssFamily, isDesktop }) {
  const name  = event.rsvp_host_display_name || event.event_name
  const date  = event.rsvp_event_date
    ? new Date(event.rsvp_event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const loc   = event.rsvp_location
  const bg    = theme?.colors?.bg        || '#F8F5ED'
  const acc   = theme?.colors?.accent    || '#1A1A18'
  const txt   = theme?.colors?.text      || '#1A1A18'
  const bdr   = theme?.colors?.border    || '#E0D8C6'
  const muted = theme?.colors?.textSubtle || '#88887E'
  const showFood = event.rsvp_mode === 'rsvp_and_food' || event.rsvp_mode === 'food_only'
  const titlePos = Number(event.rsvp_title_position ?? 50)
  const titlePosD = Number(event.rsvp_title_position_desktop ?? titlePos)
  const tPos = isDesktop ? titlePosD : titlePos
  // 0=top → justifyContent flex-start, 100=bottom → flex-end
  const titleJustify = tPos <= 15 ? 'flex-start' : tPos >= 85 ? 'flex-end' : 'center'
  const titlePad = tPos <= 15 ? '8px 8px 0' : tPos >= 85 ? '0 8px 8px' : '0 8px'

  if (step === 0) return (
    <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'relative', flex: '0 0 55%' }}>
        {bgImage ? <img src={bgImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #2C2C2A 0%, #1A1A18 100%)' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: titleJustify, padding: titlePad, textAlign: 'center' }}>
          <p style={{ fontSize: 5, fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 2 }}>You're Invited</p>
          <p style={{ fontSize: isDesktop ? 11 : 13, fontWeight: 800, color: 'white', fontFamily: fontCssFamily || 'inherit', lineHeight: 1.2 }}>{name}</p>
          {date && <p style={{ fontSize: 5.5, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{date}</p>}
        </div>
      </div>
      <div style={{ flex: 1, background: bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 10px', gap: 5 }}>
        {event.rsvp_description && <p style={{ fontSize: 5, color: muted, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{event.rsvp_description}</p>}
        {loc && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'white', border: `1px solid ${bdr}`, borderRadius: 5, padding: '3px 6px' }}>
            <svg width="7" height="7" fill="none" stroke={acc} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <p style={{ fontSize: 5.5, color: txt, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{loc}</p>
          </div>
        )}
        <div style={{ background: acc, borderRadius: 6, padding: '5px 8px', textAlign: 'center', marginTop: 2 }}>
          <p style={{ fontSize: 7, fontWeight: 800, color: 'white' }}>RSVP Now →</p>
        </div>
      </div>
    </div>
  )

  if (step === 1) return (
    <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'relative', flex: '0 0 30%' }}>
        {bgImage ? <img src={bgImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #2C2C2A 0%, #1A1A18 100%)' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 5, left: 0, right: 0, textAlign: 'center' }}>
          <p style={{ fontSize: isDesktop ? 8 : 9, fontWeight: 800, color: 'white', fontFamily: fontCssFamily || 'inherit' }}>{name}</p>
        </div>
      </div>
      <div style={{ flex: 1, background: bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 10px 8px', gap: 5 }}>
        <p style={{ fontSize: 7, fontWeight: 900, color: txt }}>Will you be there?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ background: acc, borderRadius: 6, padding: '5px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 7, fontWeight: 800, color: 'white' }}>I'm Going</p>
          </div>
          {event.rsvp_allow_maybe !== false && (
            <div style={{ background: 'white', border: `1.5px solid ${bdr}`, borderRadius: 6, padding: '5px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 7, fontWeight: 700, color: muted }}>Maybe</p>
            </div>
          )}
          <div style={{ background: 'white', border: `1.5px solid ${bdr}`, borderRadius: 6, padding: '5px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 7, fontWeight: 700, color: muted }}>Can't Attend</p>
          </div>
        </div>
        <div style={{ background: 'white', border: `1px solid ${bdr}`, borderRadius: 5, padding: '4px 6px' }}>
          <p style={{ fontSize: 5, color: '#C9C5BC' }}>Your name…</p>
        </div>
      </div>
    </div>
  )

  if (step === 2 && showFood) return (
    <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '8px 10px 4px' }}>
        <p style={{ fontSize: 8, fontWeight: 900, color: txt }}>{event.food_heading || 'Food Sign-up'}</p>
        <p style={{ fontSize: 5, color: muted, marginTop: 1 }}>Choose something to bring</p>
      </div>
      <div style={{ flex: 1, padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
        {[{ label: 'Main dish', spots: '2 spots' }, { label: 'Side dish', spots: 'Open' }, { label: 'Dessert', spots: '1 spot' }, { label: 'Drinks', spots: 'Open' }].map(item => (
          <div key={item.label} style={{ background: 'white', border: `1px solid ${bdr}`, borderRadius: 6, padding: '4px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 14, height: 14, background: '#F4F3F0', borderRadius: 3, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 6, fontWeight: 700, color: txt }}>{item.label}</p>
              <p style={{ fontSize: 4.5, color: muted }}>{item.spots}</p>
            </div>
            <div style={{ background: 'white', border: `1.5px solid ${acc}`, borderRadius: 4, padding: '2px 5px' }}>
              <p style={{ fontSize: 5, fontWeight: 700, color: acc }}>Choose</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 14px', gap: 6, textAlign: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: acc + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" fill="none" stroke={acc} strokeWidth="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div>
        <p style={{ fontSize: 9, fontWeight: 900, color: txt, fontFamily: fontCssFamily || 'inherit', lineHeight: 1.2 }}>See you there!</p>
        <p style={{ fontSize: 5.5, color: muted, marginTop: 3 }}>Your RSVP has been received. We can't wait to celebrate with you.</p>
      </div>
      <div style={{ background: acc, borderRadius: 6, padding: '5px 14px', marginTop: 4 }}>
        <p style={{ fontSize: 6, fontWeight: 800, color: 'white' }}>Done</p>
      </div>
    </div>
  )
}

// ── RSVP Desktop Preview (16:9 browser mockup) ───────────────
function RSVPPreviewDesktop({ event, bgImage, theme, fontCssFamily, previewStep, onStepChange }) {
  const showFood = event.rsvp_mode === 'rsvp_and_food' || event.rsvp_mode === 'food_only'
  const totalSteps = showFood ? 3 : 3
  const acc = theme?.colors?.accent || '#1A1A18'

  return (
    <div style={{ width: '100%', height: '100%', background: '#F4F3F0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Step selector bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '5px 0', background: 'white', borderBottom: '1px solid #E8E4DA', flexShrink: 0 }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <button key={i} onClick={() => onStepChange(i)}
            style={{ width: i === previewStep ? 20 : 7, height: 7, borderRadius: 4, background: i === previewStep ? acc : '#D4CFBC', border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }} />
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <PreviewScreen step={previewStep} event={event} bgImage={bgImage} theme={theme} fontCssFamily={fontCssFamily} isDesktop />
      </div>
    </div>
  )
}

// ── RSVP Live Preview (phone mockup) ─────────────────────────
function RSVPPreview({ event, bgImage, theme, fontCssFamily, previewStep, onStepChange }) {
  const showFood = event.rsvp_mode === 'rsvp_and_food' || event.rsvp_mode === 'food_only'
  const totalSteps = showFood ? 3 : 3
  const acc = theme?.colors?.accent || '#1A1A18'
  const stepOnInvite = previewStep === 0

  return (
    <div className="relative mx-auto"
      style={{ width: 160, height: 320, background: '#111', borderRadius: 22, boxShadow: '0 0 0 3px #333, 0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Step dots at top */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 0 5px', background: stepOnInvite ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', flexShrink: 0, zIndex: 10 }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <button key={i} onClick={() => onStepChange(i)}
            style={{ width: i === previewStep ? 20 : 6, height: 6, borderRadius: 3, background: i === previewStep ? (stepOnInvite ? 'white' : acc) : (stepOnInvite ? 'rgba(255,255,255,0.4)' : '#D4CFBC'), border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }} />
        ))}
      </div>

      {/* Screen content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <PreviewScreen step={previewStep} event={event} bgImage={bgImage} theme={theme} fontCssFamily={fontCssFamily} isDesktop={false} />
      </div>

      <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 40, height: 3, background: 'rgba(0,0,0,0.15)', borderRadius: 2, zIndex: 10 }} />
    </div>
  )
}

// ── Main RSVPDashboard page ───────────────────────────────────
export default function RSVPDashboard() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { event, loading: eventLoading } = useHostEvent()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('setup')
  const [localEvent, setLocalEvent] = useState(null)
  const [design, setDesign] = useState({ themeId: 'warm_editorial', fontId: DEFAULT_FONT_ID, eventId: null })
  const [previewDevice, setPreviewDevice] = useState('mobile')
  const [previewStep, setPreviewStep] = useState(0)

  // Guest controls state
  const [localAllowDownloads,  setLocalAllowDownloads]  = useState(null)
  const [localAllowSharing,    setLocalAllowSharing]    = useState(null)
  const [localRequireApproval, setLocalRequireApproval] = useState(null)
  const [localUploadLimit,     setLocalUploadLimit]     = useState(undefined)
  const [localPasscode,        setLocalPasscode]        = useState(undefined)
  const [savingPasscode,       setSavingPasscode]       = useState(false)
  const [qrCopied,             setQrCopied]             = useState(false)
  const qrRef = useRef(null)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (event?.id) {
      setLocalEvent(event)
      setDesign({
        eventId: event.id,
        themeId: event.rsvp_theme || 'warm_editorial',
        fontId:  event.rsvp_font  || DEFAULT_FONT_ID,
      })
      // Apply admin branding default bg if no custom image set
      const isCustom = (url) => url && url.includes('/backgrounds/')
      if (!isCustom(event.background_image) || !isCustom(event.background_image_desktop)) {
        const brandingKey = event.event_type || 'none'
        const hardcodedFallback = getEventType(event.event_type)?.defaultBg ?? null
        supabase.from('admin_branding').select('background_url').eq('event_type', brandingKey).maybeSingle().then(({ data }) => {
          const adminDefault = data?.background_url || hardcodedFallback
          if (!adminDefault) return
          const updates = {}
          if (!isCustom(event.background_image)) updates.background_image = adminDefault
          if (!isCustom(event.background_image_desktop)) updates.background_image_desktop = adminDefault
          if (!Object.keys(updates).length) return
          supabase.from('events').update(updates).eq('id', event.id).then(() => {
            setLocalEvent(e => ({ ...(e || event), ...updates }))
          })
        })
      }
    }
  }, [event?.id])

  const ev = localEvent || event

  function mergeLocal(u) {
    setLocalEvent(e => ({ ...(e || event), ...u }))
  }

  // Derived guest control values (fall back to event DB values)
  const allowDownloads  = localAllowDownloads  !== null      ? localAllowDownloads  : (ev?.allow_downloads  ?? true)
  const allowSharing    = localAllowSharing    !== null      ? localAllowSharing    : (ev?.allow_sharing    ?? true)
  const requireApproval = localRequireApproval !== null      ? localRequireApproval : (ev?.require_approval ?? false)
  const uploadLimit     = localUploadLimit     !== undefined ? localUploadLimit     : (ev?.guest_upload_limit ?? null)
  const passcode        = localPasscode        !== undefined ? localPasscode        : (ev?.guest_passcode   ?? '')

  async function saveEventField(fields) {
    if (!ev?.id) return
    await supabase.from('events').update(fields).eq('id', ev.id)
    mergeLocal(fields)
  }
  async function toggleAllowDownloads()  { const v = !allowDownloads;  setLocalAllowDownloads(v);  await saveEventField({ allow_downloads: v }) }
  async function toggleAllowSharing()    { const v = !allowSharing;    setLocalAllowSharing(v);    await saveEventField({ allow_sharing: v }) }
  async function toggleRequireApproval() { const v = !requireApproval; setLocalRequireApproval(v); await saveEventField({ require_approval: v }) }
  async function saveUploadLimit(val)    { setLocalUploadLimit(val);    await saveEventField({ guest_upload_limit: val }) }
  async function savePasscode(val) {
    const clean = val.trim()
    setLocalPasscode(clean)
    setSavingPasscode(true)
    await saveEventField({ guest_passcode: clean || null })
    setSavingPasscode(false)
  }

  function downloadQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      canvas.width = 800; canvas.height = 800
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 800, 800)
      ctx.drawImage(img, 100, 100, 600, 600)
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${ev?.event_slug}-rsvp-qr.png`; a.click()
        URL.revokeObjectURL(url)
      })
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  if (authLoading || eventLoading) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center">
        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A18" strokeWidth="2">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/>
        </svg>
      </div>
    )
  }

  if (!ev) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm text-[#88887E] mb-4">No event found. Create your gallery event first.</p>
          <Link to="/dashboard" className="text-sm font-bold text-[#1A1A18] underline underline-offset-4">← Go to Gallery Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0]">

      {/* Header */}
      <header className="bg-[#1A1A18] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <VantgeLogo size="sm" variant="dark" />
            <div className="w-px h-4 bg-white/20" />
            <span className="text-xs font-bold text-white/60 uppercase tracking-widest">RSVP</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/dashboard"
              className="text-xs font-bold text-white/60 hover:text-white transition-colors hidden sm:block">
              Gallery Dashboard
            </Link>
            <a href={`/${ev.event_slug}/rsvp`} target="_blank" rel="noopener noreferrer"
              className="text-xs font-bold border border-white/20 text-white/70 rounded-full px-3 py-1.5 hover:border-white/50 hover:text-white transition-all">
              Preview ↗
            </a>
            <button onClick={signOut} className="text-xs text-white/40 hover:text-white/70 transition-colors">Sign out</button>
          </div>
        </div>
      </header>

      {/* Body — two-column layout matching Gallery Dashboard */}
      <div className="max-w-6xl mx-auto px-5 py-6 pb-16">

        {/* Page title */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-1">RSVP Dashboard</p>
            <h1 className="text-xl font-black text-[#1A1A18]">{ev.event_name}</h1>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${
            ev.rsvp_status === 'published' ? 'bg-green-100 text-green-800' :
            ev.rsvp_status === 'closed'    ? 'bg-red-100 text-red-800' :
                                             'bg-[#F4F3F0] text-[#88887E]'
          }`}>
            {ev.rsvp_status || 'draft'}
          </span>
        </div>

        <div className="grid md:grid-cols-12 gap-5 items-start">

          {/* LEFT — preview + bg picker */}
          <div className="md:col-span-4 flex flex-col gap-3">

            {/* Live Preview card */}
            <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-sm">
              <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-4">Live Preview</p>
              <div className="flex items-center justify-center" style={{ height: 336 }}>
                {previewDevice === 'desktop' ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="rounded-lg overflow-hidden border-4 border-[#1A1A18] shadow-xl relative" style={{ width: 300, height: 188 }}>
                      <RSVPPreviewDesktop event={ev} bgImage={ev?.background_image_desktop || ev?.background_image}
                        theme={ALL_THEMES.find(t => t.id === design.themeId)}
                        fontCssFamily={getFont(design.fontId)?.cssFamily}
                        previewStep={previewStep}
                        onStepChange={setPreviewStep} />
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-2 bg-[#1A1A18] rounded-b" />
                      <div className="w-16 h-1.5 bg-[#1A1A18] rounded" />
                    </div>
                  </div>
                ) : (
                  <RSVPPreview event={ev} bgImage={ev?.background_image}
                    theme={ALL_THEMES.find(t => t.id === design.themeId)}
                    fontCssFamily={getFont(design.fontId)?.cssFamily}
                    previewStep={previewStep}
                    onStepChange={setPreviewStep} />
                )}
              </div>
              {/* Device toggle */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <button onClick={() => setPreviewDevice('mobile')} title="Mobile preview"
                  className={`p-2 rounded-lg transition-colors ${previewDevice === 'mobile' ? 'bg-[#1A1A18] text-white' : 'text-[#B0AFA5] hover:text-[#1A1A18]'}`}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeWidth="2.5"/></svg>
                </button>
                <button onClick={() => setPreviewDevice('desktop')} title="Desktop preview"
                  className={`p-2 rounded-lg transition-colors ${previewDevice === 'desktop' ? 'bg-[#1A1A18] text-white' : 'text-[#B0AFA5] hover:text-[#1A1A18]'}`}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>

            {/* QR code card */}
            {ev && (
              <div className="bg-white rounded-3xl border border-[#E8E4DA] p-5 shadow-sm flex flex-col items-center gap-4">
                <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] self-start">Scan to Share</p>
                <div ref={qrRef} className="bg-[#F7F5F0] p-4 rounded-2xl">
                  <QRCodeSVG value={`${window.location.origin}/${ev.event_slug}/rsvp`} size={136} level="M" fgColor="#1A1A18" bgColor="#F7F5F0" />
                </div>
                <div className="w-full flex items-center gap-2 bg-[#F7F5F0] border border-[#E8E4DA] rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-[10px] text-[#6B6B63] truncate font-mono">
                    {window.location.origin}/{ev.event_slug}/rsvp
                  </span>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${ev.event_slug}/rsvp`); setQrCopied(true); setTimeout(() => setQrCopied(false), 2000) }}
                    aria-label="Copy link" className="shrink-0 text-[#B0AFA5] hover:text-[#1A1A18] transition-colors">
                    {qrCopied
                      ? <svg width="14" height="14" fill="none" stroke="#22c55e" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    }
                  </button>
                </div>
                <button onClick={downloadQR}
                  className="w-full bg-[#1A1A18] hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full py-3 transition-all">
                  Download QR PNG
                </button>
              </div>
            )}

            {/* Guest Controls card */}
            {ev && (
              <div className="bg-white rounded-3xl border border-[#E8E4DA] shadow-sm flex flex-col">
                <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] px-5 pt-5 pb-4">Guest Controls</p>

                {/* Toggles */}
                <div className="px-5 pb-5 flex flex-col gap-4 border-b-2 border-[#F0EDE6]">
                  {[
                    { label: 'Allow Downloads',  sub: 'Guests can save photos',                      value: allowDownloads,  toggle: toggleAllowDownloads },
                    { label: 'Allow Sharing',    sub: 'Guests can share photos',                     value: allowSharing,    toggle: toggleAllowSharing },
                    { label: 'Require Approval', sub: 'You approve each photo before it appears',    value: requireApproval, toggle: toggleRequireApproval },
                  ].map(({ label, sub, value, toggle }) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A18]">{label}</p>
                        <p className="text-[11px] text-[#88887E]">{sub}</p>
                      </div>
                      <button onClick={toggle} aria-label={label}
                        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-[#1A1A18]' : 'bg-[#E0D8C6]'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Upload Limit */}
                <div className="px-5 py-5 border-b-2 border-[#F0EDE6]">
                  <p className="text-sm font-semibold text-[#1A1A18] mb-0.5">Upload Limit per Guest</p>
                  <p className="text-[11px] text-[#88887E] mb-3">Max photos a guest can submit</p>
                  <div className="flex gap-2 flex-wrap">
                    {[null, 5, 10, 20, 30].map((v) => (
                      <button key={v ?? 'unlimited'} onClick={() => saveUploadLimit(v)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${uploadLimit === v ? 'bg-[#1A1A18] text-white border-[#1A1A18]' : 'bg-white text-[#1A1A18] border-[#E8E4DA] hover:border-[#1A1A18]'}`}>
                        {v === null ? 'Unlimited' : v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Passcode */}
                <div className="px-5 py-5">
                  <p className="text-sm font-semibold text-[#1A1A18] mb-0.5">Guest Passcode</p>
                  <p className="text-[11px] text-[#88887E] mb-3">Guests must enter this to access the event</p>
                  <div className="flex gap-2">
                    <input type="text" value={passcode}
                      onChange={(e) => setLocalPasscode(e.target.value)}
                      onBlur={(e) => savePasscode(e.target.value)}
                      placeholder="No passcode" maxLength={20}
                      className="flex-1 border border-[#E8E4DA] rounded-xl px-3 py-2 text-sm text-[#1A1A18] placeholder-[#B0AFA5] focus:outline-none focus:border-[#1A1A18] transition-colors" />
                    {passcode ? (
                      <button onClick={() => savePasscode('')}
                        className="px-3 py-2 rounded-xl border border-[#E8E4DA] text-[11px] font-bold text-[#C84A44] hover:border-[#C84A44] transition-colors">
                        Clear
                      </button>
                    ) : null}
                  </div>
                  {savingPasscode && <p className="text-[10px] text-[#88887E] mt-1 animate-pulse">Saving…</p>}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT — tabs + content */}
          <div className="md:col-span-8">

            {/* Tab bar */}
            <div className="flex border-b border-[#E0D8C6] overflow-x-auto mb-5" style={{ scrollbarWidth: 'none' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`pb-3 pt-1 mr-5 text-sm font-bold transition-all relative whitespace-nowrap shrink-0 ${
                    activeTab === t.id ? 'text-[#1A1A18]' : 'text-[#B0AFA5] hover:text-[#5A5A52]'
                  }`}>
                  {t.label}
                  {activeTab === t.id && <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#1A1A18] rounded-full" />}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'setup'       && <SetupTab       event={ev} onSaved={mergeLocal} />}
            {activeTab === 'design'      && <DesignTab      event={ev} design={design} onChange={setDesign} onSaved={() => mergeLocal({ rsvp_theme: design.themeId, rsvp_font: design.fontId })} onLocalUpdate={mergeLocal} />}
            {activeTab === 'responses'   && <ResponsesTab   event={ev} />}
            {activeTab === 'food'        && <FoodTab        event={ev} />}
          </div>

        </div>
      </div>
    </div>
  )
}

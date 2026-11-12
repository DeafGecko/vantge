// src/pages/RSVPDashboard.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { LogOut, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useHostEvent } from '../hooks/useHostEvent'
import { supabase } from '../lib/supabase'
import VantgeLogo from '../components/VantgeLogo'
import DashboardHeader from '../components/DashboardHeader'
import { getAllThemes } from '../lib/themes'
import { getFontsByCategory, getFont, getAllFonts, getGoogleFontsUrl, DEFAULT_FONT_ID } from '../lib/fonts'
import { EVENT_TYPES, getEventType } from '../lib/eventTypes'
import BackgroundUploader from '../components/BackgroundUploader'
import Dropdown from '../components/Dropdown'
import DateTimeField from '../components/DateTimeField'
import LogoUploader from '../components/LogoUploader'
import { bgPhotoStyle } from '../lib/bgPhoto'

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
  const cls = "w-full rounded-xl border-2 border-[#D9D4C5] bg-white px-4 py-3 text-base text-[#1A1A18] placeholder-[#7A7A72] hover:border-[#1A1A18] focus:outline-none focus:border-[#1A1A18] focus-visible:ring-2 focus-visible:ring-[#1A1A18]"
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
    <Dropdown value={value} onChange={onChange} options={options}
      className="rounded-xl border-2 border-[#D9D4C5] bg-white px-4 py-3 text-base text-[#1A1A18] hover:border-[#1A1A18]" />
  )
}

// ── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { id: 'event',     label: 'Event' },
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
// Turn a saved (UTC) date into the local text a date box shows, so the form compares like with like
function toInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function SetupTab({ event, onSaved, registerSave, onDirty, onNameInput, onStatusInput }) {
  const DRAFT_KEY = `rsvp_setup_draft_${event.id}`

  function baseForm() {
    return {
      rsvp_enabled:           event.rsvp_enabled ?? false,
      rsvp_status:            event.rsvp_status ?? 'draft',
      rsvp_mode:              event.rsvp_mode ?? 'rsvp_only',
      rsvp_event_name:        event.rsvp_event_name ?? '',
      rsvp_description:       event.rsvp_description ?? '',
      rsvp_location:          event.rsvp_location ?? '',
      rsvp_event_date:        toInputValue(event.rsvp_event_date),
      rsvp_end_time:          toInputValue(event.rsvp_end_time),
      rsvp_timezone:          event.rsvp_timezone ?? 'America/New_York',
      rsvp_deadline:          toInputValue(event.rsvp_deadline),
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
    u.rsvp_end_time         = u.rsvp_end_time?.trim() ? new Date(u.rsvp_end_time).toISOString() : null
    u.rsvp_deadline         = u.rsvp_deadline    ? new Date(u.rsvp_deadline).toISOString()    : null
    u.rsvp_attendance_limit = u.rsvp_attendance_limit ? parseInt(u.rsvp_attendance_limit) : null
    const { error: err } = await supabase.from('events').update(u).eq('id', event.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    localStorage.removeItem(DRAFT_KEY)
    setHasDraft(false)
    setSaved(true); onSaved?.(u); setTimeout(() => setSaved(false), 2500)
  }
  useEffect(() => { registerSave?.(save) })
  // Tell the top Save button whether this tab has changes that aren't saved yet
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseForm())
  useEffect(() => { onDirty?.(isDirty) })

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
    <div className="space-y-6">

      {/* Status banner */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <SectionLabel>Status</SectionLabel>
            <p className="text-sm text-[#5A5A52] mt-1">
              {form.rsvp_status === 'draft'     && 'Draft — guests cannot see it yet.'}
              {form.rsvp_status === 'published' && 'Live — guests can reply.'}
              {form.rsvp_status === 'closed'    && 'Closed — no new replies.'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['draft','published','closed'].map(s => (
              <button key={s} onClick={() => { set('rsvp_status')(s); onStatusInput?.(s) }}
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
          <Toggle label="Turn on RSVP" sublabel="Needs to be on for guests to reply"
            checked={form.rsvp_enabled} onChange={set('rsvp_enabled')} />
        </div>
      </Card>

      {/* Event details */}
      <Card className="p-6 space-y-5">
        <SectionLabel>Event Details</SectionLabel>
        <FieldRow label="Display name">
          <TextInput value={form.rsvp_event_name} onChange={v => { set('rsvp_event_name')(v); onNameInput?.(v) }} placeholder="e.g. The Johnson Family" />
        </FieldRow>
        <FieldRow label="Message (optional)" info="A short note shown on the invitation. Use it for a welcome, dress code, or parking.ing.">
          <TextInput value={form.rsvp_description} onChange={set('rsvp_description')} placeholder="A short note for your guests…" rows={2} />
        </FieldRow>
        <FieldRow label="Location">
          <TextInput value={form.rsvp_location} onChange={set('rsvp_location')} placeholder="Spring Hill, Tennessee" />
        </FieldRow>
      </Card>

      {/* Date & time */}
      <Card className="p-6 space-y-5">
        <SectionLabel>Date & Time</SectionLabel>

        {/* Row 1 — Start + End time */}
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Start time">
            <DateTimeField value={form.rsvp_event_date} onChange={set('rsvp_event_date')} />
          </FieldRow>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <input type="checkbox" id="show_end_time"
                checked={!!form.rsvp_end_time}
                onChange={e => set('rsvp_end_time')(e.target.checked ? ' ' : '')}
                className="w-3.5 h-3.5 rounded accent-[#1A1A18] cursor-pointer" />
              <label htmlFor="show_end_time" className="text-xs font-bold text-[#88887E] uppercase tracking-widest cursor-pointer">End time</label>
            </div>
            <DateTimeField value={form.rsvp_end_time?.trim() ? form.rsvp_end_time : ''} onChange={set('rsvp_end_time')}
              disabled={!form.rsvp_end_time} placeholder="Pick an end time" />
          </div>
        </div>

        {/* Row 2 — Timezone + RSVP deadline */}
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Timezone">
            <Sel value={form.rsvp_timezone} onChange={set('rsvp_timezone')} options={timezones} />
          </FieldRow>
          <FieldRow label="RSVP deadline (optional)">
            <DateTimeField value={form.rsvp_deadline} onChange={set('rsvp_deadline')} placeholder="Optional" />
          </FieldRow>
        </div>
      </Card>

      {/* RSVP options */}
      <Card className="p-6 space-y-5">
        <SectionLabel>RSVP Options</SectionLabel>
        <FieldRow label="What to ask">
          <Sel value={form.rsvp_mode} onChange={set('rsvp_mode')} options={[
            { value: 'rsvp_only',      label: 'RSVP only' },
            { value: 'food_only',      label: 'Food only' },
            { value: 'rsvp_and_food',  label: 'Reply and food' },
          ]} />
        </FieldRow>
        <FieldRow label="Most guests allowed (optional)">
          <TextInput type="number" value={form.rsvp_attendance_limit} onChange={set('rsvp_attendance_limit')} placeholder="Leave blank for unlimited" />
        </FieldRow>
        <FieldRow label="How to count guests">
          <Sel value={form.rsvp_headcount_mode} onChange={set('rsvp_headcount_mode')} options={[
            { value: 'headcount', label: 'Number only' },
            { value: 'names',     label: 'Guest names only' },
            { value: 'both',      label: 'Number and names' },
          ]} />
        </FieldRow>
        <div className="space-y-3 pt-1">
          <Toggle label="Ask for email" checked={form.rsvp_collect_email} onChange={set('rsvp_collect_email')} />
          <Toggle label='Allow "Maybe"' checked={form.rsvp_allow_maybe} onChange={set('rsvp_allow_maybe')} />
        </div>
      </Card>

      {/* Food sign-up */}
      {showFood && (
        <Card className="p-6 space-y-5">
          <SectionLabel>Food Sign-up</SectionLabel>
          <Toggle label="Turn on food sign-up" checked={form.food_enabled} onChange={set('food_enabled')} />
          {form.food_enabled && (
            <>
              <FieldRow label="Heading">
                <TextInput value={form.food_heading} onChange={set('food_heading')} placeholder="Food Sign-up" />
              </FieldRow>
              <div className="space-y-3">
                <Toggle label="Guests can add items" checked={form.food_allow_suggestions} onChange={set('food_allow_suggestions')} />
                <Toggle label="Show who brought each item" checked={form.food_show_contributors} onChange={set('food_show_contributors')} />
              </div>
            </>
          )}
        </Card>
      )}

      {error && <p className="text-sm text-[#C84A44] text-center">{error}</p>}

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
  const [editing, setEditing]     = useState(null)   // the response being edited
  const [draft, setDraft]         = useState({ guest_name: '', response: 'going', party_size: 1, guest_names: '', note: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editingClaim, setEditingClaim] = useState(null)
  const [claimDraft, setClaimDraft] = useState({ guest_name: '', description: '', quantity: 1 })

  function startEditClaim(c) {
    setEditingClaim(c)
    setClaimDraft({ guest_name: c.guest_name ?? '', description: c.description ?? '', quantity: c.quantity ?? 1 })
  }

  async function saveClaim() {
    if (!editingClaim || !claimDraft.guest_name.trim()) return
    setSavingEdit(true)
    const fields = {
      guest_name: claimDraft.guest_name.trim(),
      description: claimDraft.description.trim() || null,
      quantity: Math.max(1, parseInt(claimDraft.quantity) || 1),
    }
    const { error } = await supabase.from('food_claims').update(fields).eq('id', editingClaim.id)
    setSavingEdit(false)
    if (error) { alert('Could not save: ' + error.message); return }
    setFoodClaims(list => list.map(x => x.id === editingClaim.id ? { ...x, ...fields } : x))
    setEditingClaim(null)
  }

  async function removeClaim(c) {
    if (!window.confirm(`Remove ${c.guest_name}'s food item?`)) return
    const { error } = await supabase.from('food_claims').delete().eq('id', c.id)
    if (error) { alert('Could not remove: ' + error.message); return }
    setFoodClaims(list => list.filter(x => x.id !== c.id))
  }

  function startEdit(r) {
    setEditing(r)
    setDraft({ guest_name: r.guest_name ?? '', response: r.response ?? 'going', party_size: r.party_size ?? 1, guest_names: r.guest_names ?? '', note: r.note ?? '' })
  }

  async function saveEdit() {
    if (!editing || !draft.guest_name.trim()) return
    setSavingEdit(true)
    const fields = {
      guest_name: draft.guest_name.trim(),
      response: draft.response,
      party_size: Math.max(1, parseInt(draft.party_size) || 1),
      guest_names: draft.guest_names.trim() || null,
      note: draft.note.trim() || null,
    }
    const { error } = await supabase.from('rsvp_responses').update(fields).eq('id', editing.id)
    setSavingEdit(false)
    if (error) { alert('Could not save: ' + error.message); return }
    setResponses(list => list.map(x => x.id === editing.id ? { ...x, ...fields } : x))
    setEditing(null)
  }

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
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Going',        count: totalAttendees,  sub: `${going.length} response${going.length !== 1 ? 's' : ''}`, color: '#1A1A18' },
          { label: 'Maybe',        count: maybe.length,    sub: 'responses',                                              color: '#B29746' },
          { label: "Can't attend", count: notGoing.length, sub: 'responses',                                              color: '#C84A44' },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl font-black leading-tight" style={{ color: s.color }}>{s.count}</p>
            <p className="text-xs font-bold text-[#1A1A18] mt-0.5">{s.label}</p>
            <p className="text-[10px] text-[#88887E]">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Sub-tab switcher */}
      <div className="flex gap-3 bg-[#F4F3F0] rounded-xl p-2">
        {[
          { id: 'guests', label: 'Guest List' },
          { id: 'food',   label: 'Food Sign-up' },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`flex-1 text-sm font-bold py-2.5 rounded-lg border-2 transition-all focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A18] ${
              subTab === t.id ? 'bg-[#1A1A18] border-[#1A1A18] text-white' : 'bg-[#E8E4DA] border-[#D9D4C5] text-[#3D3D38] hover:bg-[#DDD8CB]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Guest List sub-tab */}
      {subTab === 'guests' && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-wrap gap-3">
            <SectionLabel>All Responses ({responses.length})</SectionLabel>
            <div className="flex items-center gap-2">
              <Dropdown value={filter} onChange={setFilter} wrapClassName="relative w-36"
                className="text-xs font-bold border border-[#E0D8C6] rounded-full px-3 py-1.5 bg-white text-[#1A1A18]"
                options={[{ value: 'all', label: 'All' }, { value: 'going', label: 'Going' }, { value: 'maybe', label: 'Maybe' }, { value: 'not_going', label: "Can't attend" }]} />
              {responses.length > 0 && (
                <button onClick={exportCSV}
                  className="text-xs font-bold text-[#1A1A18] border border-[#E0D8C6] rounded-full px-3 py-1.5 hover:bg-[#F4F3F0] transition-colors">
                  Export CSV
                </button>
              )}
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-[#5A5A52]">{responses.length === 0 ? 'No responses yet.' : 'None in this filter.'}</p>
          ) : (
            <div className="divide-y-2 divide-[#D9D4C5]">
              {filtered.map(r => (
                <div key={r.id} className="px-6 py-5 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-black text-[#1A1A18]">{r.guest_name}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        r.response === 'going'  ? 'bg-green-100 text-green-800' :
                        r.response === 'maybe'  ? 'bg-yellow-100 text-yellow-800' :
                                                  'bg-red-100 text-red-800'
                      }`}>
                        {r.response === 'going' ? 'Going' : r.response === 'maybe' ? 'Maybe' : "Can't attend"}
                      </span>
                      {r.party_size > 1 && (
                        <span className="text-sm font-semibold text-[#1A1A18]">+{r.party_size - 1} guest{r.party_size > 2 ? 's' : ''}</span>
                      )}
                    </div>
                    {r.guest_names && <p className="text-sm text-[#5A5A52] mt-1">{r.guest_names}</p>}
                    {r.note && <p className="text-sm text-[#5A5A52] italic mt-1">"{r.note}"</p>}
                    <p className="text-xs text-[#5A5A52] mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(r)} aria-label="Edit response" title="Edit"
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-[#5A5A52] hover:text-[#1A1A18] hover:bg-[#F4F3F0] transition-colors">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                  </button>
                  <button onClick={() => remove(r.id)} aria-label="Remove response" title="Remove"
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-[#C84A44] hover:text-red-700 hover:bg-[#FEF2F2] transition-colors">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                  </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Edit popup — dark tint behind it */}
      {editing && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-5" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-base font-black text-[#1A1A18]">Edit response</p>
              <button onClick={() => setEditing(null)} aria-label="Close" className="text-[#5A5A52] hover:text-[#1A1A18] text-2xl leading-none">×</button>
            </div>
            <FieldRow label="Name">
              <TextInput value={draft.guest_name} onChange={v => setDraft(d => ({ ...d, guest_name: v }))} />
            </FieldRow>
            <FieldRow label="Reply">
              <Dropdown value={draft.response} onChange={v => setDraft(d => ({ ...d, response: v }))}
                options={[{ value: 'going', label: 'Going' }, { value: 'maybe', label: 'Maybe' }, { value: 'not_going', label: "Can't come" }]}
                className="rounded-xl border-2 border-[#D9D4C5] bg-white px-4 py-3 text-base text-[#1A1A18]" />
            </FieldRow>
            <FieldRow label="Number of guests">
              <TextInput type="number" value={draft.party_size} onChange={v => setDraft(d => ({ ...d, party_size: v }))} />
            </FieldRow>
            <FieldRow label="Guest names (optional)">
              <TextInput value={draft.guest_names} onChange={v => setDraft(d => ({ ...d, guest_names: v }))} placeholder="One name on each line" />
            </FieldRow>
            <FieldRow label="Note (optional)">
              <TextInput value={draft.note} onChange={v => setDraft(d => ({ ...d, note: v }))} />
            </FieldRow>
            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit} disabled={savingEdit || !draft.guest_name.trim()}
                className="flex-1 bg-[#1A1A18] text-white text-sm font-bold uppercase tracking-widest rounded-full py-3.5 disabled:opacity-50 hover:bg-black transition-all">
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
              <button onClick={() => setEditing(null)} className="px-5 text-sm font-bold text-[#5A5A52] hover:text-[#1A1A18]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit food item popup — dark tint behind it */}
      {editingClaim && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-5" onClick={() => setEditingClaim(null)}>
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-base font-black text-[#1A1A18]">Edit food item</p>
              <button onClick={() => setEditingClaim(null)} aria-label="Close" className="text-[#5A5A52] hover:text-[#1A1A18] text-2xl leading-none">×</button>
            </div>
            <FieldRow label="Name">
              <TextInput value={claimDraft.guest_name} onChange={v => setClaimDraft(d => ({ ...d, guest_name: v }))} />
            </FieldRow>
            <FieldRow label="What they bring">
              <TextInput value={claimDraft.description} onChange={v => setClaimDraft(d => ({ ...d, description: v }))} />
            </FieldRow>
            <FieldRow label="How many">
              <TextInput type="number" value={claimDraft.quantity} onChange={v => setClaimDraft(d => ({ ...d, quantity: v }))} />
            </FieldRow>
            <div className="flex gap-2 pt-1">
              <button onClick={saveClaim} disabled={savingEdit || !claimDraft.guest_name.trim()}
                className="flex-1 bg-[#1A1A18] text-white text-sm font-bold uppercase tracking-widest rounded-full py-3.5 disabled:opacity-50 hover:bg-black transition-all">
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
              <button onClick={() => setEditingClaim(null)} className="px-5 text-sm font-bold text-[#5A5A52] hover:text-[#1A1A18]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Food sign-up sub-tab */}
      {subTab === 'food' && (
        <Card className="overflow-hidden">
          <div className="px-6 pt-5 pb-4">
            <SectionLabel>Who's Bringing What ({foodClaims.length} claim{foodClaims.length !== 1 ? 's' : ''})</SectionLabel>
          </div>
          {foodItems.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-[#5A5A52]">No food items set up yet. Add items in the Food Sign-up tab.</p>
          ) : foodClaims.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-[#5A5A52]">No one has claimed a food item yet.</p>
          ) : (
            <div className="divide-y-2 divide-[#D9D4C5]">
              {claimsByItem.filter(g => g.claims.length > 0).map(({ item, claims }) => (
                <div key={item.id} className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-base font-black text-[#1A1A18]">{item.name}</p>
                    {item.category && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#88887E] border border-[#E0D8C6] rounded-full px-2 py-0.5">{item.category}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2.5 pl-2">
                    {claims.map(c => (
                      <div key={c.id} className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#C9BFA8] mt-2 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#1A1A18]">{c.guest_name}</p>
                            {c.description && <p className="text-sm text-[#5A5A52]">{c.description}</p>}
                            {c.quantity > 1 && <p className="text-sm text-[#5A5A52]">×{c.quantity}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => startEditClaim(c)} aria-label="Edit food item" title="Edit"
                            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#5A5A52] hover:text-[#1A1A18] hover:bg-[#F4F3F0] transition-colors">
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                          </button>
                          <button onClick={() => removeClaim(c)} aria-label="Remove food item" title="Remove"
                            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#C84A44] hover:text-red-700 hover:bg-[#FEF2F2] transition-colors">
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          </button>
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
  const [editingId, setEditingId] = useState(null)
  // Removed item waits here for 20 seconds, so it can be put back with Undo
  const [pendingDelete, setPendingDelete] = useState(null)
  const pendingRef = useRef(null)
  const timerRef = useRef(null)

  async function commitDelete(item) {
    clearTimeout(timerRef.current)
    pendingRef.current = null
    setPendingDelete(null)
    await supabase.from('food_items').delete().eq('id', item.id)
    load()
  }
  const [editDraft, setEditDraft] = useState({ name: '', category: '', notes: '', spots_total: '' })

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

  function startEdit(item) {
    setEditingId(item.id)
    setEditDraft({ name: item.name ?? '', category: item.category ?? '', notes: item.notes ?? '', spots_total: item.spots_total ?? '' })
  }

  async function saveEdit(id) {
    if (!editDraft.name.trim()) return
    setSaving(true)
    await supabase.from('food_items').update({
      name: editDraft.name.trim(),
      category: editDraft.category.trim() || null,
      notes: editDraft.notes.trim() || null,
      spots_total: editDraft.spots_total === '' || editDraft.spots_total == null ? null : parseInt(editDraft.spots_total),
    }).eq('id', id)
    setEditingId(null); setSaving(false); load()
  }

  function deleteItem(id) {
    const item = items.find(it => it.id === id)
    if (!item) return
    if (pendingRef.current) commitDelete(pendingRef.current) // finish any earlier removal first
    pendingRef.current = item
    setPendingDelete(item)
    timerRef.current = setTimeout(() => commitDelete(item), 20000)
  }

  function undoDelete() {
    clearTimeout(timerRef.current)
    pendingRef.current = null
    setPendingDelete(null)
  }

  // If the page closes during the 20 seconds, finish the removal
  useEffect(() => () => {
    if (pendingRef.current) {
      clearTimeout(timerRef.current)
      supabase.from('food_items').delete().eq('id', pendingRef.current.id)
    }
  }, [])

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
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-wrap gap-3">
          <SectionLabel>{event.food_heading || 'Food Items'} ({items.length})</SectionLabel>
          <div className="flex items-center gap-2">
            {!adding && (
              <button onClick={() => setAdding(true)}
                className="text-xs font-bold text-[#1A1A18] border border-[#1A1A18] rounded-full px-3 py-1.5 hover:bg-[#1A1A18] hover:text-white transition-colors">
                + Add item
              </button>
            )}
            {items.length > 0 && (
              <button onClick={exportCSV}
                className="text-xs font-bold text-[#1A1A18] border border-[#E0D8C6] rounded-full px-3 py-1.5 hover:bg-[#F4F3F0] transition-colors">
                Export CSV
              </button>
            )}
          </div>
        </div>

        {items.length === 0 && !adding && (
          <p className="px-5 pb-4 text-sm text-[#88887E]">No items yet. Add items for guests to claim.</p>
        )}

        <div className="divide-y-2 divide-[#D9D4C5]">
          {items.filter(it => it.id !== pendingDelete?.id).map(item => {
            const itemClaims = claims.filter(c => c.food_item_id === item.id)
            const claimed = itemClaims.reduce((s, c) => s + c.quantity, 0)
            return (
              <div key={item.id} className="px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-black text-[#1A1A18]">{item.name}</p>
                      {item.is_suggestion && (
                        <span className="text-[10px] font-bold bg-[#FEF9EC] text-[#8B7224] border border-[#F5D97A] rounded-full px-2 py-0.5">Guest suggestion</span>
                      )}
                    </div>
                    {item.category && <p className="text-sm text-[#5A5A52] mt-0.5">{item.category}</p>}
                    {item.notes    && <p className="text-sm text-[#5A5A52] italic mt-0.5">{item.notes}</p>}
                    <p className="text-sm font-semibold text-[#1A1A18] mt-2">
                      {item.spots_total ? `${claimed} / ${item.spots_total} spots claimed` : `${claimed} claimed · unlimited spots`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(item)} aria-label="Edit item" title="Edit"
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-[#5A5A52] hover:text-[#1A1A18] hover:bg-[#F4F3F0] transition-colors">
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    </button>
                    <button onClick={() => deleteItem(item.id)} aria-label="Remove item" title="Remove"
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-[#C84A44] hover:text-red-700 hover:bg-[#FEF2F2] transition-colors">
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    </button>
                  </div>
                </div>
                {itemClaims.length > 0 && (
                  <div className="mt-4 space-y-2.5">
                    {itemClaims.map(c => (
                      <p key={c.id} className="text-sm text-[#1A1A18] flex items-center gap-2.5 leading-normal">
                        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#1A1A18] shrink-0" />
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

        {/* Undo bar — shows for 20 seconds after a removal */}
        {pendingDelete && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[65] bg-[#1A1A18] text-white rounded-full pl-5 pr-2 py-2 shadow-2xl flex items-center gap-4">
            <p className="text-xs font-bold">"{pendingDelete.name}" removed</p>
            <button onClick={undoDelete} className="text-xs font-bold uppercase tracking-widest bg-white text-[#1A1A18] rounded-full px-4 py-1.5 hover:bg-[#F4F3F0] transition-colors">Undo</button>
          </div>
        )}

        {/* Edit popup — dark tint behind it */}
        {editingId && (() => {
          const item = items.find(it => it.id === editingId)
          if (!item) return null
          return (
            <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-5" onClick={() => setEditingId(null)}>
              <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-[#1A1A18]">Edit item</p>
                  <button onClick={() => setEditingId(null)} aria-label="Close" className="text-[#88887E] hover:text-[#1A1A18] text-lg leading-none">×</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <FieldRow label="Item name *">
                      <TextInput value={editDraft.name} onChange={v => setEditDraft(f => ({ ...f, name: v }))} />
                    </FieldRow>
                  </div>
                  <FieldRow label="Type">
                    <TextInput value={editDraft.category} onChange={v => setEditDraft(f => ({ ...f, category: v }))} />
                  </FieldRow>
                  <FieldRow label="How many (blank = no limit)">
                    <TextInput type="number" value={editDraft.spots_total} onChange={v => setEditDraft(f => ({ ...f, spots_total: v }))} />
                  </FieldRow>
                  <div className="col-span-2">
                    <FieldRow label="Note">
                      <TextInput value={editDraft.notes} onChange={v => setEditDraft(f => ({ ...f, notes: v }))} />
                    </FieldRow>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => saveEdit(item.id)} disabled={saving || !editDraft.name.trim()}
                    className="flex-1 bg-[#1A1A18] text-white text-xs font-bold uppercase tracking-widest rounded-full py-3 disabled:opacity-50 hover:bg-black transition-all">
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button onClick={() => setEditingId(null)} className="px-5 text-xs font-bold text-[#88887E] hover:text-[#1A1A18]">Cancel</button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Add item form */}
        {adding && (
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
        )}
      </Card>
    </div>
  )
}

// ── Design Tab ────────────────────────────────────────────────
// Title position sliders, shown under the live preview they change
function TitlePositionControls({ event, onLocalUpdate }) {
  const [pos, setPos]   = useState(event.rsvp_title_position ?? 50)
  const [posD, setPosD] = useState(event.rsvp_title_position_desktop ?? 50)
  async function save(fields) {
    await supabase.from('events').update(fields).eq('id', event.id)
    onLocalUpdate?.(fields)
  }
  return (
    <div className="mt-4 pt-4 border-t border-[#F0EDE6] flex flex-col gap-3">
          {/* Mobile */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeWidth="2.5"/></svg>
              <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Title place</p>
            </div>
            <span className="text-[9px] font-bold text-[#88887E]">{pos == 0 ? 'Top' : pos == 100 ? 'Bottom' : pos == 50 ? 'Center' : `${pos}%`}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-[#B0AFA5]">Top</span>
            <input type="range" min={0} max={100} step={1} value={pos}
              onChange={async (e) => { const val = e.target.value; setPos(val); await save({ rsvp_title_position: val }) }}
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
              <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Title place</p>
            </div>
            <span className="text-[9px] font-bold text-[#88887E]">{posD == 0 ? 'Top' : posD == 100 ? 'Bottom' : posD == 50 ? 'Center' : `${posD}%`}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-[#B0AFA5]">Top</span>
            <input type="range" min={0} max={100} step={1} value={posD}
              onChange={async (e) => { const val = e.target.value; setPosD(val); await save({ rsvp_title_position_desktop: val }) }}
              className="flex-1 accent-[#1A1A18] h-1.5 rounded-full cursor-pointer"
            />
            <span className="text-[8px] text-[#B0AFA5]">Bottom</span>
          </div>
        </div>
    </div>
  )
}

function DesignTab({ event, design, onChange, onSaved, onLocalUpdate, registerSave, onDirty, onNameInput }) {
  const [savingName, setSavingName]   = useState(false)
  const [localName,  setLocalName]    = useState(event.rsvp_event_name ?? '')
  const [localType,  setLocalType]    = useState(event.rsvp_event_type ?? '')
  const [localBgMobile,   setLocalBgMobile]   = useState(event.rsvp_background_image ?? null)
  const [localBgDesktop,  setLocalBgDesktop]  = useState(event.rsvp_background_image_desktop ?? null)
  const [localBgPosition, setLocalBgPosition] = useState(event.rsvp_background_position ?? 50)
  const [localBgTint,     setLocalBgTint]     = useState(event.rsvp_background_tint ?? 0)
  const [localLogoUrl,    setLocalLogoUrl]    = useState(event.rsvp_logo_url ?? null)
  const [localTitleAlign, setLocalTitleAlign] = useState(event.rsvp_title_align ?? 'left')
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
  useEffect(() => { registerSave?.(saveDesign) })
  const designDirty = design?.themeId !== event.rsvp_theme || design?.fontId !== event.rsvp_font
  useEffect(() => { onDirty?.(designDirty) })

  const catLabels = { elegant: 'Elegant & Script', modern: 'Modern & Clean', display: 'Display & Bold' }
  const currentTheme = ALL_THEMES.find(t => t.id === design.themeId)

  return (
    <div className="space-y-6">

      {/* Logo | Display Name | Event Type | Title place */}
      <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-sm">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Logo</p>
            <LogoUploader
          field="rsvp_logo_url"
              eventId={event.id}
              currentLogoUrl={localLogoUrl}
              onSaved={(url) => { setLocalLogoUrl(url); onLocalUpdate?.({ rsvp_logo_url: url }) }}
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
                onChange={(e) => { setLocalName(e.target.value); onNameInput?.(e.target.value) }}
                onBlur={async () => {
                  if (localName === (event.rsvp_event_name ?? '')) return
                  setSavingName(true)
                  await saveField({ rsvp_event_name: localName })
                  setSavingName(false)
                }}
                placeholder="e.g. The Johnson Family"
                style={{ height: 68 }}
                className="w-full bg-[#F7F5F0] border-2 border-[#E8E4DA] rounded-xl px-3 py-2.5 text-sm font-bold text-[#1A1A18] focus:outline-none focus:border-[#1A1A18] transition-colors placeholder:text-[#C0BFB5] placeholder:font-normal resize-none leading-snug"
              />
            </div>
            <div>
              <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-1.5">Event Type</p>
              <Dropdown value={localType} className="bg-[#F7F5F0] border-2 border-[#E8E4DA] rounded-xl px-3 py-2.5 text-sm font-bold text-[#1A1A18]"
                options={[{ value: '', label: '— None —' }, ...EVENT_TYPES.map(t => ({ value: t.id, label: t.label }))]}
                onChange={async (val) => { setLocalType(val); await saveField({ rsvp_event_type: val || null }) }} />
            </div>
          </div>
        </div>

      </div>

      {/* Background Photo — Mobile Portrait + Desktop Landscape */}
      <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-sm overflow-hidden">
        <BackgroundUploader
          dbPrefix="rsvp_background"
          eventId={event.id}
          currentImageUrl={localBgMobile}
          currentImageDesktopUrl={localBgDesktop}
          currentPosition={localBgPosition}
          currentTint={localBgTint}
          currentPositionDesktop={event.rsvp_background_position_desktop ?? event.rsvp_background_position ?? '50% 50%'}
          currentTintDesktop={event.rsvp_background_tint_desktop ?? event.rsvp_background_tint ?? 55}
          currentZoomDesktop={event.rsvp_background_zoom_desktop ?? 100}
          currentZoom={event.rsvp_background_zoom ?? 100}
          accentColor={currentTheme?.colors?.accent}
          eventTypeId={localType}
          onSaved={(url, pos, tint, zoom) => {
            setLocalBgMobile(url); setLocalBgPosition(pos); setLocalBgTint(tint)
            onLocalUpdate?.({ rsvp_background_image: url, rsvp_background_position: pos, rsvp_background_tint: tint, rsvp_background_zoom: zoom })
          }}
          onSavedDesktop={(url, pos, tint, zoom) => {
            setLocalBgDesktop(url)
            onLocalUpdate?.({ rsvp_background_image_desktop: url, rsvp_background_position_desktop: pos, rsvp_background_tint_desktop: tint, rsvp_background_zoom_desktop: zoom })
          }}
          onPreview={(fields) => onLocalUpdate?.(fields)}
        />
      </div>

      {/* Font + Color side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        <div className="bg-white rounded-2xl border border-[#E8E4DA] shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
            <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Title Font</p>
            <div className="flex items-center gap-1">
              {[{ v: 'left', Icon: AlignLeft }, { v: 'center', Icon: AlignCenter }, { v: 'right', Icon: AlignRight }].map(({ v, Icon }) => (
                <button key={v} onClick={() => { setLocalTitleAlign(v); saveField({ rsvp_title_align: v }) }}
                  aria-label={`Align title ${v}`} title={`Align ${v}`}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${localTitleAlign === v ? 'bg-[#1A1A18] text-white' : 'text-[#88887E] hover:bg-[#F4F3F0]'}`}>
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
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

    </div>
  )
}

// ── Shared preview screen renderer ───────────────────────────
function PreviewScreen({ step, event, bgImage, theme, fontCssFamily, isDesktop }) {
  const name  = event.rsvp_event_name
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
  // Photo framing: desktop uses its own saved values, falling back to the mobile ones
  const bgPos  = (isDesktop ? event.rsvp_background_position_desktop ?? event.rsvp_background_position : event.rsvp_background_position) || '50% 50%'
  const bgZoom = isDesktop ? event.rsvp_background_zoom_desktop ?? event.rsvp_background_zoom : event.rsvp_background_zoom
  const bgTint = (isDesktop ? event.rsvp_background_tint_desktop ?? event.rsvp_background_tint : event.rsvp_background_tint) ?? 55
  // continuous: paddingTop drives smooth vertical position, 0=top 100=bottom maps to 0%–70% of container
  // top % is measured against the screen height (padding % is measured against width, which pushed the title too high)
  const titleTopPct = `${(tPos / 100) * 45}%`

  if (step === 0) {
    // Mirrors the guest page: logo at top, title block, then location, deadline and RSVP button at the bottom
    const tz = event.rsvp_timezone || undefined
    const dateLong = event.rsvp_event_date
      ? new Date(event.rsvp_event_date).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz })
      : null
    const deadlineLong = event.rsvp_deadline
      ? new Date(event.rsvp_deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: tz })
      : null
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: bgImage ? 'transparent' : 'linear-gradient(135deg, #2C2C2A 0%, #1A1A18 100%)' }}>
        {bgImage && <img src={bgImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...bgPhotoStyle(bgPos, bgZoom) }} />}
        {bgImage && <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${(bgTint / 100).toFixed(2)})` }} />}
        <div style={{ position: 'absolute', top: '4%', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <VantgeLogo size="sm" monoWhite />
        </div>
        <div style={{ position: 'absolute', left: '6%', right: '6%', top: titleTopPct, textAlign: event.rsvp_title_align ?? 'left' }}>
          <p style={{ fontSize: 5, fontWeight: 900, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 3 }}>You're Invited</p>
          <p style={{ fontSize: isDesktop ? 11 : 13, fontWeight: 800, color: 'white', fontFamily: fontCssFamily || 'inherit', lineHeight: 1.15, marginBottom: 3 }}>{name}</p>
          {dateLong && (
            <p style={{ fontSize: 5.5, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
              <svg width="6" height="6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {dateLong}
            </p>
          )}
        </div>
        <div style={{ position: 'absolute', left: '6%', right: '6%', bottom: '4%', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {loc && (
            <div style={{ background: 'white', borderRadius: 6, border: `1px solid ${bdr}`, padding: '4px 7px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="7" height="7" fill="none" stroke="#C84A44" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <div>
                <p style={{ fontSize: 4, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: muted }}>Location</p>
                <p style={{ fontSize: 5.5, color: txt, fontWeight: 700 }}>{loc}</p>
              </div>
            </div>
          )}
          {deadlineLong && (
            <div style={{ background: 'white', borderRadius: 6, border: `1px solid ${bdr}`, padding: '4px 7px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="7" height="7" fill="none" stroke="#5A5A52" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <div>
                <p style={{ fontSize: 4, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: muted }}>RSVP Deadline</p>
                <p style={{ fontSize: 5.5, color: txt, fontWeight: 700 }}>{deadlineLong}</p>
              </div>
            </div>
          )}
          <div style={{ background: acc, borderRadius: 6, padding: '5px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 7, fontWeight: 800, color: 'white' }}>RSVP Now →</p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 1) return (
    <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'relative', flex: '0 0 30%' }}>
        {bgImage ? <img src={bgImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...bgPhotoStyle(bgPos, bgZoom) }} /> :<div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #2C2C2A 0%, #1A1A18 100%)' }} />}
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
  const [activeTab, setActiveTab] = useState('event')
  const saveRef = useRef(null)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved
  const [dirty, setDirty] = useState(false)
  const [liveName, setLiveName] = useState(null) // name as it is being typed, shown under RSVP Dashboard
  const [liveStatus, setLiveStatus] = useState(null) // status as it is being picked, shown next to the name
  const registerSave = (fn) => { saveRef.current = fn }
  async function handleTopSave() {
    setSaveState('saving')
    await saveRef.current?.()   // Food and Responses save as they go, so there is nothing to run
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }
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
      if (!isCustom(event.rsvp_background_image) || !isCustom(event.rsvp_background_image_desktop)) {
        const brandingKey = event.rsvp_event_type || 'none'
        const hardcodedFallback = getEventType(event.rsvp_event_type)?.defaultBg ?? null
        supabase.from('admin_branding').select('background_url').eq('event_type', brandingKey).maybeSingle().then(({ data }) => {
          const adminDefault = data?.background_url || hardcodedFallback
          if (!adminDefault) return
          const updates = {}
          if (!isCustom(event.rsvp_background_image)) updates.rsvp_background_image = adminDefault
          if (!isCustom(event.rsvp_background_image_desktop)) updates.rsvp_background_image_desktop = adminDefault
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
      <DashboardHeader active="rsvp" onSignOut={signOut} />

      {/* Body — two-column layout matching Gallery Dashboard */}
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 pb-20">

        {/* Page title + tabs — same row as the Event dashboard */}
        <div className="flex items-end justify-between mb-8 flex-wrap gap-6">
          <div>
            <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-1">RSVP Dashboard</p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-black text-[#1A1A18]">{liveName ?? ev.rsvp_event_name}</h1>
            </div>
          </div>
          <div className="flex gap-6 items-end">
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setActiveTab(t.id); setDirty(false) }}
                className={`relative pb-1 text-sm font-bold transition-colors whitespace-nowrap ${
                  activeTab === t.id ? 'text-[#1A1A18]' : 'text-[#B0AFA5] hover:text-[#5A5A52]'
                }`}>
                {t.label}
                {activeTab === t.id && <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#1A1A18] rounded-full" />}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-6 md:gap-8 items-start">

          {/* LEFT — preview + bg picker */}
          <div className="md:col-span-4 flex flex-col gap-6">

            {/* Live Preview card */}
            <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Live Preview</p>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${
                    (liveStatus ?? ev.rsvp_status) === 'published' ? 'bg-green-100 text-green-800' :
                    (liveStatus ?? ev.rsvp_status) === 'closed'    ? 'bg-red-100 text-red-800' :
                                                     'bg-yellow-100 text-yellow-800'
                  }`}>
                    {liveStatus ?? ev.rsvp_status ?? 'draft'}
                  </span>
              </div>
              <div className="flex items-center justify-center" style={{ height: 336 }}>
                {previewDevice === 'desktop' ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="rounded-lg overflow-hidden border-4 border-[#1A1A18] shadow-xl relative" style={{ width: 300, height: 188 }}>
                      <RSVPPreviewDesktop event={ev} bgImage={ev?.rsvp_background_image_desktop || ev?.rsvp_background_image}
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
                  <RSVPPreview event={ev} bgImage={ev?.rsvp_background_image}
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
              <TitlePositionControls event={ev} onLocalUpdate={mergeLocal} />
            </div>

            {/* QR code card */}
            {ev && (
              <div className="bg-white rounded-3xl border border-[#E8E4DA] p-5 shadow-sm flex flex-col items-center gap-4">
                <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] self-start">Scan to open</p>
                <div ref={qrRef} className="bg-[#F7F5F0] p-4 rounded-2xl">
                  <QRCodeSVG value={`https://vantge.app/${ev.event_slug}/rsvp`} size={136} level="M" fgColor="#1A1A18" bgColor="#F7F5F0" />
                </div>
                <div className="w-full flex items-center gap-2 bg-[#F7F5F0] border border-[#E8E4DA] rounded-xl px-3 py-2.5">
                  <span className="flex-1 text-[10px] text-[#6B6B63] truncate font-mono">
                    https://vantge.app/{ev.event_slug}/rsvp
                  </span>
                  <button onClick={() => { navigator.clipboard.writeText(`https://vantge.app/${ev.event_slug}/rsvp`); setQrCopied(true); setTimeout(() => setQrCopied(false), 2000) }}
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
                    { label: 'Allow downloads',  sub: 'Guests can save photos',                      value: allowDownloads,  toggle: toggleAllowDownloads },
                    { label: 'Allow sharing',    sub: 'Guests can share photos',                     value: allowSharing,    toggle: toggleAllowSharing },
                    { label: 'Check photos first', sub: 'You check each photo before guests see it',    value: requireApproval, toggle: toggleRequireApproval },
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
                  <p className="text-sm font-semibold text-[#1A1A18] mb-0.5">Photo limit per guest</p>
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
                  <p className="text-sm font-semibold text-[#1A1A18] mb-0.5">Passcode</p>
                  <p className="text-[11px] text-[#88887E] mb-3">Guests type this to open the event</p>
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
          <div className="md:col-span-8 space-y-6">

            {/* Tab content */}
            {activeTab === 'event'       && <SetupTab       event={ev} onSaved={mergeLocal} registerSave={registerSave} onDirty={setDirty} onNameInput={setLiveName} onStatusInput={setLiveStatus} />}
            {activeTab === 'design'      && <DesignTab      event={ev} design={design} onChange={setDesign} onSaved={() => mergeLocal({ rsvp_theme: design.themeId, rsvp_font: design.fontId })} onLocalUpdate={mergeLocal} registerSave={registerSave} onDirty={setDirty} onNameInput={setLiveName} />}
            {activeTab === 'responses'   && <ResponsesTab   event={ev} />}
            {activeTab === 'food'        && <FoodTab        event={ev} />}

          </div>

        </div>
      </div>
    {/* Bottom save bar — appears only when the Event or Design tab has changes not saved yet */}
    {(activeTab === 'event' || activeTab === 'design') && dirty && (
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white/95 backdrop-blur border-t border-[#E0D8C6] shadow-lg">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-2 flex items-center justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#88887E]">Unsaved changes</p>
          <button onClick={handleTopSave} disabled={saveState === 'saving'}
            className="text-[10px] font-bold uppercase tracking-widest rounded-full px-4 py-1.5 bg-[#1A1A18] text-white hover:bg-black transition-all disabled:opacity-50">
            {saveState === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )}
    </div>
  )
}

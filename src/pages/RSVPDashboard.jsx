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
import { EVENT_TYPES } from '../lib/eventTypes'
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
function FieldRow({ label, children }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#88887E] uppercase tracking-widest mb-1.5">{label}</p>
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
  { id: 'setup',       label: 'Event Setup' },
  { id: 'design',      label: 'Design' },
  { id: 'invitations', label: 'Invitations' },
  { id: 'responses',   label: 'Responses' },
  { id: 'food',        label: 'Food Sign-up' },
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
        <FieldRow label="Description (optional)">
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

// ── Invitations Tab ───────────────────────────────────────────
function InvitationsTab({ event }) {
  const guestUrl = `${window.location.origin}/${event.event_slug}/rsvp`
  const [copied, setCopied]     = useState(false)
  const [textCopied, setTextCopied] = useState(false)
  const qrRef = useRef(null)

  function copy(text, setter) {
    navigator.clipboard.writeText(text).then(() => { setter(true); setTimeout(() => setter(false), 2000) })
  }

  const inviteText = [
    `You're invited to ${event.event_name}!`,
    event.rsvp_host_display_name ? `Hosted by ${event.rsvp_host_display_name}` : null,
    event.rsvp_event_date ? `📅 ${new Date(event.rsvp_event_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}` : null,
    event.rsvp_location ? `📍 ${event.rsvp_location}` : null,
    event.rsvp_deadline ? `RSVP by ${new Date(event.rsvp_deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}` : null,
    '',
    `RSVP here: ${guestUrl}`,
  ].filter(l => l !== null).join('\n')

  const mailtoHref = `mailto:?subject=${encodeURIComponent(`You're invited: ${event.event_name}`)}&body=${encodeURIComponent(inviteText)}`

  async function nativeShare() {
    if (!navigator.share) return
    try { await navigator.share({ title: `You're invited: ${event.event_name}`, text: inviteText, url: guestUrl }) }
    catch {}
  }

  function downloadQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `rsvp-qr-${event.event_slug}.svg`; a.click()
    URL.revokeObjectURL(url)
  }

  const isPublished = event.rsvp_status === 'published'

  return (
    <div className="space-y-4">

      {!isPublished && (
        <div className="rounded-2xl bg-[#FEF9EC] border border-[#F5D97A] px-5 py-4 flex items-start gap-3">
          <svg width="16" height="16" fill="none" stroke="#B29746" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="text-sm text-[#8B7224]">
            Your invitation is in <strong>Draft</strong> mode. Go to <strong>Event Setup</strong> and set the status to <strong>Published</strong> before sharing.
          </p>
        </div>
      )}

      {/* Guest link */}
      <Card className="p-5">
        <SectionLabel>Guest RSVP Link</SectionLabel>
        <div className="mt-3 flex items-center gap-2 bg-[#F8F5ED] rounded-xl px-4 py-3">
          <p className="flex-1 text-xs text-[#5A5A52] truncate font-mono">{guestUrl}</p>
          <button onClick={() => copy(guestUrl, setCopied)} className="text-xs font-bold text-[#1A1A18] shrink-0 hover:text-black transition-colors">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </Card>

      {/* QR code — standalone, dedicated */}
      <Card className="p-5">
        <SectionLabel>RSVP QR Code</SectionLabel>
        <p className="text-xs text-[#88887E] mt-1 mb-4">Guests scan this to open the RSVP page directly. Print it, add it to an invite, or display it at the door.</p>
        <div className="flex flex-col items-center gap-4">
          <div ref={qrRef} className="bg-white p-4 rounded-2xl border border-[#E0D8C6] inline-block">
            <QRCodeSVG value={guestUrl} size={180} includeMargin={false} />
          </div>
          <div className="flex gap-2">
            <button onClick={downloadQR}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#1A1A18] rounded-full px-4 py-2 hover:bg-black transition-colors">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download QR
            </button>
            <button onClick={() => copy(guestUrl, setCopied)}
              className="text-xs font-bold text-[#1A1A18] border border-[#E0D8C6] rounded-full px-4 py-2 hover:bg-[#F4F3F0] transition-colors">
              Copy link
            </button>
          </div>
          <p className="text-[10px] text-[#B0AFA5] text-center">Links to: {guestUrl}</p>
        </div>
      </Card>

      {/* Share options */}
      <Card className="p-5">
        <SectionLabel>Share Invitation</SectionLabel>
        <div className="mt-3 space-y-2">

          <a href={mailtoHref}
            className="flex items-center gap-3 w-full rounded-xl border border-[#E0D8C6] px-4 py-3 text-sm font-bold text-[#1A1A18] hover:bg-[#F4F3F0] transition-colors">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            Open email draft
            <span className="ml-auto text-[10px] text-[#88887E] font-bold uppercase tracking-widest">via your email app</span>
          </a>

          {typeof navigator !== 'undefined' && navigator.share && (
            <button onClick={nativeShare}
              className="flex items-center gap-3 w-full rounded-xl border border-[#E0D8C6] px-4 py-3 text-sm font-bold text-[#1A1A18] hover:bg-[#F4F3F0] transition-colors">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share invitation
            </button>
          )}

          <button onClick={() => copy(inviteText, setTextCopied)}
            className="flex items-center gap-3 w-full rounded-xl border border-[#E0D8C6] px-4 py-3 text-sm font-bold text-[#1A1A18] hover:bg-[#F4F3F0] transition-colors">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            {textCopied ? '✓ Copied!' : 'Copy invitation text'}
            <span className="ml-auto text-[10px] text-[#88887E] font-bold uppercase tracking-widest">for texting</span>
          </button>
        </div>
        <p className="text-[10px] text-[#B0AFA5] mt-3 leading-relaxed">
          You review and send through your own apps. No messages are sent automatically by Vantge.
        </p>
      </Card>
    </div>
  )
}

// ── Responses Tab ─────────────────────────────────────────────
function ResponsesTab({ event }) {
  const [responses, setResponses] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('rsvp_responses').select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })
    setResponses(data || [])
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

  if (loading) return <div className="py-10 text-center text-sm text-[#88887E]">Loading…</div>

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Going',       count: going.length,    sub: `${totalAttendees} attending`, color: '#1A1A18' },
          { label: 'Maybe',       count: maybe.length,    sub: 'responses',                   color: '#B29746' },
          { label: "Can't attend", count: notGoing.length, sub: 'responses',                  color: '#C84A44' },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl font-black leading-tight" style={{ color: s.color }}>{s.count}</p>
            <p className="text-xs font-bold text-[#1A1A18] mt-0.5">{s.label}</p>
            <p className="text-[10px] text-[#88887E]">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* List */}
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
                      r.response === 'going'    ? 'bg-green-100 text-green-800'  :
                      r.response === 'maybe'    ? 'bg-yellow-100 text-yellow-800' :
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
  const [localTitlePos,   setLocalTitlePos]   = useState(event.title_position ?? 50)
  const [localTitlePosD,  setLocalTitlePosD]  = useState(event.title_position_desktop ?? 50)
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
                onChange={async (e) => { const val = e.target.value; setLocalTitlePos(val); await saveField({ title_position: val }) }}
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
                onChange={async (e) => { const val = e.target.value; setLocalTitlePosD(val); await saveField({ title_position_desktop: val }) }}
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

// ── RSVP Desktop Preview (16:9 browser mockup) ───────────────
function RSVPPreviewDesktop({ event, bgImage, theme, fontCssFamily, bodyTint }) {
  const name  = event.rsvp_host_display_name || event.event_name
  const date  = event.rsvp_event_date
    ? new Date(event.rsvp_event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const loc   = event.rsvp_location
  const bg    = theme?.colors?.bg     || '#F8F5ED'
  const acc   = theme?.colors?.accent || '#1A1A18'
  const bdr   = theme?.colors?.border || '#E0D8C6'
  const muted = theme?.colors?.textSubtle || '#88887E'
  const bodyBg = bodyTint || bg

  return (
    <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Hero — full width, ~60% height */}
      <div style={{ position: 'relative', flex: '0 0 60%' }}>
        {bgImage
          ? <img src={bgImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #2C2C2A 0%, #1A1A18 100%)' }} />
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10, textAlign: 'center' }}>
          <p style={{ fontSize: 5, fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 2 }}>You're Invited</p>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'white', fontFamily: fontCssFamily || 'inherit', lineHeight: 1.2 }}>{name}</p>
          {date && <p style={{ fontSize: 5, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{date}</p>}
        </div>
      </div>
      {/* Body — centered 50% column, buttons at bottom */}
      <div style={{ flex: 1, background: bodyBg, display: 'flex', justifyContent: 'center', padding: '6px 0 8px' }}>
        <div style={{ width: '55%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Map row */}
          {loc && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, paddingTop: 3 }}>
              <svg width="7" height="7" fill="none" stroke={acc} strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <p style={{ fontSize: 5, color: muted, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 80 }}>{loc}</p>
            </div>
          )}
          {/* RSVP buttons at bottom */}
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {["I'm Going ✓", 'Maybe', "Can't Attend"].map((label, i) => (
                <div key={label} style={{ background: i === 0 ? acc : 'white', border: `1px solid ${bdr}`, borderRadius: 3, padding: '2.5px 5px', textAlign: 'center' }}>
                  <p style={{ fontSize: 5, fontWeight: 700, color: i === 0 ? 'white' : muted }}>{label}</p>
                </div>
              ))}
            </div>
            {(event.rsvp_mode === 'rsvp_and_food' || event.rsvp_mode === 'food_only') && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <p style={{ fontSize: 4, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: muted }}>{event.food_heading || 'Food Sign-up'}</p>
                {['Main dish', 'Side dish', 'Dessert'].map(item => (
                  <div key={item} style={{ background: 'white', border: `1px solid ${bdr}`, borderRadius: 3, padding: '2.5px 5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 4, color: muted }}>{item}</p>
                    <div style={{ background: acc, borderRadius: 2, padding: '1px 3px' }}>
                      <p style={{ fontSize: 3.5, color: 'white', fontWeight: 700 }}>Claim</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── RSVP Live Preview (phone mockup) ─────────────────────────
function RSVPPreview({ event, bgImage, theme, fontCssFamily, bodyTint }) {
  const name  = event.rsvp_host_display_name || event.event_name
  const date  = event.rsvp_event_date
    ? new Date(event.rsvp_event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const loc   = event.rsvp_location
  const bg    = theme?.colors?.bg    || '#F8F5ED'
  const acc   = theme?.colors?.accent || '#1A1A18'
  const txt   = theme?.colors?.text   || '#1A1A18'
  const bdr   = theme?.colors?.border || '#E0D8C6'
  const muted = theme?.colors?.textSubtle || '#88887E'
  const bodyBg = bodyTint || bg

  return (
    <div className="relative mx-auto"
      style={{ width: 160, height: 320, background: '#111', borderRadius: 22, boxShadow: '0 0 0 3px #333, 0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Hero — big photo area ~60% */}
      <div style={{ position: 'relative', flex: '0 0 58%' }}>
        {bgImage ? (
          <img src={bgImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #2C2C2A 0%, #1A1A18 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.65) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10, paddingLeft: 8, paddingRight: 8, textAlign: 'center' }}>
          <p style={{ fontSize: 6, fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 2 }}>You're Invited</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'white', lineHeight: 1.2, fontFamily: fontCssFamily || 'inherit' }}>{name}</p>
          {date && <p style={{ fontSize: 6, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{date}</p>}
        </div>
      </div>

      {/* Body — location + RSVP buttons */}
      <div style={{ flex: 1, background: bodyBg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '8px 10px 12px' }}>
        {/* Map pin row */}
        {loc ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="9" height="9" fill="none" stroke={acc} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <p style={{ fontSize: 7, color: muted, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 120 }}>{loc}</p>
          </div>
        ) : <div />}

        {/* RSVP buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ background: acc, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 7, fontWeight: 800, color: 'white', letterSpacing: '0.08em', textTransform: 'uppercase' }}>I'm Going ✓</p>
          </div>
          {event.rsvp_allow_maybe !== false && (
            <div style={{ background: 'white', border: `1px solid ${bdr}`, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 7, fontWeight: 700, color: muted }}>Maybe</p>
            </div>
          )}
          <div style={{ background: 'white', border: `1px solid ${bdr}`, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 7, fontWeight: 700, color: txt }}>Can't Attend</p>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', width: 40, height: 3, background: 'rgba(255,255,255,0.25)', borderRadius: 2 }} />
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
                        bodyTint={ev?.rsvp_body_tint || ''} />
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
                    bodyTint={ev?.rsvp_body_tint || ''} />
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
            {activeTab === 'invitations' && <InvitationsTab event={ev} />}
            {activeTab === 'responses'   && <ResponsesTab   event={ev} />}
            {activeTab === 'food'        && <FoodTab        event={ev} />}
          </div>

        </div>
      </div>
    </div>
  )
}

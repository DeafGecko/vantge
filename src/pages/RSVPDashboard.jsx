// src/pages/RSVPDashboard.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../hooks/useAuth'
import { useHostEvent } from '../hooks/useHostEvent'
import { supabase } from '../lib/supabase'
import VantgeLogo from '../components/VantgeLogo'
import FontLoader from '../components/FontLoader'

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
  { id: 'invitations', label: 'Invitations' },
  { id: 'responses',   label: 'Responses' },
  { id: 'food',        label: 'Food Sign-up' },
]

// ── Setup Tab ─────────────────────────────────────────────────
function SetupTab({ event, onSaved }) {
  const [form, setForm] = useState({
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
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

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
          <TextInput value={form.rsvp_host_display_name} onChange={set('rsvp_host_display_name')} placeholder="The Rogers Family" />
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
        <FieldRow label="Event date & start time">
          <input type="datetime-local" value={form.rsvp_event_date} onChange={e => set('rsvp_event_date')(e.target.value)}
            className="w-full rounded-xl border border-[#E0D8C6] px-4 py-2.5 text-sm text-[#1A1A18] focus:outline-none focus:border-[#C9BFA8]" />
        </FieldRow>
        <FieldRow label="End time (optional)">
          <input type="datetime-local" value={form.rsvp_end_time} onChange={e => set('rsvp_end_time')(e.target.value)}
            className="w-full rounded-xl border border-[#E0D8C6] px-4 py-2.5 text-sm text-[#1A1A18] focus:outline-none focus:border-[#C9BFA8]" />
        </FieldRow>
        <FieldRow label="Timezone">
          <Sel value={form.rsvp_timezone} onChange={set('rsvp_timezone')} options={timezones} />
        </FieldRow>
        <FieldRow label="RSVP deadline (optional)">
          <input type="datetime-local" value={form.rsvp_deadline} onChange={e => set('rsvp_deadline')(e.target.value)}
            className="w-full rounded-xl border border-[#E0D8C6] px-4 py-2.5 text-sm text-[#1A1A18] focus:outline-none focus:border-[#C9BFA8]" />
        </FieldRow>
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

// ── Main RSVPDashboard page ───────────────────────────────────
export default function RSVPDashboard() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { event, loading: eventLoading } = useHostEvent()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('setup')
  const [localEvent, setLocalEvent] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [authLoading, user, navigate])

  const ev = localEvent || event

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
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
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
              Preview page ↗
            </a>
            <button onClick={signOut} className="text-xs text-white/40 hover:text-white/70 transition-colors">Sign out</button>
          </div>
        </div>
      </header>

      {/* Page header */}
      <div className="max-w-4xl mx-auto px-5 pt-7 pb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-1">RSVP Dashboard</p>
            <h1 className="text-xl font-black text-[#1A1A18]">{ev.event_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${
              ev.rsvp_status === 'published' ? 'bg-green-100 text-green-800' :
              ev.rsvp_status === 'closed'    ? 'bg-red-100 text-red-800' :
                                               'bg-[#F4F3F0] text-[#88887E]'
            }`}>
              {ev.rsvp_status || 'draft'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="max-w-4xl mx-auto px-5">
        <div className="flex border-b border-[#E0D8C6] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
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
      </div>

      {/* Tab content */}
      <div className="max-w-4xl mx-auto px-5 py-5 pb-16">
        {activeTab === 'setup'       && <SetupTab       event={ev} onSaved={u => setLocalEvent(e => ({ ...e, ...u }))} />}
        {activeTab === 'invitations' && <InvitationsTab event={ev} />}
        {activeTab === 'responses'   && <ResponsesTab   event={ev} />}
        {activeTab === 'food'        && <FoodTab        event={ev} />}
      </div>
    </div>
  )
}

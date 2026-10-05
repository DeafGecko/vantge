// src/components/RSVPManager.jsx
// Host dashboard sections: RSVP setup, responses, food items, invitations
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { QRCodeSVG } from 'qrcode.react'

// ── Small helpers ─────────────────────────────────────────────
function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl border border-[#E0D8C6] shadow-sm ${className}`}>{children}</div>
}
function SectionLabel({ children }) {
  return <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-0.5">{children}</p>
}
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      {label && <span className="text-sm font-semibold text-[#1A1A18]">{label}</span>}
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-[#1A1A18]' : 'bg-[#D4CFBC]'}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-5' : 'left-1'}`} />
      </button>
    </label>
  )
}
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#88887E] uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  )
}
function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#E0D8C6] px-4 py-2.5 text-sm text-[#1A1A18] placeholder-[#B0AFA5] focus:outline-none focus:border-[#C9BFA8]"
    />
  )
}
function Select({ value, onChange, options }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-xl border border-[#E0D8C6] px-4 py-2.5 text-sm text-[#1A1A18] bg-white focus:outline-none focus:border-[#C9BFA8]"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ── RSVP Setup ────────────────────────────────────────────────
export function RSVPSetup({ event, onSave }) {
  const [form, setForm] = useState({
    rsvp_enabled: event.rsvp_enabled ?? false,
    rsvp_mode: event.rsvp_mode ?? 'rsvp_only',
    rsvp_status: event.rsvp_status ?? 'draft',
    rsvp_host_display_name: event.rsvp_host_display_name ?? '',
    rsvp_description: event.rsvp_description ?? '',
    rsvp_location: event.rsvp_location ?? '',
    rsvp_event_date: event.rsvp_event_date ? event.rsvp_event_date.slice(0, 16) : '',
    rsvp_end_time: event.rsvp_end_time ? event.rsvp_end_time.slice(0, 16) : '',
    rsvp_timezone: event.rsvp_timezone ?? 'America/New_York',
    rsvp_deadline: event.rsvp_deadline ? event.rsvp_deadline.slice(0, 16) : '',
    rsvp_attendance_limit: event.rsvp_attendance_limit ?? '',
    rsvp_collect_email: event.rsvp_collect_email ?? false,
    rsvp_allow_maybe: event.rsvp_allow_maybe ?? true,
    rsvp_headcount_mode: event.rsvp_headcount_mode ?? 'headcount',
    food_enabled: event.food_enabled ?? false,
    food_heading: event.food_heading ?? 'Food Sign-up',
    food_allow_suggestions: event.food_allow_suggestions ?? true,
    food_show_contributors: event.food_show_contributors ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function set(k) { return v => setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setSaving(true)
    const update = { ...form }
    if (!update.rsvp_event_date) update.rsvp_event_date = null
    else update.rsvp_event_date = new Date(update.rsvp_event_date).toISOString()
    if (!update.rsvp_end_time) update.rsvp_end_time = null
    else update.rsvp_end_time = new Date(update.rsvp_end_time).toISOString()
    if (!update.rsvp_deadline) update.rsvp_deadline = null
    else update.rsvp_deadline = new Date(update.rsvp_deadline).toISOString()
    if (!update.rsvp_attendance_limit) update.rsvp_attendance_limit = null
    else update.rsvp_attendance_limit = parseInt(update.rsvp_attendance_limit)

    const { error } = await supabase.from('events').update(update).eq('id', event.id)
    setSaving(false)
    if (!error) { setSaved(true); onSave?.(update); setTimeout(() => setSaved(false), 2000) }
  }

  const timezones = [
    { value: 'America/New_York', label: 'Eastern (ET)' },
    { value: 'America/Chicago', label: 'Central (CT)' },
    { value: 'America/Denver', label: 'Mountain (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
    { value: 'America/Anchorage', label: 'Alaska (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
    { value: 'UTC', label: 'UTC' },
  ]

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionLabel>Invitation</SectionLabel>
        <div className="space-y-4 mt-3">
          <Toggle label="Enable RSVP / Invitation" checked={form.rsvp_enabled} onChange={set('rsvp_enabled')} />

          {form.rsvp_enabled && (
            <>
              <Field label="Mode">
                <Select value={form.rsvp_mode} onChange={set('rsvp_mode')} options={[
                  { value: 'rsvp_only', label: 'RSVP only' },
                  { value: 'food_only', label: 'Food sign-up only' },
                  { value: 'rsvp_and_food', label: 'RSVP + Food sign-up' },
                ]} />
              </Field>

              <Field label="Status">
                <Select value={form.rsvp_status} onChange={set('rsvp_status')} options={[
                  { value: 'draft', label: 'Draft (not visible)' },
                  { value: 'published', label: 'Published (accepting RSVPs)' },
                  { value: 'closed', label: 'Closed (no new RSVPs)' },
                ]} />
              </Field>

              <Field label="Host display name">
                <TextInput value={form.rsvp_host_display_name} onChange={set('rsvp_host_display_name')} placeholder="The Rogers Family" />
              </Field>

              <Field label="Description (optional)">
                <textarea
                  value={form.rsvp_description ?? ''}
                  onChange={e => set('rsvp_description')(e.target.value)}
                  placeholder="A short note for your guests…"
                  rows={2}
                  className="w-full rounded-xl border border-[#E0D8C6] px-4 py-2.5 text-sm text-[#1A1A18] placeholder-[#B0AFA5] focus:outline-none focus:border-[#C9BFA8] resize-none"
                />
              </Field>

              <Field label="Location">
                <TextInput value={form.rsvp_location} onChange={set('rsvp_location')} placeholder="Spring Hill, Tennessee" />
              </Field>
            </>
          )}
        </div>
      </Card>

      {form.rsvp_enabled && (
        <Card className="p-5">
          <SectionLabel>Date & Time</SectionLabel>
          <div className="space-y-4 mt-3">
            <Field label="Event date & start time">
              <input type="datetime-local" value={form.rsvp_event_date}
                onChange={e => set('rsvp_event_date')(e.target.value)}
                className="w-full rounded-xl border border-[#E0D8C6] px-4 py-2.5 text-sm text-[#1A1A18] focus:outline-none focus:border-[#C9BFA8]"
              />
            </Field>
            <Field label="End time (optional)">
              <input type="datetime-local" value={form.rsvp_end_time}
                onChange={e => set('rsvp_end_time')(e.target.value)}
                className="w-full rounded-xl border border-[#E0D8C6] px-4 py-2.5 text-sm text-[#1A1A18] focus:outline-none focus:border-[#C9BFA8]"
              />
            </Field>
            <Field label="Timezone">
              <Select value={form.rsvp_timezone} onChange={set('rsvp_timezone')} options={timezones} />
            </Field>
            <Field label="RSVP deadline (optional)">
              <input type="datetime-local" value={form.rsvp_deadline}
                onChange={e => set('rsvp_deadline')(e.target.value)}
                className="w-full rounded-xl border border-[#E0D8C6] px-4 py-2.5 text-sm text-[#1A1A18] focus:outline-none focus:border-[#C9BFA8]"
              />
            </Field>
          </div>
        </Card>
      )}

      {form.rsvp_enabled && (
        <Card className="p-5">
          <SectionLabel>RSVP Options</SectionLabel>
          <div className="space-y-4 mt-3">
            <Field label="Attendance limit (optional)">
              <TextInput type="number" value={form.rsvp_attendance_limit} onChange={set('rsvp_attendance_limit')} placeholder="e.g. 50" />
            </Field>
            <Field label="Guest headcount">
              <Select value={form.rsvp_headcount_mode} onChange={set('rsvp_headcount_mode')} options={[
                { value: 'headcount', label: 'Number only' },
                { value: 'names', label: 'Guest names only' },
                { value: 'both', label: 'Number + guest names' },
              ]} />
            </Field>
            <div className="space-y-3 pt-1">
              <Toggle label="Collect email address" checked={form.rsvp_collect_email} onChange={set('rsvp_collect_email')} />
              <Toggle label="Allow Maybe response" checked={form.rsvp_allow_maybe} onChange={set('rsvp_allow_maybe')} />
            </div>
          </div>
        </Card>
      )}

      {form.rsvp_enabled && (form.rsvp_mode === 'food_only' || form.rsvp_mode === 'rsvp_and_food') && (
        <Card className="p-5">
          <SectionLabel>Food Sign-up</SectionLabel>
          <div className="space-y-4 mt-3">
            <Toggle label="Enable food sign-up" checked={form.food_enabled} onChange={set('food_enabled')} />
            {form.food_enabled && (
              <>
                <Field label="Section heading">
                  <TextInput value={form.food_heading} onChange={set('food_heading')} placeholder="Food Sign-up" />
                </Field>
                <div className="space-y-3">
                  <Toggle label="Allow guests to suggest items" checked={form.food_allow_suggestions} onChange={set('food_allow_suggestions')} />
                  <Toggle label="Show contributor names" checked={form.food_show_contributors} onChange={set('food_show_contributors')} />
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-[#1A1A18] text-white text-[11px] font-bold uppercase tracking-widest rounded-full py-3.5 hover:bg-black transition-all disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save settings'}
      </button>
    </div>
  )
}

// ── Food Items Manager ────────────────────────────────────────
export function FoodItemsManager({ event }) {
  const [items, setItems] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', category: '', notes: '', spots_total: '', unit: 'serving' })
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    const [{ data: i }, { data: c }] = await Promise.all([
      supabase.from('food_items').select('*').eq('event_id', event.id).order('sort_order').order('created_at'),
      supabase.from('food_claims').select('*').eq('event_id', event.id),
    ])
    setItems(i || [])
    setClaims(c || [])
    setLoading(false)
  }, [event.id])

  useEffect(() => { fetch() }, [fetch])

  async function addItem() {
    if (!newItem.name.trim()) return
    setSaving(true)
    await supabase.from('food_items').insert({
      event_id: event.id,
      name: newItem.name.trim(),
      category: newItem.category.trim() || null,
      notes: newItem.notes.trim() || null,
      spots_total: newItem.spots_total ? parseInt(newItem.spots_total) : null,
      unit: newItem.unit || 'serving',
      sort_order: items.length,
    })
    setNewItem({ name: '', category: '', notes: '', spots_total: '', unit: 'serving' })
    setAdding(false)
    setSaving(false)
    fetch()
  }

  async function deleteItem(id) {
    if (!window.confirm('Remove this item? Any existing claims will also be deleted.')) return
    await supabase.from('food_items').delete().eq('id', id)
    fetch()
  }

  function claimsFor(itemId) {
    return claims.filter(c => c.food_item_id === itemId)
  }

  if (loading) return <div className="py-6 text-sm text-[#88887E]">Loading…</div>

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <SectionLabel>Food Items</SectionLabel>
        </div>
        {items.length === 0 && (
          <p className="px-5 pb-4 text-sm text-[#88887E]">No items yet. Add items for guests to claim.</p>
        )}
        <div className="divide-y divide-[#F4F3F0]">
          {items.map(item => {
            const itemClaims = claimsFor(item.id)
            const claimed = itemClaims.reduce((s, c) => s + c.quantity, 0)
            return (
              <div key={item.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1A1A18]">{item.name}</p>
                  {item.category && <p className="text-xs text-[#88887E]">{item.category}</p>}
                  {item.notes && <p className="text-xs text-[#88887E] italic">{item.notes}</p>}
                  <p className="text-xs text-[#88887E] mt-0.5">
                    {item.spots_total ? `${claimed} / ${item.spots_total} claimed` : `${claimed} claimed`}
                    {item.is_suggestion && <span className="ml-2 text-[#B29746] font-bold">Guest suggestion</span>}
                  </p>
                </div>
                <button onClick={() => deleteItem(item.id)} className="text-[#C84A44] hover:text-red-700 text-xs font-bold shrink-0">Remove</button>
              </div>
            )
          })}
        </div>

        {adding ? (
          <div className="px-5 pb-5 pt-3 border-t border-[#F4F3F0] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Item name">
                  <TextInput value={newItem.name} onChange={v => setNewItem(f => ({ ...f, name: v }))} placeholder="Main dish" />
                </Field>
              </div>
              <Field label="Category">
                <TextInput value={newItem.category} onChange={v => setNewItem(f => ({ ...f, category: v }))} placeholder="Side dish" />
              </Field>
              <Field label="Spots (blank = unlimited)">
                <TextInput type="number" value={newItem.spots_total} onChange={v => setNewItem(f => ({ ...f, spots_total: v }))} placeholder="e.g. 2" />
              </Field>
              <div className="col-span-2">
                <Field label="Notes">
                  <TextInput value={newItem.notes} onChange={v => setNewItem(f => ({ ...f, notes: v }))} placeholder="Dietary notes…" />
                </Field>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addItem} disabled={saving || !newItem.name.trim()} className="flex-1 bg-[#1A1A18] text-white text-xs font-bold uppercase tracking-widest rounded-full py-2.5 disabled:opacity-50">
                {saving ? 'Adding…' : 'Add item'}
              </button>
              <button onClick={() => setAdding(false)} className="px-4 text-xs font-bold text-[#88887E]">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-4 pt-2 border-t border-[#F4F3F0]">
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A18] hover:text-black">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add item
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}

// ── RSVP Responses ────────────────────────────────────────────
export function RSVPResponses({ event }) {
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('rsvp_responses')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })
    setResponses(data || [])
    setLoading(false)
  }, [event.id])

  useEffect(() => { fetch() }, [fetch])

  async function deleteResponse(id) {
    if (!window.confirm('Remove this RSVP?')) return
    await supabase.from('rsvp_responses').delete().eq('id', id)
    setResponses(r => r.filter(x => x.id !== id))
  }

  function exportCSV() {
    const rows = [['Name', 'Response', 'Party Size', 'Guest Names', 'Note', 'Submitted']]
    responses.forEach(r => {
      rows.push([r.guest_name, r.response, r.party_size, r.guest_names || '', r.note || '', new Date(r.created_at).toLocaleDateString()])
    })
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `rsvp-${event.event_slug}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const going = responses.filter(r => r.response === 'going')
  const maybe = responses.filter(r => r.response === 'maybe')
  const notGoing = responses.filter(r => r.response === 'not_going')
  const totalAttendees = going.reduce((s, r) => s + r.party_size, 0)

  const filtered = filter === 'all' ? responses : responses.filter(r => r.response === filter)

  if (loading) return <div className="py-6 text-sm text-[#88887E]">Loading…</div>

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Going', count: going.length, sub: `${totalAttendees} total`, color: '#1A1A18' },
          { label: 'Maybe', count: maybe.length, sub: 'responses', color: '#B29746' },
          { label: "Can't attend", count: notGoing.length, sub: 'responses', color: '#C84A44' },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.count}</p>
            <p className="text-xs font-bold text-[#1A1A18]">{s.label}</p>
            <p className="text-[10px] text-[#88887E]">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Filter + export */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-wrap gap-2">
          <SectionLabel>Responses ({responses.length})</SectionLabel>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="text-xs font-bold border border-[#E0D8C6] rounded-full px-3 py-1.5 text-[#1A1A18] bg-white focus:outline-none"
            >
              <option value="all">All</option>
              <option value="going">Going</option>
              <option value="maybe">Maybe</option>
              <option value="not_going">Can't attend</option>
            </select>
            {responses.length > 0 && (
              <button onClick={exportCSV} className="text-xs font-bold text-[#1A1A18] border border-[#E0D8C6] rounded-full px-3 py-1.5 hover:bg-[#F4F3F0] transition-colors">
                Export CSV
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-[#88887E]">No responses yet.</p>
        ) : (
          <div className="divide-y divide-[#F4F3F0]">
            {filtered.map(r => (
              <div key={r.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-[#1A1A18]">{r.guest_name}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      r.response === 'going' ? 'bg-green-100 text-green-800' :
                      r.response === 'maybe' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {r.response === 'going' ? 'Going' : r.response === 'maybe' ? 'Maybe' : "Can't attend"}
                    </span>
                    {r.party_size > 1 && <span className="text-xs text-[#88887E]">+{r.party_size - 1} guest{r.party_size > 2 ? 's' : ''}</span>}
                  </div>
                  {r.guest_names && <p className="text-xs text-[#88887E] mt-0.5">{r.guest_names}</p>}
                  {r.note && <p className="text-xs text-[#5A5A52] mt-0.5 italic">"{r.note}"</p>}
                  <p className="text-[10px] text-[#B0AFA5] mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => deleteResponse(r.id)} className="text-[#C84A44] hover:text-red-700 text-xs font-bold shrink-0">Remove</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ── Invitations / Sharing ─────────────────────────────────────
export function InvitationsPanel({ event }) {
  const guestUrl = `${window.location.origin}/${event.event_slug}/rsvp`
  const [copied, setCopied] = useState(false)
  const [textCopied, setTextCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  function copy(text, setter) {
    navigator.clipboard.writeText(text).then(() => { setter(true); setTimeout(() => setter(false), 2000) })
  }

  const inviteText = `You're invited to ${event.event_name}!${event.rsvp_host_display_name ? `\nHosted by ${event.rsvp_host_display_name}` : ''}${event.rsvp_event_date ? `\n📅 ${new Date(event.rsvp_event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}${event.rsvp_location ? `\n📍 ${event.rsvp_location}` : ''}${event.rsvp_deadline ? `\nRSVP by ${new Date(event.rsvp_deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}` : ''}\n\nRSVP here: ${guestUrl}`

  const mailtoHref = `mailto:?subject=You're invited: ${encodeURIComponent(event.event_name)}&body=${encodeURIComponent(inviteText)}`

  async function nativeShare() {
    if (!navigator.share) return
    await navigator.share({ title: `You're invited: ${event.event_name}`, text: inviteText, url: guestUrl })
  }

  return (
    <div className="space-y-3">
      <Card className="p-5">
        <SectionLabel>Guest Link</SectionLabel>
        <div className="mt-3 flex items-center gap-2 bg-[#F8F5ED] rounded-xl px-4 py-3">
          <p className="flex-1 text-xs text-[#5A5A52] truncate font-mono">{guestUrl}</p>
          <button
            onClick={() => copy(guestUrl, setCopied)}
            className="text-xs font-bold text-[#1A1A18] shrink-0 hover:text-black"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionLabel>Share Invitation</SectionLabel>
        <div className="mt-3 space-y-2">
          {/* Open email draft */}
          <a
            href={mailtoHref}
            className="flex items-center gap-3 w-full rounded-xl border border-[#E0D8C6] px-4 py-3 text-sm font-bold text-[#1A1A18] hover:bg-[#F4F3F0] transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Open email draft
            <span className="ml-auto text-[10px] font-bold text-[#88887E] uppercase tracking-widest">via your email app</span>
          </a>

          {/* Native share */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              onClick={nativeShare}
              className="flex items-center gap-3 w-full rounded-xl border border-[#E0D8C6] px-4 py-3 text-sm font-bold text-[#1A1A18] hover:bg-[#F4F3F0] transition-colors"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share invitation
            </button>
          )}

          {/* Copy invitation text */}
          <button
            onClick={() => copy(inviteText, setTextCopied)}
            className="flex items-center gap-3 w-full rounded-xl border border-[#E0D8C6] px-4 py-3 text-sm font-bold text-[#1A1A18] hover:bg-[#F4F3F0] transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            {textCopied ? '✓ Copied invitation text' : 'Copy invitation (for texting)'}
          </button>
        </div>
        <p className="text-[10px] text-[#B0AFA5] mt-3">You review and send through your own apps. No messages are sent automatically.</p>
      </Card>

      <Card className="p-5">
        <SectionLabel>QR Code</SectionLabel>
        <div className="mt-3">
          {!showQR ? (
            <button
              onClick={() => setShowQR(true)}
              className="text-xs font-bold text-[#1A1A18] border border-[#E0D8C6] rounded-full px-4 py-2 hover:bg-[#F4F3F0] transition-colors"
            >
              Show QR code
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-xl border border-[#E0D8C6]">
                <QRCodeSVG value={guestUrl} size={160} />
              </div>
              <p className="text-xs text-[#88887E] text-center">Guests scan to open the RSVP page</p>
              <button
                onClick={() => {
                  const svg = document.querySelector('.rsvp-qr svg')
                  if (!svg) return
                  const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = `qr-${event.event_slug}.svg`; a.click()
                }}
                className="text-xs font-bold text-[#1A1A18] underline underline-offset-2"
              >
                Download QR code
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

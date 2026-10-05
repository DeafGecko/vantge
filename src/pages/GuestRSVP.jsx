// src/pages/GuestRSVP.jsx
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import { getTheme } from '../lib/themes'
import { resolveFontFamily } from '../lib/fonts'
import { getEventType } from '../lib/eventTypes'
import { useResponsiveBg } from '../hooks/useResponsiveBg'
import FontLoader from '../components/FontLoader'
import VantgeLogo from '../components/VantgeLogo'
import { supabase } from '../lib/supabase'

// ── Helpers ──────────────────────────────────────────────────
function fmt(dt, tz) {
  if (!dt) return null
  try {
    return new Date(dt).toLocaleString('en-US', {
      timeZone: tz || 'America/New_York',
      month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  } catch { return null }
}
function fmtDeadline(dt, tz) {
  if (!dt) return null
  try {
    return new Date(dt).toLocaleDateString('en-US', {
      timeZone: tz || 'America/New_York',
      month: 'long', day: 'numeric',
    })
  } catch { return null }
}
function isPastDeadline(dt) {
  if (!dt) return false
  return new Date(dt) < new Date()
}

// ── Accent helpers ────────────────────────────────────────────
function accentStyle(c) { return { backgroundColor: c.accent, color: '#fff' } }

// ── Sub-components ────────────────────────────────────────────
function TabBar({ tabs, active, onChange, accent }) {
  return (
    <div className="flex border-b border-[#E0D8C6] bg-white sticky top-0 z-20">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-5 py-3.5 text-sm font-bold transition-colors whitespace-nowrap relative ${
            active === t.id ? 'text-[#1A1A18]' : 'text-[#88887E] hover:text-[#1A1A18]'
          }`}
        >
          {t.label}
          {active === t.id && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: accent }} />
          )}
        </button>
      ))}
    </div>
  )
}

function ResponseButton({ label, value, selected, accentColor, onChange }) {
  return (
    <button
      onClick={() => onChange(value)}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold border-2 transition-all ${
        selected
          ? 'text-white border-transparent'
          : 'bg-white text-[#5A5A52] border-[#E0D8C6] hover:border-[#C9BFA8]'
      }`}
      style={selected ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
    >
      {selected && (
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {label}
    </button>
  )
}

function FieldInput({ label, type = 'text', value, onChange, placeholder, required, error }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#1A1A18] mb-1.5">
        {label}{required && <span className="text-[#C84A44] ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-4 py-3 text-sm text-[#1A1A18] placeholder-[#B0AFA5] focus:outline-none transition-colors ${
          error ? 'border-[#C84A44] bg-[#FEF2F2]' : 'border-[#E0D8C6] bg-white focus:border-[#C9BFA8]'
        }`}
      />
      {error && <p className="text-xs text-[#C84A44] mt-1">{error}</p>}
    </div>
  )
}

function HeadcountStepper({ value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-[#1A1A18]">Number attending</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          className="w-8 h-8 rounded-full border border-[#E0D8C6] flex items-center justify-center text-[#1A1A18] hover:bg-[#F4F3F0] transition-colors"
        >
          <svg width="12" height="2" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="0" y1="1" x2="12" y2="1"/></svg>
        </button>
        <span className="text-sm font-bold text-[#1A1A18] w-6 text-center">{value}</span>
        <button
          onClick={() => onChange(Math.min(20, value + 1))}
          className="w-8 h-8 rounded-full border border-[#E0D8C6] flex items-center justify-center text-[#1A1A18] hover:bg-[#F4F3F0] transition-colors"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="6" y1="0" x2="6" y2="12"/><line x1="0" y1="6" x2="12" y2="6"/></svg>
        </button>
      </div>
    </div>
  )
}

// ── RSVP Form Tab ─────────────────────────────────────────────
function RSVPForm({ event, accentColor, existingResponse, onSuccess }) {
  const [response, setResponse] = useState(existingResponse?.response || 'going')
  const [name, setName] = useState(existingResponse?.guest_name || '')
  const [email, setEmail] = useState('')
  const [partySize, setPartySize] = useState(existingResponse?.party_size || 1)
  const [guestNames, setGuestNames] = useState(existingResponse?.guest_names || '')
  const [note, setNote] = useState(existingResponse?.note || '')
  const [showGuestNames, setShowGuestNames] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const isEdit = !!existingResponse

  const pastDeadline = isPastDeadline(event.rsvp_deadline)

  function validate() {
    const e = {}
    if (!name.trim()) e.name = 'Name is required'
    if (event.rsvp_collect_email && !email.trim()) e.email = 'Email is required'
    if (event.rsvp_collect_email && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email'
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSubmitting(true)
    setErrors({})
    try {
      let result
      if (isEdit) {
        const { data, error } = await supabase
          .from('rsvp_responses')
          .update({ response, guest_name: name.trim(), party_size: partySize, guest_names: guestNames.trim() || null, note: note.trim() || null, updated_at: new Date().toISOString() })
          .eq('id', existingResponse.id)
          .select('id, edit_token')
          .single()
        if (error) throw error
        result = data
      } else {
        const { data, error } = await supabase
          .from('rsvp_responses')
          .insert({ event_id: event.id, response, guest_name: name.trim(), party_size: partySize, guest_names: guestNames.trim() || null, note: note.trim() || null })
          .select('id, edit_token')
          .single()
        if (error) throw error
        result = data
        // Save contact separately
        if (email.trim()) {
          await supabase.from('rsvp_contacts').insert({ response_id: result.id, email: email.trim() })
        }
      }
      onSuccess({ ...result, guest_name: name.trim(), response, party_size: partySize })
    } catch (err) {
      setErrors({ submit: err.message || 'Something went wrong. Please try again.' })
    }
    setSubmitting(false)
  }

  if (pastDeadline && !isEdit) {
    return (
      <div className="bg-white rounded-2xl border border-[#E0D8C6] p-6 text-center">
        <p className="text-sm font-bold text-[#1A1A18] mb-1">RSVP deadline has passed</p>
        <p className="text-xs text-[#88887E]">This event is no longer accepting new RSVPs.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E0D8C6] p-6">
      <h2 className="text-xl font-black text-[#1A1A18] mb-1">Will you join us?</h2>
      <p className="text-sm text-[#88887E] mb-5">Let us know if you can make it.</p>

      {/* Response buttons */}
      <div className="flex gap-2 flex-wrap mb-5">
        <ResponseButton label="Going" value="going" selected={response === 'going'} accentColor={accentColor} onChange={setResponse} />
        {event.rsvp_allow_maybe !== false && (
          <ResponseButton label="Maybe" value="maybe" selected={response === 'maybe'} accentColor={accentColor} onChange={setResponse} />
        )}
        <ResponseButton label="Can't attend" value="not_going" selected={response === 'not_going'} accentColor={accentColor} onChange={setResponse} />
      </div>

      <div className="flex flex-col gap-4">
        <FieldInput label="Your name" value={name} onChange={setName} placeholder="Jordan Taylor" required error={errors.name} />
        {event.rsvp_collect_email && (
          <FieldInput label="Your email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required error={errors.email} />
        )}

        {response !== 'not_going' && (
          <div className="border border-[#E0D8C6] rounded-xl px-4 py-3.5">
            <HeadcountStepper value={partySize} onChange={setPartySize} />
          </div>
        )}

        {response !== 'not_going' && (event.rsvp_headcount_mode === 'names' || event.rsvp_headcount_mode === 'both') && (
          <div>
            <button
              onClick={() => setShowGuestNames(v => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-[#5A5A52] hover:text-[#1A1A18] transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d={showGuestNames ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add guest names (optional)
            </button>
            {showGuestNames && (
              <textarea
                value={guestNames}
                onChange={e => setGuestNames(e.target.value)}
                placeholder="One name per line"
                rows={3}
                className="mt-2 w-full rounded-xl border border-[#E0D8C6] px-4 py-3 text-sm text-[#1A1A18] placeholder-[#B0AFA5] focus:outline-none focus:border-[#C9BFA8] resize-none"
              />
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-[#1A1A18] mb-1.5">Note <span className="text-[#88887E] font-normal">(optional)</span></label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Any message for the host…"
            rows={2}
            className="w-full rounded-xl border border-[#E0D8C6] px-4 py-3 text-sm text-[#1A1A18] placeholder-[#B0AFA5] focus:outline-none focus:border-[#C9BFA8] resize-none"
          />
        </div>

        {errors.submit && (
          <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#C84A44]">
            {errors.submit}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {submitting ? 'Sending…' : isEdit ? 'Update RSVP' : 'Send RSVP'}
        </button>
      </div>
    </div>
  )
}

// ── Food Sign-up Tab ──────────────────────────────────────────
function FoodSignup({ event, accentColor }) {
  const [items, setItems] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(null)
  const [claimForm, setClaimForm] = useState({ guestName: '', description: '', note: '', quantity: 1 })
  const [claimErrors, setClaimErrors] = useState({})
  const [claimSuccess, setClaimSuccess] = useState(null)
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestion, setSuggestion] = useState({ name: '', category: '', notes: '' })
  const [suggestSubmitting, setSuggestSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    const [{ data: itemData }, { data: claimData }] = await Promise.all([
      supabase.from('food_items').select('*').eq('event_id', event.id).order('sort_order').order('created_at'),
      supabase.from('food_claims').select('*').eq('event_id', event.id),
    ])
    setItems(itemData || [])
    setClaims(claimData || [])
    setLoading(false)
  }, [event.id])

  useEffect(() => { fetchData() }, [fetchData])

  function spotsLeft(item) {
    if (!item.spots_total) return null
    const used = claims.filter(c => c.food_item_id === item.id).reduce((sum, c) => sum + c.quantity, 0)
    return item.spots_total - used
  }

  function isFilled(item) {
    const left = spotsLeft(item)
    return left !== null && left <= 0
  }

  async function handleClaim(item) {
    const e = {}
    if (!claimForm.guestName.trim()) e.guestName = 'Name is required'
    if (Object.keys(e).length) { setClaimErrors(e); return }
    setClaiming(item.id)
    try {
      const { data, error } = await supabase.rpc('claim_food_item', {
        p_food_item_id: item.id,
        p_event_id: event.id,
        p_guest_name: claimForm.guestName.trim(),
        p_quantity: claimForm.quantity,
        p_description: claimForm.description.trim() || null,
        p_note: claimForm.note.trim() || null,
      })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      setClaimSuccess(item.id)
      setClaimForm({ guestName: '', description: '', note: '', quantity: 1 })
      setClaimErrors({})
      fetchData()
      setTimeout(() => setClaimSuccess(null), 3000)
    } catch (err) {
      setClaimErrors({ submit: err.message })
    }
    setClaiming(null)
  }

  async function handleSuggest() {
    if (!suggestion.name.trim()) return
    setSuggestSubmitting(true)
    await supabase.from('food_items').insert({
      event_id: event.id,
      name: suggestion.name.trim(),
      category: suggestion.category.trim() || null,
      notes: suggestion.notes.trim() || null,
      is_suggestion: true,
    })
    setSuggestion({ name: '', category: '', notes: '' })
    setShowSuggest(false)
    setSuggestSubmitting(false)
    fetchData()
  }

  if (loading) return <div className="py-8 text-center text-sm text-[#88887E]">Loading…</div>

  return (
    <div className="bg-white rounded-2xl border border-[#E0D8C6] p-6">
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-xl font-black text-[#1A1A18]">{event.food_heading || 'Food Sign-up'}</h2>
        <span className="text-xs font-bold text-[#88887E] border border-[#E0D8C6] rounded-full px-2.5 py-0.5">Optional</span>
      </div>
      <p className="text-sm text-[#88887E] mb-5">Choose something to bring, or suggest your own.</p>

      {items.length === 0 && (
        <p className="text-sm text-[#88887E] text-center py-4">No items yet.</p>
      )}

      <div className="flex flex-col divide-y divide-[#F4F3F0]">
        {items.map(item => {
          const left = spotsLeft(item)
          const filled = isFilled(item)
          const isOpen = claiming === item.id

          return (
            <div key={item.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                {/* Icon placeholder */}
                <div className="w-12 h-12 rounded-xl bg-[#F4F3F0] flex items-center justify-center shrink-0">
                  <svg width="20" height="20" fill="none" stroke="#88887E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    {item.category === 'Drinks'
                      ? <><path d="M8 2h8l-1 7H9L8 2z"/><path d="M9 9c0 5 6 5 6 0"/><path d="M12 14v6"/><path d="M9 20h6"/></>
                      : item.category === 'Dessert'
                      ? <><circle cx="12" cy="11" r="5"/><path d="M12 2v2"/><path d="M4.2 7.5l1.7 1"/><path d="M18.1 7.5l-1.7 1"/><path d="M7 20h10"/><path d="M12 16v4"/></>
                      : <><path d="M3 11l19-9-9 19-2-8-8-2z"/></>
                    }
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1A1A18]">{item.name}</p>
                  {item.notes && <p className="text-xs text-[#88887E] mt-0.5">{item.notes}</p>}
                  <p className="text-xs text-[#88887E] mt-0.5">
                    {filled ? 'Filled' : left !== null ? `${left} spot${left !== 1 ? 's' : ''} left` : 'Open'}
                  </p>
                </div>
                <div className="shrink-0">
                  {filled ? (
                    <span className="text-xs font-bold text-[#88887E] border border-[#E0D8C6] rounded-xl px-4 py-2">Filled</span>
                  ) : (
                    <button
                      onClick={() => claiming === item.id ? setClaiming(null) : (setClaiming(item.id), setClaimErrors({}))}
                      className="text-sm font-bold rounded-xl px-4 py-2 border-2 transition-all"
                      style={{ borderColor: accentColor, color: accentColor }}
                    >
                      Choose
                    </button>
                  )}
                </div>
              </div>

              {/* Inline claim form */}
              {isOpen && (
                <div className="mt-3 bg-[#F8F5ED] rounded-xl p-4 flex flex-col gap-3">
                  <FieldInput label="Your name" value={claimForm.guestName} onChange={v => setClaimForm(f => ({ ...f, guestName: v }))} placeholder="Jordan Taylor" required error={claimErrors.guestName} />
                  <FieldInput label="What will you bring?" value={claimForm.description} onChange={v => setClaimForm(f => ({ ...f, description: v }))} placeholder="My famous mac & cheese…" />
                  {claimErrors.submit && <p className="text-xs text-[#C84A44]">{claimErrors.submit}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleClaim(item)}
                      disabled={!!claiming && claiming !== item.id}
                      className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-all"
                      style={{ backgroundColor: accentColor }}
                    >
                      {claiming === item.id ? 'Claiming…' : 'Confirm'}
                    </button>
                    <button onClick={() => setClaiming(null)} className="px-4 text-sm font-bold text-[#88887E] hover:text-[#1A1A18]">Cancel</button>
                  </div>
                </div>
              )}

              {claimSuccess === item.id && (
                <div className="mt-2 flex items-center gap-2 text-sm font-bold text-green-700 bg-green-50 rounded-xl px-4 py-2.5">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Claimed!
                </div>
              )}
            </div>
          )
        })}
      </div>

      {event.food_allow_suggestions && (
        <div className="mt-4 pt-4 border-t border-[#F4F3F0]">
          {!showSuggest ? (
            <button
              onClick={() => setShowSuggest(true)}
              className="flex items-center gap-2 text-sm font-bold transition-colors"
              style={{ color: accentColor }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Add your own item
            </button>
          ) : (
            <div className="flex flex-col gap-3 bg-[#F8F5ED] rounded-xl p-4">
              <p className="text-sm font-bold text-[#1A1A18]">Suggest an item</p>
              <FieldInput label="Item name" value={suggestion.name} onChange={v => setSuggestion(s => ({ ...s, name: v }))} placeholder="e.g. Potato salad" required />
              <FieldInput label="Category (optional)" value={suggestion.category} onChange={v => setSuggestion(s => ({ ...s, category: v }))} placeholder="e.g. Side dish" />
              <div className="flex gap-2">
                <button
                  onClick={handleSuggest}
                  disabled={suggestSubmitting || !suggestion.name.trim()}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 transition-all"
                  style={{ backgroundColor: accentColor }}
                >
                  {suggestSubmitting ? 'Submitting…' : 'Submit suggestion'}
                </button>
                <button onClick={() => setShowSuggest(false)} className="px-4 text-sm font-bold text-[#88887E]">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Photos Tab ────────────────────────────────────────────────
function PhotosTab({ event, eventSlug, accentColor }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!event.gallery_unlocked) { setLoading(false); return }
    supabase
      .from('media_queue')
      .select('id, original_url, thumbnail_url, is_video')
      .eq('event_id', event.id)
      .eq('status', 1)
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => { setPhotos(data || []); setLoading(false) })
  }, [event.id, event.gallery_unlocked])

  return (
    <div className="bg-white rounded-2xl border border-[#E0D8C6] p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div>
          <span className="text-xl font-black text-[#1A1A18]">Shared photos</span>
          <span className="text-[#88887E] text-sm ml-2">· Relive the moments! Upload and view photos from this event.</span>
        </div>
        {event.gallery_unlocked && (
          <div className="flex gap-2">
            <Link to={`/${eventSlug}/upload`} className="flex items-center gap-1.5 text-xs font-bold text-white rounded-full px-4 py-2 transition-all" style={{ backgroundColor: accentColor }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload photos
            </Link>
            <Link to={`/${eventSlug}/gallery`} className="text-xs font-bold rounded-full px-4 py-2 border border-[#E0D8C6] text-[#1A1A18] hover:bg-[#F4F3F0] transition-all">
              View gallery
            </Link>
          </div>
        )}
      </div>

      {!event.gallery_unlocked ? (
        <p className="text-sm text-[#88887E] mt-3">Photos will be available once the host opens the gallery.</p>
      ) : loading ? (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[0,1,2,3].map(i => <div key={i} className="aspect-square rounded-xl bg-[#F4F3F0] animate-pulse" />)}
        </div>
      ) : photos.length === 0 ? (
        <p className="text-sm text-[#88887E] mt-3">No photos yet. Be the first to upload!</p>
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {photos.map(p => (
            <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-[#F4F3F0]">
              <img src={p.thumbnail_url || p.original_url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Confirmation Screen ───────────────────────────────────────
function ConfirmationScreen({ event, rsvpResult, accentColor, fontFamily, onEdit }) {
  const editUrl = `${window.location.origin}/${event.event_slug}/rsvp?edit=${rsvpResult.edit_token}`
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(editUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const label = rsvpResult.response === 'going' ? 'See you there!' : rsvpResult.response === 'maybe' ? 'Thanks for letting us know!' : 'Thanks for responding'
  const sub = rsvpResult.response === 'going'
    ? `You're in${rsvpResult.party_size > 1 ? ` with ${rsvpResult.party_size} guests` : ''}. We can't wait to see you.`
    : rsvpResult.response === 'maybe'
    ? "We hope you can make it. You can update your response anytime."
    : "Sorry you can't make it. You can update your response anytime."

  return (
    <div className="bg-white rounded-2xl border border-[#E0D8C6] p-8 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: accentColor + '20' }}>
        {rsvpResult.response === 'going'
          ? <svg width="28" height="28" fill="none" stroke={accentColor} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          : rsvpResult.response === 'maybe'
          ? <svg width="28" height="28" fill="none" stroke={accentColor} strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 015.12 2.12c0 2-3 3-3 3" strokeLinecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" strokeLinecap="round"/></svg>
          : <svg width="28" height="28" fill="none" stroke={accentColor} strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5-2 4-2 4 2 4 2"/><line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round"/><line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round"/></svg>
        }
      </div>
      <div>
        <h2 className="text-xl font-black text-[#1A1A18]" style={{ fontFamily }}>{label}</h2>
        <p className="text-sm text-[#88887E] mt-1">{sub}</p>
      </div>
      <div className="w-full bg-[#F8F5ED] rounded-xl p-4 text-left">
        <p className="text-xs font-bold text-[#88887E] uppercase tracking-widest mb-1">Your edit link</p>
        <p className="text-xs text-[#5A5A52] break-all mb-2">{editUrl}</p>
        <button onClick={copy} className="text-xs font-bold transition-colors" style={{ color: accentColor }}>
          {copied ? '✓ Copied!' : 'Copy link'}
        </button>
      </div>
      <button onClick={onEdit} className="text-sm font-bold text-[#88887E] hover:text-[#1A1A18] transition-colors">
        Edit my response
      </button>
    </div>
  )
}

// ── Hero Banner (shared across steps) ────────────────────────
function HeroBanner({ event, bgImage, bgPosition, tintAlpha, fontFamily, accentColor }) {
  const eventDateStr = fmt(event.rsvp_event_date, event.rsvp_timezone)
  return (
    <div className="relative w-full" style={{ height: 'clamp(240px, 40vw, 360px)' }}>
      {bgImage && (
        <div className="absolute inset-0" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition }} />
      )}
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
      <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)' }} />
      <div className="absolute top-4 left-4">
        <a href="/"><VantgeLogo size="sm" monoWhite /></a>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
        <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/60 mb-1">You're Invited</p>
        <h1 className="font-extrabold text-white leading-tight mb-2" style={{ fontFamily, fontSize: 'clamp(1.6rem, 5vw, 2.5rem)' }}>
          {event.rsvp_host_display_name || event.event_name}
        </h1>
        <div className="flex flex-col gap-1">
          {eventDateStr && (
            <div className="flex items-center gap-2 text-sm text-white/80">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {eventDateStr}
            </div>
          )}
          {event.rsvp_location && (
            <div className="flex items-center gap-2 text-sm text-white/80">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {event.rsvp_location}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step 1: Event details / advertisement ────────────────────
function InviteStep({ event, accentColor, fontFamily, deadlineStr, onNext }) {
  const pastDeadline = isPastDeadline(event.rsvp_deadline)
  return (
    <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-5">
      {/* Description card */}
      {event.rsvp_description && (
        <div className="bg-white rounded-2xl border border-[#E0D8C6] px-5 py-4">
          <p className="text-sm text-[#5A5A52] leading-relaxed">{event.rsvp_description}</p>
        </div>
      )}

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-[#E0D8C6] divide-y divide-[#F4F3F0]">
        {event.rsvp_location && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(event.rsvp_location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 px-5 py-4 hover:bg-[#F8F5ED] transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#F4F3F0] flex items-center justify-center shrink-0 group-hover:bg-[#E8E4DA] transition-colors">
              <svg width="16" height="16" fill="none" stroke="#C84A44" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#88887E] uppercase tracking-widest">Location</p>
              <p className="text-sm font-semibold text-[#1A1A18] truncate">{event.rsvp_location}</p>
            </div>
            <svg width="14" height="14" fill="none" stroke="#B0AFA5" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
        )}
        {deadlineStr && (
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-[#F4F3F0] flex items-center justify-center shrink-0">
              <svg width="16" height="16" fill="none" stroke="#5A5A52" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-[#88887E] uppercase tracking-widest">RSVP Deadline</p>
              <p className="text-sm font-semibold text-[#1A1A18]">{deadlineStr}</p>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      {pastDeadline ? (
        <div className="bg-[#F4F3F0] rounded-2xl px-5 py-4 text-center">
          <p className="text-sm font-bold text-[#88887E]">RSVP deadline has passed</p>
          <p className="text-xs text-[#B0AFA5] mt-1">This event is no longer accepting RSVPs.</p>
        </div>
      ) : (
        <button
          onClick={onNext}
          className="w-full rounded-2xl py-4 text-base font-black text-white transition-all active:scale-[0.98] shadow-sm"
          style={{ backgroundColor: accentColor }}
        >
          RSVP Now →
        </button>
      )}
    </div>
  )
}

// ── Step 2: RSVP response ─────────────────────────────────────
function RSVPStep({ event, accentColor, existingResponse, onSuccess, onBack }) {
  const [response, setResponse] = useState(existingResponse?.response || 'going')
  const [name, setName] = useState(existingResponse?.guest_name || '')
  const [email, setEmail] = useState('')
  const [partySize, setPartySize] = useState(existingResponse?.party_size || 1)
  const [guestNames, setGuestNames] = useState(existingResponse?.guest_names || '')
  const [note, setNote] = useState(existingResponse?.note || '')
  const [showGuestNames, setShowGuestNames] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const isEdit = !!existingResponse

  function validate() {
    const e = {}
    if (!name.trim()) e.name = 'Name is required'
    if (event.rsvp_collect_email && !email.trim()) e.email = 'Email is required'
    if (event.rsvp_collect_email && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email'
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSubmitting(true)
    setErrors({})
    try {
      let result
      if (isEdit) {
        const { data, error } = await supabase
          .from('rsvp_responses')
          .update({ response, guest_name: name.trim(), party_size: partySize, guest_names: guestNames.trim() || null, note: note.trim() || null, updated_at: new Date().toISOString() })
          .eq('id', existingResponse.id)
          .select('id, edit_token')
          .single()
        if (error) throw error
        result = data
      } else {
        const { data, error } = await supabase
          .from('rsvp_responses')
          .insert({ event_id: event.id, response, guest_name: name.trim(), party_size: partySize, guest_names: guestNames.trim() || null, note: note.trim() || null })
          .select('id, edit_token')
          .single()
        if (error) throw error
        result = data
        if (email.trim()) {
          await supabase.from('rsvp_contacts').insert({ response_id: result.id, email: email.trim() })
        }
      }
      onSuccess({ ...result, guest_name: name.trim(), response, party_size: partySize })
    } catch (err) {
      setErrors({ submit: err.message || 'Something went wrong. Please try again.' })
    }
    setSubmitting(false)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-[#E0D8C6] p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-black text-[#1A1A18] mb-1">Will you be there?</h2>
          <p className="text-sm text-[#88887E]">Let the host know if you can make it.</p>
        </div>

        {/* Big response buttons */}
        <div className="flex flex-col gap-2">
          {[
            { value: 'going', label: "I'm Going" },
            ...(event.rsvp_allow_maybe !== false ? [{ value: 'maybe', label: 'Maybe' }] : []),
            { value: 'not_going', label: "Can't Attend" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setResponse(opt.value)}
              className={`w-full rounded-xl px-5 py-3.5 text-base font-bold border-2 transition-all text-left ${
                response === opt.value ? 'text-white border-transparent' : 'bg-white text-[#5A5A52] border-[#E0D8C6] hover:border-[#C9BFA8]'
              }`}
              style={response === opt.value ? { backgroundColor: accentColor, borderColor: accentColor } : {}}
            >
              {response === opt.value && <span className="mr-2">✓</span>}
              {opt.label}
            </button>
          ))}
        </div>

        <div className="border-t border-[#F4F3F0] pt-4 flex flex-col gap-4">
          <FieldInput label="Your name" value={name} onChange={setName} placeholder="Jordan Taylor" required error={errors.name} />
          {event.rsvp_collect_email && (
            <FieldInput label="Your email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required error={errors.email} />
          )}

          {response !== 'not_going' && (
            <div className="border border-[#E0D8C6] rounded-xl px-4 py-3.5">
              <HeadcountStepper value={partySize} onChange={setPartySize} />
            </div>
          )}

          {response !== 'not_going' && (event.rsvp_headcount_mode === 'names' || event.rsvp_headcount_mode === 'both') && (
            <div>
              <button
                onClick={() => setShowGuestNames(v => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-[#5A5A52] hover:text-[#1A1A18] transition-colors"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d={showGuestNames ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add guest names (optional)
              </button>
              {showGuestNames && (
                <textarea
                  value={guestNames}
                  onChange={e => setGuestNames(e.target.value)}
                  placeholder="One name per line"
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-[#E0D8C6] px-4 py-3 text-sm text-[#1A1A18] placeholder-[#B0AFA5] focus:outline-none focus:border-[#C9BFA8] resize-none"
                />
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#1A1A18] mb-1.5">Note <span className="text-[#88887E] font-normal">(optional)</span></label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any message for the host…"
              rows={2}
              className="w-full rounded-xl border border-[#E0D8C6] px-4 py-3 text-sm text-[#1A1A18] placeholder-[#B0AFA5] focus:outline-none focus:border-[#C9BFA8] resize-none"
            />
          </div>

          {errors.submit && (
            <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#C84A44]">{errors.submit}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {submitting ? 'Sending…' : isEdit ? 'Update RSVP' : 'Send RSVP'}
          </button>
        </div>
      </div>

      <button onClick={onBack} className="mt-4 flex items-center gap-1.5 text-sm text-[#88887E] hover:text-[#1A1A18] transition-colors">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to details
      </button>
    </div>
  )
}

// ── Step 3: Food list ─────────────────────────────────────────
function FoodStep({ event, accentColor, bgImage, bgPosition, rsvpResult, onBack, onDone }) {
  return (
    <div className="relative min-h-screen">
      {/* Background photo at 75% opacity */}
      {bgImage && (
        <div className="fixed inset-0 -z-10" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition, opacity: 0.25 }} />
      )}
      <div className="fixed inset-0 -z-10 bg-[#F4F3F0]/80" />

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-5">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-[#E0D8C6] px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: accentColor + '20' }}>
              <svg width="12" height="12" fill="none" stroke={accentColor} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="text-sm font-bold text-[#1A1A18]">RSVP received!</p>
          </div>
          <p className="text-xs text-[#88887E]">
            {rsvpResult.response === 'going' ? `See you there, ${rsvpResult.guest_name}.` : `Thanks for letting us know, ${rsvpResult.guest_name}.`}
          </p>
        </div>

        <FoodSignup event={event} accentColor={accentColor} />

        <button
          onClick={onDone}
          className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98]"
          style={{ backgroundColor: accentColor }}
        >
          Done
        </button>

        <button onClick={onBack} className="flex items-center justify-center gap-1.5 text-sm text-[#88887E] hover:text-[#1A1A18] transition-colors">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function GuestRSVP() {
  const { eventSlug } = useParams()
  const [searchParams] = useSearchParams()
  const editToken = searchParams.get('edit')

  const { event, loading: eventLoading } = useEvent(eventSlug)
  const bg = useResponsiveBg(event?.background_image, event?.background_image_desktop)

  // step: 'invite' | 'rsvp' | 'food' | 'done'
  const [step, setStep] = useState('invite')
  const [rsvpResult, setRsvpResult] = useState(null)
  const [existingResponse, setExistingResponse] = useState(null)
  const [editLoading, setEditLoading] = useState(!!editToken)

  useEffect(() => {
    if (!editToken) return
    setEditLoading(true)
    supabase
      .from('rsvp_responses')
      .select('*')
      .eq('edit_token', editToken)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setExistingResponse(data); setStep('rsvp') }
        setEditLoading(false)
      })
  }, [editToken])

  if (eventLoading || editLoading) {
    return (
      <div className="min-h-screen bg-[#F8F5ED] flex items-center justify-center">
        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A18" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/></svg>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#F8F5ED] flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm text-[#88887E] mb-4">Event not found.</p>
          <Link to="/" className="text-sm font-bold text-[#1A1A18] underline underline-offset-4">← Back to home</Link>
        </div>
      </div>
    )
  }

  if (!event.rsvp_enabled || event.rsvp_status === 'draft') {
    return (
      <div className="min-h-screen bg-[#F8F5ED] flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-lg font-black text-[#1A1A18] mb-2">Invitation not available yet</p>
          <p className="text-sm text-[#88887E]">The host hasn't published this invitation yet.</p>
        </div>
      </div>
    )
  }

  if (event.rsvp_status === 'closed') {
    return (
      <div className="min-h-screen bg-[#F8F5ED] flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-lg font-black text-[#1A1A18] mb-2">Invitations closed</p>
          <p className="text-sm text-[#88887E]">This event is no longer accepting RSVPs.</p>
        </div>
      </div>
    )
  }

  const theme = getTheme(event.rsvp_theme || event.theme)
  const c = theme.colors
  const fontFamily = resolveFontFamily(event.rsvp_font || event.font_family)
  const eventType = getEventType(event.event_type)
  const bgImage = bg || eventType.defaultBg
  const bgPosition = event.background_position || '50% 50%'
  const accentColor = c.accent
  const tintAlpha = ((event.background_tint ?? 55) / 100).toFixed(2)

  const showFood = event.food_enabled && (event.rsvp_mode === 'food_only' || event.rsvp_mode === 'rsvp_and_food')
  const deadlineStr = fmtDeadline(event.rsvp_deadline, event.rsvp_timezone)

  function handleRsvpSuccess(result) {
    setRsvpResult(result)
    if (showFood && result.response !== 'not_going') {
      setStep('food')
    } else {
      setStep('done')
    }
  }

  const heroProps = { event, bgImage, bgPosition, tintAlpha, fontFamily, accentColor }

  return (
    <>
      <FontLoader fontId={event.rsvp_font || event.font_family} />
      <div className="min-h-screen bg-[#F4F3F0]">
        <HeroBanner {...heroProps} />

        {step === 'invite' && (
          <InviteStep
            event={event}
            accentColor={accentColor}
            fontFamily={fontFamily}
            deadlineStr={deadlineStr}
            onNext={() => setStep('rsvp')}
          />
        )}

        {step === 'rsvp' && (
          <RSVPStep
            event={event}
            accentColor={accentColor}
            existingResponse={existingResponse}
            onSuccess={handleRsvpSuccess}
            onBack={() => setStep('invite')}
          />
        )}

        {step === 'food' && (
          <FoodStep
            event={event}
            accentColor={accentColor}
            bgImage={bgImage}
            bgPosition={bgPosition}
            rsvpResult={rsvpResult}
            onBack={() => setStep('rsvp')}
            onDone={() => setStep('done')}
          />
        )}

        {step === 'done' && (
          <div className="max-w-lg mx-auto px-4 py-8">
            <ConfirmationScreen
              event={event}
              rsvpResult={rsvpResult}
              accentColor={accentColor}
              fontFamily={fontFamily}
              onEdit={() => { setExistingResponse(rsvpResult); setRsvpResult(null); setStep('rsvp') }}
            />
          </div>
        )}

        {/* ── Vantge promo footer ──────────────────────────────── */}
        <div className="max-w-lg mx-auto px-4 pb-10 mt-4">
          <div className="flex items-center justify-between bg-white rounded-2xl border border-[#E0D8C6] px-5 py-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <VantgeLogo size="xs" />
              <div>
                <p className="text-sm font-bold text-[#1A1A18]">Your next gathering starts here.</p>
                <p className="text-xs text-[#88887E]">Create a free RSVP and food sign-up with Vantge.</p>
              </div>
            </div>
            <Link
              to="/signup"
              className="text-sm font-bold text-white rounded-full px-5 py-2.5 transition-all active:scale-[0.98]"
              style={{ backgroundColor: accentColor }}
            >
              Create a free event
            </Link>
          </div>
          <p className="text-center text-[10px] text-[#B0AFA5] mt-3 tracking-widest uppercase">
            Powered by Vantge · vantge.app
          </p>
        </div>
      </div>
    </>
  )
}

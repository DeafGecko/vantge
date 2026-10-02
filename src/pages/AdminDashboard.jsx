import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAdminAuth } from '../hooks/useAdminAuth'
import VantgeLogo from '../components/VantgeLogo'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmt(n) { if (n === null || n === undefined) return '—'; if (n >= 1e6) return (n/1e6).toFixed(1)+'M'; if (n >= 1e3) return (n/1e3).toFixed(1)+'K'; return String(n) }
function fmtBytes(b) { if (!b) return '0 B'; const u = ['B','KB','MB','GB']; let i = 0; while (b >= 1024 && i < 3) { b /= 1024; i++ } return b.toFixed(1)+' '+u[i] }
function timeAgo(ts) {
  const d = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (d < 60) return `${d}s ago`
  if (d < 3600) return `${Math.floor(d/60)}m ago`
  if (d < 86400) return `${Math.floor(d/3600)}h ago`
  return `${Math.floor(d/86400)}d ago`
}

const NAV_ITEMS = [
  { id: 'overview',   label: 'Overview',   icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'events',     label: 'Live Events', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { id: 'photos',     label: 'Photos',      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'safety',     label: 'Safety',      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { id: 'users',      label: 'Users',       icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'tech',       label: 'Technical',   icon: 'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v10m0 0H5m4 0h10m0 0V3m0 10v4a2 2 0 01-2 2H9m10-6H9' },
]

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'white', pulse }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">{label}</p>
      <p className={`text-2xl font-black ${color === 'green' ? 'text-emerald-400' : color === 'red' ? 'text-red-400' : color === 'amber' ? 'text-amber-400' : 'text-white'} flex items-center gap-2`}>
        {value}
        {pulse && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
      </p>
      {sub && <p className="text-[11px] text-white/35">{sub}</p>}
    </div>
  )
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────
function ConfirmModal({ title, body, confirmLabel, danger, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-[#111110] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-white font-bold text-base mb-2">{title}</h3>
        <p className="text-white/50 text-sm mb-6">{body}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:text-white transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${danger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white text-[#1A1A18] hover:bg-[#E8E4DC]'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ stats, events }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Active Events"    value={fmt(stats.activeEvents)}   color="green" pulse />
        <StatCard label="Total Events"     value={fmt(stats.totalEvents)} />
        <StatCard label="Photos Today"     value={fmt(stats.photosToday)} />
        <StatCard label="Total Photos"     value={fmt(stats.totalPhotos)} />
        <StatCard label="Pending Review"   value={fmt(stats.pendingReview)}  color={stats.pendingReview > 0 ? 'amber' : 'white'} />
        <StatCard label="Approved"         value={fmt(stats.approved)}       color="green" />
        <StatCard label="Blocked"          value={fmt(stats.blocked)}        color={stats.blocked > 0 ? 'red' : 'white'} />
        <StatCard label="Favorites"        value={fmt(stats.favorites)} />
        <StatCard label="Storage Used"     value={fmtBytes(stats.storageBytes)} />
        <StatCard label="Upload Rate"      value={stats.uploadRate + '%'}    color="green" />
      </div>

      {/* Active events list */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Active Events</h2>
        {events.length === 0
          ? <p className="text-white/30 text-sm">No active events right now.</p>
          : (
            <div className="space-y-2">
              {events.map(ev => (
                <div key={ev.id} className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{ev.event_name}</p>
                    <p className="text-white/40 text-xs">{ev.event_slug} · {ev.event_type}</p>
                  </div>
                  <div className="flex gap-4 text-right shrink-0">
                    <div>
                      <p className="text-white font-semibold text-sm">{fmt(ev.photo_count)}</p>
                      <p className="text-white/35 text-[10px] uppercase tracking-wide">Photos</p>
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${ev.is_paused ? 'text-amber-400' : ev.is_locked ? 'text-red-400' : 'text-emerald-400'}`}>
                        {ev.is_locked ? 'Locked' : ev.is_paused ? 'Paused' : 'Live'}
                      </p>
                      <p className="text-white/35 text-[10px] uppercase tracking-wide">Status</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}

// ── Live Events tab ───────────────────────────────────────────────────────────
function LiveEventsTab({ events, onEmergency }) {
  const [confirm, setConfirm] = useState(null) // { event, action }

  function triggerConfirm(event, action) { setConfirm({ event, action }) }

  async function executeAction() {
    const { event, action } = confirm
    setConfirm(null)
    const updates = {}
    if (action === 'pause')   updates.is_paused = !event.is_paused
    if (action === 'hide')    updates.gallery_hidden = !event.gallery_hidden
    if (action === 'lock')    updates.is_locked = !event.is_locked
    await supabase.from('events').update(updates).eq('id', event.id)
    onEmergency()
  }

  return (
    <div className="space-y-4">
      {confirm && (
        <ConfirmModal
          title={confirm.action === 'pause' ? (confirm.event.is_paused ? 'Resume uploads?' : 'Pause uploads?')
            : confirm.action === 'hide' ? (confirm.event.gallery_hidden ? 'Show gallery?' : 'Hide gallery?')
            : (confirm.event.is_locked ? 'Unlock event?' : 'Lock event?')}
          body={confirm.action === 'lock' && !confirm.event.is_locked
            ? 'This will lock the event, preventing all uploads and hiding the gallery from guests.'
            : 'This action can be reversed.'}
          confirmLabel="Confirm"
          danger={confirm.action === 'lock' && !confirm.event.is_locked}
          onConfirm={executeAction}
          onCancel={() => setConfirm(null)}
        />
      )}

      {events.length === 0
        ? <p className="text-white/30 text-sm">No events found.</p>
        : events.map(ev => (
          <div key={ev.id} className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-bold text-base">{ev.event_name}</p>
                <p className="text-white/40 text-xs mt-0.5">{ev.event_slug} · {ev.event_type} · Created {timeAgo(ev.created_at)}</p>
              </div>
              <span className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${ev.is_locked ? 'bg-red-500/15 text-red-400' : ev.is_paused ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                {ev.is_locked ? 'Locked' : ev.is_paused ? 'Paused' : 'Live'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-white/[0.03] rounded-xl py-2.5">
                <p className="text-white font-bold text-lg">{fmt(ev.photo_count)}</p>
                <p className="text-white/35 text-[10px] uppercase tracking-wide">Photos</p>
              </div>
              <div className="text-center bg-white/[0.03] rounded-xl py-2.5">
                <p className={`font-bold text-lg ${ev.pending_count > 0 ? 'text-amber-400' : 'text-white'}`}>{fmt(ev.pending_count)}</p>
                <p className="text-white/35 text-[10px] uppercase tracking-wide">Pending</p>
              </div>
              <div className="text-center bg-white/[0.03] rounded-xl py-2.5">
                <p className={`font-bold text-lg ${ev.blocked_count > 0 ? 'text-red-400' : 'text-white'}`}>{fmt(ev.blocked_count)}</p>
                <p className="text-white/35 text-[10px] uppercase tracking-wide">Blocked</p>
              </div>
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              {ev.allow_uploads   !== false || <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">Uploads disabled</span>}
              {ev.gallery_hidden  && <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">Gallery hidden</span>}
              {ev.is_locked       && <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400">Locked</span>}
              {ev.is_paused       && <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">Uploads paused</span>}
            </div>

            {/* Emergency controls */}
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2.5">Emergency Controls</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => triggerConfirm(ev, 'pause')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${ev.is_paused ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'}`}
                >
                  {ev.is_paused ? '▶ Resume Uploads' : '⏸ Pause Uploads'}
                </button>
                <button
                  onClick={() => triggerConfirm(ev, 'hide')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${ev.gallery_hidden ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' : 'bg-white/[0.07] text-white/60 hover:bg-white/[0.12]'}`}
                >
                  {ev.gallery_hidden ? '👁 Show Gallery' : '🚫 Hide Gallery'}
                </button>
                <button
                  onClick={() => triggerConfirm(ev, 'lock')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${ev.is_locked ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' : 'bg-red-500/15 text-red-300 hover:bg-red-500/25'}`}
                >
                  {ev.is_locked ? '🔓 Unlock Event' : '🔒 Lock Event'}
                </button>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  )
}

// ── Photos tab ────────────────────────────────────────────────────────────────
function PhotosTab({ photos, onAction }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = photos.filter(p => {
    const statusOk = statusFilter === 'all' || (statusFilter === 'approved' && p.status === 1) || (statusFilter === 'pending' && p.status === 0) || (statusFilter === 'blocked' && p.status === 2)
    const typeOk = typeFilter === 'all' || (typeFilter === 'photos' && !p.is_video) || (typeFilter === 'videos' && p.is_video)
    return statusOk && typeOk
  })

  const photoCount = photos.filter(p => !p.is_video).length
  const videoCount = photos.filter(p => p.is_video).length

  async function approve(id) { await supabase.from('media_queue').update({ status: 1 }).eq('id', id); onAction() }
  async function reject(id)  { await supabase.from('media_queue').update({ status: 0 }).eq('id', id); onAction() }
  async function block(id)   { await supabase.from('media_queue').update({ status: 2 }).eq('id', id); onAction() }
  async function remove(id)  {
    const item = photos.find(p => p.id === id)
    if (item?.storage_path) await supabase.storage.from('event-media').remove([item.storage_path])
    await supabase.from('media_queue').delete().eq('id', id)
    onAction()
  }

  return (
    <div className="space-y-4">
      {/* Type filter */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex gap-1.5">
          {[['all', `All (${photos.length})`], ['photos', `Photos (${photoCount})`], ['videos', `Videos (${videoCount})`]].map(([f, label]) => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${typeFilter === f ? 'bg-white text-[#1A1A18]' : 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1]'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex gap-1.5">
          {[['all','All'], ['approved','Approved'], ['pending','Pending'], ['blocked','Blocked']].map(([f, label]) => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${statusFilter === f ? 'bg-white/20 text-white' : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08]'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0
        ? <p className="text-white/30 text-sm">Nothing in this queue.</p>
        : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filtered.map(p => {
              const thumb = p.cloudinary_public_id
                ? `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,w_300,h_300,q_80/${p.cloudinary_public_id}`
                : (p.thumbnail_url || (!p.is_video ? p.original_url : null))
              return (
                <div key={p.id} className="relative group rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.07] aspect-square">
                  {p.is_video && !thumb ? (
                    <video src={p.original_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  ) : thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">No preview</div>
                  )}

                  {/* Type badge */}
                  {p.is_video && (
                    <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                      <svg width="8" height="8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      VID
                    </div>
                  )}

                  {/* Status badge */}
                  <div className={`absolute top-1.5 right-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${p.status === 1 ? 'bg-emerald-500/90 text-white' : p.status === 2 ? 'bg-red-500/90 text-white' : 'bg-amber-500/90 text-white'}`}>
                    {p.status === 1 ? 'OK' : p.status === 2 ? 'BLK' : 'PND'}
                  </div>

                  {/* Format label bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white/50 text-[9px] truncate">{p.storage_path?.split('/').pop()}</p>
                  </div>

                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                    {p.status !== 1 && (
                      <button onClick={() => approve(p.id)} className="w-full py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold hover:bg-emerald-500/40 transition-colors">Approve</button>
                    )}
                    {p.status !== 0 && (
                      <button onClick={() => reject(p.id)} className="w-full py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold hover:bg-amber-500/40 transition-colors">Review</button>
                    )}
                    {p.status !== 2 && (
                      <button onClick={() => block(p.id)} className="w-full py-1.5 rounded-lg bg-red-500/20 text-red-300 text-[10px] font-bold hover:bg-red-500/40 transition-colors">Block</button>
                    )}
                    <button onClick={() => remove(p.id)} className="w-full py-1.5 rounded-lg bg-white/10 text-white/60 text-[10px] font-bold hover:bg-white/20 transition-colors">Delete</button>
                    {p.event_name && <p className="text-white/40 text-[9px] text-center truncate w-full mt-0.5">{p.event_name}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}

// ── Safety tab ────────────────────────────────────────────────────────────────
function SafetyTab({ photos, onAction }) {
  const pending = photos.filter(p => p.status === 0)
  const blocked = photos.filter(p => p.status === 2)

  async function approve(id) { await supabase.from('media_queue').update({ status: 1 }).eq('id', id); onAction() }
  async function block(id)   { await supabase.from('media_queue').update({ status: 2 }).eq('id', id); onAction() }
  async function remove(id)  { await supabase.from('media_queue').delete().eq('id', id); onAction() }

  function Queue({ items, title, color }) {
    return (
      <div>
        <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${color}`}>{title} <span className="text-white/40">({items.length})</span></h3>
        {items.length === 0
          ? <p className="text-white/25 text-xs mb-6">Queue clear.</p>
          : (
            <div className="space-y-2 mb-6">
              {items.map(p => {
                const thumb = p.cloudinary_public_id
                  ? `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,w_120,h_120,q_70/${p.cloudinary_public_id}`
                  : (p.thumbnail_url || p.original_url)
                return (
                  <div key={p.id} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white/[0.06]">
                      {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-xs truncate">{p.event_name || p.event_id}</p>
                      <p className="text-white/35 text-[10px]">{timeAgo(p.created_at)}</p>
                      {p.device_type && <p className="text-white/25 text-[10px]">{p.device_type}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {p.status !== 1 && <button onClick={() => approve(p.id)} className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-bold hover:bg-emerald-500/30 transition-colors">✓</button>}
                      {p.status !== 2 && <button onClick={() => block(p.id)} className="px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-300 text-[10px] font-bold hover:bg-red-500/30 transition-colors">✕</button>}
                      <button onClick={() => remove(p.id)} className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] text-white/40 text-[10px] font-bold hover:bg-white/[0.12] transition-colors">🗑</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }
      </div>
    )
  }

  return (
    <div>
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
        <svg width="14" height="14" fill="none" stroke="#F59E0B" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <p className="text-amber-300/80 text-xs">AI moderation is not active. Manual review only. <strong className="text-amber-300">{pending.length}</strong> photo{pending.length !== 1 ? 's' : ''} awaiting review.</p>
      </div>
      <Queue items={pending} title="Needs Review" color="text-amber-400" />
      <Queue items={blocked} title="Blocked" color="text-red-400" />
    </div>
  )
}

// ── Technical tab ─────────────────────────────────────────────────────────────
function TechTab({ photos }) {
  const deviceCounts = {}
  photos.forEach(p => {
    const d = p.device_type || 'Unknown'
    deviceCounts[d] = (deviceCounts[d] || 0) + 1
  })
  const total = photos.length || 1
  const devices = Object.entries(deviceCounts).sort((a,b) => b[1]-a[1])

  const today = new Date().toISOString().slice(0,10)
  const photosToday = photos.filter(p => p.created_at?.slice(0,10) === today).length
  const photosTotal = photos.length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Photos Today"  value={fmt(photosToday)} />
        <StatCard label="Total Photos"  value={fmt(photosTotal)} />
        <StatCard label="Device Types"  value={fmt(devices.length)} />
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Device Breakdown</h2>
        {devices.length === 0
          ? <p className="text-white/30 text-sm">No device data yet.</p>
          : (
            <div className="space-y-2">
              {devices.map(([name, count]) => (
                <div key={name} className="flex items-center gap-3">
                  <p className="text-white/70 text-sm w-28 shrink-0">{name}</p>
                  <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-white/30 rounded-full" style={{ width: `${(count/total)*100}%` }} />
                  </div>
                  <p className="text-white/40 text-xs w-10 text-right">{Math.round((count/total)*100)}%</p>
                  <p className="text-white/25 text-xs w-6 text-right">{count}</p>
                </div>
              ))}
            </div>
          )
        }
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Monitoring Notes</p>
        <ul className="space-y-1 text-xs text-white/40">
          <li>• Sentry error tracking: not yet configured</li>
          <li>• API error rate: no server-side logging yet</li>
          <li>• Upload timing: not yet instrumented</li>
          <li>• Gallery load time: not yet instrumented</li>
        </ul>
      </div>
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function approve(id) {
    await supabase.from('profiles').update({ approved: true }).eq('id', id)
    fetchUsers()
  }

  async function revoke(id) {
    await supabase.from('profiles').update({ approved: false }).eq('id', id)
    fetchUsers()
  }

  const pending  = users.filter(u => !u.approved)
  const approved = users.filter(u => u.approved)

  if (loading) return <div className="flex justify-center py-10"><svg className="animate-spin w-5 h-5 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/></svg></div>

  function UserRow({ u, onApprove, onRevoke }) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{u.email}</p>
          <p className="text-white/35 text-xs">{u.full_name || 'No name'} · Joined {timeAgo(u.created_at)}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {onApprove && (
            <button onClick={() => onApprove(u.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-colors">
              Approve
            </button>
          )}
          {onRevoke && (
            <button onClick={() => onRevoke(u.id)} className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/40 text-xs font-bold hover:bg-red-500/20 hover:text-red-300 transition-colors">
              Revoke
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Users"    value={fmt(users.length)} />
        <StatCard label="Pending"        value={fmt(pending.length)}  color={pending.length > 0 ? 'amber' : 'white'} />
        <StatCard label="Approved"       value={fmt(approved.length)} color="green" />
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">Awaiting Approval ({pending.length})</h2>
          <div className="space-y-2">
            {pending.map(u => <UserRow key={u.id} u={u} onApprove={approve} />)}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Approved ({approved.length})</h2>
        {approved.length === 0
          ? <p className="text-white/25 text-sm">No approved users yet.</p>
          : (
            <div className="space-y-2">
              {approved.map(u => <UserRow key={u.id} u={u} onRevoke={revoke} />)}
            </div>
          )
        }
      </div>
    </div>
  )
}

// ── Main AdminDashboard ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const { adminUser, loading, adminSignOut } = useAdminAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [events, setEvents] = useState([])
  const [photos, setPhotos] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const refreshTimer = useRef(null)

  useEffect(() => {
    if (!loading && !adminUser) navigate('/admin/login', { replace: true })
  }, [adminUser, loading, navigate])

  const fetchData = useCallback(async () => {
    const [evRes, phRes] = await Promise.all([
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('media_queue').select('*, events(event_name)').order('created_at', { ascending: false }).limit(500),
    ])
    if (evRes.data) {
      // attach photo/pending/blocked counts to each event
      const enriched = evRes.data.map(ev => ({
        ...ev,
        photo_count:   (phRes.data || []).filter(p => p.event_id === ev.id).length,
        pending_count: (phRes.data || []).filter(p => p.event_id === ev.id && p.status === 0).length,
        blocked_count: (phRes.data || []).filter(p => p.event_id === ev.id && p.status === 2).length,
      }))
      setEvents(enriched)
    }
    if (phRes.data) {
      setPhotos(phRes.data.map(p => ({ ...p, event_name: p.events?.event_name })))
    }
    setLastRefresh(new Date())
    setDataLoading(false)
  }, [])

  useEffect(() => {
    if (adminUser) {
      fetchData()
      refreshTimer.current = setInterval(fetchData, 30000)
      return () => clearInterval(refreshTimer.current)
    }
  }, [adminUser, fetchData])

  // stats derived from live data
  const [pendingUsers, setPendingUsers] = useState(0)
  useEffect(() => {
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('approved', false).then(({ count }) => setPendingUsers(count || 0))
  }, [])

  const stats = {
    activeEvents:  events.filter(e => !e.is_locked).length,
    totalEvents:   events.length,
    photosToday:   photos.filter(p => p.created_at?.slice(0,10) === new Date().toISOString().slice(0,10)).length,
    totalPhotos:   photos.length,
    pendingReview: photos.filter(p => p.status === 0).length,
    approved:      photos.filter(p => p.status === 1).length,
    blocked:       photos.filter(p => p.status === 2).length,
    favorites:     photos.filter(p => p.is_favorited).length,
    storageBytes:  null,
    uploadRate:    photos.length > 0 ? Math.round((photos.filter(p => p.status === 1).length / photos.length) * 100) : 0,
    pendingUsers,
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A08] flex items-center justify-center">
      <svg className="animate-spin w-6 h-6 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" /><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" /></svg>
    </div>
  )

  if (!adminUser) return null

  return (
    <div className="min-h-screen bg-[#0A0A08] flex">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-30 w-56 bg-[#0F0F0D] border-r border-white/[0.06] flex flex-col py-6 px-3 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:h-auto lg:min-h-screen`}>
        <div className="flex items-center gap-2 px-2 mb-8">
          <VantgeLogo size="sm" variant="dark" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-red-400/70 leading-none mt-0.5">Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'}`}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24" className="shrink-0">
                <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item.label}
              {item.id === 'safety' && stats.pendingReview > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{stats.pendingReview}</span>
              )}
              {item.id === 'users' && stats.pendingUsers > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{stats.pendingUsers}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/[0.06] pt-4 mt-4 px-2">
          <p className="text-[10px] text-white/25 truncate mb-2">{adminUser.email}</p>
          <button onClick={adminSignOut} className="w-full py-2 px-3 rounded-xl bg-white/[0.04] text-white/40 text-xs hover:bg-white/[0.08] hover:text-white/70 transition-colors text-left">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-[#0A0A08]/90 backdrop-blur border-b border-white/[0.05] px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-white/50 hover:text-white transition-colors" onClick={() => setSidebarOpen(true)}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h1 className="text-white font-bold text-sm capitalize">{NAV_ITEMS.find(n => n.id === activeTab)?.label}</h1>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && <p className="text-white/25 text-[10px] hidden sm:block">Updated {timeAgo(lastRefresh)}</p>}
            <button onClick={fetchData} disabled={dataLoading} className="text-white/40 hover:text-white transition-colors disabled:opacity-30">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className={dataLoading ? 'animate-spin' : ''}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-5 max-w-6xl w-full mx-auto">
          {dataLoading
            ? <div className="flex items-center justify-center py-20"><svg className="animate-spin w-6 h-6 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/></svg></div>
            : <>
              {activeTab === 'overview' && <OverviewTab stats={stats} events={events} />}
              {activeTab === 'events'   && <LiveEventsTab events={events} onEmergency={fetchData} />}
              {activeTab === 'photos'   && <PhotosTab photos={photos} onAction={fetchData} />}
              {activeTab === 'safety'   && <SafetyTab photos={photos} onAction={fetchData} />}
              {activeTab === 'users'    && <UsersTab />}
              {activeTab === 'tech'     && <TechTab photos={photos} />}
            </>
          }
        </main>
      </div>
    </div>
  )
}

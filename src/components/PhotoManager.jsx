import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getThumbnailUrl, getFullSizeUrl } from '../lib/cloudinary'

export default function PhotoManager({ eventId, status, onAdminPhotoDeleted }) {
      const [photos, setPhotos] = useState([])
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)
      const [toast, setToast] = useState(null)
      const [confirmDelete, setConfirmDelete] = useState(null)
      const [modalPhoto, setModalPhoto] = useState(null)
      const [selectMode, setSelectMode] = useState(false)
      const [selected, setSelected] = useState(new Set())
      const [bulkDeleting, setBulkDeleting] = useState(false)

      useEffect(() => {
            if (!eventId) return
            setLoading(true)

            async function fetchInitial() {
                  const { data, error: queryError } = await supabase
                        .from('media_queue')
                        .select('*')
                        .eq('event_id', eventId)
                        .eq('status', status)
                        .order('created_at', { ascending: false })

                  if (queryError) {
                        setError(queryError.message)
                  } else {
                        setPhotos(data || [])
                  }
                  setLoading(false)
            }

            fetchInitial()

            const channel = supabase
                  .channel(`photos:${eventId}:${status}`)
                  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'media_queue', filter: `event_id=eq.${eventId}` },
                        (payload) => {
                              if (payload.new.status === status) {
                                    setPhotos((current) => {
                                          if (current.some((p) => p.id === payload.new.id)) return current
                                          return [payload.new, ...current]
                                    })
                              }
                        })
                  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'media_queue', filter: `event_id=eq.${eventId}` },
                        (payload) => {
                              if (payload.new.status === status) {
                                    setPhotos((current) => {
                                          if (current.some((p) => p.id === payload.new.id)) return current
                                          return [payload.new, ...current]
                                    })
                              } else {
                                    setPhotos((current) => current.filter((p) => p.id !== payload.new.id))
                              }
                        })
                  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'media_queue', filter: `event_id=eq.${eventId}` },
                        (payload) => {
                              setPhotos((current) => current.filter((p) => p.id !== payload.old.id))
                        })
                  .subscribe()

            return () => supabase.removeChannel(channel)
      }, [eventId, status])

      async function updateStatus(photo, newStatus, toastLabel) {
            setPhotos((current) => current.filter((p) => p.id !== photo.id))
            setModalPhoto(null)

            const { error } = await supabase
                  .from('media_queue')
                  .update({ status: newStatus })
                  .eq('id', photo.id)

            if (error) {
                  alert(`Couldn't update photo: ${error.message}`)
                  window.location.reload()
                  return
            }

            if (toastLabel) {
                  setToast({ label: toastLabel, photo, previousStatus: status, expiresAt: Date.now() + 6000 })
            }
      }

      async function handleUndo() {
            if (!toast) return
            const { error } = await supabase
                  .from('media_queue')
                  .update({ status: toast.previousStatus })
                  .eq('id', toast.photo.id)
            if (error) { alert('Could not undo. Refresh the page.'); return }
            setToast(null)
      }

      async function handleDeleteForever(photo) {
            setConfirmDelete(null)
            setModalPhoto(null)
            setPhotos((current) => current.filter((p) => p.id !== photo.id))
            if (photo.storage_path && !photo.storage_path.startsWith('fake/')) {
                  await supabase.storage.from('event-media').remove([photo.storage_path])
            }
            const { error } = await supabase.from('media_queue').delete().eq('id', photo.id)
            if (error) { alert(`Delete failed: ${error.message}`); window.location.reload() }
            if (photo.is_admin_upload) onAdminPhotoDeleted?.()
      }

      function toggleSelect(id) {
            setSelected(prev => {
                  const next = new Set(prev)
                  next.has(id) ? next.delete(id) : next.add(id)
                  return next
            })
      }

      function exitSelectMode() {
            setSelectMode(false)
            setSelected(new Set())
      }

      async function handleBulkDelete() {
            if (!selected.size) return
            setBulkDeleting(true)
            const ids = Array.from(selected)
            const targets = photos.filter(p => ids.includes(p.id))
            setPhotos(prev => prev.filter(p => !ids.includes(p.id)))
            exitSelectMode()
            for (const photo of targets) {
                  if (photo.storage_path && !photo.storage_path.startsWith('fake/')) {
                        await supabase.storage.from('event-media').remove([photo.storage_path])
                  }
            }
            const { error } = await supabase.from('media_queue').delete().in('id', ids)
            if (error) { alert(`Delete failed: ${error.message}`); window.location.reload() }
            if (targets.some(p => p.is_admin_upload)) onAdminPhotoDeleted?.()
            setBulkDeleting(false)
      }

      if (loading) return <div className="text-center py-12"><p className="text-sm text-[#5A5A52]">Loading photos...</p></div>

      if (error) return <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-sm rounded-lg px-4 py-3">Error: {error}</div>

      if (photos.length === 0) {
            const emptyStates = {
                  0: { title: 'All caught up', message: 'No photos waiting for review.', hint: 'New photos will appear here as guests upload.' },
                  1: { title: 'Gallery is empty', message: 'No approved photos yet.', hint: 'Photos you approve will show up here and in the public gallery.' },
                  2: { title: 'Trash is empty', message: 'No hidden photos.', hint: 'Rejected photos go here. You can restore or permanently delete them.' },
            }
            const cfg = emptyStates[status]
            return (
                  <div className="bg-white rounded-2xl border border-[#E0D8C6] p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-[#F4F3F0] mx-auto mb-4 flex items-center justify-center">
                              <svg className="h-6 w-6 text-[#88887E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-lg font-extrabold text-[#1A1A18] mb-1">{cfg.title}</h3>
                        <p className="text-sm text-[#5A5A52]">{cfg.message}</p>
                        <p className="text-xs text-[#88887E] mt-2">{cfg.hint}</p>
                  </div>
            )
      }

      return (
            <div>
                  <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-extrabold text-[#1A1A18]">
                              {status === 0 ? 'Pending approval' : status === 1 ? 'Live gallery' : 'Trash'}
                        </h2>
                        <div className="flex items-center gap-3">
                              {selectMode && (
                                    <span className="text-xs text-[#88887E]">
                                          {selected.size} selected
                                    </span>
                              )}
                              <span className="text-xs text-[#C84A44] font-semibold tracking-wide uppercase">
                                    {photos.length} {photos.length === 1 ? 'item' : 'items'}
                              </span>
                              {selectMode ? (
                                    <button
                                          onClick={exitSelectMode}
                                          className="text-xs font-bold text-[#88887E] hover:text-[#1A1A18] transition-colors"
                                    >
                                          Cancel
                                    </button>
                              ) : (
                                    <button
                                          onClick={() => setSelectMode(true)}
                                          className="text-xs font-bold text-[#1A1A18] border border-[#E0D8C6] rounded-full px-3 py-1 hover:bg-[#F4F3F0] transition-colors"
                                    >
                                          Select
                                    </button>
                              )}
                        </div>
                  </div>

                  {/* Compact grid — click to expand or select */}
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                        {photos.map((photo) => (
                              <MiniCard
                                    key={photo.id}
                                    photo={photo}
                                    selectMode={selectMode}
                                    selected={selected.has(photo.id)}
                                    onClick={() => selectMode ? toggleSelect(photo.id) : setModalPhoto(photo)}
                              />
                        ))}
                  </div>

                  {/* Bulk action bar */}
                  {selectMode && selected.size > 0 && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#1A1A18] text-white rounded-full pl-5 pr-2 py-2 shadow-2xl">
                              <span className="text-sm font-medium whitespace-nowrap">{selected.size} selected</span>
                              <button
                                    onClick={handleBulkDelete}
                                    disabled={bulkDeleting}
                                    className="bg-[#C84A44] hover:bg-red-700 text-white text-sm font-bold rounded-full px-4 py-1.5 transition-colors disabled:opacity-50"
                              >
                                    {bulkDeleting ? 'Deleting…' : 'Delete'}
                              </button>
                              <button
                                    onClick={() => setSelected(new Set(photos.map(p => p.id)))}
                                    className="text-white/60 hover:text-white text-sm font-bold px-2 py-1.5 transition-colors"
                              >
                                    All
                              </button>
                              <button onClick={exitSelectMode} className="text-white/40 hover:text-white w-8 h-8 flex items-center justify-center text-lg" aria-label="Cancel">×</button>
                        </div>
                  )}

                  <Toast toast={toast} onUndo={handleUndo} onDismiss={() => setToast(null)} />

                  {modalPhoto && (
                        <PhotoModal
                              photo={modalPhoto}
                              status={status}
                              onApprove={() => updateStatus(modalPhoto, 1, 'Photo approved')}
                              onReject={() => updateStatus(modalPhoto, 2, 'Photo rejected')}
                              onRemoveFromGallery={() => updateStatus(modalPhoto, 2, 'Moved to trash')}
                              onRestore={() => updateStatus(modalPhoto, 0, 'Restored to pending')}
                              onDeleteForever={() => setConfirmDelete(modalPhoto)}
                              onClose={() => setModalPhoto(null)}
                        />
                  )}

                  {confirmDelete && (
                        <ConfirmDeleteModal
                              photo={confirmDelete}
                              onConfirm={() => handleDeleteForever(confirmDelete)}
                              onCancel={() => setConfirmDelete(null)}
                        />
                  )}
            </div>
      )
}

function looksLikeVideo(url) {
      if (!url) return false
      return /\.(mp4|mov|webm|avi|mkv|3gp)(\?|$)/i.test(url)
}

// ─── MINI THUMBNAIL CARD ──────────────────────────────────────────────────────
function MiniCard({ photo, onClick, selectMode, selected }) {
      const isVideo = photo.is_video || looksLikeVideo(photo.original_url)
      return (
            <button onClick={onClick}
                  className="relative aspect-square rounded-xl overflow-hidden bg-[#F4F3F0] group focus:outline-none"
                  style={{ outline: selected ? '2.5px solid #1A1A18' : 'none', outlineOffset: '-2px' }}
                  aria-label={`${selectMode ? 'Select' : 'View'} ${isVideo ? 'video' : 'photo'} by ${photo.guest_name || 'Anonymous'}`}>
                  {isVideo ? (
                        photo.thumbnail_url
                              ? <img src={photo.thumbnail_url} alt="" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" />
                              : <video src={photo.original_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                        <img src={getThumbnailUrl(photo.original_url)} alt=""
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" loading="lazy" />
                  )}
                  {isVideo && !selectMode && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <div className="w-6 h-6 rounded-full bg-black/55 flex items-center justify-center">
                                    <svg width="8" height="8" fill="white" viewBox="0 0 24 24" style={{ marginLeft: 1 }}><path d="M8 5v14l11-7z"/></svg>
                              </div>
                        </div>
                  )}
                  {/* Select mode overlay */}
                  {selectMode && (
                        <div className={`absolute inset-0 transition-colors ${selected ? 'bg-black/30' : 'bg-black/0 group-hover:bg-black/10'}`}>
                              <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selected ? 'bg-[#1A1A18] border-[#1A1A18]' : 'bg-white/70 border-white'}`}>
                                    {selected && <svg width="9" height="9" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                        </div>
                  )}
                  {/* Hover zoom hint — only when not selecting */}
                  {!selectMode && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/><path d="M11 8v6M8 11h6" strokeLinecap="round"/></svg>
                        </div>
                  )}
            </button>
      )
}

// ─── PHOTO MODAL ──────────────────────────────────────────────────────────────
function PhotoModal({ photo, status, onApprove, onReject, onRemoveFromGallery, onRestore, onDeleteForever, onClose }) {
      const [processing, setProcessing] = useState(false)
      const isVideo = photo.is_video || looksLikeVideo(photo.original_url)
      const uploadTime = new Date(photo.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

      async function run(fn) {
            setProcessing(true)
            await fn()
      }

      return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
                  onClick={onClose}>
                  <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}>

                        {/* Close button */}
                        <button onClick={onClose} aria-label="Close"
                              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors">
                              <svg width="12" height="12" fill="none" stroke="#1A1A18" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>

                        {/* Media */}
                        <div className="relative bg-[#F4F3F0]" style={{ maxHeight: '60vh' }}>
                              {isVideo ? (
                                    <video src={photo.original_url} controls autoPlay playsInline
                                          className="w-full object-contain" style={{ maxHeight: '60vh' }} />
                              ) : (
                                    <img src={getFullSizeUrl(photo.original_url)}
                                          alt={photo.guest_name ? `Photo by ${photo.guest_name}` : 'Event photo'}
                                          className="w-full object-contain" style={{ maxHeight: '60vh' }} loading="eager" />
                              )}
                              {processing && (
                                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A18" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".2"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/></svg>
                                    </div>
                              )}
                        </div>

                        {/* Info + actions */}
                        <div className="px-5 py-4">
                              <div className="flex items-center justify-between mb-1">
                                    <p className="font-bold text-sm text-[#1A1A18]">{photo.guest_name || 'Anonymous'}</p>
                                    <p className="text-xs text-[#B0AFA5]">{uploadTime}</p>
                              </div>
                              {photo.caption && (
                                    <p className="text-xs text-[#6B6B63] mb-3 leading-snug">"{photo.caption}"</p>
                              )}

                              {/* Actions */}
                              {status === 0 && (
                                    <div className="flex gap-2 mt-3">
                                          <button onClick={() => run(onReject)} disabled={processing}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-[#F7F5F0] hover:bg-[#FEF2F2] text-[#5A5A52] hover:text-[#C84A44] text-sm font-bold rounded-xl py-3 border border-[#E8E4DA] hover:border-[#FECACA] transition-all disabled:opacity-40">
                                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                                                Reject
                                          </button>
                                          <button onClick={() => run(onApprove)} disabled={processing}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-[#1A1A18] hover:bg-black text-white text-sm font-bold rounded-xl py-3 transition-all disabled:opacity-40">
                                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                Approve
                                          </button>
                                    </div>
                              )}

                              {status === 1 && (
                                    <button onClick={() => run(onRemoveFromGallery)} disabled={processing}
                                          className="w-full flex items-center justify-center gap-1.5 bg-[#F7F5F0] hover:bg-[#EFEDE7] text-[#5A5A52] text-sm font-bold rounded-xl py-3 border border-[#E8E4DA] transition-all mt-3 disabled:opacity-40">
                                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                                          Remove from gallery
                                    </button>
                              )}

                              {status === 2 && (
                                    <div className="flex gap-2 mt-3">
                                          <button onClick={() => run(onRestore)} disabled={processing}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-[#F7F5F0] hover:bg-[#EFEDE7] text-[#1A1A18] text-sm font-bold rounded-xl py-3 border border-[#E8E4DA] transition-all disabled:opacity-40">
                                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 12a9 9 0 109-9 9 9 0 00-9 9" strokeLinecap="round"/><path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                Restore
                                          </button>
                                          <button onClick={onDeleteForever} disabled={processing}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#C84A44] text-sm font-bold rounded-xl py-3 border border-[#FECACA] transition-all disabled:opacity-40">
                                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" strokeLinecap="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round"/></svg>
                                                Delete forever
                                          </button>
                                    </div>
                              )}
                        </div>
                  </div>
            </div>
      )
}

function Toast({ toast, onUndo, onDismiss }) {
      const [timeLeft, setTimeLeft] = useState(6)

      useEffect(() => {
            if (!toast) { setTimeLeft(6); return }
            const interval = setInterval(() => {
                  const remaining = Math.ceil((toast.expiresAt - Date.now()) / 1000)
                  if (remaining <= 0) { onDismiss() } else { setTimeLeft(remaining) }
            }, 250)
            return () => clearInterval(interval)
      }, [toast, onDismiss])

      if (!toast) return null

      return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                  <div className="bg-[#1A1A18] text-white rounded-full pl-4 pr-2 py-2 flex items-center gap-3 shadow-2xl">
                        <span className="text-sm font-medium whitespace-nowrap">{toast.label} · {timeLeft}s</span>
                        <button onClick={onUndo} className="bg-white hover:bg-[#F4F3F0] text-[#1A1A18] font-semibold text-sm rounded-full px-4 py-1.5 transition-colors">Undo</button>
                        <button onClick={onDismiss} className="text-white/50 hover:text-white w-8 h-8 flex items-center justify-center text-lg" aria-label="Dismiss">×</button>
                  </div>
            </div>
      )
}

function ConfirmDeleteModal({ photo, onConfirm, onCancel }) {
      return (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6"
                  style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
                  onClick={onCancel}>
                  <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-3xl overflow-hidden"
                        style={{ backgroundColor: '#1A1A18', border: '1px solid rgba(255,255,255,0.08)' }}
                        onClick={e => e.stopPropagation()}>
                        <div className="px-6 pt-7 pb-5 text-center">
                              <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(200,74,68,0.15)', border: '1px solid rgba(200,74,68,0.3)' }}>
                                    <svg width="20" height="20" fill="none" stroke="#C84A44" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                                    </svg>
                              </div>
                              <h3 className="text-base font-extrabold text-white mb-1.5">Delete {photo.is_video ? 'video' : 'photo'} forever?</h3>
                              <p className="text-sm text-white/50 leading-relaxed">This cannot be undone. The file will be permanently removed from storage.</p>
                              {photo.guest_name && <p className="text-xs text-white/30 mt-2 font-bold uppercase tracking-widest">From {photo.guest_name}</p>}
                        </div>
                        <div className="border-t border-white/[0.07] grid grid-cols-2">
                              <button onClick={onCancel} className="py-4 text-sm font-bold text-white/50 hover:text-white transition-colors border-r border-white/[0.07]">Cancel</button>
                              <button onClick={onConfirm} className="py-4 text-sm font-bold transition-colors" style={{ color: '#C84A44' }}>Delete forever</button>
                        </div>
                  </div>
            </div>
      )
}

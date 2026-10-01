import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getThumbnailUrl } from '../lib/cloudinary'

/**
 * Generic photo manager. Renders one tab at a time based on the status prop.
 *
 * Props:
 *   eventId - UUID of the event
 *   status  - 0 (pending), 1 (approved/live), 2 (trashed)
 */
export default function PhotoManager({ eventId, status }) {
      const [photos, setPhotos] = useState([])
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)
      const [toast, setToast] = useState(null)
      const [confirmDelete, setConfirmDelete] = useState(null)

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
                  .on(
                        'postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'media_queue', filter: `event_id=eq.${eventId}` },
                        (payload) => {
                              if (payload.new.status === status) {
                                    setPhotos((current) => {
                                          if (current.some((p) => p.id === payload.new.id)) return current
                                          return [payload.new, ...current]
                                    })
                              }
                        }
                  )
                  .on(
                        'postgres_changes',
                        { event: 'UPDATE', schema: 'public', table: 'media_queue', filter: `event_id=eq.${eventId}` },
                        (payload) => {
                              if (payload.new.status === status) {
                                    setPhotos((current) => {
                                          if (current.some((p) => p.id === payload.new.id)) return current
                                          return [payload.new, ...current]
                                    })
                              } else {
                                    setPhotos((current) => current.filter((p) => p.id !== payload.new.id))
                              }
                        }
                  )
                  .on(
                        'postgres_changes',
                        { event: 'DELETE', schema: 'public', table: 'media_queue', filter: `event_id=eq.${eventId}` },
                        (payload) => {
                              setPhotos((current) => current.filter((p) => p.id !== payload.old.id))
                        }
                  )
                  .subscribe()

            return () => {
                  supabase.removeChannel(channel)
            }
      }, [eventId, status])

      // Change a photo's status. Shared action handler for all tabs.
      async function updateStatus(photo, newStatus, toastLabel) {
            setPhotos((current) => current.filter((p) => p.id !== photo.id))

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
                  setToast({
                        label: toastLabel,
                        photo,
                        previousStatus: status,
                        expiresAt: Date.now() + 6000,
                  })
            }
      }

      async function handleUndo() {
            if (!toast) return
            const { error } = await supabase
                  .from('media_queue')
                  .update({ status: toast.previousStatus })
                  .eq('id', toast.photo.id)

            if (error) {
                  alert('Could not undo. Refresh the page.')
                  return
            }
            setToast(null)
      }

      async function handleDeleteForever(photo) {
            setConfirmDelete(null)
            setPhotos((current) => current.filter((p) => p.id !== photo.id))

            if (photo.storage_path && !photo.storage_path.startsWith('fake/')) {
                  await supabase.storage.from('event-media').remove([photo.storage_path])
            }

            const { error } = await supabase
                  .from('media_queue')
                  .delete()
                  .eq('id', photo.id)

            if (error) {
                  alert(`Delete failed: ${error.message}`)
                  window.location.reload()
            }
      }

      if (loading) {
            return (
                  <div className="text-center py-12">
                        <p className="text-sm text-[#5A5A52]">Loading photos...</p>
                  </div>
            )
      }

      if (error) {
            return (
                  <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-sm rounded-lg px-4 py-3">
                        Error: {error}
                  </div>
            )
      }

      // Empty states per tab
      if (photos.length === 0) {
            const emptyStates = {
                  0: {
                        title: 'All caught up',
                        message: 'No photos waiting for review.',
                        hint: 'New photos will appear here as guests upload.',
                  },
                  1: {
                        title: 'Gallery is empty',
                        message: 'No approved photos yet.',
                        hint: 'Photos you approve will show up here and in the public gallery.',
                  },
                  2: {
                        title: 'Trash is empty',
                        message: 'No hidden photos.',
                        hint: 'Rejected photos go here. You can restore or permanently delete them.',
                  },
            }
            const cfg = emptyStates[status]

            return (
                  <div className="bg-white rounded-2xl border border-[#E0D8C6] p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-[#F4F3F0] mx-auto mb-4 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#88887E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                        </div>
                        <h3 className="text-lg font-extrabold text-[#1A1A18] mb-1">{cfg.title}</h3>
                        <p className="text-sm text-[#5A5A52]">{cfg.message}</p>
                        <p className="text-xs text-[#88887E] mt-2">{cfg.hint}</p>
                  </div>
            )
      }

      return (
            <div>
                  <div className="flex items-baseline justify-between mb-4">
                        <h2 className="text-lg font-extrabold text-[#1A1A18]">
                              {status === 0 ? 'Pending approval' : status === 1 ? 'Live gallery' : 'Trash'}
                        </h2>
                        <span className="text-xs text-[#C84A44] font-semibold tracking-wide uppercase" aria-live="polite">
                              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                        </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {photos.map((photo) => (
                              <PhotoCard
                                    key={photo.id}
                                    photo={photo}
                                    status={status}
                                    onApprove={() => updateStatus(photo, 1, 'Photo approved')}
                                    onReject={() => updateStatus(photo, 2, 'Photo rejected')}
                                    onRemoveFromGallery={() => updateStatus(photo, 2, 'Moved to trash')}
                                    onRestore={() => updateStatus(photo, 0, 'Restored to pending')}
                                    onDeleteForever={() => setConfirmDelete(photo)}
                              />
                        ))}
                  </div>

                  <Toast toast={toast} onUndo={handleUndo} onDismiss={() => setToast(null)} />

                  {confirmDelete ? (
                        <ConfirmDeleteModal
                              photo={confirmDelete}
                              onConfirm={() => handleDeleteForever(confirmDelete)}
                              onCancel={() => setConfirmDelete(null)}
                        />
                  ) : null}
            </div>
      )
}

function looksLikeVideo(url) {
      if (!url) return false
      return /\.(mp4|mov|webm|avi|mkv|3gp)(\?|$)/i.test(url)
}

function VideoLightbox({ photo, status, onApprove, onReject, onClose }) {
      const [processing, setProcessing] = useState(false)

      async function run(fn) {
            setProcessing(true)
            await fn()
            onClose()
      }

      return (
            <div className="fixed inset-0 z-50 flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Video preview" onClick={onClose}>
                  {/* Video player */}
                  <div className="flex-1 flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
                        <video
                              src={photo.original_url}
                              className="max-w-full max-h-full"
                              controls
                              autoPlay
                              playsInline
                        />
                  </div>

                  {/* Bottom panel */}
                  <div className="shrink-0 px-5 py-5 border-t border-white/10" style={{ backgroundColor: '#0a0a0a', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
                        {/* Meta */}
                        <div className="flex items-center justify-between mb-4">
                              <div>
                                    <p className="text-white font-bold text-sm">{photo.guest_name || 'Anonymous'}</p>
                                    <p className="text-white/40 text-xs mt-0.5">
                                          {new Date(photo.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                    </p>
                              </div>
                              <button onClick={onClose} aria-label="Close video preview" className="w-8 h-8 rounded-full flex items-center justify-center border border-white/15" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                    <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                        </div>

                        {/* Actions */}
                        {status === 0 && (
                              <div className="flex gap-2.5">
                                    <button
                                          onClick={() => run(onReject)}
                                          disabled={processing}
                                          className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl font-bold text-sm border border-white/15 text-white/60 disabled:opacity-40 transition-all"
                                          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                                    >
                                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                          Reject
                                    </button>
                                    <button
                                          onClick={() => run(onApprove)}
                                          disabled={processing}
                                          className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-40 transition-all"
                                          style={{ backgroundColor: '#1A1A18' }}
                                    >
                                          {processing ? (
                                                <svg className="animate-spin" width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/></svg>
                                          ) : (
                                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                                          )}
                                          Approve
                                    </button>
                              </div>
                        )}
                  </div>
            </div>
      )
}

function PhotoCard({ photo, status, onApprove, onReject, onRemoveFromGallery, onRestore, onDeleteForever }) {
      const [processing, setProcessing] = useState(false)
      const [videoOpen, setVideoOpen] = useState(false)
      const isVideo = photo.is_video || looksLikeVideo(photo.original_url)

      const uploadTime = new Date(photo.created_at).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
      })

      async function run(fn) {
            setProcessing(true)
            await fn()
      }

      return (
            <>
            {videoOpen && (
                  <VideoLightbox
                        photo={photo}
                        status={status}
                        onApprove={onApprove}
                        onReject={onReject}
                        onClose={() => setVideoOpen(false)}
                  />
            )}
            <div className="bg-white rounded-2xl border border-[#E8E4DA] overflow-hidden shadow-sm group">
                  {/* Photo or Video */}
                  <div
                        className={`aspect-[4/5] bg-[#F4F3F0] relative overflow-hidden${isVideo ? ' cursor-pointer' : ''}`}
                        onClick={isVideo ? () => setVideoOpen(true) : undefined}
                  >
                        {photo.is_video ? (
                              <>
                                    {photo.thumbnail_url ? (
                                          <img
                                                src={photo.thumbnail_url}
                                                alt="Video thumbnail"
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                                                loading="lazy"
                                          />
                                    ) : (
                                          <video
                                                src={photo.original_url}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                                                muted
                                                playsInline
                                                preload="metadata"
                                          />
                                    )}
                                    {/* Play button overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 transition-all group-hover:bg-black/30">
                                          <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                                                <svg width="22" height="22" fill="white" viewBox="0 0 24 24" style={{ marginLeft: 3 }}><path d="M8 5v14l11-7z"/></svg>
                                          </div>
                                    </div>
                                    {/* Video label */}
                                    <div className="absolute top-2 left-2 bg-black/55 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                                          Video · tap to preview
                                    </div>
                              </>
                        ) : looksLikeVideo(photo.original_url) ? (
                              <>
                                    <video
                                          src={photo.original_url}
                                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                                          muted playsInline preload="metadata"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 transition-all group-hover:bg-black/30">
                                          <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
                                                <svg width="22" height="22" fill="white" viewBox="0 0 24 24" style={{ marginLeft: 3 }}><path d="M8 5v14l11-7z"/></svg>
                                          </div>
                                    </div>
                                    <div className="absolute top-2 left-2 bg-black/55 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                                          Video · tap to preview
                                    </div>
                              </>
                        ) : (
                              <img
                                    src={getThumbnailUrl(photo.original_url)}
                                    alt={photo.guest_name ? `Photo by ${photo.guest_name}` : 'Event photo'}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                                    loading="lazy"
                                    onError={(e) => {
                                          e.currentTarget.style.display = 'none'
                                          e.currentTarget.parentElement.innerHTML += `
                                                <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F4F3F0]">
                                                      <svg width="28" height="28" fill="none" stroke="#B0AFA5" stroke-width="1.5" viewBox="0 0 24 24"><path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                                      <p class="text-[10px] font-bold text-[#B0AFA5] uppercase tracking-widest">Video</p>
                                                </div>`
                                    }}
                              />
                        )}
                        {processing && (
                              <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A18" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".2"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/></svg>
                              </div>
                        )}
                  </div>

                  {/* Footer */}
                  <div className="px-3.5 py-3">
                        {/* Caption */}
                        {photo.caption && (
                              <p className="text-xs text-[#1A1A18] leading-snug mb-2 line-clamp-2">"{photo.caption}"</p>
                        )}
                        {/* Guest + time */}
                        <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-bold text-[#1A1A18] truncate mr-2">
                                    {photo.guest_name || 'Anonymous'}
                              </p>
                              <p className="text-[10px] text-[#B0AFA5] shrink-0 tracking-wide">{uploadTime}</p>
                        </div>

                        {/* Actions */}
                        {status === 0 && (
                              <div className="flex gap-2">
                                    <button
                                          onClick={() => run(onApprove)}
                                          disabled={processing}
                                          className="flex-1 flex items-center justify-center gap-1.5 bg-[#1A1A18] hover:bg-black text-white text-[11px] font-bold tracking-wide rounded-xl py-2.5 transition-all active:scale-[0.97] disabled:opacity-40"
                                    >
                                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                          Approve
                                    </button>
                                    <button
                                          onClick={() => run(onReject)}
                                          disabled={processing}
                                          className="flex-1 flex items-center justify-center gap-1.5 bg-[#F7F5F0] hover:bg-[#FEF2F2] text-[#5A5A52] hover:text-[#C84A44] text-[11px] font-bold tracking-wide rounded-xl py-2.5 border border-[#E8E4DA] hover:border-[#FECACA] transition-all active:scale-[0.97] disabled:opacity-40 group/reject"
                                    >
                                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                                          <span className="group-hover/reject:hidden">Reject</span>
                                          <span className="hidden group-hover/reject:inline">Will hide from gallery</span>
                                    </button>
                              </div>
                        )}

                        {status === 1 && (
                              <button
                                    onClick={() => run(onRemoveFromGallery)}
                                    disabled={processing}
                                    className="w-full flex items-center justify-center gap-1.5 bg-[#F7F5F0] hover:bg-[#EFEDE7] text-[#5A5A52] text-[11px] font-bold tracking-wide rounded-xl py-2.5 border border-[#E8E4DA] transition-all active:scale-[0.97] disabled:opacity-40"
                              >
                                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                                    Remove from gallery
                              </button>
                        )}

                        {status === 2 && (
                              <div className="flex gap-2">
                                    <button
                                          onClick={() => run(onRestore)}
                                          disabled={processing}
                                          className="flex-1 flex items-center justify-center gap-1.5 bg-[#F7F5F0] hover:bg-[#EFEDE7] text-[#1A1A18] text-[11px] font-bold tracking-wide rounded-xl py-2.5 border border-[#E8E4DA] transition-all active:scale-[0.97] disabled:opacity-40"
                                    >
                                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 12a9 9 0 109-9 9 9 0 00-9 9" strokeLinecap="round"/><path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                          Restore
                                    </button>
                                    <button
                                          onClick={onDeleteForever}
                                          disabled={processing}
                                          className="flex-1 flex items-center justify-center gap-1.5 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#C84A44] text-[11px] font-bold tracking-wide rounded-xl py-2.5 border border-[#FECACA] transition-all active:scale-[0.97] disabled:opacity-40"
                                    >
                                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" strokeLinecap="round"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round"/><path d="M10 11v6M14 11v6" strokeLinecap="round"/></svg>
                                          Delete
                                    </button>
                              </div>
                        )}
                  </div>
            </div>
            </>
      )
}

function Toast({ toast, onUndo, onDismiss }) {
      const [timeLeft, setTimeLeft] = useState(6)

      useEffect(() => {
            if (!toast) {
                  setTimeLeft(6)
                  return
            }
            const interval = setInterval(() => {
                  const remaining = Math.ceil((toast.expiresAt - Date.now()) / 1000)
                  if (remaining <= 0) {
                        onDismiss()
                  } else {
                        setTimeLeft(remaining)
                  }
            }, 250)
            return () => clearInterval(interval)
      }, [toast, onDismiss])

      if (!toast) return null

      return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                  <div className="bg-[#1A1A18] text-white rounded-full pl-4 pr-2 py-2 flex items-center gap-3 shadow-2xl">
                        <span className="text-sm font-medium whitespace-nowrap">
                              {toast.label} · {timeLeft}s
                        </span>
                        <button
                              onClick={onUndo}
                              className="bg-white hover:bg-[#F4F3F0] text-[#1A1A18] font-semibold text-sm rounded-full px-4 py-1.5 transition-colors"
                        >
                              Undo
                        </button>
                        <button
                              onClick={onDismiss}
                              className="text-white/50 hover:text-white w-8 h-8 flex items-center justify-center text-lg"
                              aria-label="Dismiss"
                        >
                              ×
                        </button>
                  </div>
            </div>
      )
}

function ConfirmDeleteModal({ photo, onConfirm, onCancel }) {
      return (
            <div
                  className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
                  style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
                  onClick={onCancel}
            >
                  <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-modal-title"
                        className="w-full max-w-sm rounded-3xl overflow-hidden"
                        style={{ backgroundColor: '#1A1A18', border: '1px solid rgba(255,255,255,0.08)' }}
                        onClick={(e) => e.stopPropagation()}
                  >
                        {/* Icon + text */}
                        <div className="px-6 pt-7 pb-5 text-center">
                              <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(200,74,68,0.15)', border: '1px solid rgba(200,74,68,0.3)' }}>
                                    <svg width="20" height="20" fill="none" stroke="#C84A44" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                                    </svg>
                              </div>
                              <h3 id="delete-modal-title" className="text-base font-extrabold text-white mb-1.5">
                                    Delete {photo.is_video ? 'video' : 'photo'} forever?
                              </h3>
                              <p className="text-sm text-white/50 leading-relaxed">
                                    This cannot be undone. The file will be permanently removed from storage.
                              </p>
                              {photo.guest_name && (
                                    <p className="text-xs text-white/30 mt-2 font-bold uppercase tracking-widest">
                                          From {photo.guest_name}
                                    </p>
                              )}
                        </div>

                        {/* Buttons */}
                        <div className="border-t border-white/[0.07] grid grid-cols-2">
                              <button
                                    onClick={onCancel}
                                    className="py-4 text-sm font-bold text-white/50 hover:text-white transition-colors border-r border-white/[0.07]"
                              >
                                    Cancel
                              </button>
                              <button
                                    onClick={onConfirm}
                                    className="py-4 text-sm font-bold transition-colors"
                                    style={{ color: '#C84A44' }}
                              >
                                    Delete forever
                              </button>
                        </div>
                  </div>
            </div>
      )
}
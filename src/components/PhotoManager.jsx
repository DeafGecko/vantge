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
                        <span className="text-xs text-[#C84A44] font-semibold tracking-wide uppercase">
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

function PhotoCard({ photo, status, onApprove, onReject, onRemoveFromGallery, onRestore, onDeleteForever }) {
      const [processing, setProcessing] = useState(false)

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
            <div className="bg-white rounded-2xl border border-[#E0D8C6] overflow-hidden">
                  <div className="aspect-[4/5] bg-[#F4F3F0] relative">
                        <img
                              src={getThumbnailUrl(photo.original_url)}
                              alt="Event photo"
                              className="w-full h-full object-cover"
                              loading="lazy"
                        />
                  </div>

                  <div className="p-3">
                        <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-medium text-[#1A1A18]">
                                    {photo.guest_name || 'Anonymous'}
                              </p>
                              <p className="text-xs text-[#88887E]">{uploadTime}</p>
                        </div>

                        {status === 0 ? (
                              <div className="flex gap-2">
                                    <button
                                          onClick={() => run(onApprove)}
                                          disabled={processing}
                                          className="flex-1 bg-[#16A34A] hover:bg-[#15803D] text-white font-medium rounded-lg py-2 px-3 text-sm transition-colors active:scale-[0.98] disabled:opacity-50"
                                    >
                                          ✓ Approve
                                    </button>
                                    <button
                                          onClick={() => run(onReject)}
                                          disabled={processing}
                                          className="flex-1 bg-[#C84A44] hover:bg-[#B43E39] text-white font-medium rounded-lg py-2 px-3 text-sm transition-colors active:scale-[0.98] disabled:opacity-50"
                                    >
                                          ✕ Reject
                                    </button>
                              </div>
                        ) : null}

                        {status === 1 ? (
                              <button
                                    onClick={() => run(onRemoveFromGallery)}
                                    disabled={processing}
                                    className="w-full bg-[#F4F3F0] hover:bg-[#E8E5DC] text-[#5A5A52] border border-[#E0D8C6] font-medium rounded-lg py-2 px-3 text-sm transition-colors active:scale-[0.98] disabled:opacity-50"
                              >
                                    Remove from gallery
                              </button>
                        ) : null}

                        {status === 2 ? (
                              <div className="flex gap-2">
                                    <button
                                          onClick={() => run(onRestore)}
                                          disabled={processing}
                                          className="flex-1 bg-[#F4F3F0] hover:bg-[#E8E5DC] text-[#1A1A18] border border-[#E0D8C6] font-medium rounded-lg py-2 px-3 text-sm transition-colors active:scale-[0.98] disabled:opacity-50"
                                    >
                                          Restore
                                    </button>
                                    <button
                                          onClick={onDeleteForever}
                                          disabled={processing}
                                          className="flex-1 bg-[#C84A44] hover:bg-[#B43E39] text-white font-medium rounded-lg py-2 px-3 text-sm transition-colors active:scale-[0.98] disabled:opacity-50"
                                    >
                                          Delete forever
                                    </button>
                              </div>
                        ) : null}
                  </div>
            </div>
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
                  className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
                  onClick={onCancel}
            >
                  <div
                        className="bg-white rounded-2xl max-w-sm w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                  >
                        <h3 className="text-lg font-extrabold text-[#1A1A18] mb-2">
                              Delete this photo forever?
                        </h3>
                        <p className="text-sm text-[#5A5A52] mb-1">
                              This cannot be undone. The photo file will be permanently deleted.
                        </p>
                        <p className="text-xs text-[#88887E] mb-5">
                              Guest: {photo.guest_name || 'Anonymous'}
                        </p>

                        <div className="flex gap-2">
                              <button
                                    onClick={onCancel}
                                    className="flex-1 bg-[#F4F3F0] hover:bg-[#E8E5DC] text-[#1A1A18] border border-[#E0D8C6] font-medium rounded-full py-2.5 px-4 text-sm transition-colors"
                              >
                                    Cancel
                              </button>
                              <button
                                    onClick={onConfirm}
                                    className="flex-1 bg-[#C84A44] hover:bg-[#B43E39] text-white font-medium rounded-full py-2.5 px-4 text-sm transition-colors"
                              >
                                    Delete forever
                              </button>
                        </div>
                  </div>
            </div>
      )
}
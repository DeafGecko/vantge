import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getThumbnailUrl } from '../lib/cloudinary'

export default function ApprovalQueue({ eventId }) {
      const [pendingPhotos, setPendingPhotos] = useState([])
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)
      const [toast, setToast] = useState(null)

      useEffect(() => {
            if (!eventId) return

            async function fetchInitial() {
                  const { data, error: queryError } = await supabase
                        .from('media_queue')
                        .select('*')
                        .eq('event_id', eventId)
                        .eq('status', 0)
                        .order('created_at', { ascending: false })

                  if (queryError) {
                        setError(queryError.message)
                  } else {
                        setPendingPhotos(data || [])
                  }
                  setLoading(false)
            }

            fetchInitial()

            const channel = supabase
                  .channel(`media_queue:${eventId}`)
                  .on(
                        'postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'media_queue', filter: `event_id=eq.${eventId}` },
                        (payload) => {
                              if (payload.new.status === 0) {
                                    setPendingPhotos((current) => {
                                          // Avoid duplicates
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
                              if (payload.new.status === 0) {
                                    // Photo moved BACK to pending (from undo)
                                    setPendingPhotos((current) => {
                                          if (current.some((p) => p.id === payload.new.id)) return current
                                          return [payload.new, ...current]
                                    })
                              } else {
                                    // Photo moved OUT of pending
                                    setPendingPhotos((current) => current.filter((p) => p.id !== payload.new.id))
                              }
                        }
                  )
                  .on(
                        'postgres_changes',
                        { event: 'DELETE', schema: 'public', table: 'media_queue', filter: `event_id=eq.${eventId}` },
                        (payload) => {
                              setPendingPhotos((current) => current.filter((p) => p.id !== payload.old.id))
                        }
                  )
                  .subscribe()

            return () => {
                  supabase.removeChannel(channel)
            }
      }, [eventId])

      /**
       * Approve: sets status = 1. Photo appears in gallery.
       */
      async function handleApprove(photo) {
            setPendingPhotos((current) => current.filter((p) => p.id !== photo.id))

            const { error } = await supabase
                  .from('media_queue')
                  .update({ status: 1 })
                  .eq('id', photo.id)

            if (error) {
                  console.error('Approve failed:', error)
                  alert(`Couldn't approve photo: ${error.message}. Refreshing...`)
                  window.location.reload()
                  return
            }

            setToast({
                  type: 'approve',
                  photo: photo,
                  expiresAt: Date.now() + 6000,
            })
      }

      /**
       * Reject: sets status = 2. Photo hidden but still in DB for undo.
       */
      async function handleReject(photo) {
            setPendingPhotos((current) => current.filter((p) => p.id !== photo.id))

            const { error } = await supabase
                  .from('media_queue')
                  .update({ status: 2 })
                  .eq('id', photo.id)

            if (error) {
                  console.error('Reject failed:', error)
                  alert(`Couldn't reject photo: ${error.message}. Refreshing...`)
                  window.location.reload()
                  return
            }

            setToast({
                  type: 'reject',
                  photo: photo,
                  expiresAt: Date.now() + 6000,
            })
      }

      /**
       * Undo: puts the photo back in the pending queue.
       */
      async function handleUndo() {
            if (!toast) return

            const photoId = toast.photo.id

            const { error } = await supabase
                  .from('media_queue')
                  .update({ status: 0 })
                  .eq('id', photoId)

            if (error) {
                  console.error('Undo failed:', error)
                  alert('Could not undo. Refresh the page.')
                  return
            }

            setToast(null)
      }

      if (loading) {
            return (
                  <div className="text-center py-12">
                        <p className="text-sm text-[#5A5A52]">Loading pending photos...</p>
                  </div>
            )
      }

      if (error) {
            return (
                  <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-sm rounded-lg px-4 py-3">
                        Error loading queue: {error}
                  </div>
            )
      }

      return (
            <div>
                  {pendingPhotos.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-[#E0D8C6] p-8 text-center">
                              <div className="w-12 h-12 rounded-full bg-[#F4F3F0] mx-auto mb-4 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#88887E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                              </div>
                              <h3 className="text-lg font-extrabold text-[#1A1A18] mb-1">All caught up</h3>
                              <p className="text-sm text-[#5A5A52]">No photos waiting for review.</p>
                              <p className="text-xs text-[#88887E] mt-2">
                                    New photos will appear here instantly as guests upload.
                              </p>
                        </div>
                  ) : (
                        <>
                              <div className="flex items-baseline justify-between mb-4">
                                    <h2 className="text-lg font-extrabold text-[#1A1A18]">Pending approval</h2>
                                    <span className="text-xs text-[#C84A44] font-semibold tracking-wide uppercase">
                                          {pendingPhotos.length} {pendingPhotos.length === 1 ? 'photo' : 'photos'}
                                    </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {pendingPhotos.map((photo) => (
                                          <PhotoCard
                                                key={photo.id}
                                                photo={photo}
                                                onApprove={() => handleApprove(photo)}
                                                onReject={() => handleReject(photo)}
                                          />
                                    ))}
                              </div>
                        </>
                  )}

                  <Toast
                        toast={toast}
                        onUndo={handleUndo}
                        onDismiss={() => setToast(null)}
                  />
            </div>
      )
}

function PhotoCard({ photo, onApprove, onReject }) {
      const [processing, setProcessing] = useState(false)

      const uploadTime = new Date(photo.created_at).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
      })

      async function handleClick(action) {
            setProcessing(true)
            if (action === 'approve') await onApprove()
            if (action === 'reject') await onReject()
      }

      return (
            <div className="bg-white rounded-2xl border border-[#E0D8C6] overflow-hidden">
                  <div className="aspect-[4/5] bg-[#F4F3F0] relative">
                        <img
                              src={getThumbnailUrl(photo.original_url)}
                              alt="Pending photo"
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

                        <div className="flex gap-2">
                              <button
                                    onClick={() => handleClick('approve')}
                                    disabled={processing}
                                    className="flex-1 bg-[#16A34A] hover:bg-[#15803D] text-white font-medium rounded-lg py-2 px-3 text-sm transition-colors active:scale-[0.98] disabled:opacity-50"
                              >
                                    ✓ Approve
                              </button>
                              <button
                                    onClick={() => handleClick('reject')}
                                    disabled={processing}
                                    className="flex-1 bg-[#C84A44] hover:bg-[#B43E39] text-white font-medium rounded-lg py-2 px-3 text-sm transition-colors active:scale-[0.98] disabled:opacity-50"
                              >
                                    ✕ Reject
                              </button>
                        </div>
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

      const label = toast.type === 'approve' ? 'Photo approved' : 'Photo rejected'
      const iconBg = toast.type === 'approve' ? 'bg-[#16A34A]' : 'bg-[#C84A44]'
      const iconChar = toast.type === 'approve' ? '✓' : '✕'

      return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                  <div className="bg-[#1A1A18] text-white rounded-full pl-2 pr-2 py-2 flex items-center gap-3 shadow-2xl">
                        <span className={`${iconBg} w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold`}>
                              {iconChar}
                        </span>
                        <span className="text-sm font-medium whitespace-nowrap">
                              {label} · {timeLeft}s
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
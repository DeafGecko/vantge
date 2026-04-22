import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getThumbnailUrl } from '../lib/cloudinary'


export default function ApprovalQueue({ eventId }) {
      const [pendingPhotos, setPendingPhotos] = useState([])
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)

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
                                    setPendingPhotos((current) => [payload.new, ...current])
                              }
                        }
                  )
                  .on(
                        'postgres_changes',
                        { event: 'UPDATE', schema: 'public', table: 'media_queue', filter: `event_id=eq.${eventId}` },
                        (payload) => {
                              if (payload.new.status !== 0) {
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
       * Approve: sets status = 1. Photo disappears from queue, appears in gallery.
       */
      async function handleApprove(photoId) {
            // Optimistic update — remove immediately from UI
            setPendingPhotos((current) => current.filter((p) => p.id !== photoId))

            const { error } = await supabase
                  .from('media_queue')
                  .update({ status: 1 })
                  .eq('id', photoId)

            if (error) {
                  console.error('Approve failed:', error)
                  // Reload if something went wrong
                  alert(`Couldn't approve photo: ${error.message}. Refreshing...`)
                  window.location.reload()
            }
      }

      /**
       * Reject: deletes the file from Storage AND the row from the database.
       */
      async function handleReject(photoId, storagePath) {
            // Optimistic update — remove immediately from UI
            setPendingPhotos((current) => current.filter((p) => p.id !== photoId))

            // Delete the file from Storage (if it's a real path, not a fake test URL)
            if (storagePath && !storagePath.startsWith('fake/')) {
                  await supabase.storage.from('event-media').remove([storagePath])
            }

            // Delete the row from the database
            const { error } = await supabase
                  .from('media_queue')
                  .delete()
                  .eq('id', photoId)

            if (error) {
                  console.error('Reject failed:', error)
                  alert(`Couldn't reject photo: ${error.message}. Refreshing...`)
                  window.location.reload()
            }
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

      if (pendingPhotos.length === 0) {
            return (
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
            )
      }

      return (
            <div>
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
                                    onApprove={() => handleApprove(photo.id)}
                                    onReject={() => handleReject(photo.id, photo.storage_path)}
                              />
                        ))}
                  </div>
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
            // No need to reset processing — card disappears after success
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
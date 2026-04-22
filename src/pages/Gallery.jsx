import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getThumbnailUrl, getFullSizeUrl } from '../lib/cloudinary'

export default function Gallery() {
      const { eventSlug } = useParams()
      const [event, setEvent] = useState(null)
      const [photos, setPhotos] = useState([])
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)
      const [lightboxIndex, setLightboxIndex] = useState(null)

      useEffect(() => {
            async function fetchData() {
                  setLoading(true)

                  // Step 1: find the event by slug
                  const { data: eventData, error: eventError } = await supabase
                        .from('events')
                        .select('*')
                        .eq('event_slug', eventSlug)
                        .maybeSingle()

                  if (eventError || !eventData) {
                        setError('Event not found')
                        setLoading(false)
                        return
                  }

                  setEvent(eventData)

                  // Step 2: if the gallery is locked, stop here
                  if (!eventData.gallery_unlocked) {
                        setLoading(false)
                        return
                  }

                  // Step 3: fetch all approved photos (status = 1)
                  const { data: photoData, error: photoError } = await supabase
                        .from('media_queue')
                        .select('*')
                        .eq('event_id', eventData.id)
                        .eq('status', 1)
                        .order('created_at', { ascending: false })

                  if (photoError) {
                        setError(photoError.message)
                  } else {
                        setPhotos(photoData || [])
                  }
                  setLoading(false)
            }

            fetchData()

            // Realtime: when a new photo is approved, add it to the gallery live
            const channel = supabase
                  .channel(`gallery:${eventSlug}`)
                  .on(
                        'postgres_changes',
                        { event: 'UPDATE', schema: 'public', table: 'media_queue' },
                        (payload) => {
                              // Photo just got approved → add to top of gallery
                              if (payload.new.status === 1 && payload.old.status === 0) {
                                    setPhotos((current) => [payload.new, ...current])
                              }
                        }
                  )
                  .subscribe()

            return () => {
                  supabase.removeChannel(channel)
            }
      }, [eventSlug])

      // Loading state
      if (loading) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-6">
                        <p className="text-sm text-[#88887E]">Loading gallery...</p>
                  </div>
            )
      }

      // Error / not found
      if (error || !event) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-6">
                        <div className="max-w-sm text-center">
                              <h1 className="text-2xl font-extrabold text-[#1A1A18] mb-2">Gallery not found</h1>
                              <p className="text-sm text-[#5A5A52]">
                                    We couldn't find that event. Double-check the link.
                              </p>
                        </div>
                  </div>
            )
      }

      // Gallery locked
      if (!event.gallery_unlocked) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-6">
                        <div className="max-w-md text-center">
                              <div className="w-12 h-12 rounded-full bg-white border border-[#E0D8C6] mx-auto mb-5 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#5A5A52]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                              </div>
                              <p className="text-xs text-[#88887E] tracking-wide uppercase mb-2">
                                    {event.event_name}
                              </p>
                              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1A18] mb-3">
                                    Gallery opens <span className="text-[#C84A44]">soon</span>.
                              </h1>
                              <p className="text-sm text-[#5A5A52] leading-relaxed">
                                    The host hasn't opened the gallery yet. Check back after the event — your photos will live here.
                              </p>
                              <Link
                                    to={`/${event.event_slug}`}
                                    className="inline-block mt-6 text-sm text-[#5A5A52] hover:text-[#C84A44] transition-colors"
                              >
                                    ← Back to event
                              </Link>
                        </div>
                  </div>
            )
      }

      // Empty gallery (unlocked but no photos yet)
      if (photos.length === 0) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-6">
                        <div className="max-w-md text-center">
                              <p className="text-xs text-[#88887E] tracking-wide uppercase mb-2">
                                    {event.event_name}
                              </p>
                              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1A18] mb-3">
                                    The gallery is <span className="text-[#C84A44]">open</span>.
                              </h1>
                              <p className="text-sm text-[#5A5A52]">
                                    No photos yet — be the first.
                              </p>
                              <Link
                                    to={`/${event.event_slug}/camera`}
                                    className="inline-block mt-6 bg-[#C84A44] hover:bg-[#B43E39] text-white font-medium rounded-full py-3 px-6 transition-colors text-sm"
                              >
                                    Open camera
                              </Link>
                        </div>
                  </div>
            )
      }

      // Populated gallery
      return (
            <div className="min-h-screen bg-cream">
                  {/* Header */}
                  <header className="px-6 pt-10 pb-6 text-center">
                        <p className="text-xs text-[#88887E] tracking-wide uppercase mb-2">
                              {event.event_name}
                        </p>
                        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1A1A18] mb-2">
                              The <span className="text-[#C84A44]">gallery</span>.
                        </h1>
                        <p className="text-sm text-[#5A5A52]">
                              {photos.length} {photos.length === 1 ? 'photo' : 'photos'} from your guests
                        </p>
                  </header>

                  {/* Photo grid */}
                  <div className="px-4 sm:px-6 pb-16">
                        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                              {photos.map((photo, index) => (
                                    <button
                                          key={photo.id}
                                          onClick={() => setLightboxIndex(index)}
                                          className="aspect-square bg-[#F4F3F0] overflow-hidden rounded-lg hover:opacity-90 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-[#C84A44]"
                                    >
                                          <img
                                                src={getThumbnailUrl(photo.original_url)}
                                                alt={photo.guest_name ? `Photo by ${photo.guest_name}` : 'Event photo'}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                          />
                                    </button>
                              ))}
                        </div>
                  </div>

                  {/* Footer */}
                  <footer className="text-center pb-8">
                        <Link
                              to={`/${event.event_slug}/camera`}
                              className="inline-block bg-[#C84A44] hover:bg-[#B43E39] text-white font-medium rounded-full py-3 px-6 transition-colors text-sm"
                        >
                              Add your photo
                        </Link>
                        <p className="text-xs text-[#88887E] mt-4">powered by vantge</p>
                  </footer>

                  {/* Lightbox overlay */}
                  {lightboxIndex !== null && (
                        <Lightbox
                              photos={photos}
                              initialIndex={lightboxIndex}
                              onClose={() => setLightboxIndex(null)}
                        />
                  )}
            </div>
      )
}

/**
 * Full-screen photo viewer.
 */
function Lightbox({ photos, initialIndex, onClose }) {
      const [index, setIndex] = useState(initialIndex)
      const photo = photos[index]

      function next() {
            setIndex((i) => (i + 1) % photos.length)
      }

      function prev() {
            setIndex((i) => (i - 1 + photos.length) % photos.length)
      }

      // Keyboard navigation
      useEffect(() => {
            function handleKey(e) {
                  if (e.key === 'Escape') onClose()
                  if (e.key === 'ArrowRight') next()
                  if (e.key === 'ArrowLeft') prev()
            }
            window.addEventListener('keydown', handleKey)
            return () => window.removeEventListener('keydown', handleKey)
      }, [])

      return (
            <div
                  className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                  onClick={onClose}
            >
                  {/* Close button */}
                  <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light w-12 h-12 flex items-center justify-center"
                        aria-label="Close"
                  >
                        ×
                  </button>

                  {/* Counter */}
                  <p className="absolute top-4 left-4 text-white/70 text-sm">
                        {index + 1} / {photos.length}
                  </p>

                  {/* Photo */}
                  <img
                        src={getFullSizeUrl(photo.original_url)}
                        alt=""
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-full max-h-[85vh] object-contain"
                  />

                  {/* Prev button */}
                  {photos.length > 1 && (
                        <button
                              onClick={(e) => { e.stopPropagation(); prev() }}
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl w-12 h-12 flex items-center justify-center"
                              aria-label="Previous"
                        >
                              ‹
                        </button>
                  )}

                  {/* Next button */}
                  {photos.length > 1 && (
                        <button
                              onClick={(e) => { e.stopPropagation(); next() }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl w-12 h-12 flex items-center justify-center"
                              aria-label="Next"
                        >
                              ›
                        </button>
                  )}

                  {/* Guest name caption */}
                  {photo.guest_name && (
                        <p className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-sm">
                              {photo.guest_name}
                        </p>
                  )}
            </div>
      )
}
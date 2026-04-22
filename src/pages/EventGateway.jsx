import { useParams, Link } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'

export default function EventGateway() {
      const { eventSlug } = useParams()
      const { event, loading, error } = useEvent(eventSlug)

      // Loading state — while Supabase query is in flight
      if (loading) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-8">
                        <p className="text-sm text-[#5A5A52]">Loading event...</p>
                  </div>
            )
      }

      // Error state — something broke (bad connection, RLS issue, etc.)
      if (error) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-8">
                        <div className="max-w-md w-full text-center">
                              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1A18] mb-2">
                                    Something went wrong
                              </h1>
                              <p className="text-sm text-[#5A5A52]">{error}</p>
                        </div>
                  </div>
            )
      }

      // Event not found — slug doesn't match any event in the database
      if (!event) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-8">
                        <div className="max-w-md w-full text-center">
                              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1A18] mb-3">
                                    Event not found
                              </h1>
                              <p className="text-sm text-[#5A5A52] mb-6">
                                    We couldn't find an event at this address. Double-check the link from your host.
                              </p>
                              <Link
                                    to="/"
                                    className="inline-block text-sm text-[#C84A44] font-medium hover:text-[#B43E39] transition-colors"
                              >
                                    ← Back to home
                              </Link>
                        </div>
                  </div>
            )
      }

      // Event found — render the real gateway page
      return (
            <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
                  <div className="max-w-md w-full text-center">

                        {/* Small coral pill at the top — brand accent */}
                        <div className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-1 mb-8 border border-[#E0D8C6]">
                              <span className="w-2 h-2 rounded-full bg-[#E8615C]"></span>
                              <span className="text-xs font-medium text-[#1A1A18]">Event gallery</span>
                        </div>

                        {/* Event name — display typography */}
                        <h1 className="text-5xl font-extrabold tracking-tight text-[#1A1A18] leading-[1.05] mb-4">
                              {event.event_name}
                        </h1>

                        {/* Welcome message — if one is set */}
                        {event.welcome_message && (
                              <p className="text-base text-[#5A5A52] leading-relaxed mb-10 max-w-sm mx-auto">
                                    {event.welcome_message}
                              </p>
                        )}

                        {/* Primary CTA — Open Camera button */}
                        <Link
                              to={`/${eventSlug}/camera`}
                              className="block w-full bg-[#C84A44] hover:bg-[#B43E39] text-white font-medium rounded-full py-4 px-6 transition-colors text-base mb-3 text-center"
                        >
                              Open camera
                        </Link>

                        {/* Gallery button — only shows if host has unlocked the gallery */}
                        {event.gallery_unlocked && (
                              <Link
                                    to={`/gallery/${event.event_slug}`}
                                    className="block w-full bg-white hover:bg-[#FDFCF7] text-[#1A1A18] font-medium rounded-full py-4 px-6 border border-[#1A1A18] transition-colors text-base"
                              >
                                    View gallery
                              </Link>
                        )}

                        {/* Footer — tiny brand wordmark */}
                        <p className="mt-12 text-xs text-[#88887E] tracking-wide">
                              powered by <span className="font-semibold text-[#1A1A18]">vantge</span>
                        </p>

                  </div>
            </div>
      )
}
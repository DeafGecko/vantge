import { useParams, Link } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'

export default function EventGateway() {
      const { eventSlug } = useParams()
      const { event, loading, error } = useEvent(eventSlug)

      if (loading) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-8">
                        <p className="text-sm text-[#5A5A52]">Loading event...</p>
                  </div>
            )
      }

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

      return (
            <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
                  <div className="max-w-md w-full text-center">

                        {/* Small coral pill at the top */}
                        <div className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-1 mb-8 border border-[#E0D8C6]">
                              <span className="w-2 h-2 rounded-full bg-[#E8615C]"></span>
                              <span className="text-xs font-medium text-[#1A1A18]">Event gallery</span>
                        </div>

                        {/* Event name */}
                        <h1 className="text-5xl font-extrabold tracking-tight text-[#1A1A18] leading-[1.05] mb-4">
                              {event.event_name}
                        </h1>

                        {/* Welcome message */}
                        {event.welcome_message && (
                              <p className="text-base text-[#5A5A52] leading-relaxed mb-10 max-w-sm mx-auto">
                                    {event.welcome_message}
                              </p>
                        )}

                        {/* Two upload options side-by-side */}
                        <div className="flex gap-2 mb-3">

                              {/* Open camera (coral) */}
                              <Link
                                    to={`/${eventSlug}/camera`}
                                    className="flex-1 bg-[#C84A44] hover:bg-[#B43E39] text-white font-medium rounded-full py-4 px-4 transition-colors text-sm text-center inline-flex items-center justify-center gap-2"
                              >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Take photo
                              </Link>

                              {/* Choose from gallery (warm neutral) */}
                              <Link
                                    to={`/${eventSlug}/upload`}
                                    className="flex-1 bg-white hover:bg-[#FDFCF7] text-[#1A1A18] font-medium rounded-full py-4 px-4 border border-[#E0D8C6] transition-colors text-sm text-center inline-flex items-center justify-center gap-2"
                              >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Choose photos
                              </Link>
                        </div>

                        <p className="text-xs text-[#88887E] mb-10">
                              Pick up to 10 photos from your gallery
                        </p>

                        {/* View gallery button — only shows when gallery is unlocked */}
                        {event.gallery_unlocked && (
                              <Link
                                    to={`/gallery/${event.event_slug}`}
                                    className="block w-full bg-transparent hover:bg-white text-[#1A1A18] font-medium rounded-full py-4 px-6 border border-[#1A1A18] transition-colors text-base"
                              >
                                    View gallery
                              </Link>
                        )}

                        {/* Footer */}
                        <p className="mt-12 text-xs text-[#88887E] tracking-wide">
                              powered by <span className="font-semibold text-[#1A1A18]">vantge</span>
                        </p>

                  </div>
            </div>
      )
}
import { useParams, Link } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import { getTheme } from '../lib/themes'

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

      // Apply the event's theme
      const theme = getTheme(event.theme)
      const c = theme.colors

      return (
            <div
                  className="min-h-screen flex flex-col items-center justify-center p-6"
                  style={{ backgroundColor: c.bg }}
            >
                  <div className="max-w-md w-full text-center">

                        {/* Small pill at the top — brand accent */}
                        <div
                              className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-8 border"
                              style={{
                                    backgroundColor: c.surface,
                                    borderColor: c.border,
                              }}
                        >
                              <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: c.accentSoft }}
                              />
                              <span
                                    className="text-xs font-medium"
                                    style={{ color: c.text }}
                              >
                                    Event gallery
                              </span>
                        </div>

                        {/* Event name */}
                        <h1
                              className="text-5xl font-extrabold tracking-tight leading-[1.05] mb-4"
                              style={{ color: c.text }}
                        >
                              {event.event_name}
                        </h1>

                        {/* Welcome message */}
                        {event.welcome_message && (
                              <p
                                    className="text-base leading-relaxed mb-10 max-w-sm mx-auto"
                                    style={{ color: c.textMuted }}
                              >
                                    {event.welcome_message}
                              </p>
                        )}

                        {/* Two upload options side-by-side */}
                        <div className="flex gap-2 mb-3">

                              {/* Take photo (accent) */}
                              <Link
                                    to={`/${eventSlug}/camera`}
                                    className="flex-1 font-medium rounded-full py-4 px-4 transition-colors text-sm text-center inline-flex items-center justify-center gap-2 text-white"
                                    style={{ backgroundColor: c.accent }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = c.accentHover }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = c.accent }}
                              >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Take photo
                              </Link>

                              {/* Choose photos (neutral) */}
                              <Link
                                    to={`/${eventSlug}/upload`}
                                    className="flex-1 font-medium rounded-full py-4 px-4 border transition-colors text-sm text-center inline-flex items-center justify-center gap-2"
                                    style={{
                                          backgroundColor: c.surface,
                                          borderColor: c.border,
                                          color: c.text,
                                    }}
                              >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Choose photos
                              </Link>
                        </div>

                        <p
                              className="text-xs mb-10"
                              style={{ color: c.textSubtle }}
                        >
                              Pick up to 10 photos from your gallery
                        </p>

                        {/* View gallery button — only when unlocked */}
                        {event.gallery_unlocked && (
                              <Link
                                    to={`/gallery/${event.event_slug}`}
                                    className="block w-full font-medium rounded-full py-4 px-6 border transition-colors text-base"
                                    style={{
                                          borderColor: c.text,
                                          color: c.text,
                                          backgroundColor: 'transparent',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = c.surface }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                              >
                                    View gallery
                              </Link>
                        )}

                        {/* Footer */}
                        <p
                              className="mt-12 text-xs tracking-wide"
                              style={{ color: c.textSubtle }}
                        >
                              powered by <span className="font-semibold" style={{ color: c.text }}>vantge</span>
                        </p>

                  </div>
            </div>
      )
}
// src/pages/EventGateway.jsx
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import { getTheme } from '../lib/themes'
import { resolveFontFamily } from '../lib/fonts'
import FontLoader from '../components/FontLoader'

export default function EventGateway() {
      const { eventSlug } = useParams()
      const navigate = useNavigate()
      const { event, loading: eventLoading } = useEvent(eventSlug)

      if (eventLoading) {
            return (
                  <div className="min-h-screen bg-black flex items-center justify-center">
                        <p className="text-sm text-white/50">Loading...</p>
                  </div>
            )
      }

      if (!event) {
            return (
                  <div className="min-h-screen bg-black flex items-center justify-center p-8">
                        <div className="text-center">
                              <p className="text-sm text-white/50 mb-4">Event not found.</p>
                              <Link to="/" className="text-sm text-red-400 font-medium">← Back to home</Link>
                        </div>
                  </div>
            )
      }

      const theme = getTheme(event.theme)
      const c = theme.colors
      const selectedFontFamily = resolveFontFamily(event.font_family)

      const bgImage = event.background_image
      const bgPosition = event.background_position || '50% 50%'
      const txt = bgImage ? '#FFFFFF' : c.text
      const txtMuted = bgImage ? 'rgba(255,255,255,0.75)' : c.textMuted
      const txtSubtle = bgImage ? 'rgba(255,255,255,0.55)' : c.textSubtle
      const cardBg = bgImage ? 'rgba(255,255,255,0.15)' : c.surface
      const cardBorder = bgImage ? 'rgba(255,255,255,0.3)' : c.border
      const iconBg = bgImage ? 'rgba(255,255,255,0.2)' : c.surfaceMuted

      return (
            <>
                  <FontLoader fontId={event.font_family} />
                  <div
                        className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden"
                        style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition } : { backgroundColor: c.bg }}
                  >
                        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: bgImage ? 'rgba(0,0,0,0.55)' : c.accent + '22' }} />

                        <div className="relative z-10 max-w-sm w-full flex flex-col items-center text-center">

                              <p className="text-xs tracking-widest uppercase mb-3 font-medium" style={{ color: txtSubtle }}>
                                    Welcome to the celebration
                              </p>

                              <h1 className="font-extrabold tracking-tight mb-8 leading-tight" style={{ color: txt, fontFamily: selectedFontFamily, fontSize: '2.6rem' }}>
                                    {event.event_name}
                              </h1>

                              <p className="text-sm leading-relaxed mb-10" style={{ color: txtMuted }}>
                                    Scan. Snap. Share.<br />We'll reveal the gallery once the host approves.
                              </p>

                              <div className="w-full flex flex-col gap-3">

                                    <button
                                          onClick={() => navigate(`/${eventSlug}/camera`)}
                                          className="w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.98]"
                                          style={{ backgroundColor: c.accent, color: '#fff' }}
                                    >
                                          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                                                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                                      <circle cx="12" cy="13" r="4" />
                                                </svg>
                                          </span>
                                          <div>
                                                <p className="font-bold text-base leading-tight">Open Camera</p>
                                                <p className="text-xs opacity-80 mt-0.5">Take a photo right now</p>
                                          </div>
                                          <svg className="ml-auto opacity-60" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                                    </button>

                                    <Link
                                          to={`/${eventSlug}/upload`}
                                          className="w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.98] border"
                                          style={{ backgroundColor: cardBg, borderColor: cardBorder, color: txt }}
                                    >
                                          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
                                                <svg width="22" height="22" fill="none" stroke={bgImage ? '#fff' : c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <rect x="3" y="3" width="18" height="18" rx="2" />
                                                      <circle cx="8.5" cy="8.5" r="1.5" />
                                                      <path d="M21 15l-5-5L5 21" />
                                                </svg>
                                          </span>
                                          <div>
                                                <p className="font-bold text-base leading-tight">Upload a Photo</p>
                                                <p className="text-xs mt-0.5" style={{ color: txtMuted }}>Choose from your phone's gallery</p>
                                          </div>
                                          <svg className="ml-auto" width="18" height="18" fill="none" stroke={txtSubtle} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                                    </Link>

                                    <Link
                                          to={`/${eventSlug}/gallery`}
                                          className="w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.98] border"
                                          style={{ backgroundColor: cardBg, borderColor: cardBorder, color: txt }}
                                    >
                                          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
                                                <svg width="22" height="22" fill="none" stroke={bgImage ? '#fff' : c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <rect x="3" y="3" width="7" height="7" rx="1" />
                                                      <rect x="14" y="3" width="7" height="7" rx="1" />
                                                      <rect x="3" y="14" width="7" height="7" rx="1" />
                                                      <rect x="14" y="14" width="7" height="7" rx="1" />
                                                </svg>
                                          </span>
                                          <div>
                                                <p className="font-bold text-base leading-tight">View Gallery</p>
                                                <p className="text-xs mt-0.5" style={{ color: txtMuted }}>See all approved photos</p>
                                          </div>
                                          <svg className="ml-auto" width="18" height="18" fill="none" stroke={txtSubtle} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                                    </Link>

                              </div>

                              <p className="text-xs mt-10" style={{ color: txtSubtle }}>
                                    powered by <span className="font-semibold">vantge</span>
                              </p>
                        </div>
                  </div>
            </>
      )
}
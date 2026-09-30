// src/pages/EventGateway.jsx
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import { getTheme } from '../lib/themes'
import { resolveFontFamily } from '../lib/fonts'
import { getEventType } from '../lib/eventTypes'
import FontLoader from '../components/FontLoader'

// Cinematic background for events without a custom background
const DEFAULT_BG = 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=85'

export default function EventGateway() {
      const { eventSlug } = useParams()
      const navigate = useNavigate()
      const { event, loading: eventLoading } = useEvent(eventSlug)

      if (eventLoading) {
            return (
                  <div className="min-h-screen bg-[#1A1A18] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" /><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" /></svg>
                              <p className="text-sm text-white/40 tracking-widest uppercase">Loading</p>
                        </div>
                  </div>
            )
      }

      if (!event) {
            return (
                  <div className="min-h-screen bg-[#1A1A18] flex items-center justify-center p-8">
                        <div className="text-center">
                              <p className="text-sm text-white/50 mb-4">Event not found.</p>
                              <Link to="/" className="text-sm text-white/70 font-medium underline underline-offset-4">← Back to home</Link>
                        </div>
                  </div>
            )
      }

      const theme = getTheme(event.theme)
      const c = theme.colors
      const selectedFontFamily = resolveFontFamily(event.font_family)
      const bgImage = event.background_image || DEFAULT_BG
      const bgPosition = event.background_position || '50% 40%'
      const accentColor = c.accent
      const eventType = getEventType(event.event_type)

      return (
            <>
                  <FontLoader fontId={event.font_family} />
                  <div
                        className="min-h-screen relative flex flex-col items-center justify-end pb-0"
                        style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition }}
                  >
                        {/* Dark cinematic gradient — heavier at bottom for legibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 pointer-events-none" />

                        {/* Subtle top wordmark */}
                        <div className="absolute top-6 left-0 right-0 flex justify-center z-10">
                              <span className="text-xs font-bold tracking-[0.3em] uppercase text-white/40">vantge</span>
                        </div>

                        {/* Main card — sits at bottom on mobile, centred on tall screens */}
                        <div className="relative z-10 w-full max-w-md px-5 pb-10 pt-0 flex flex-col items-center text-center">

                              {/* Event name — large cinematic heading */}
                              <div className="mb-8">
                                    <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50 mb-4">
                                          {eventType.tagline}
                                    </p>
                                    {event.logo_url && (
                                          <img
                                                src={event.logo_url}
                                                alt="Event logo"
                                                className="mx-auto mb-5 max-h-20 max-w-[180px] object-contain drop-shadow-lg"
                                          />
                                    )}
                                    <h1
                                          className="font-extrabold leading-tight text-white drop-shadow-lg"
                                          style={{
                                                fontFamily: selectedFontFamily,
                                                fontSize: 'clamp(2rem, 9vw, 3.5rem)',
                                                textShadow: '0 2px 24px rgba(0,0,0,0.5)',
                                          }}
                                    >
                                          {event.event_name}
                                    </h1>
                              </div>

                              {/* Action buttons — frosted glass cards */}
                              <div className="w-full flex flex-col gap-3">

                                    {/* Primary CTA */}
                                    <button
                                          onClick={() => navigate(`/${eventSlug}/camera`)}
                                          className="w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.98] hover:opacity-95 shadow-xl"
                                          style={{ backgroundColor: accentColor, color: '#fff' }}
                                    >
                                          <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                                                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                                      <circle cx="12" cy="13" r="4" />
                                                </svg>
                                          </span>
                                          <div className="flex-1 min-w-0">
                                                <p className="font-bold text-base leading-tight">Open Camera</p>
                                                <p className="text-xs opacity-75 mt-0.5">Take a photo right now</p>
                                          </div>
                                          <svg className="opacity-60 shrink-0" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </button>

                                    {/* Secondary buttons — frosted glass */}
                                    <div className="grid grid-cols-2 gap-3">
                                          <Link
                                                to={`/${eventSlug}/upload`}
                                                className="flex flex-col items-center gap-2.5 rounded-2xl px-4 py-4 text-center transition-all active:scale-[0.98] border border-white/20"
                                                style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                                          >
                                                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                                                      <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                                            <path d="M21 15l-5-5L5 21" />
                                                      </svg>
                                                </span>
                                                <div>
                                                      <p className="font-bold text-sm text-white leading-tight">Upload</p>
                                                      <p className="text-[11px] text-white/60 mt-0.5">From gallery</p>
                                                </div>
                                          </Link>

                                          <Link
                                                to={`/${eventSlug}/gallery`}
                                                className="flex flex-col items-center gap-2.5 rounded-2xl px-4 py-4 text-center transition-all active:scale-[0.98] border border-white/20"
                                                style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                                          >
                                                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                                                      <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                            <rect x="3" y="3" width="7" height="7" rx="1" />
                                                            <rect x="14" y="3" width="7" height="7" rx="1" />
                                                            <rect x="3" y="14" width="7" height="7" rx="1" />
                                                            <rect x="14" y="14" width="7" height="7" rx="1" />
                                                      </svg>
                                                </span>
                                                <div>
                                                      <p className="font-bold text-sm text-white leading-tight">Gallery</p>
                                                      <p className="text-[11px] text-white/60 mt-0.5">View photos</p>
                                                </div>
                                          </Link>
                                    </div>
                              </div>

                              <p className="text-[10px] text-white/30 mt-8 tracking-widest uppercase">
                                    powered by vantge
                              </p>
                        </div>
                  </div>
            </>
      )
}

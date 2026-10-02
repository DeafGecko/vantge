// src/pages/EventGateway.jsx
import { useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import { getTheme } from '../lib/themes'
import { resolveFontFamily } from '../lib/fonts'
import { getEventType } from '../lib/eventTypes'
import FontLoader from '../components/FontLoader'
import VantgeLogo from '../components/VantgeLogo'
import { useResponsiveBg } from '../hooks/useResponsiveBg'


export default function EventGateway() {
      const { eventSlug } = useParams()
      const navigate = useNavigate()
      const { event, loading: eventLoading } = useEvent(eventSlug)
      const cameraInputRef = useRef(null)
      const _bgResponsive = useResponsiveBg(event?.background_image, event?.background_image_desktop)

      function handleCameraCapture(e) {
            const file = e.target.files?.[0]
            if (!file) return
            navigate(`/${eventSlug}/upload`, { state: { capturedFile: file } })
      }

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
      const eventType = getEventType(event.event_type)
      const bgImage = _bgResponsive || eventType.defaultBg
      const bgPosition = event.background_position || '50% 50%'
      const accentColor = c.accent
      const tintAlpha = ((event.background_tint ?? 55) / 100).toFixed(2)

      if (!event.gallery_unlocked) return (
            <>
                  <FontLoader fontId={event.font_family} />
                  <div className="fixed inset-0" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition }} />
                  <div className="fixed inset-0" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                  <div className="fixed inset-x-0 bottom-0 h-2/3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }} />
                  <div className="relative z-10 min-h-screen flex flex-col items-center justify-end pb-16 px-6 text-center">
                        <a href="/"><VantgeLogo size="sm" monoWhite /></a>
                        <div className="mt-auto">
                              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/40 mb-3">{eventType.tagline}</p>
                              {event.logo_url && (
                                    <img src={event.logo_url} alt="Event logo" className="mx-auto mb-3 object-contain drop-shadow-lg" style={{ maxHeight: '56px', maxWidth: '160px' }} />
                              )}
                              <h1 className="text-4xl font-bold text-white mb-3 leading-tight" style={{ fontFamily: selectedFontFamily }}>{event.event_name}</h1>
                              <p className="text-white/50 text-sm mb-8">This event is not open yet. Check back soon.</p>
                        </div>
                  </div>
            </>
      )

      return (
            <>
                  <FontLoader fontId={event.font_family} />

                  {/* Full-screen background */}
                  <div
                        className="fixed inset-0"
                        style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition }}
                  />

                  {/* Uniform tint */}
                  <div className="fixed inset-0" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />

                  {/* Extra gradient at bottom so buttons always pop */}
                  <div className="fixed inset-x-0 bottom-0 h-2/3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />

                  {/* Scroll container */}
                  <div className="relative z-10 min-h-screen flex flex-col">

                        {/* Top wordmark */}
                        <div className="flex justify-center pt-6 pb-2">
                              <a href="/"><VantgeLogo size="sm" monoWhite /></a>
                        </div>

                        {/* Spacer — pushes content to bottom */}
                        <div className="flex-1" />

                        {/* Bottom content panel */}
                        <div
                              className="w-full max-w-md mx-auto px-5 flex flex-col items-center text-center"
                              style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
                        >
                              {/* Tagline */}
                              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50 mb-3">
                                    {eventType.tagline}
                              </p>

                              {/* Logo */}
                              {event.logo_url && (
                                    <img
                                          src={event.logo_url}
                                          alt="Event logo"
                                          className="mx-auto mb-3 object-contain drop-shadow-lg"
                                          style={{ maxHeight: '56px', maxWidth: '160px' }}
                                    />
                              )}

                              {/* Event name */}
                              <h1
                                    className="font-extrabold leading-tight text-white drop-shadow-lg mb-6"
                                    style={{
                                          fontFamily: selectedFontFamily,
                                          fontSize: 'clamp(1.8rem, 8vw, 3rem)',
                                          textShadow: '0 2px 20px rgba(0,0,0,0.6)',
                                    }}
                              >
                                    {event.event_name}
                              </h1>

                              {/* Buttons */}
                              <div className="w-full flex flex-col gap-2.5">

                                    {/* Open Camera — primary */}
                                    <input
                                          ref={cameraInputRef}
                                          type="file"
                                          accept="image/*,video/*"
                                          capture="environment"
                                          className="hidden"
                                          onChange={handleCameraCapture}
                                    />
                                    <button
                                          onClick={() => cameraInputRef.current?.click()}
                                          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98] shadow-lg"
                                          style={{ backgroundColor: accentColor, color: '#fff' }}
                                    >
                                          <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                                      <circle cx="12" cy="13" r="4" />
                                                </svg>
                                          </span>
                                          <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm leading-tight">Open Camera</p>
                                                <p className="text-xs opacity-70 mt-0.5">Take a photo right now</p>
                                          </div>
                                          <svg className="opacity-50 shrink-0" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </button>

                                    {/* Upload + Gallery — secondary row */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                          <Link
                                                to={`/${eventSlug}/upload`}
                                                className="flex items-center gap-2.5 rounded-2xl px-4 py-3.5 transition-all active:scale-[0.98] border border-white/20"
                                                style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                                          >
                                                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                                                      <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                                            <path d="M21 15l-5-5L5 21" />
                                                      </svg>
                                                </span>
                                                <div className="min-w-0">
                                                      <p className="font-bold text-sm text-white leading-tight">Upload</p>
                                                      <p className="text-[11px] text-white/55 leading-tight">From gallery</p>
                                                </div>
                                          </Link>

                                          <Link
                                                to={`/${eventSlug}/gallery`}
                                                className="flex items-center gap-2.5 rounded-2xl px-4 py-3.5 transition-all active:scale-[0.98] border border-white/20"
                                                style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                                          >
                                                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                                                      <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                            <rect x="3" y="3" width="7" height="7" rx="1" />
                                                            <rect x="14" y="3" width="7" height="7" rx="1" />
                                                            <rect x="3" y="14" width="7" height="7" rx="1" />
                                                            <rect x="14" y="14" width="7" height="7" rx="1" />
                                                      </svg>
                                                </span>
                                                <div className="min-w-0">
                                                      <p className="font-bold text-sm text-white leading-tight">Gallery</p>
                                                      <p className="text-[11px] text-white/55 leading-tight">View photos</p>
                                                </div>
                                          </Link>
                                    </div>
                              </div>

                              <p className="text-[9px] text-white/25 mt-5 tracking-widest uppercase">
                                    powered by vantge
                              </p>
                        </div>
                  </div>
            </>
      )
}

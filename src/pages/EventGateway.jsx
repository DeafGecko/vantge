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

      return (
            <>
                  <FontLoader fontId={event.font_family} />
                  <div
                        className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden"
                        style={{ backgroundColor: c.bg }}
                  >
                        {/* Subtle background texture / gradient */}
                        <div
                              className="absolute inset-0 opacity-30 pointer-events-none"
                              style={{
                                    background: `radial-gradient(ellipse at 50% 0%, ${c.accent}22 0%, transparent 70%)`,
                              }}
                        />

                        <div className="relative z-10 max-w-sm w-full flex flex-col items-center text-center">

                              {/* Event label */}
                              <p
                                    className="text-xs tracking-widest uppercase mb-3 font-medium"
                                    style={{ color: c.textSubtle }}
                              >
                                    {event.event_name}
                              </p>

                              {/* Main heading */}
                              <h1
                                    className="text-4xl font-extrabold tracking-tight mb-3 leading-tight"
                                    style={{ color: c.text, fontFamily: selectedFontFamily }}
                              >
                                    Welcome to the<br />
                                    <span style={{ color: c.accent }}>celebration</span>.
                              </h1>

                              <p
                                    className="text-sm leading-relaxed mb-10"
                                    style={{ color: c.textMuted }}
                              >
                                    Capture a moment, share your photos, or browse the gallery.
                              </p>

                              {/* ── Three action buttons ─────────────────────────────── */}
                              <div className="w-full flex flex-col gap-3">

                                    {/* 1. Open Camera */}
                                    <button
                                          onClick={() => navigate(`/${eventSlug}/camera`)}
                                          className="w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.98]"
                                          style={{
                                                backgroundColor: c.accent,
                                                color: '#fff',
                                          }}
                                    >
                                          <span
                                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                                          >
                                                {/* Camera icon */}
                                                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                                      <circle cx="12" cy="13" r="4" />
                                                </svg>
                                          </span>
                                          <div>
                                                <p className="font-bold text-base leading-tight">Open Camera</p>
                                                <p className="text-xs opacity-80 mt-0.5">Take a photo or video right now</p>
                                          </div>
                                          <svg className="ml-auto opacity-60" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                                    </button>

                                    {/* 2. Upload from Gallery */}
                                    <Link
                                          to={`/${eventSlug}/upload`}
                                          className="w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.98] border"
                                          style={{
                                                backgroundColor: c.surface,
                                                borderColor: c.border,
                                                color: c.text,
                                          }}
                                    >
                                          <span
                                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: c.surfaceMuted }}
                                          >
                                                {/* Upload / gallery icon */}
                                                <svg width="22" height="22" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <rect x="3" y="3" width="18" height="18" rx="2" />
                                                      <circle cx="8.5" cy="8.5" r="1.5" />
                                                      <path d="M21 15l-5-5L5 21" />
                                                </svg>
                                          </span>
                                          <div>
                                                <p className="font-bold text-base leading-tight" style={{ color: c.text }}>Upload a Photo</p>
                                                <p className="text-xs mt-0.5" style={{ color: c.textMuted }}>Choose from your phone's gallery</p>
                                          </div>
                                          <svg className="ml-auto" width="18" height="18" fill="none" stroke={c.textSubtle} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                                    </Link>

                                    {/* 3. View Gallery */}
                                    <Link
                                          to={`/${eventSlug}/gallery`}
                                          className="w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all active:scale-[0.98] border"
                                          style={{
                                                backgroundColor: c.surface,
                                                borderColor: c.border,
                                                color: c.text,
                                          }}
                                    >
                                          <span
                                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: c.surfaceMuted }}
                                          >
                                                {/* Grid / gallery view icon */}
                                                <svg width="22" height="22" fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <rect x="3" y="3" width="7" height="7" rx="1" />
                                                      <rect x="14" y="3" width="7" height="7" rx="1" />
                                                      <rect x="3" y="14" width="7" height="7" rx="1" />
                                                      <rect x="14" y="14" width="7" height="7" rx="1" />
                                                </svg>
                                          </span>
                                          <div>
                                                <p className="font-bold text-base leading-tight" style={{ color: c.text }}>View Gallery</p>
                                                <p className="text-xs mt-0.5" style={{ color: c.textMuted }}>See all photos from this event</p>
                                          </div>
                                          <svg className="ml-auto" width="18" height="18" fill="none" stroke={c.textSubtle} strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                                    </Link>

                              </div>

                              {/* Footer */}
                              <p className="text-xs mt-10" style={{ color: c.textSubtle }}>
                                    powered by <span className="font-semibold">vantge</span>
                              </p>
                        </div>
                  </div>
            </>
      )
}
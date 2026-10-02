import { useState, useRef, useEffect } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import { uploadPhoto } from '../lib/uploadPhoto'
import { getTheme } from '../lib/themes'
import { resolveFontFamily } from '../lib/fonts'
import { getEventType } from '../lib/eventTypes'
import FontLoader from '../components/FontLoader'
import VantgeLogo from '../components/VantgeLogo'

const MAX_FILES = 10
const VIDEO_LIMIT_SECONDS = 30

function checkVideoDuration(file) {
      return new Promise((resolve) => {
            const url = URL.createObjectURL(file)
            const vid = document.createElement('video')
            vid.preload = 'metadata'
            vid.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(vid.duration) }
            vid.onerror = () => { URL.revokeObjectURL(url); resolve(0) }
            vid.src = url
      })
}

export default function GuestUploader() {
      const { eventSlug } = useParams()
      const navigate = useNavigate()
      const location = useLocation()
      const { event, loading, error } = useEvent(eventSlug)
      const fileInputRef = useRef(null)
      const cameraInputRef = useRef(null)

      const [files, setFiles] = useState([])

      useEffect(() => {
            const captured = location.state?.capturedFile
            if (captured) setFiles([captured])
      }, [])
      const [guestName, setGuestName] = useState('')
      const [caption, setCaption] = useState('')
      const [uploadState, setUploadState] = useState('idle')
      const [currentIndex, setCurrentIndex] = useState(0)
      const [successCount, setSuccessCount] = useState(0)
      const [failedFiles, setFailedFiles] = useState([])
      const [fileError, setFileError] = useState(null)

      async function handleFileSelect(e) {
            setFileError(null)
            const picked = Array.from(e.target.files || [])
            if (!picked.length) return
            e.target.value = ''

            if (picked.length > MAX_FILES) {
                  setFileError(`Please pick ${MAX_FILES} files or fewer. You selected ${picked.length}.`)
                  return
            }

            const valid = []
            const tooLong = []

            for (const file of picked) {
                  if (file.type.startsWith('video/')) {
                        const duration = await checkVideoDuration(file)
                        if (duration > VIDEO_LIMIT_SECONDS) {
                              tooLong.push(file.name)
                              continue
                        }
                  }
                  valid.push(file)
            }

            if (tooLong.length > 0) {
                  setFileError(`Video${tooLong.length > 1 ? 's' : ''} too long (max 30s): ${tooLong.join(', ')}`)
            }

            setFiles(valid)
      }

      async function handleUpload() {
            if (!event || !files.length) return

            setUploadState('uploading')
            setCurrentIndex(0)
            setSuccessCount(0)
            setFailedFiles([])

            let succeeded = 0
            const failures = []

            for (let i = 0; i < files.length; i++) {
                  setCurrentIndex(i)
                  const file = files[i]
                  const isVideo = file.type.startsWith('video/')

                  const result = await uploadPhoto({
                        blob: file,
                        eventId: event.id,
                        guestName,
                        caption,
                        is_video: isVideo,
                  })

                  if (result.success) {
                        succeeded++
                        setSuccessCount(succeeded)
                  } else {
                        failures.push(file.name)
                  }
            }

            setFailedFiles(failures)
            setUploadState(failures.length === 0 ? 'success' : succeeded > 0 ? 'partial' : 'error')
      }

      function reset() {
            setFiles([])
            setUploadState('idle')
            setCurrentIndex(0)
            setSuccessCount(0)
            setFailedFiles([])
            setFileError(null)
      }

      if (loading) {
            return (
                  <div className="min-h-screen bg-[#1A1A18] flex items-center justify-center">
                        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/></svg>
                  </div>
            )
      }

      if (error || !event) {
            return (
                  <div className="min-h-screen bg-[#1A1A18] flex items-center justify-center p-8 text-center">
                        <div>
                              <p className="text-white/50 text-sm mb-4">Event not found.</p>
                              <Link to="/" className="text-white/70 text-sm underline underline-offset-4">← Go home</Link>
                        </div>
                  </div>
            )
      }

      const theme = getTheme(event.theme)
      const c = theme.colors
      const selectedFontFamily = resolveFontFamily(event.font_family)
      const eventType = getEventType(event.event_type)
      const bgImage = event.background_image || eventType.defaultBg
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
                              <h1 className="text-4xl font-bold text-white mb-3 leading-tight" style={{ fontFamily: selectedFontFamily }}>{event.event_name}</h1>
                              <p className="text-white/50 text-sm mb-8">This event is not open yet. Check back soon.</p>
                              <button onClick={() => navigate(`/${eventSlug}`)} className="px-6 py-3 rounded-2xl font-bold text-sm text-white/70 border border-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                    ← Back to Event
                              </button>
                        </div>
                  </div>
            </>
      )

      const totalFiles = files.length
      const videoCount = files.filter(f => f.type.startsWith('video/')).length
      const photoCount = totalFiles - videoCount

      // ── Success ──────────────────────────────────────────────────────
      if (uploadState === 'success') {
            return (
                  <>
                        <FontLoader fontId={event.font_family} />
                        <div className="fixed inset-0" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition }} />
                        <div className="fixed inset-0" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                        <div className="fixed inset-x-0 bottom-0 h-2/3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }} />

                        <div className="relative z-10 min-h-screen flex flex-col">
                              <div className="flex justify-center pt-6 pb-2">
                                    <a href="/"><VantgeLogo size="sm" monoWhite /></a>
                              </div>
                              <div className="flex-1" />
                              <div className="w-full max-w-md mx-auto px-5 flex flex-col items-center text-center" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
                                    <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: accentColor }}>
                                          <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                                    </div>
                                    <h1 className="text-2xl font-extrabold text-white mb-2" style={{ fontFamily: selectedFontFamily }}>
                                          {successCount === 1 ? 'Sent!' : `${successCount} sent!`}
                                    </h1>
                                    <p className="text-white/55 text-sm mb-8">
                                          {eventType.tagline} — the host will review and add {successCount === 1 ? 'it' : 'them'} to the gallery.
                                    </p>
                                    <div className="w-full flex flex-col gap-2.5">
                                          <button
                                                onClick={reset}
                                                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
                                                style={{ backgroundColor: accentColor }}
                                          >
                                                Send More
                                          </button>
                                          <button
                                                onClick={() => navigate(`/${eventSlug}`)}
                                                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white/70 border border-white/15 transition-all active:scale-[0.98]"
                                                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                                          >
                                                Back to Event
                                          </button>
                                    </div>
                              </div>
                        </div>
                  </>
            )
      }

      // ── Uploading ────────────────────────────────────────────────────
      if (uploadState === 'uploading') {
            const progress = Math.round(((currentIndex + 1) / files.length) * 100)
            return (
                  <>
                        <FontLoader fontId={event.font_family} />
                        <div className="fixed inset-0" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition }} />
                        <div className="fixed inset-0" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
                              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-3">{event.event_name}</p>
                              <p className="text-white text-xl font-extrabold mb-1" style={{ fontFamily: selectedFontFamily }}>
                                    Sending {currentIndex + 1} of {files.length}…
                              </p>
                              <p className="text-white/40 text-sm mb-6">Keep this page open.</p>
                              <div className="w-full max-w-xs rounded-full h-1.5 mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                                    <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: accentColor }} />
                              </div>
                              <p className="text-white/30 text-xs">{progress}%</p>
                        </div>
                  </>
            )
      }

      // ── Error / Partial ──────────────────────────────────────────────
      if (uploadState === 'error' || uploadState === 'partial') {
            return (
                  <>
                        <FontLoader fontId={event.font_family} />
                        <div className="fixed inset-0" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition }} />
                        <div className="fixed inset-0" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
                              <p className="text-white text-xl font-extrabold mb-2" style={{ fontFamily: selectedFontFamily }}>
                                    {uploadState === 'partial' ? `${successCount} of ${files.length} sent` : 'Upload failed'}
                              </p>
                              <p className="text-white/50 text-sm mb-7">
                                    {failedFiles.length} file{failedFiles.length > 1 ? 's' : ''} failed. Check your connection and try again.
                              </p>
                              <div className="w-full max-w-xs flex flex-col gap-2.5">
                                    <button onClick={handleUpload} className="w-full py-3.5 rounded-2xl font-bold text-sm text-white" style={{ backgroundColor: accentColor }}>
                                          Retry
                                    </button>
                                    <button onClick={reset} className="w-full py-3.5 rounded-2xl font-bold text-sm text-white/60 border border-white/15" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                          Start Over
                                    </button>
                              </div>
                        </div>
                  </>
            )
      }

      // ── Idle ─────────────────────────────────────────────────────────
      return (
            <>
                  <FontLoader fontId={event.font_family} />

                  <div className="fixed inset-0" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition }} />
                  <div className="fixed inset-0" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                  <div className="fixed inset-x-0 bottom-0 h-2/3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }} />

                  <div className="relative z-10 min-h-screen flex flex-col">

                        {/* Top bar */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-2">
                              <button onClick={() => navigate(`/${eventSlug}`)} aria-label="Back to event" className="flex items-center gap-1.5 text-white/60 text-sm font-medium">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                                    Back
                              </button>
                              <a href="/"><VantgeLogo size="sm" monoWhite /></a>
                              <div className="w-12" />
                        </div>

                        <div className="flex-1" />

                        {/* Bottom content */}
                        <div className="w-full max-w-md mx-auto px-5" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>

                              {/* Event label + title */}
                              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/45 mb-2">{event.event_name}</p>
                              <h1 className="text-2xl font-extrabold text-white leading-tight mb-5 whitespace-nowrap" style={{ fontFamily: selectedFontFamily }}>
                                    Share your photos & videos.
                              </h1>

                              {/* File picker / preview */}
                              {files.length === 0 ? (
                                    <div className="flex gap-2 mb-3">
                                          {/* Take Photo — opens native camera */}
                                          <button
                                                onClick={() => cameraInputRef.current?.click()}
                                                className="flex-1 flex flex-col items-center gap-2 rounded-2xl px-4 py-5 border border-white/15 transition-all active:scale-[0.97]"
                                                style={{ backgroundColor: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px)' }}
                                          >
                                                <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                                                      <svg width="22" height="22" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                                                      </svg>
                                                </span>
                                                <p className="font-bold text-sm text-white">Take Photo</p>
                                                <p className="text-[10px] text-white/40">Opens your camera</p>
                                          </button>
                                          {/* Choose from library */}
                                          <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex-1 flex flex-col items-center gap-2 rounded-2xl px-4 py-5 border border-white/15 transition-all active:scale-[0.97]"
                                                style={{ backgroundColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}
                                          >
                                                <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                                                      <svg width="22" height="22" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                                                      </svg>
                                                </span>
                                                <p className="font-bold text-sm text-white">Library</p>
                                                <p className="text-[10px] text-white/40">Up to {MAX_FILES} files</p>
                                          </button>
                                    </div>
                              ) : (
                                    <div
                                          className="rounded-2xl p-4 mb-3 border border-white/10"
                                          style={{ backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
                                    >
                                          {/* Summary row */}
                                          <div className="flex items-center justify-between mb-3">
                                                <p className="text-white text-sm font-bold">
                                                      {photoCount > 0 && `${photoCount} photo${photoCount > 1 ? 's' : ''}`}
                                                      {photoCount > 0 && videoCount > 0 && ' · '}
                                                      {videoCount > 0 && `${videoCount} video${videoCount > 1 ? 's' : ''}`}
                                                </p>
                                                <button
                                                      onClick={() => fileInputRef.current?.click()}
                                                      className="text-[11px] font-bold text-white/50 hover:text-white/80 transition-colors"
                                                >
                                                      Change
                                                </button>
                                          </div>

                                          {/* Thumbnails */}
                                          <div className="grid grid-cols-4 gap-1.5">
                                                {files.map((file, i) => (
                                                      <div key={i} className="aspect-square rounded-lg overflow-hidden relative bg-white/10">
                                                            {file.type.startsWith('video/') ? (
                                                                  <>
                                                                        <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                              <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                                                                                    <svg width="9" height="9" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                                              </div>
                                                                        </div>
                                                                  </>
                                                            ) : (
                                                                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                                                            )}
                                                      </div>
                                                ))}
                                          </div>
                                    </div>
                              )}

                              {/* Error */}
                              {fileError && (
                                    <div className="rounded-xl px-4 py-3 mb-3 flex items-start gap-2.5 border border-red-500/30" style={{ backgroundColor: 'rgba(220,38,38,0.15)' }}>
                                          <svg width="14" height="14" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                          <p className="text-red-300 text-xs">{fileError}</p>
                                    </div>
                              )}

                              {/* Name input */}
                              <div className="mb-2.5">
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1.5">Your name <span className="text-red-400">*</span></p>
                                    <input
                                          type="text"
                                          value={guestName}
                                          onChange={(e) => setGuestName(e.target.value)}
                                          placeholder="Required — so the host knows it's from you"
                                          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-white/30 transition-colors"
                                          style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                                    />
                              </div>

                              {/* Caption input */}
                              <div className="mb-3">
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1.5">Caption</p>
                                    <input
                                          type="text"
                                          value={caption}
                                          onChange={(e) => setCaption(e.target.value)}
                                          placeholder="Optional — add a message to your photo"
                                          maxLength={200}
                                          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-white/30 transition-colors"
                                          style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                                    />
                              </div>

                              {/* Send button */}
                              <button
                                    onClick={files.length > 0 ? handleUpload : () => fileInputRef.current?.click()}
                                    disabled={files.length > 0 && !guestName.trim()}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50"
                                    style={{ backgroundColor: accentColor }}
                              >
                                    {files.length > 0 ? (
                                          <>
                                                <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                Send {totalFiles} {totalFiles === 1 ? 'file' : 'files'}
                                          </>
                                    ) : (
                                          <>
                                                <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                                                Choose files
                                          </>
                                    )}
                              </button>
                        </div>
                  </div>

                  {/* Library picker — multiple files */}
                  <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                  />
                  {/* Native camera — single capture */}
                  <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*,video/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        className="hidden"
                  />
            </>
      )
}

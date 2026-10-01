import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import JSZip from 'jszip'
import { supabase } from '../lib/supabase'
import { getThumbnailUrl, getFullSizeUrl } from '../lib/cloudinary'
import { getTheme } from '../lib/themes'
import { resolveFontFamily } from '../lib/fonts'
import { getEventType } from '../lib/eventTypes'
import FontLoader from '../components/FontLoader'

const DEFAULT_BG = 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=85'

async function downloadSinglePhoto(url, filename) {
      try {
            const res = await fetch(url)
            const blob = await res.blob()
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = filename
            a.click()
            URL.revokeObjectURL(a.href)
      } catch {
            window.open(url, '_blank')
      }
}

async function downloadZip(urls, eventName) {
      const zip = new JSZip()
      await Promise.all(
            urls.map(async ({ url, name }) => {
                  try {
                        const res = await fetch(url)
                        const blob = await res.blob()
                        zip.file(name, blob)
                  } catch { /* skip failed */ }
            })
      )
      const blob = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${eventName}-photos.zip`
      a.click()
      URL.revokeObjectURL(a.href)
}

function looksLikeVideo(url) {
      if (!url) return false
      return /\.(mp4|mov|webm|avi|mkv|3gp)(\?|$)/i.test(url)
}

export default function Gallery() {
      const { eventSlug } = useParams()
      const navigate = useNavigate()
      const [event, setEvent] = useState(null)
      const [photos, setPhotos] = useState([])
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)
      const [lightboxIndex, setLightboxIndex] = useState(null)
      const [selectMode, setSelectMode] = useState(false)
      const [selected, setSelected] = useState(new Set())
      const [downloading, setDownloading] = useState(false)

      const toggleSelect = useCallback((id) => {
            setSelected(prev => {
                  const next = new Set(prev)
                  next.has(id) ? next.delete(id) : next.add(id)
                  return next
            })
      }, [])

      async function handleDownloadSelected() {
            setDownloading(true)
            const targets = photos
                  .filter(p => selected.has(p.id))
                  .map((p, i) => {
                        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
                        const ext = p.is_video || looksLikeVideo(p.original_url) ? 'mp4' : 'jpg'
                        return { url: getFullSizeUrl(p.original_url), name: `vantge-${date}-#${String(i + 1).padStart(3, '0')}.${ext}` }
                  })
            await downloadZip(targets, event.event_slug)
            setDownloading(false)
      }

      function exitSelectMode() {
            setSelectMode(false)
            setSelected(new Set())
      }

      useEffect(() => {
            async function fetchData() {
                  setLoading(true)
                  const { data: eventData, error: eventError } = await supabase
                        .from('events').select('*').eq('event_slug', eventSlug).maybeSingle()

                  if (eventError || !eventData) { setError('Event not found'); setLoading(false); return }
                  setEvent(eventData)

                  if (!eventData.gallery_unlocked) { setLoading(false); return }

                  const { data: photoData, error: photoError } = await supabase
                        .from('media_queue').select('*')
                        .eq('event_id', eventData.id).eq('status', 1)
                        .order('created_at', { ascending: false })

                  if (photoError) setError(photoError.message)
                  else setPhotos(photoData || [])
                  setLoading(false)
            }

            fetchData()

            const channel = supabase.channel(`gallery:${eventSlug}`)
                  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'media_queue' }, (payload) => {
                        if (payload.new.status === 1 && payload.old.status === 0)
                              setPhotos((current) => [payload.new, ...current])
                  }).subscribe()

            return () => supabase.removeChannel(channel)
      }, [eventSlug])

      if (loading) {
            return (
                  <div className="min-h-screen bg-[#0E0E0C] flex items-center justify-center">
                        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" /><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" />
                        </svg>
                  </div>
            )
      }

      if (error || !event) {
            return (
                  <div className="min-h-screen bg-[#0E0E0C] flex items-center justify-center p-8 text-center">
                        <div>
                              <p className="text-white/50 text-sm mb-4">Gallery not found.</p>
                              <Link to="/" className="text-white/70 text-sm underline underline-offset-4">← Go home</Link>
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
      const tintAlpha = ((event.background_tint ?? 55) / 100).toFixed(2)

      // ── Gallery locked ────────────────────────────────────────────────
      if (!event.gallery_unlocked) {
            return (
                  <>
                        <FontLoader fontId={event.font_family} />
                        <div className="fixed inset-0" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition }} />
                        <div className="fixed inset-0" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                        <div className="fixed inset-x-0 bottom-0 h-2/3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }} />
                        <div className="relative z-10 min-h-screen flex flex-col">
                              <div className="flex justify-center pt-6"><span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50">vantge</span></div>
                              <div className="flex-1" />
                              <div className="w-full max-w-md mx-auto px-5 text-center" style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}>
                                    <div className="w-12 h-12 rounded-full mx-auto mb-5 flex items-center justify-center border border-white/15" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                          <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    </div>
                                    <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/40 mb-3">{eventType.tagline}</p>
                                    <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight" style={{ fontFamily: selectedFontFamily }}>
                                          Gallery opens <span style={{ color: accentColor }}>soon.</span>
                                    </h1>
                                    <p className="text-white/50 text-sm mb-8 leading-relaxed">
                                          The host hasn't opened the gallery yet. Check back after the event — your photos will live here.
                                    </p>
                                    <button onClick={() => navigate(`/${eventSlug}`)}
                                          className="w-full py-3.5 rounded-2xl font-bold text-sm text-white/70 border border-white/15 transition-all active:scale-[0.98]"
                                          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                          ← Back to Event
                                    </button>
                              </div>
                        </div>
                  </>
            )
      }

      // ── Empty gallery ─────────────────────────────────────────────────
      if (photos.length === 0) {
            return (
                  <>
                        <FontLoader fontId={event.font_family} />
                        <div className="fixed inset-0" style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition }} />
                        <div className="fixed inset-0" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                        <div className="fixed inset-x-0 bottom-0 h-2/3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }} />
                        <div className="relative z-10 min-h-screen flex flex-col">
                              <div className="flex justify-center pt-6"><span className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50">vantge</span></div>
                              <div className="flex-1" />
                              <div className="w-full max-w-md mx-auto px-5 text-center" style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}>
                                    <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/40 mb-3">{eventType.tagline}</p>
                                    <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight" style={{ fontFamily: selectedFontFamily }}>
                                          The gallery is <span style={{ color: accentColor }}>open.</span>
                                    </h1>
                                    <p className="text-white/50 text-sm mb-8">No photos yet — be the first to share one.</p>
                                    <button onClick={() => navigate(`/${eventSlug}/camera`)}
                                          className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
                                          style={{ backgroundColor: accentColor }}>
                                          Open Camera
                                    </button>
                              </div>
                        </div>
                  </>
            )
      }

      const videoCount = photos.filter(p => p.is_video || looksLikeVideo(p.original_url)).length
      const photoCount = photos.length - videoCount

      // ── Main gallery ──────────────────────────────────────────────────
      return (
            <>
                  <FontLoader fontId={event.font_family} />
                  <div className="min-h-screen bg-[#0E0E0C]">

                        {/* Sticky header */}
                        <header className="sticky top-0 z-20 border-b border-white/[0.07]" style={{ backgroundColor: 'rgba(14,14,12,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                              <div className="max-w-6xl mx-auto px-4 sm:px-6">
                                    <div className="flex items-center justify-between h-14">

                                          {/* Left — back or cancel */}
                                          {selectMode ? (
                                                <button onClick={exitSelectMode} className="text-sm font-bold text-white/50 hover:text-white transition-colors">
                                                      Cancel
                                                </button>
                                          ) : (
                                                <button onClick={() => navigate(`/${eventSlug}`)} className="flex items-center gap-1.5 text-sm font-bold text-white/50 hover:text-white transition-colors">
                                                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                                                      Back
                                                </button>
                                          )}

                                          {/* Center — event name */}
                                          <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
                                                <p className="text-white text-sm font-extrabold leading-tight truncate max-w-[160px]" style={{ fontFamily: selectedFontFamily }}>
                                                      {event.event_name}
                                                </p>
                                                <p className="text-white/35 text-[9px] font-bold uppercase tracking-widest">
                                                      {photoCount > 0 && `${photoCount} photo${photoCount !== 1 ? 's' : ''}`}
                                                      {photoCount > 0 && videoCount > 0 && ' · '}
                                                      {videoCount > 0 && `${videoCount} video${videoCount !== 1 ? 's' : ''}`}
                                                </p>
                                          </div>

                                          {/* Right — select or download */}
                                          {selectMode ? (
                                                <button
                                                      onClick={handleDownloadSelected}
                                                      disabled={selected.size === 0 || downloading}
                                                      className="flex items-center gap-1.5 text-sm font-bold text-white disabled:opacity-30 transition-all"
                                                      style={{ color: selected.size > 0 ? accentColor : undefined }}
                                                >
                                                      {downloading ? (
                                                            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/></svg>
                                                      ) : (
                                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/><polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/></svg>
                                                      )}
                                                      {selected.size > 0 ? `Download (${selected.size})` : 'Download'}
                                                </button>
                                          ) : (
                                                <button
                                                      onClick={() => setSelectMode(true)}
                                                      className="text-sm font-bold text-white/50 hover:text-white transition-colors"
                                                >
                                                      Select
                                                </button>
                                          )}
                                    </div>

                                    {/* Select-all bar */}
                                    {selectMode && (
                                          <div className="flex items-center justify-between pb-3 pt-0.5">
                                                <p className="text-white/40 text-xs">{selected.size} selected</p>
                                                <button
                                                      onClick={() => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map(p => p.id)))}
                                                      className="text-xs font-bold transition-colors"
                                                      style={{ color: accentColor }}
                                                >
                                                      {selected.size === photos.length ? 'Deselect all' : 'Select all'}
                                                </button>
                                          </div>
                                    )}
                              </div>
                        </header>

                        {/* Photo grid */}
                        <div className="max-w-6xl mx-auto px-3 pt-3 pb-24">
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {photos.map((photo, index) => {
                                          const isSelected = selected.has(photo.id)
                                          const isVid = photo.is_video || looksLikeVideo(photo.original_url)
                                          return (
                                                <button
                                                      key={photo.id}
                                                      onClick={() => selectMode ? toggleSelect(photo.id) : setLightboxIndex(index)}
                                                      className="flex flex-col overflow-hidden relative focus:outline-none group text-left vantge-photo-cell rounded-xl"
                                                      style={{ backgroundColor: '#1A1A18', animationDelay: `${Math.min(index * 40, 600)}ms` }}
                                                >
                                                      {/* Square image area */}
                                                      <div className="aspect-square w-full relative overflow-hidden">
                                                            {isVid ? (
                                                                  <>
                                                                        {photo.thumbnail_url ? (
                                                                              <img src={photo.thumbnail_url} alt="Video" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" style={{ opacity: selectMode && !isSelected ? 0.4 : 1 }} loading="lazy" />
                                                                        ) : (
                                                                              <video src={photo.original_url} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" style={{ opacity: selectMode && !isSelected ? 0.4 : 1 }} muted playsInline preload="metadata" />
                                                                        )}
                                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                                                                    <svg width="13" height="13" fill="white" viewBox="0 0 24 24" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg>
                                                                              </div>
                                                                        </div>
                                                                  </>
                                                            ) : (
                                                                  <img
                                                                        src={getThumbnailUrl(photo.original_url)}
                                                                        alt={photo.guest_name ? `Photo by ${photo.guest_name}` : 'Event photo'}
                                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                                                        style={{ opacity: selectMode && !isSelected ? 0.4 : 1 }}
                                                                        loading="lazy"
                                                                  />
                                                            )}

                                                            {/* Select checkmark */}
                                                            {selectMode && (
                                                                  <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-white' : 'border-white/50'}`}
                                                                        style={{ backgroundColor: isSelected ? accentColor : 'rgba(0,0,0,0.3)' }}>
                                                                        {isSelected && <svg width="9" height="9" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                                                  </div>
                                                            )}
                                                      </div>

                                                      {/* Caption below image — guest name hidden from public */}
                                                      {photo.caption && (
                                                            <div className="w-full px-2 py-1.5 border-t border-white/[0.06]">
                                                                  <p className="text-white/70 text-[11px] leading-snug line-clamp-2">{photo.caption}</p>
                                                            </div>
                                                      )}
                                                </button>
                                          )
                                    })}
                              </div>
                        </div>

                        {/* Bottom bar */}
                        <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-white/[0.07] flex items-center justify-center gap-6 px-6 py-4" style={{ backgroundColor: 'rgba(14,14,12,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                              <button
                                    onClick={() => navigate(`/${eventSlug}/camera`)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm text-white transition-all active:scale-[0.97]"
                                    style={{ backgroundColor: accentColor }}
                              >
                                    <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                    Add Photo
                              </button>
                              <button
                                    onClick={() => navigate(`/${eventSlug}/upload`)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm text-white/60 border border-white/15 transition-all active:scale-[0.97]"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                              >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                                    Upload
                              </button>
                        </div>

                        {lightboxIndex !== null && (
                              <Lightbox
                                    photos={photos}
                                    initialIndex={lightboxIndex}
                                    accentColor={accentColor}
                                    onClose={() => setLightboxIndex(null)}
                                    allowDownloads={event.allow_downloads ?? true}
                                    allowSharing={event.allow_sharing ?? true}
                                    eventName={event.event_name}
                              />
                        )}
                  </div>
            <style>{`
              @keyframes vantgePhotoIn {
                from { opacity: 0; transform: scale(0.96); }
                to   { opacity: 1; transform: scale(1); }
              }
              .vantge-photo-cell {
                animation: vantgePhotoIn 0.4s ease both;
              }
              @media (prefers-reduced-motion: reduce) {
                .vantge-photo-cell { animation: none; }
              }
            `}</style>
            </>
      )
}

function Lightbox({ photos, initialIndex, accentColor, onClose, allowDownloads, allowSharing, eventName }) {
      const [index, setIndex] = useState(initialIndex)
      const [dlLoading, setDlLoading] = useState(false)
      const [shareMenuOpen, setShareMenuOpen] = useState(false)
      const [linkCopied, setLinkCopied] = useState(false)
      const photo = photos[index]
      const isVid = photo.is_video || looksLikeVideo(photo.original_url)
      const photoUrl = getFullSizeUrl(photo.original_url)
      const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share

      function next() { setIndex((i) => (i + 1) % photos.length); setShareMenuOpen(false) }
      function prev() { setIndex((i) => (i - 1 + photos.length) % photos.length); setShareMenuOpen(false) }

      useEffect(() => {
            function handleKey(e) {
                  if (e.key === 'Escape') { if (shareMenuOpen) setShareMenuOpen(false); else onClose() }
                  if (e.key === 'ArrowRight') next()
                  if (e.key === 'ArrowLeft') prev()
            }
            window.addEventListener('keydown', handleKey)
            return () => window.removeEventListener('keydown', handleKey)
      }, [index, shareMenuOpen])

      async function handleDownload(e) {
            e.stopPropagation()
            setDlLoading(true)
            const ext = isVid ? 'mp4' : 'jpg'
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
            await downloadSinglePhoto(photo.original_url, `vantge-${date}-#${String(index + 1).padStart(3, '0')}.${ext}`)
            setDlLoading(false)
      }

      async function handleShare(e) {
            e.stopPropagation()
            if (hasNativeShare) {
                  try {
                        const shareData = {
                              title: eventName || 'Vantge',
                              text: `Check out this photo from ${eventName || 'the event'}`,
                              url: photoUrl,
                        }
                        if (!isVid && navigator.canShare && navigator.canShare({ files: [] })) {
                              try {
                                    const res = await fetch(photoUrl)
                                    const blob = await res.blob()
                                    const file = new File([blob], `vantge-photo.jpg`, { type: blob.type })
                                    if (navigator.canShare({ files: [file] })) {
                                          await navigator.share({ files: [file], title: shareData.title, text: shareData.text })
                                          return
                                    }
                              } catch { /* fall through to URL share */ }
                        }
                        await navigator.share(shareData)
                  } catch (err) {
                        if (err.name !== 'AbortError') setShareMenuOpen(true)
                  }
            } else {
                  setShareMenuOpen(s => !s)
            }
      }

      async function copyLink(e) {
            e.stopPropagation()
            await navigator.clipboard.writeText(photoUrl)
            setLinkCopied(true)
            setTimeout(() => { setLinkCopied(false); setShareMenuOpen(false) }, 2000)
      }

      const btnStyle = { backgroundColor: 'rgba(255,255,255,0.10)' }

      return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => shareMenuOpen ? setShareMenuOpen(false) : onClose()}>

                  {/* Top bar */}
                  <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.07]" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                              <button onClick={onClose} aria-label="Back to gallery" className="w-8 h-8 rounded-full flex items-center justify-center border border-white/15 text-white/60 hover:text-white transition-colors" style={btnStyle}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                              </button>
                              <p className="text-white/40 text-xs font-bold">{index + 1} / {photos.length}</p>
                        </div>

                        <div className="flex items-center gap-2">
                              {isVid && (
                                    <span className="flex items-center gap-1 bg-white/10 text-white/60 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                                          <svg width="9" height="9" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                          Video
                                    </span>
                              )}
                              {allowSharing && (
                                    <div className="relative">
                                          <button
                                                onClick={handleShare}
                                                aria-label="Share photo"
                                                className="flex items-center gap-1.5 text-white font-bold text-xs px-3.5 py-2 rounded-full border border-white/15 transition-all active:scale-95"
                                                style={btnStyle}
                                          >
                                                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                                                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                                                </svg>
                                                Share
                                          </button>
                                          {/* Desktop share menu */}
                                          {shareMenuOpen && (
                                                <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-10" style={{ backgroundColor: 'rgba(20,20,18,0.97)', backdropFilter: 'blur(20px)' }} onClick={e => e.stopPropagation()}>
                                                      <button onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors text-left">
                                                            {linkCopied
                                                                  ? <><svg width="14" height="14" fill="none" stroke="#22c55e" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg><span className="text-green-400 font-semibold">Link copied!</span></>
                                                                  : <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copy Link</>
                                                            }
                                                      </button>
                                                      <div className="h-px bg-white/[0.06]" />
                                                      <a href={`mailto:?subject=${encodeURIComponent(eventName || 'Vantge Photo')}&body=${encodeURIComponent(photoUrl)}`} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors" onClick={e => e.stopPropagation()}>
                                                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                                            Email
                                                      </a>
                                                      {allowDownloads && (
                                                            <>
                                                                  <div className="h-px bg-white/[0.06]" />
                                                                  <button onClick={handleDownload} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors text-left">
                                                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                                        Download
                                                                  </button>
                                                            </>
                                                      )}
                                                </div>
                                          )}
                                    </div>
                              )}
                              {allowDownloads && (
                                    <button
                                          onClick={handleDownload}
                                          disabled={dlLoading}
                                          aria-label="Download photo"
                                          className="flex items-center gap-1.5 text-white font-bold text-xs px-3.5 py-2 rounded-full border border-white/15 transition-all disabled:opacity-40 active:scale-95"
                                          style={btnStyle}
                                    >
                                          {dlLoading ? (
                                                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/></svg>
                                          ) : (
                                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/><polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/></svg>
                                          )}
                                          Save
                                    </button>
                              )}
                        </div>
                  </div>

                  {/* Media */}
                  <div className="flex-1 flex items-center justify-center relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        {isVid ? (
                              <video key={photo.id} src={photo.original_url} controls autoPlay playsInline className="max-w-full max-h-full" />
                        ) : (
                              <img key={photo.id} src={photoUrl} alt={photo.guest_name ? `Photo by ${photo.guest_name}` : 'Event photo'} className="max-w-full max-h-full object-contain" />
                        )}

                        {/* Prev / Next */}
                        {photos.length > 1 && (
                              <>
                                    <button onClick={(e) => { e.stopPropagation(); prev() }} aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white transition-all active:scale-90" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); next() }} aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white transition-all active:scale-90" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </button>
                              </>
                        )}
                  </div>

                  {/* Bottom — caption + mobile share/save row */}
                  <div className="shrink-0" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)' }} onClick={e => e.stopPropagation()}>
                        {photo.caption && (
                              <div className="px-5 pt-3 pb-1 border-t border-white/[0.07] text-center">
                                    <p className="text-white/70 text-sm leading-snug">{photo.caption}</p>
                              </div>
                        )}
                        {/* Mobile action row — easy thumb reach */}
                        {(allowDownloads || allowSharing) && (
                              <div className="flex gap-3 px-5 py-4 border-t border-white/[0.07]" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                                    {allowSharing && (
                                          <button onClick={handleShare} aria-label="Share photo" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/15 text-white font-bold text-sm transition-all active:scale-95" style={btnStyle}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                                                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                                                </svg>
                                                Share
                                          </button>
                                    )}
                                    {allowDownloads && (
                                          <button onClick={handleDownload} disabled={dlLoading} aria-label="Download photo" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/15 text-white font-bold text-sm transition-all disabled:opacity-40 active:scale-95" style={btnStyle}>
                                                {dlLoading
                                                      ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/></svg>
                                                      : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/><polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/></svg>
                                                }
                                                Save
                                          </button>
                                    )}
                              </div>
                        )}
                  </div>
            </div>
      )
}

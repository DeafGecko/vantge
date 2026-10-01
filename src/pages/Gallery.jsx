import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import JSZip from 'jszip'
import { supabase } from '../lib/supabase'
import { getThumbnailUrl, getFullSizeUrl } from '../lib/cloudinary'
import { getTheme } from '../lib/themes'
import { resolveFontFamily } from '../lib/fonts'
import FontLoader from '../components/FontLoader'

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



export default function Gallery() {
      const { eventSlug } = useParams()
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
                  .map((p, i) => ({ url: getFullSizeUrl(p.original_url), name: `photo-${i + 1}.jpg` }))
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

                  if (!eventData.gallery_unlocked) {
                        setLoading(false)
                        return
                  }

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

            const channel = supabase
                  .channel(`gallery:${eventSlug}`)
                  .on(
                        'postgres_changes',
                        { event: 'UPDATE', schema: 'public', table: 'media_queue' },
                        (payload) => {
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

      if (loading) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-6">
                        <p className="text-sm text-[#88887E]">Loading gallery...</p>
                  </div>
            )
      }

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

      const theme = getTheme(event.theme)
      const c = theme.colors
      const selectedFontFamily = resolveFontFamily(event.font_family)


      if (!event.gallery_unlocked) {
            return (
                  <div
                        className="min-h-screen flex items-center justify-center p-6"
                        style={{ backgroundColor: c.bg }}
                  >
                        <div className="max-w-md text-center">
                              <div
                                    className="w-12 h-12 rounded-full mx-auto mb-5 flex items-center justify-center border"
                                    style={{
                                          backgroundColor: c.surface,
                                          borderColor: c.border,
                                    }}
                              >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke={c.textMuted} strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                              </div>
                              <p className="text-xs tracking-wide uppercase mb-2" style={{ color: c.textSubtle }}>
                                    {event.event_name}
                              </p>
                              <h1 className="text-3xl font-extrabold tracking-tight mb-3" style={{ color: c.text }}>
                                    Gallery opens <span style={{ color: c.accent }}>soon</span>.
                              </h1>
                              <p className="text-sm leading-relaxed" style={{ color: c.textMuted }}>
                                    The host hasn't opened the gallery yet. Check back after the event — your photos will live here.
                              </p>
                              <Link
                                    to={`/${event.event_slug}`}
                                    className="inline-block mt-6 text-sm transition-colors"
                                    style={{ color: c.textMuted }}
                              >
                                    ← Back to event
                              </Link>
                        </div>
                  </div>
            )
      }

      // ...existing code...

      if (photos.length === 0) {
            return (
                  <div
                        className="min-h-screen flex items-center justify-center p-6"
                        style={{ backgroundColor: c.bg }}
                  >
                        <div className="max-w-md text-center">
                              <p className="text-xs tracking-wide uppercase mb-2" style={{ color: c.textSubtle }}>
                                    {event.event_name}
                              </p>
                              <h1 className="text-3xl font-extrabold tracking-tight mb-3" style={{ color: c.text }}>
                                    The gallery is <span style={{ color: c.accent }}>open</span>.
                              </h1>
                              <p className="text-sm" style={{ color: c.textMuted }}>
                                    No photos yet — be the first.
                              </p>
                              <Link
                                    to={`/${event.event_slug}/camera`}
                                    className="inline-block mt-6 font-medium rounded-full py-3 px-6 transition-colors text-sm text-white"
                                    style={{ backgroundColor: c.accent }}
                              >
                                    Open camera
                              </Link>
                        </div>
                  </div>
            )
      }

      return (
            <>
            <FontLoader fontId={event.font_family} />
            <div className="min-h-screen" style={{ backgroundColor: c.bg }}>
                  <header className="px-4 sm:px-6 pt-5 pb-4">
                        <div className="max-w-6xl mx-auto">
                              <div className="flex items-center justify-between mb-3">
                                    {selectMode ? (
                                          <button
                                                onClick={exitSelectMode}
                                                className="text-sm font-medium transition-colors"
                                                style={{ color: c.textMuted }}
                                          >
                                                Cancel
                                          </button>
                                    ) : (
                                          <Link
                                                to={`/${event.event_slug}`}
                                                className="inline-flex items-center gap-1 text-sm font-medium transition-colors"
                                                style={{ color: c.textMuted }}
                                          >
                                                ← Back
                                          </Link>
                                    )}

                                    <div className="flex items-center gap-3">
                                          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: c.textSubtle }}>
                                                {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                                          </p>
                                          {!selectMode && (
                                                <button
                                                      onClick={() => setSelectMode(true)}
                                                      className="text-xs font-bold px-3 py-1.5 rounded-full border transition-all"
                                                      style={{ borderColor: c.border, color: c.text }}
                                                >
                                                      Select
                                                </button>
                                          )}
                                    </div>
                              </div>

                              <div className="flex items-center justify-between">
                                    <h1
                                          className="text-2xl sm:text-3xl font-extrabold tracking-tight"
                                          style={{ color: c.text, fontFamily: selectedFontFamily }}
                                    >
                                          {event.event_name} — <span style={{ color: c.accent }}>Gallery</span>
                                    </h1>

                                    {selectMode && (
                                          <div className="flex items-center gap-2">
                                                <button
                                                      onClick={() => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map(p => p.id)))}
                                                      className="text-xs font-bold px-3 py-1.5 rounded-full border transition-all"
                                                      style={{ borderColor: c.border, color: c.text }}
                                                >
                                                      {selected.size === photos.length ? 'Deselect all' : 'Select all'}
                                                </button>
                                                <button
                                                      onClick={handleDownloadSelected}
                                                      disabled={selected.size === 0 || downloading}
                                                      className="text-xs font-bold px-3 py-1.5 rounded-full text-white transition-all disabled:opacity-40 flex items-center gap-1.5"
                                                      style={{ backgroundColor: c.accent }}
                                                >
                                                      {downloading ? (
                                                            <>
                                                                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" /><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" /></svg>
                                                                  Zipping…
                                                            </>
                                                      ) : (
                                                            <>
                                                                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" /><polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" /></svg>
                                                                  Download {selected.size > 0 ? `(${selected.size})` : ''}
                                                            </>
                                                      )}
                                                </button>
                                          </div>
                                    )}
                              </div>
                        </div>
                  </header>

                  <div className="px-2 sm:px-4 pb-12">
                        <div className="max-w-6xl mx-auto grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-1.5">
                              {photos.map((photo, index) => {
                                    const isSelected = selected.has(photo.id)
                                    return (
                                          <button
                                                key={photo.id}
                                                onClick={() => selectMode ? toggleSelect(photo.id) : setLightboxIndex(index)}
                                                className="aspect-square overflow-hidden rounded-md transition-all focus:outline-none relative"
                                                style={{ backgroundColor: c.surfaceMuted }}
                                          >
                                                {photo.is_video ? (
                                                      <>
                                                            {photo.thumbnail_url ? (
                                                                  <img
                                                                        src={photo.thumbnail_url}
                                                                        alt="Video thumbnail"
                                                                        className="w-full h-full object-cover"
                                                                        style={{ opacity: selectMode && !isSelected ? 0.5 : 1 }}
                                                                        loading="lazy"
                                                                  />
                                                            ) : (
                                                                  <video
                                                                        src={photo.original_url}
                                                                        className="w-full h-full object-cover"
                                                                        style={{ opacity: selectMode && !isSelected ? 0.5 : 1 }}
                                                                        muted playsInline preload="metadata"
                                                                  />
                                                            )}
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                  <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
                                                                        <svg width="12" height="12" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                                  </div>
                                                            </div>
                                                      </>
                                                ) : /\.(mp4|mov|webm|avi|mkv|3gp)(\?|$)/i.test(photo.original_url || '') ? (
                                                      <>
                                                            <video
                                                                  src={photo.original_url}
                                                                  className="w-full h-full object-cover"
                                                                  style={{ opacity: selectMode && !isSelected ? 0.5 : 1 }}
                                                                  muted playsInline preload="metadata"
                                                            />
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                  <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
                                                                        <svg width="12" height="12" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                                  </div>
                                                            </div>
                                                      </>
                                                ) : (
                                                      <img
                                                            src={getThumbnailUrl(photo.original_url)}
                                                            alt={photo.guest_name ? `Photo by ${photo.guest_name}` : 'Event photo'}
                                                            className="w-full h-full object-cover"
                                                            style={{ opacity: selectMode && !isSelected ? 0.5 : 1 }}
                                                            loading="lazy"
                                                      />
                                                )}
                                                {selectMode && (
                                                      <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-white' : 'border-white/60'}`}
                                                            style={{ backgroundColor: isSelected ? c.accent : 'transparent' }}>
                                                            {isSelected && (
                                                                  <svg width="10" height="10" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                            )}
                                                      </div>
                                                )}
                                          </button>
                                    )
                              })}
                        </div>
                  </div>

                  <footer className="text-center pb-6">
                        <Link
                              to={`/${event.event_slug}/camera`}
                              className="inline-block font-medium rounded-full py-2.5 px-5 transition-colors text-sm text-white"
                              style={{ backgroundColor: c.accent }}
                        >
                              Add your photo
                        </Link>
                        <p className="text-xs mt-3" style={{ color: c.textSubtle }}>powered by vantge</p>
                  </footer>

                  {lightboxIndex !== null && (
                        <Lightbox
                              photos={photos}
                              initialIndex={lightboxIndex}
                              onClose={() => setLightboxIndex(null)}
                        />
                  )}
            </div>
            </>
      )
}

function Lightbox({ photos, initialIndex, onClose }) {
      const [index, setIndex] = useState(initialIndex)
      const [dlLoading, setDlLoading] = useState(false)
      const photo = photos[index]

      function next() { setIndex((i) => (i + 1) % photos.length) }
      function prev() { setIndex((i) => (i - 1 + photos.length) % photos.length) }

      useEffect(() => {
            function handleKey(e) {
                  if (e.key === 'Escape') onClose()
                  if (e.key === 'ArrowRight') next()
                  if (e.key === 'ArrowLeft') prev()
            }
            window.addEventListener('keydown', handleKey)
            return () => window.removeEventListener('keydown', handleKey)
      }, [index])

      async function handleDownload(e) {
            e.stopPropagation()
            setDlLoading(true)
            await downloadSinglePhoto(getFullSizeUrl(photo.original_url), `photo-${index + 1}.jpg`)
            setDlLoading(false)
      }

      return (
            <div
                  className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                  onClick={onClose}
            >
                  {/* Top bar */}
                  <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3">
                        <p className="text-white/60 text-sm">{index + 1} / {photos.length}</p>
                        <div className="flex items-center gap-2">
                              {/* Download this photo */}
                              <button
                                    onClick={handleDownload}
                                    disabled={dlLoading}
                                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-full transition-all disabled:opacity-50"
                              >
                                    {dlLoading ? (
                                          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" /><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" /></svg>
                                    ) : (
                                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" /><polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" /></svg>
                                    )}
                                    Save photo
                              </button>
                              <button
                                    onClick={onClose}
                                    className="text-white/70 hover:text-white text-3xl font-light w-10 h-10 flex items-center justify-center"
                                    aria-label="Close"
                              >
                                    ×
                              </button>
                        </div>
                  </div>

                  {photo.is_video ? (
                        <video
                              src={photo.original_url}
                              controls
                              autoPlay
                              playsInline
                              onClick={(e) => e.stopPropagation()}
                              className="max-w-full max-h-[85vh] rounded-lg"
                        />
                  ) : (
                        <img
                              src={getFullSizeUrl(photo.original_url)}
                              alt=""
                              onClick={(e) => e.stopPropagation()}
                              className="max-w-full max-h-[85vh] object-contain"
                        />
                  )}

                  {photos.length > 1 && (
                        <button
                              onClick={(e) => { e.stopPropagation(); prev() }}
                              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white transition-all active:scale-95"
                              style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                              aria-label="Previous"
                        >
                              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                  )}

                  {photos.length > 1 && (
                        <button
                              onClick={(e) => { e.stopPropagation(); next() }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white transition-all active:scale-95"
                              style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                              aria-label="Next"
                        >
                              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                  )}

                  {photo.guest_name && (
                        <p className="absolute bottom-6 left-0 right-0 text-center text-white/50 text-sm">
                              {photo.guest_name}
                        </p>
                  )}
            </div>
      )
}
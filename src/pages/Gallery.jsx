import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import JSZip from 'jszip'
import { supabase } from '../lib/supabase'
import { getThumbnailUrl, getFullSizeUrl } from '../lib/cloudinary'
import { getTheme } from '../lib/themes'
import { resolveFontFamily } from '../lib/fonts'
import { getEventType } from '../lib/eventTypes'
import { uploadPhoto } from '../lib/uploadPhoto'
import FontLoader from '../components/FontLoader'
import VantgeLogo from '../components/VantgeLogo'

const DEFAULT_BG = 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=85'
const FAVORITES_KEY = (eventId) => `vantge_favs_${eventId}`

function looksLikeVideo(url) {
  if (!url) return false
  return /\.(mp4|mov|webm|avi|mkv|3gp)(\?|$)/i.test(url)
}

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

async function downloadZip(targets, eventSlug) {
  const zip = new JSZip()
  await Promise.all(targets.map(async ({ url, name }) => {
    try { const res = await fetch(url); zip.file(name, await res.blob()) } catch { /* skip */ }
  }))
  const blob = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${eventSlug}-photos.zip`
  a.click()
  URL.revokeObjectURL(a.href)
}

function makeFilename(index) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `vantge-${date}-#${String(index + 1).padStart(3, '0')}`
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ message, visible }) {
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-full text-sm font-semibold text-white shadow-xl transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
      style={{ backgroundColor: 'rgba(26,26,24,0.95)', backdropFilter: 'blur(12px)' }}>
      {message}
    </div>
  )
}

function useToast() {
  const [toast, setToast] = useState({ message: '', visible: false })
  const timerRef = useRef(null)
  function show(message, duration = 2200) {
    clearTimeout(timerRef.current)
    setToast({ message, visible: true })
    timerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), duration)
  }
  return [toast, show]
}

// ─── UPLOAD SHEET ─────────────────────────────────────────────────────────────
function UploadSheet({ event, accentColor, onClose, onUploaded }) {
  const [files, setFiles] = useState([])
  const [guestName, setGuestName] = useState('')
  const [progress, setProgress] = useState(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const cameraRef = useRef(null)

  async function handleUpload() {
    if (!files.length || !guestName.trim()) return
    setProgress(0)
    setError(null)
    let completed = 0
    for (const file of files) {
      const result = await uploadPhoto({ blob: file, eventId: event.id, guestName: guestName.trim(), status: 0 })
      if (!result.success) { setError('Some files failed to upload.') }
      completed++
      setProgress(Math.round((completed / files.length) * 100))
    }
    setDone(true)
    setTimeout(() => { onUploaded(); onClose() }, 1600)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[#F8F5ED] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>

        <div className="w-10 h-1 bg-[#D4CFBC] rounded-full mx-auto mb-5 sm:hidden" />

        <h2 className="text-lg font-black text-[#1A1A18] mb-1">Add Photos</h2>
        <p className="text-sm text-[#6B6B63] mb-5">Share your photos from {event.event_name}</p>

        {done ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <svg width="24" height="24" fill="none" stroke="#16a34a" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="font-bold text-[#1A1A18]">{files.length} photo{files.length !== 1 ? 's' : ''} shared!</p>
          </div>
        ) : (
          <>
            {/* Name */}
            <div className="mb-3">
              <label className="block text-[10px] font-black tracking-widest uppercase text-[#9A9A8E] mb-1.5">Your Name <span className="text-red-500">*</span></label>
              <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)}
                placeholder="So the host knows it's from you"
                className="w-full bg-white border border-[#E0D8C6] rounded-xl px-4 py-3 text-sm text-[#1A1A18] focus:outline-none focus:border-[#1A1A18] transition-colors placeholder:text-[#C0BFB5]" />
            </div>

            {/* Hidden inputs */}
            <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="hidden"
              onChange={e => setFiles(Array.from(e.target.files || []))} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => setFiles(Array.from(e.target.files || []))} />

            {files.length === 0 ? (
              <div className="flex gap-2 mb-1">
                <button onClick={() => cameraRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-[#D4CFBC] rounded-2xl py-6 flex flex-col items-center gap-2 text-[#9A9A8E] hover:border-[#B29746] hover:text-[#B29746] transition-colors">
                  <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="4"/></svg>
                  <span className="text-xs font-bold">Take Photo</span>
                </button>
                <button onClick={() => inputRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-[#D4CFBC] rounded-2xl py-6 flex flex-col items-center gap-2 text-[#9A9A8E] hover:border-[#B29746] hover:text-[#B29746] transition-colors">
                  <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-xs font-bold">Library</span>
                </button>
              </div>
            ) : (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-[#1A1A18]">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
                  <button onClick={() => inputRef.current?.click()} className="text-xs font-bold text-[#B29746]">Change</button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {files.slice(0, 6).map((f, i) => (
                    <div key={i} className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-[#E8E4DC]">
                      <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {files.length > 6 && <div className="shrink-0 w-14 h-14 rounded-lg bg-[#E8E4DC] flex items-center justify-center text-xs font-bold text-[#6B6B63]">+{files.length - 6}</div>}
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}

            {progress !== null && (
              <div className="mt-3 mb-2">
                <div className="h-1.5 bg-[#E8E4DC] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: accentColor }} />
                </div>
                <p className="text-xs text-[#9A9A8E] mt-1 text-right">{progress}%</p>
              </div>
            )}

            <p className="text-[10px] text-[#9A9A8E] text-center mt-3 leading-relaxed">
              By uploading, you agree your photos may be used by the event host for promotional purposes.
            </p>

            <button onClick={handleUpload} disabled={!files.length || !guestName.trim() || progress !== null}
              className="w-full mt-2 py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ backgroundColor: accentColor }}>
              {progress !== null ? 'Uploading…' : `Share ${files.length > 0 ? files.length + ' ' : ''}Photo${files.length !== 1 ? 's' : ''}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── SHARE SHEET (desktop fallback) ──────────────────────────────────────────
function ShareSheet({ photo, eventName, onClose, showToast }) {
  const url = getFullSizeUrl(photo.original_url)

  async function copyLink() {
    await navigator.clipboard.writeText(url)
    showToast('Link copied!')
    onClose()
  }

  async function savePhoto() {
    const ext = photo.is_video || looksLikeVideo(photo.original_url) ? 'mp4' : 'jpg'
    await downloadSinglePhoto(url, makeFilename(0) + '.' + ext)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* Photo preview row */}
        <div className="flex items-center gap-3 p-4 border-b border-[#F0EDE6]">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#E8E4DC] shrink-0">
            <img src={getThumbnailUrl(photo.original_url)} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#1A1A18] text-sm truncate">{eventName}</p>
            <p className="text-xs text-[#9A9A8E]">{photo.is_video ? 'Video' : 'Photo'}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#F0EDE6] flex items-center justify-center text-[#6B6B63]">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </div>

        {[
          { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/><polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/></svg>, label: 'Save to Photos', action: savePhoto },
          { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" strokeLinecap="round"/><polyline points="16 6 12 2 8 6" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round"/></svg>, label: 'Share', action: async () => { if (navigator.share) { try { await navigator.share({ title: eventName, url }); onClose() } catch { /* aborted */ } } else { copyLink() } } },
          { icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: 'Copy Link', action: copyLink },
        ].map(({ icon, label, action }) => (
          <button key={label} onClick={action} className="w-full flex items-center gap-4 px-5 py-4 text-[#1A1A18] hover:bg-[#F8F5ED] transition-colors border-b border-[#F0EDE6] last:border-b-0">
            <span className="text-[#6B6B63]">{icon}</span>
            <span className="font-medium text-sm">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────────
function Lightbox({ photos, initialIndex, onClose, allowDownloads, allowSharing, allowFavorites, eventName, favorites, onToggleFavorite, showToast }) {
  const [index, setIndex] = useState(initialIndex)
  const [dlLoading, setDlLoading] = useState(false)
  const [shareSheetPhoto, setShareSheetPhoto] = useState(null)
  const touchStartX = useRef(null)

  const photo = photos[index]
  const isVid = photo.is_video || looksLikeVideo(photo.original_url)
  const isFav = favorites.has(photo.id)

  function next() { setIndex(i => (i + 1) % photos.length) }
  function prev() { setIndex(i => (i - 1 + photos.length) % photos.length) }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index])

  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev()
    touchStartX.current = null
  }

  async function handleDownload() {
    setDlLoading(true)
    const ext = isVid ? 'mp4' : 'jpg'
    await downloadSinglePhoto(getFullSizeUrl(photo.original_url), makeFilename(index) + '.' + ext)
    setDlLoading(false)
  }

  async function handleShare() {
    const url = getFullSizeUrl(photo.original_url)
    if (navigator.share) {
      try {
        if (!isVid && navigator.canShare) {
          try {
            const res = await fetch(url)
            const blob = await res.blob()
            const file = new File([blob], `vantge-photo.jpg`, { type: blob.type })
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: eventName })
              return
            }
          } catch { /* fall through */ }
        }
        await navigator.share({ title: eventName, text: `Photo from ${eventName}`, url })
      } catch (err) {
        if (err.name !== 'AbortError') setShareSheetPhoto(photo)
      }
    } else {
      setShareSheetPhoto(photo)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black flex flex-col select-none"
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

        {/* Top bar */}
        <div className="shrink-0 flex items-center justify-between px-5 h-14"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <button onClick={onClose} aria-label="Back to gallery"
            className="flex items-center gap-1 text-white/80 hover:text-white transition-colors">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          <p className="text-white text-sm font-semibold absolute left-1/2 -translate-x-1/2 tracking-wide">{index + 1} / {photos.length}</p>

          <div className="flex items-center gap-4">
            {allowFavorites && (
              <button onClick={() => onToggleFavorite(photo.id)} aria-label={isFav ? 'Unfavorite' : 'Favorite'}
                className="transition-transform active:scale-90">
                <svg width="24" height="24" fill={isFav ? 'white' : 'none'} stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              </button>
            )}
            <button aria-label="More options" className="text-white/80 hover:text-white transition-colors">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>
          </div>
        </div>

        {/* Media */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {isVid ? (
            <video key={photo.id} src={photo.original_url} controls autoPlay playsInline className="max-w-full max-h-full" />
          ) : (
            <img key={photo.id} src={getFullSizeUrl(photo.original_url)}
              alt={photo.guest_name ? `Photo by ${photo.guest_name}` : 'Event photo'}
              className="max-w-full max-h-full object-contain" />
          )}

          {photos.length > 1 && (
            <>
              <button onClick={prev} aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all active:scale-90 hidden sm:flex"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button onClick={next} aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all active:scale-90 hidden sm:flex"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </>
          )}
        </div>

        {/* Filmstrip */}
        {photos.length > 1 && (
          <div className="shrink-0 px-3 py-2">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar justify-start" style={{ scrollbarWidth: 'none' }}>
              {photos.map((p, i) => {
                const isVid = p.is_video || looksLikeVideo(p.original_url)
                return (
                  <button key={p.id} onClick={() => setIndex(i)}
                    className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all ${i === index ? 'ring-2 ring-white opacity-100' : 'opacity-40 hover:opacity-70'}`}>
                    {isVid && p.thumbnail_url
                      ? <img src={p.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      : isVid
                        ? <div className="w-full h-full bg-white/10 flex items-center justify-center"><svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
                        : <img src={getThumbnailUrl(p.original_url)} alt="" className="w-full h-full object-cover" loading="lazy" />
                    }
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Bottom action bar */}
        <div className="shrink-0 border-t border-white/[0.07]"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {photo.caption && (
            <p className="text-white/60 text-sm text-center px-6 pt-3 pb-1 leading-snug">{photo.caption}</p>
          )}
          <div className={`flex items-center pt-3 px-8 ${[allowFavorites, allowDownloads, allowSharing].filter(Boolean).length > 0 ? 'justify-around' : 'justify-center'}`}>
            {allowFavorites && (
              <button onClick={() => onToggleFavorite(photo.id)}
                className="flex flex-col items-center gap-1.5 transition-transform active:scale-90 min-w-[56px]">
                <svg width="24" height="24" fill={isFav ? '#E8615C' : 'none'} stroke={isFav ? '#E8615C' : 'rgba(255,255,255,0.7)'} strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                <span className="text-[10px] font-semibold text-white/60">Favorite</span>
              </button>
            )}
            {allowDownloads && (
              <button onClick={handleDownload} disabled={dlLoading}
                className="flex flex-col items-center gap-1.5 transition-transform active:scale-90 disabled:opacity-40 min-w-[56px]">
                {dlLoading
                  ? <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/></svg>
                  : <svg width="24" height="24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round"/><polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round"/></svg>
                }
                <span className="text-[10px] font-semibold text-white/60">Download</span>
              </button>
            )}
            {allowSharing && (
              <button onClick={handleShare}
                className="flex flex-col items-center gap-1.5 transition-transform active:scale-90 min-w-[56px]">
                <svg width="24" height="24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                <span className="text-[10px] font-semibold text-white/60">Share</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {shareSheetPhoto && (
        <ShareSheet photo={shareSheetPhoto} eventName={eventName} showToast={showToast}
          onClose={() => setShareSheetPhoto(null)} />
      )}
    </>
  )
}

// ─── PHOTO GRID ───────────────────────────────────────────────────────────────
function PhotoGrid({ photos, selectMode, selected, accentColor, favorites, onTap, onToggleSelect }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-0.5 sm:gap-1">
      {photos.map((photo, index) => {
        const isSelected = selected.has(photo.id)
        const isFav = favorites.has(photo.id)
        const isVid = photo.is_video || looksLikeVideo(photo.original_url)
        return (
          <button key={photo.id}
            onClick={() => selectMode ? onToggleSelect(photo.id) : onTap(index)}
            className="relative aspect-square overflow-hidden group focus:outline-none vantge-photo-cell bg-[#E8E4DC]"
            style={{ animationDelay: `${Math.min(index * 30, 500)}ms` }}
            aria-label={photo.guest_name ? `Photo by ${photo.guest_name}` : 'Event photo'}>

            {isVid ? (
              photo.thumbnail_url
                ? <img src={photo.thumbnail_url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" style={{ opacity: selectMode && !isSelected ? 0.45 : 1 }} loading="lazy" />
                : <video src={photo.original_url} className="w-full h-full object-cover" style={{ opacity: selectMode && !isSelected ? 0.45 : 1 }} muted playsInline preload="metadata" />
            ) : (
              <img src={getThumbnailUrl(photo.original_url)} alt=""
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                style={{ opacity: selectMode && !isSelected ? 0.45 : 1 }} loading="lazy" />
            )}

            {isVid && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.52)' }}>
                  <svg width="12" height="12" fill="white" viewBox="0 0 24 24" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
            )}

            {isFav && !selectMode && (
              <div className="absolute top-1.5 left-1.5 pointer-events-none">
                <svg width="14" height="14" fill="#E8615C" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              </div>
            )}

            {selectMode && (
              <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-white' : 'border-white/60'}`}
                style={{ backgroundColor: isSelected ? accentColor : 'rgba(0,0,0,0.35)' }}>
                {isSelected && <svg width="9" height="9" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── MAIN GALLERY ─────────────────────────────────────────────────────────────
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
  const [filter, setFilter] = useState('all') // 'all' | 'favorites' | 'mine'
  const [favorites, setFavorites] = useState(new Set())
  const [guestId] = useState(() => {
    let id = localStorage.getItem('vantge_guest_id')
    if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('vantge_guest_id', id) }
    return id
  })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [toast, showToast] = useToast()

  // Load favorites from localStorage
  useEffect(() => {
    if (!event) return
    try {
      const raw = localStorage.getItem(FAVORITES_KEY(event.id))
      setFavorites(raw ? new Set(JSON.parse(raw)) : new Set())
    } catch { setFavorites(new Set()) }
  }, [event?.id])

  function toggleFavorite(photoId) {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(photoId) ? next.delete(photoId) : next.add(photoId)
      if (event) localStorage.setItem(FAVORITES_KEY(event.id), JSON.stringify([...next]))
      return next
    })
  }

  const toggleSelect = useCallback((id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const { data: eventData, error: eventError } = await supabase
        .from('events').select('*').eq('event_slug', eventSlug).maybeSingle()
      if (eventError || !eventData) { setError('Event not found'); setLoading(false); return }
      setEvent(eventData)
      if (!eventData.gallery_unlocked) { setLoading(false); return }
      const { data: photoData, error: photoError } = await supabase
        .from('media_queue').select('*').eq('event_id', eventData.id).eq('status', 1).eq('is_admin_upload', false)
        .order('created_at', { ascending: false })
      if (!photoError) setPhotos(photoData || [])
      setLoading(false)
    }
    fetchData()
    const channel = supabase.channel(`gallery:${eventSlug}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'media_queue' }, (payload) => {
        if (payload.new.status === 1 && !payload.new.is_admin_upload) setPhotos(curr => [payload.new, ...curr])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'media_queue' }, (payload) => {
        if (payload.new.status === 1 && payload.old.status === 0 && !payload.new.is_admin_upload) setPhotos(curr => [payload.new, ...curr])
      }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [eventSlug])

  async function handleDownloadSelected() {
    setDownloading(true)
    const targets = photos.filter(p => selected.has(p.id)).map((p, i) => {
      const ext = p.is_video || looksLikeVideo(p.original_url) ? 'mp4' : 'jpg'
      return { url: getFullSizeUrl(p.original_url), name: makeFilename(i) + '.' + ext }
    })
    await downloadZip(targets, event.event_slug)
    setDownloading(false)
  }

  async function handleShareSelected() {
    const selectedPhotos = photos.filter(p => selected.has(p.id))
    const url = getFullSizeUrl(selectedPhotos[0].original_url)
    if (navigator.share) {
      try { await navigator.share({ title: event.event_name, text: `${selectedPhotos.length > 1 ? selectedPhotos.length + ' photos' : 'A photo'} from ${event.event_name}`, url }) } catch { /* aborted */ }
    } else {
      await navigator.clipboard.writeText(url)
      showToast(selectedPhotos.length > 1 ? `${selectedPhotos.length} links ready — first link copied` : 'Link copied!')
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#F8F5ED] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B29746" strokeWidth="2">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  )

  if (error || !event) return (
    <div className="min-h-screen bg-[#F8F5ED] flex items-center justify-center p-8 text-center">
      <div>
        <p className="text-[#6B6B63] text-sm mb-4">Gallery not found.</p>
        <button onClick={() => navigate('/')} className="text-[#1A1A18] text-sm font-semibold underline underline-offset-4">← Go home</button>
      </div>
    </div>
  )

  const theme = getTheme(event.theme)
  const c = theme.colors
  const selectedFontFamily = resolveFontFamily(event.font_family)
  const bgImage = event.background_image || DEFAULT_BG
  const bgPosition = event.background_position || '50% 40%'
  const accentColor = c.accent
  const eventType = getEventType(event.event_type)
  const tintAlpha = ((event.background_tint ?? 55) / 100).toFixed(2)

  const allowDownloads = event.allow_downloads ?? true
  const allowSharing = event.allow_sharing ?? true
  const allowFavorites = event.allow_favorites ?? true
  const allowUploads = event.allow_uploads ?? true

  // ── Gallery locked ─────────────────────────────────────────────────────────
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
          <p className="text-white/50 text-sm mb-8">Gallery opens soon. Check back after the event.</p>
          <button onClick={() => navigate(`/${eventSlug}`)} className="px-6 py-3 rounded-2xl font-bold text-sm text-white/70 border border-white/20" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            ← Back to Event
          </button>
        </div>
      </div>
    </>
  )

  // Filter photos
  const filteredPhotos = filter === 'favorites'
    ? photos.filter(p => favorites.has(p.id))
    : filter === 'mine'
      ? photos.filter(p => p.guest_id === guestId)
      : photos

  const videoCount = photos.filter(p => p.is_video || looksLikeVideo(p.original_url)).length
  const photoCount = photos.length - videoCount

  // ── Main gallery ───────────────────────────────────────────────────────────
  return (
    <>
      <FontLoader fontId={event.font_family} />
      <div className="min-h-screen bg-[#F8F5ED]">

        {/* ── SELECT MODE HEADER (only shown when selecting) ── */}
        {selectMode && (
          <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-md border-b border-[#E8E4DC]">
            <div className="max-w-2xl mx-auto px-4 flex items-center justify-between" style={{ height: '52px' }}>
              <button onClick={() => { setSelectMode(false); setSelected(new Set()) }}
                className="text-sm font-bold text-[#6B6B63] hover:text-ink transition-colors min-w-14">Cancel</button>
              <p className="absolute left-1/2 -translate-x-1/2 text-sm font-bold text-ink">{selected.size} selected</p>
              <div className="flex items-center gap-3 min-w-14 justify-end">
                {allowSharing && (
                  <button onClick={handleShareSelected} disabled={selected.size === 0}
                    className="text-sm font-bold text-[#6B6B63] disabled:opacity-30 hover:text-[#1A1A18] transition-colors">
                    Share
                  </button>
                )}
                {allowDownloads && (
                  <button onClick={handleDownloadSelected} disabled={selected.size === 0 || downloading}
                    className="text-sm font-bold disabled:opacity-30 transition-colors"
                    style={{ color: selected.size > 0 ? accentColor : '#6B6B63' }}>
                    {downloading ? 'Saving…' : 'Save'}
                  </button>
                )}
              </div>
            </div>
            <div className="max-w-2xl mx-auto px-4 pb-2 flex items-center justify-between">
              <p className="text-xs text-[#9A9A8E]">{selected.size} of {photos.length} selected</p>
              <button onClick={() => setSelected(selected.size === photos.length ? new Set() : new Set(photos.map(p => p.id)))}
                className="text-xs font-bold" style={{ color: accentColor }}>
                {selected.size === photos.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
          </header>
        )}


        {/* ── EVENT HERO ── */}
        {!selectMode && (
          <div className="relative w-full" style={{ height: 'min(56vw, 340px)' }}>
            <img src={bgImage} alt={event.event_name} className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: bgPosition }} loading="eager" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 100%)` }} />

            {/* Top bar: Back | Logo | spacer — same pattern as upload page */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 pt-5 pb-2">
              <button
                onClick={() => navigate(`/${eventSlug}`)}
                className="flex items-center gap-1.5 text-white text-sm font-semibold"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Back
              </button>
              <a href="/" className="opacity-80 hover:opacity-100 transition-opacity">
                <VantgeLogo size="sm" monoWhite />
              </a>
              <div className="w-12" />
            </div>

            {/* Event info — bottom */}
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-5 text-center px-6">
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/60 mb-1">{eventType.tagline}</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-1"
                style={{ fontFamily: selectedFontFamily }}>{event.event_name}</h1>
              {event.event_date && (
                <p className="text-white/60 text-xs font-bold tracking-widest uppercase mb-1">
                  {new Date(event.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              {event.welcome_message && (
                <p className="text-white/70 text-sm mt-1 max-w-xs leading-relaxed">{event.welcome_message}</p>
              )}
            </div>
          </div>
        )}

        {/* ── FILTER PILLS ── */}
        {!selectMode && (
          <div className="max-w-2xl mx-auto px-4 py-3 flex justify-center gap-2">
            {[
              { key: 'all', label: 'All Photos' },
              ...(allowFavorites ? [{ key: 'favorites', label: '♡ Favorites' }] : []),
              { key: 'mine', label: 'My Uploads' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${filter === key ? 'bg-[#1A1A18] text-white' : 'bg-white text-[#6B6B63] border border-[#E8E4DC] hover:border-[#1A1A18]'}`}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── PHOTO GRID ── */}
        <div className="max-w-2xl mx-auto pb-28">
          {filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              {filter === 'favorites' ? (
                <>
                  <svg width="40" height="40" fill="none" stroke="#D4CFBC" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-4"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                  <p className="text-[#9A9A8E] font-semibold text-sm">No favorites yet</p>
                  <p className="text-[#C0BFB5] text-xs mt-1">Tap the heart on any photo to save it here</p>
                </>
              ) : filter === 'mine' ? (
                <>
                  <p className="text-[#9A9A8E] font-semibold text-sm">No uploads from this device</p>
                  <p className="text-[#C0BFB5] text-xs mt-1">Your photos will appear here after you share them</p>
                </>
              ) : (
                <>
                  <p className="text-[#9A9A8E] font-semibold text-sm">No photos yet</p>
                  <p className="text-[#C0BFB5] text-xs mt-1">Be the first to share a photo!</p>
                </>
              )}
            </div>
          ) : (
            <PhotoGrid photos={filteredPhotos} selectMode={selectMode} selected={selected}
              accentColor={accentColor} favorites={favorites}
              onTap={setLightboxIndex} onToggleSelect={toggleSelect} />
          )}
        </div>

        {/* ── ADD PHOTOS BUTTON ── */}
        {allowUploads && !selectMode && (
          <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center"
            style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))', background: 'linear-gradient(to top, rgba(248,245,237,0.98) 60%, transparent)' }}>
            <button onClick={() => setUploadOpen(true)}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-full font-black text-sm text-white shadow-xl transition-all active:scale-[0.97]"
              style={{ backgroundColor: '#1A1A18' }}>
              <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Add Photos
            </button>
          </div>
        )}

        {/* ── LIGHTBOX ── */}
        {lightboxIndex !== null && (
          <Lightbox photos={filteredPhotos} initialIndex={lightboxIndex} accentColor={accentColor}
            onClose={() => setLightboxIndex(null)}
            allowDownloads={allowDownloads} allowSharing={allowSharing} allowFavorites={allowFavorites}
            eventName={event.event_name} favorites={favorites} onToggleFavorite={toggleFavorite} showToast={showToast} />
        )}

        {/* ── UPLOAD SHEET ── */}
        {uploadOpen && (
          <UploadSheet event={event} accentColor={accentColor}
            onClose={() => setUploadOpen(false)}
            onUploaded={() => showToast('Photos shared! 🎉')} />
        )}

        <Toast message={toast.message} visible={toast.visible} />

      </div>

      <style>{`
        @keyframes vantgePhotoIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        .vantge-photo-cell { animation: vantgePhotoIn 0.35s ease both; }
        @media (prefers-reduced-motion: reduce) { .vantge-photo-cell { animation: none; } }
      `}</style>
    </>
  )
}

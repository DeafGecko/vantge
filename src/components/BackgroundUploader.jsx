import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useDefaultBg } from '../hooks/useDefaultBg'

const MAX_BYTES = 50 * 1024 * 1024

// Curated Unsplash photos per event type (photo ID → full URL)
const LIBRARY = {
      anniversary: [
            'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=1200&q=80',
            'https://images.unsplash.com/photo-1518568740994-c1de148d8e22?w=1200&q=80',
            'https://images.unsplash.com/photo-1464047736614-af63643285bf?w=1200&q=80',
            'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1200&q=80',
            'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1200&q=80',
            'https://images.unsplash.com/photo-1582656447884-de8e48ab5b90?w=1200&q=80',
      ],
      birthday: [
            'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80',
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
            'https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=1200&q=80',
            'https://images.unsplash.com/photo-1585996487823-f621ff9a01d6?w=1200&q=80',
            'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80',
      ],
      corporate: [
            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
            'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&q=80',
            'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&q=80',
            'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200&q=80',
            'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=1200&q=80',
            'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=80',
      ],
      family: [
            'https://images.unsplash.com/photo-1511895426328-dc8714191011?w=1200&q=80',
            'https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?w=1200&q=80',
            'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80',
            'https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?w=1200&q=80',
            'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=1200&q=80',
            'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?w=1200&q=80',
      ],
      graduation: [
            'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80',
            'https://images.unsplash.com/photo-1627556704290-2b1f5853ff78?w=1200&q=80',
            'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80',
            'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80',
            'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1200&q=80',
            'https://images.unsplash.com/photo-1563459802257-2a97df940f11?w=1200&q=80',
      ],
      party: [
            'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80',
            'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80',
            'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80',
            'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80',
            'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&q=80',
            'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=1200&q=80',
      ],
      wedding: [
            'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80',
            'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=80',
            'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=80',
            'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1200&q=80',
            'https://images.unsplash.com/photo-1550005809-91ad75fb315f?w=1200&q=80',
            'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&q=80',
      ],
      other: [
            'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200&q=80',
            'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
            'https://images.unsplash.com/photo-1444628838545-ac4016a5418a?w=1200&q=80',
            'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80',
            'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&q=80',
            'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80',
      ],
      none: [
            'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200&q=80',
            'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
            'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80',
            'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80',
            'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80',
            'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80',
      ],
}

async function compressImage(file) {
      if (file.size <= MAX_BYTES) return file
      return new Promise((resolve) => {
            const img = new Image()
            const url = URL.createObjectURL(file)
            img.onload = () => {
                  URL.revokeObjectURL(url)
                  const canvas = document.createElement('canvas')
                  let { width, height } = img
                  let scale = 1
                  while ((width * height * 3 * scale * scale) > MAX_BYTES && scale > 0.1) scale -= 0.05
                  canvas.width = Math.round(width * scale)
                  canvas.height = Math.round(height * scale)
                  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
                  let quality = 0.92
                  const tryBlob = (q) => {
                        canvas.toBlob((blob) => {
                              if (!blob) return resolve(file)
                              if (blob.size <= MAX_BYTES || q <= 0.3) resolve(new File([blob], file.name, { type: 'image/jpeg' }))
                              else tryBlob(q - 0.1)
                        }, 'image/jpeg', q)
                  }
                  tryBlob(quality)
            }
            img.src = url
      })
}

// Thumbnail card shown in the side-by-side row
function ZoneThumb({ label, imageUrl, defaultBg, currentTint, isActive, uploading, onUpload, onEdit }) {
      const inputRef = useRef(null)

      async function handleFile(e) {
            const file = e.target.files?.[0]
            if (!file) return
            onUpload(file, inputRef)
      }

      const displayUrl = imageUrl || defaultBg
      const isDefault = !imageUrl || imageUrl === defaultBg
      const tintAlpha = ((currentTint ?? 55) / 100).toFixed(2)

      return (
            <div className="flex flex-col items-center gap-2 w-full">
                  <input ref={inputRef} type="file" accept="image/*,video/mp4,video/mov,video/quicktime" onChange={handleFile} className="hidden" />
                  <div
                        className={`relative rounded-xl overflow-hidden border-2 w-full cursor-pointer group transition-colors ${isActive ? 'border-[#1A1A18]' : 'border-[#E8E4DA]'}`}
                        style={{ height: 220 }}
                        onClick={() => displayUrl ? onEdit() : inputRef.current?.click()}
                  >
                        {displayUrl ? (
                              <>
                                    <img src={displayUrl} alt="Background" className="w-full h-full object-cover" style={{ objectPosition: '50% 50%' }} />
                                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                                    {isDefault && (
                                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:hidden">
                                                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/80 drop-shadow">Default</span>
                                          </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <svg width="20" height="20" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                          <p className="text-[9px] font-bold text-white uppercase tracking-widest">{isDefault ? 'Upload photo' : 'Edit'}</p>
                                    </div>
                              </>
                        ) : (
                              <div className="w-full h-full bg-[#F7F5F0] flex flex-col items-center justify-center gap-2 group-hover:bg-[#EFEDE8] transition-colors">
                                    <svg width="20" height="20" fill="none" stroke="#B0AFA5" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    <p className="text-[9px] font-bold text-[#B0AFA5] uppercase tracking-widest">{uploading ? 'Uploading...' : 'Upload photo'}</p>
                              </div>
                        )}
                  </div>
                  <p className="text-[10px] font-bold text-[#1A1A18] text-center">{label}</p>
            </div>
      )
}

// Full-screen modal editor — aspect-ratio preview left, tools right
function ZoneEditor({ label, isLandscape, imageUrl, defaultBg, currentPosition, currentTint, accentColor, eventId, dbField, eventTypeId, onSaved, onClose }) {
      const [position, setPosition] = useState(currentPosition || '50% 50%')
      const [zoom, setZoom] = useState(100) // percent, 100 = fit
      const [tint, setTint] = useState(currentTint ?? 55)
      const [pendingUrl, setPendingUrl] = useState(null)
      const [uploading, setUploading] = useState(false)
      const [dragging, setDragging] = useState(false)
      const [activeToolIndex, setActiveToolIndex] = useState(0)
      const [showChangePanel, setShowChangePanel] = useState(false)
      const frameRef = useRef(null)
      const dragStart = useRef(null)
      const inputRef = useRef(null)

      const [libraryPhotos, setLibraryPhotos] = useState(LIBRARY[eventTypeId] || LIBRARY.other || [])

      useEffect(() => {
            if (!eventTypeId) return
            supabase.from('event_type_library').select('photo_url').eq('event_type', eventTypeId).order('sort_order')
                  .then(({ data }) => {
                        if (data && data.length > 0) setLibraryPhotos(data.map(r => r.photo_url))
                  })
      }, [eventTypeId])

      const activeUrl = pendingUrl || imageUrl || defaultBg
      const tintAlpha = (tint / 100).toFixed(2)
      const hasCustomPhoto = !!(pendingUrl || imageUrl)

      // Drag-to-reposition: updates background-position
      const getPos = useCallback((e, rect) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX
            const clientY = e.touches ? e.touches[0].clientY : e.clientY
            const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
            const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
            return `${Math.round(x)}% ${Math.round(y)}%`
      }, [])

      function onDragStart(e) {
            e.preventDefault()
            dragStart.current = frameRef.current.getBoundingClientRect()
            setDragging(true)
            setPosition(getPos(e, dragStart.current))
      }
      function onDragMove(e) {
            if (!dragging || !dragStart.current) return
            e.preventDefault()
            setPosition(getPos(e, dragStart.current))
      }
      function onDragEnd() { setDragging(false); dragStart.current = null }

      async function handleFile(e) {
            const file = e.target.files?.[0]
            if (!file) return
            setUploading(true)
            setShowChangePanel(false)
            const compressed = await compressImage(file)
            const path = `backgrounds/${eventId}/${dbField}-${Date.now()}.jpg`
            const { error: uploadError } = await supabase.storage.from('event-media').upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
            if (uploadError) { alert('Upload failed: ' + uploadError.message); setUploading(false); return }
            const { data } = supabase.storage.from('event-media').getPublicUrl(path)
            setPendingUrl(data.publicUrl)
            setPosition('50% 50%')
            setZoom(100)
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
      }

      function handleLibraryPick(url) {
            setPendingUrl(url)
            setPosition('50% 50%')
            setZoom(100)
            setShowChangePanel(false)
            setActiveToolIndex(0)
      }

      async function handleConfirm() {
            const urlToSave = pendingUrl || imageUrl || null
            const { error } = await supabase.from('events').update({
                  [dbField]: urlToSave,
                  background_position: position,
                  background_tint: tint,
            }).eq('id', eventId)
            if (error) { alert('Could not save: ' + error.message); return }
            onSaved(urlToSave, position, tint)
            onClose()
      }

      async function handleRemove() {
            const { error } = await supabase.from('events').update({ [dbField]: null }).eq('id', eventId)
            if (error) { alert('Could not remove: ' + error.message) }
            else { onSaved(null, currentPosition, currentTint); setShowChangePanel(true) }
      }

      const tools = [
            { id: 'adjust', label: 'Adjust', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> },
            { id: 'change', label: 'Change Photo', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            { id: 'tint',   label: 'Tint',         icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 2v20"/></svg> },
            { id: 'delete', label: 'Delete Photo',  icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> },
      ]

      return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex overflow-hidden">

                        {/* LEFT — device frame preview OR photo picker */}
                        <div className="flex-1 bg-[#111] relative flex min-w-0">
                              <input ref={inputRef} type="file" accept="image/*,video/mp4,video/mov,video/quicktime" onChange={handleFile} className="hidden" />

                              {/* Photo picker panel — slides over device frame */}
                              {showChangePanel && (
                                    <div className="absolute inset-0 flex flex-col z-10">
                                          {/* Picker header */}
                                          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                                                <p className="text-white font-black text-sm uppercase tracking-widest">
                                                      {eventTypeId ? eventTypeId.charAt(0).toUpperCase() + eventTypeId.slice(1) : 'Photos'}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                      <button
                                                            onClick={() => inputRef.current?.click()}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 transition-colors"
                                                      >
                                                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                                            {uploading ? 'Uploading…' : 'Upload'}
                                                      </button>
                                                      <button onClick={() => setShowChangePanel(false)} className="text-white/40 hover:text-white transition-colors">
                                                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                                                      </button>
                                                </div>
                                          </div>
                                          {/* Photos — 3-column grid, vertical scroll */}
                                          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
                                                {libraryPhotos.length === 0 ? (
                                                      <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30">
                                                            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21" strokeLinecap="round"/></svg>
                                                            <p className="text-xs font-bold">No photos yet — upload above</p>
                                                      </div>
                                                ) : (
                                                      <div className="grid grid-cols-3 gap-2">
                                                            {libraryPhotos.map((url, i) => (
                                                                  <button
                                                                        key={i}
                                                                        onClick={() => { handleLibraryPick(url); setShowChangePanel(false) }}
                                                                        className={`relative rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02] ${pendingUrl === url ? 'border-white' : 'border-white/10'}`}
                                                                        style={{ aspectRatio: '3/2' }}
                                                                  >
                                                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                                                        {pendingUrl === url && (
                                                                              <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
                                                                                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                                                                                          <svg width="10" height="10" fill="none" stroke="#1A1A18" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                                                    </div>
                                                                              </div>
                                                                        )}
                                                                  </button>
                                                            ))}
                                                      </div>
                                                )}
                                          </div>
                                    </div>
                              )}

                              {/* Device frame — hidden when picker is open */}
                              <div className={`flex-1 flex items-center justify-center p-8 ${showChangePanel ? 'invisible' : ''}`}>

                              {activeUrl ? (
                                    <div
                                          className={`relative shrink-0 border-[6px] border-white/80 ${isLandscape ? 'rounded-2xl' : 'rounded-[2.5rem]'}`}
                                          style={isLandscape
                                                ? { width: 'min(100%, 520px)', aspectRatio: '16/9', boxShadow: '0 0 0 2px rgba(255,255,255,0.15), 0 20px 60px rgba(0,0,0,0.6)' }
                                                : { height: 'min(100%, 480px)', aspectRatio: '9/16', boxShadow: '0 0 0 2px rgba(255,255,255,0.15), 0 20px 60px rgba(0,0,0,0.6)' }
                                          }
                                    >
                                          {/* Phone notch */}
                                          {!isLandscape && <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-3.5 bg-white/80 rounded-full z-20 pointer-events-none" />}
                                          {/* Screen area — draggable */}
                                          <div
                                                className="absolute inset-0 overflow-hidden"
                                                style={{ borderRadius: isLandscape ? '10px' : '34px', cursor: dragging ? 'grabbing' : (activeToolIndex === 0 && !showChangePanel ? 'grab' : 'default') }}
                                                ref={frameRef}
                                                onMouseDown={activeToolIndex === 0 && !showChangePanel ? onDragStart : undefined}
                                                onMouseMove={activeToolIndex === 0 && !showChangePanel ? onDragMove : undefined}
                                                onMouseUp={activeToolIndex === 0 && !showChangePanel ? onDragEnd : undefined}
                                                onMouseLeave={activeToolIndex === 0 && !showChangePanel ? onDragEnd : undefined}
                                                onTouchStart={activeToolIndex === 0 && !showChangePanel ? onDragStart : undefined}
                                                onTouchMove={activeToolIndex === 0 && !showChangePanel ? onDragMove : undefined}
                                                onTouchEnd={activeToolIndex === 0 && !showChangePanel ? onDragEnd : undefined}
                                          >

                                          <img
                                                src={activeUrl}
                                                alt="Background"
                                                className="absolute inset-0 w-full h-full pointer-events-none"
                                                style={{
                                                      objectFit: 'cover',
                                                      objectPosition: position,
                                                      transform: `scale(${zoom / 100})`,
                                                      transformOrigin: position,
                                                }}
                                                draggable={false}
                                          />
                                          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />

                                          {activeToolIndex === 0 && !showChangePanel && (
                                                <div className="absolute w-6 h-6 rounded-full border-2 border-white shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: position.split(' ')[0], top: position.split(' ')[1], backgroundColor: `${accentColor}99` }} />
                                          )}
                                          {activeToolIndex === 0 && !showChangePanel && (
                                                <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
                                                      <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full">Drag to reposition</span>
                                                </div>
                                          )}

                                    </div>
                                    </div>
                              ) : (
                                    <div className="flex flex-col items-center gap-3 text-white/30">
                                          <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                          <p className="text-xs font-bold uppercase tracking-widest">No photo — tap Change Photo to add one</p>
                                          <button onClick={() => { setShowChangePanel(true); }} className="mt-2 bg-white text-[#1A1A18] text-[10px] font-bold uppercase tracking-widest rounded-full px-5 py-2.5 hover:bg-white/90 transition-all">
                                                Choose Photo
                                          </button>
                                    </div>
                              )}
                              </div>{/* end device frame wrapper */}
                        </div>

                        {/* RIGHT — tools panel */}
                        <div className="w-64 shrink-0 flex flex-col border-l border-[#E8E4DA]">

                              {/* Header */}
                              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E4DA]">
                                    <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#B0AFA5]">{label}</p>
                                    <button onClick={onClose} className="text-[#B0AFA5] hover:text-[#1A1A18] transition-colors">
                                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                                    </button>
                              </div>

                              {/* Tool list */}
                              <div className="flex flex-col gap-1 p-3 border-b border-[#E8E4DA]">
                                    {tools.map((tool, i) => {
                                          if (tool.id === 'delete' && !hasCustomPhoto) return null
                                          const isActive = activeToolIndex === i && tool.id !== 'change' && tool.id !== 'delete'
                                          return (
                                                <button
                                                      key={tool.id}
                                                      onClick={() => {
                                                            if (tool.id === 'change') { setShowChangePanel(true); return }
                                                            if (tool.id === 'delete') { handleRemove(); return }
                                                            setActiveToolIndex(i)
                                                            setShowChangePanel(false)
                                                      }}
                                                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                                                            tool.id === 'delete'
                                                                  ? 'text-[#C84A44] hover:bg-red-50'
                                                                  : isActive || (tool.id === 'change' && showChangePanel)
                                                                        ? 'bg-[#1A1A18] text-white'
                                                                        : 'text-[#5A5A52] hover:bg-[#F7F5F0]'
                                                      }`}
                                                >
                                                      <span className="shrink-0">{tool.icon}</span>
                                                      <span className="text-[11px] font-bold uppercase tracking-widest">{uploading && tool.id === 'change' ? 'Uploading...' : tool.label}</span>
                                                </button>
                                          )
                                    })}
                              </div>

                              {/* Active tool content */}
                              <div className="flex-1 overflow-y-auto p-5">
                                    {activeToolIndex === 0 && !showChangePanel && (
                                          <div className="flex flex-col gap-5">
                                                <div>
                                                      <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#B0AFA5] mb-2">Reposition</p>
                                                      <p className="text-[10px] text-[#B0AFA5] leading-relaxed">Drag the photo to reposition the focus point.</p>
                                                </div>
                                                <div>
                                                      <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#B0AFA5] mb-3">Zoom</p>
                                                      <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[9px] text-[#B0AFA5]">Fit</span>
                                                            <span className="text-[11px] font-bold text-[#1A1A18]">{zoom}%</span>
                                                            <span className="text-[9px] text-[#B0AFA5]">2×</span>
                                                      </div>
                                                      <input
                                                            type="range" min={100} max={200} step={1} value={zoom}
                                                            onChange={(e) => setZoom(Number(e.target.value))}
                                                            className="w-full accent-[#1A1A18] h-1.5 rounded-full cursor-pointer"
                                                      />
                                                </div>
                                          </div>
                                    )}
                                    {activeToolIndex === 2 && !showChangePanel && (
                                          <div>
                                                <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#B0AFA5] mb-3">Black Tint</p>
                                                <div className="flex items-center justify-between mb-2">
                                                      <span className="text-[9px] text-[#B0AFA5]">None</span>
                                                      <span className="text-[11px] font-bold text-[#1A1A18]">{tint}%</span>
                                                      <span className="text-[9px] text-[#B0AFA5]">Dark</span>
                                                </div>
                                                <input
                                                      type="range" min={0} max={90} value={tint}
                                                      onChange={(e) => setTint(Number(e.target.value))}
                                                      className="w-full accent-[#1A1A18] h-1.5 rounded-full cursor-pointer"
                                                />
                                          </div>
                                    )}
                                    {showChangePanel && (
                                          <div>
                                                <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#B0AFA5] mb-2">Photo Source</p>
                                                <p className="text-[10px] text-[#B0AFA5] leading-relaxed">Select a photo from the library below.</p>
                                          </div>
                                    )}
                              </div>

                              {/* Save / Cancel */}
                              <div className="p-4 border-t border-[#E8E4DA] flex flex-col gap-2">
                                    <button onClick={handleConfirm} className="w-full bg-[#1A1A18] text-white text-[10px] font-bold uppercase tracking-widest rounded-full py-3 hover:bg-black transition-all">Save</button>
                                    <button onClick={onClose} className="w-full border border-[#E8E4DA] text-[#5A5A52] text-[10px] font-bold uppercase tracking-widest rounded-full py-3 hover:border-[#88887E] transition-all">Cancel</button>
                              </div>
                        </div>
                  </div>

            </div>
      )
}

export default function BackgroundUploader({ eventId, currentImageUrl, currentImageDesktopUrl, currentPosition, currentTint, accentColor, eventTypeId, onSaved, onSavedDesktop }) {
      const defaultBg = useDefaultBg(eventTypeId)
      const [activeZone, setActiveZone] = useState(null) // null | 'portrait' | 'landscape'
      const [uploadingPortrait, setUploadingPortrait] = useState(false)
      const [uploadingLandscape, setUploadingLandscape] = useState(false)

      async function handleUpload(file, dbField, isLandscape, setUploading, onSavedFn) {
            setUploading(true)
            const compressed = await compressImage(file)
            const path = `backgrounds/${eventId}/${dbField}-${Date.now()}.jpg`
            const { error: uploadError } = await supabase.storage.from('event-media').upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
            if (uploadError) { alert('Upload failed: ' + uploadError.message); setUploading(false); return }
            const { data } = supabase.storage.from('event-media').getPublicUrl(path)
            await supabase.from('events').update({ [dbField]: data.publicUrl }).eq('id', eventId)
            onSavedFn(data.publicUrl, currentPosition, currentTint)
            setUploading(false)
            setActiveZone(isLandscape ? 'landscape' : 'portrait')
      }

      return (
            <div>
                  <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-4">Background Photo</p>

                  {/* Side-by-side thumbnails */}
                  <div className="flex gap-4 items-start">
                        <div className="w-[30%] shrink-0">
                              <ZoneThumb
                                    label="Mobile · Portrait"
                                    imageUrl={currentImageUrl}
                                    defaultBg={defaultBg}
                                    currentTint={currentTint}
                                    isActive={activeZone === 'portrait'}
                                    uploading={uploadingPortrait}
                                    onEdit={() => setActiveZone(activeZone === 'portrait' ? null : 'portrait')}
                                    onUpload={(file) => handleUpload(file, 'background_image', false, setUploadingPortrait, onSaved)}
                              />
                        </div>
                        <div className="flex-1 min-w-0">
                              <ZoneThumb
                                    label="Desktop · Landscape"
                                    imageUrl={currentImageDesktopUrl}
                                    defaultBg={defaultBg}
                                    currentTint={currentTint}
                                    isActive={activeZone === 'landscape'}
                                    uploading={uploadingLandscape}
                                    onEdit={() => setActiveZone(activeZone === 'landscape' ? null : 'landscape')}
                                    onUpload={(file) => handleUpload(file, 'background_image_desktop', true, setUploadingLandscape, onSavedDesktop)}
                              />
                        </div>
                  </div>

                  {/* Full-width editor — appears below when a zone is active */}
                  {activeZone === 'portrait' && (
                        <ZoneEditor
                              label="Mobile · Portrait — Edit"
                              isLandscape={false}
                              imageUrl={currentImageUrl}
                              defaultBg={defaultBg}
                              currentPosition={currentPosition}
                              currentTint={currentTint}
                              accentColor={accentColor}
                              eventId={eventId}
                              dbField="background_image"
                              eventTypeId={eventTypeId}
                              onSaved={onSaved}
                              onClose={() => setActiveZone(null)}
                        />
                  )}
                  {activeZone === 'landscape' && (
                        <ZoneEditor
                              label="Desktop · Landscape — Edit"
                              isLandscape={true}
                              imageUrl={currentImageDesktopUrl}
                              defaultBg={defaultBg}
                              currentPosition={currentPosition}
                              currentTint={currentTint}
                              accentColor={accentColor}
                              eventId={eventId}
                              dbField="background_image_desktop"
                              eventTypeId={eventTypeId}
                              onSaved={onSavedDesktop}
                              onClose={() => setActiveZone(null)}
                        />
                  )}
            </div>
      )
}

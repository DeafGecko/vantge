import { useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useDefaultBg } from '../hooks/useDefaultBg'

const MAX_BYTES = 50 * 1024 * 1024

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
function ZoneThumb({ label, isLandscape, imageUrl, defaultBg, isActive, uploading, onUpload, onEdit }) {
      const inputRef = useRef(null)

      async function handleFile(e) {
            const file = e.target.files?.[0]
            if (!file) return
            onUpload(file, inputRef)
      }

      const displayUrl = imageUrl || defaultBg
      const isDefault = !imageUrl && !!defaultBg

      return (
            <div className="flex flex-col items-center gap-2 w-full">
                  <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                  <div
                        className={`relative rounded-xl overflow-hidden border-2 w-full cursor-pointer group transition-colors ${isActive ? 'border-[#1A1A18]' : 'border-[#E8E4DA]'}`}
                        style={{ aspectRatio: isLandscape ? '16/9' : '3/4' }}
                        onClick={() => displayUrl ? onEdit() : inputRef.current?.click()}
                  >
                        {displayUrl ? (
                              <>
                                    <img src={displayUrl} alt="Background" className="w-full h-full object-cover" style={{ objectPosition: '50% 50%' }} />
                                    {isDefault && (
                                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:hidden">
                                                <span className="text-sm font-bold text-white/70 drop-shadow">Default Photo</span>
                                          </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <svg width="20" height="20" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                          <p className="text-[9px] font-bold text-white uppercase tracking-widest">{isDefault ? 'Upload photo' : 'Edit'}</p>
                                    </div>
                              </>
                        ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                    <svg width="24" height="24" fill="none" stroke="#B0AFA5" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    <p className="text-[10px] font-bold text-[#B0AFA5]">{uploading ? 'Uploading...' : 'Upload photo'}</p>
                              </div>
                        )}
                  </div>
                  <p className="text-[10px] font-bold text-[#1A1A18] text-center">{label}</p>
            </div>
      )
}

// Full-width editor shown below the row when a zone is active
function ZoneEditor({ label, isLandscape, imageUrl, defaultBg, currentPosition, currentTint, accentColor, eventId, dbField, onSaved, onClose }) {
      const [position, setPosition] = useState(currentPosition || '50% 50%')
      const [tint, setTint] = useState(currentTint ?? 55)
      const [pendingUrl, setPendingUrl] = useState(null)
      const [uploading, setUploading] = useState(false)
      const [removing, setRemoving] = useState(false)
      const [dragging, setDragging] = useState(false)
      const editorRef = useRef(null)
      const dragStart = useRef(null)
      const inputRef = useRef(null)

      const activeUrl = pendingUrl || imageUrl || defaultBg
      const tintAlpha = (tint / 100).toFixed(2)

      const getPos = useCallback((e, rect) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX
            const clientY = e.touches ? e.touches[0].clientY : e.clientY
            const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
            const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
            return `${Math.round(x)}% ${Math.round(y)}%`
      }, [])

      function onDragStart(e) {
            e.preventDefault()
            dragStart.current = editorRef.current.getBoundingClientRect()
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
            const compressed = await compressImage(file)
            const path = `backgrounds/${eventId}/${dbField}-${Date.now()}.jpg`
            const { error: uploadError } = await supabase.storage.from('event-media').upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
            if (uploadError) { alert('Upload failed: ' + uploadError.message); setUploading(false); return }
            const { data } = supabase.storage.from('event-media').getPublicUrl(path)
            setPendingUrl(data.publicUrl)
            setPosition('50% 50%')
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
      }

      async function handleConfirm() {
            const urlToSave = pendingUrl || imageUrl
            const { error } = await supabase.from('events').update({ [dbField]: urlToSave, background_position: position, background_tint: tint }).eq('id', eventId)
            if (error) { alert('Could not save: ' + error.message); return }
            onSaved(urlToSave, position, tint)
            onClose()
      }

      async function handleRemove() {
            setRemoving(true)
            const fallback = !isLandscape ? (defaultBg ?? null) : null
            const { error } = await supabase.from('events').update({ [dbField]: fallback }).eq('id', eventId)
            if (error) { alert('Could not remove: ' + error.message) }
            else { onSaved(fallback, currentPosition, currentTint); onClose() }
            setRemoving(false)
      }

      return (
            <div className="w-full mt-4 border-t border-[#E8E4DA] pt-4">
                  <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                  <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-3">{label}</p>

                  {/* Photo editor */}
                  <div
                        ref={editorRef}
                        className="relative rounded-xl overflow-hidden border border-[#E8E4DA] select-none w-full"
                        style={{ aspectRatio: isLandscape ? '16/9' : '3/4', cursor: dragging ? 'grabbing' : 'grab' }}
                        onMouseDown={onDragStart} onMouseMove={onDragMove} onMouseUp={onDragEnd} onMouseLeave={onDragEnd}
                        onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}
                  >
                        {activeUrl ? (
                              <>
                                    <img src={activeUrl} alt="Background" className="w-full h-full object-cover pointer-events-none" style={{ objectPosition: position }} draggable={false} />
                                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                                    <div className="absolute w-6 h-6 rounded-full border-2 border-white shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{ left: position.split(' ')[0], top: position.split(' ')[1], backgroundColor: `${accentColor}99` }} />
                              </>
                        ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#F7F5F0]">
                                    <p className="text-[10px] text-[#B0AFA5]">No photo</p>
                              </div>
                        )}
                  </div>

                  <p className="text-[9px] text-[#B0AFA5] mt-1.5">Drag to reposition.</p>

                  {/* Actions row */}
                  <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                        <button onClick={() => inputRef.current?.click()} disabled={uploading} className="text-[9px] font-bold uppercase tracking-widest text-[#5A5A52] hover:text-[#1A1A18] transition-colors">{uploading ? 'Uploading...' : 'Change Photo'}</button>
                        {imageUrl && imageUrl !== defaultBg && (
                              <>
                                    <span className="text-[#D1D0C8] text-[9px]">·</span>
                                    <button onClick={handleRemove} disabled={removing} className="text-[9px] font-bold uppercase tracking-widest text-[#C84A44] hover:text-red-700 transition-colors">{removing ? 'Removing...' : 'Remove'}</button>
                              </>
                        )}
                  </div>

                  {/* Tint */}
                  <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                              <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#B0AFA5]">Black Tint</p>
                              <span className="text-[9px] font-bold text-[#5A5A52]">{tint}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                              <span className="text-[9px] text-[#B0AFA5]">None</span>
                              <input type="range" min={0} max={90} value={tint} onChange={(e) => setTint(Number(e.target.value))} className="flex-1 accent-[#1A1A18] h-1.5 rounded-full cursor-pointer" />
                              <span className="text-[9px] text-[#B0AFA5]">Dark</span>
                        </div>
                  </div>

                  {/* Save / Cancel */}
                  <div className="flex gap-2 mt-4">
                        <button onClick={handleConfirm} className="flex-1 bg-[#1A1A18] text-white text-[10px] font-bold uppercase tracking-widest rounded-full py-2.5 hover:bg-black transition-all">Save</button>
                        <button onClick={onClose} className="flex-1 border border-[#E8E4DA] text-[#5A5A52] text-[10px] font-bold uppercase tracking-widest rounded-full py-2.5 hover:border-[#88887E] transition-all">Cancel</button>
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
                                    isLandscape={false}
                                    imageUrl={currentImageUrl}
                                    defaultBg={defaultBg}
                                    isActive={activeZone === 'portrait'}
                                    uploading={uploadingPortrait}
                                    onEdit={() => setActiveZone(activeZone === 'portrait' ? null : 'portrait')}
                                    onUpload={(file, ref) => handleUpload(file, 'background_image', false, setUploadingPortrait, onSaved)}
                              />
                        </div>
                        <div className="flex-1 min-w-0">
                              <ZoneThumb
                                    label="Desktop · Landscape"
                                    isLandscape={true}
                                    imageUrl={currentImageDesktopUrl}
                                    defaultBg={defaultBg}
                                    isActive={activeZone === 'landscape'}
                                    uploading={uploadingLandscape}
                                    onEdit={() => setActiveZone(activeZone === 'landscape' ? null : 'landscape')}
                                    onUpload={(file, ref) => handleUpload(file, 'background_image_desktop', true, setUploadingLandscape, onSavedDesktop)}
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
                              onSaved={onSavedDesktop}
                              onClose={() => setActiveZone(null)}
                        />
                  )}
            </div>
      )
}

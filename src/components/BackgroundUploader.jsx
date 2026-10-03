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

// Full-screen modal editor — photo left, tools right
function ZoneEditor({ label, isLandscape, imageUrl, defaultBg, currentPosition, currentTint, accentColor, eventId, dbField, onSaved, onClose }) {
      const [position, setPosition] = useState(currentPosition || '50% 50%')
      const [tint, setTint] = useState(currentTint ?? 55)
      const [pendingUrl, setPendingUrl] = useState(null)
      const [uploading, setUploading] = useState(false)
      const [dragging, setDragging] = useState(false)
      const [activeToolIndex, setActiveToolIndex] = useState(0)
      const editorRef = useRef(null)
      const dragStart = useRef(null)
      const inputRef = useRef(null)

      const activeUrl = pendingUrl || imageUrl || defaultBg
      const tintAlpha = (tint / 100).toFixed(2)
      const hasCustomPhoto = !!(pendingUrl || imageUrl)

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
            const urlToSave = pendingUrl || imageUrl || null
            const { error } = await supabase.from('events').update({ [dbField]: urlToSave, background_position: position, background_tint: tint }).eq('id', eventId)
            if (error) { alert('Could not save: ' + error.message); return }
            onSaved(urlToSave, position, tint)
            onClose()
      }

      async function handleRemove() {
            const { error } = await supabase.from('events').update({ [dbField]: null }).eq('id', eventId)
            if (error) { alert('Could not remove: ' + error.message) }
            else { onSaved(null, currentPosition, currentTint); onClose() }
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

                        {/* LEFT — photo */}
                        <div className="flex-1 bg-[#1A1A18] relative flex items-center justify-center min-w-0">
                              <input ref={inputRef} type="file" accept="image/*,video/mp4,video/mov,video/quicktime" onChange={handleFile} className="hidden" />
                              {activeUrl ? (
                                    <div
                                          ref={editorRef}
                                          className="relative w-full h-full select-none"
                                          style={{ cursor: dragging ? 'grabbing' : (activeToolIndex === 0 ? 'grab' : 'default') }}
                                          onMouseDown={activeToolIndex === 0 ? onDragStart : undefined}
                                          onMouseMove={activeToolIndex === 0 ? onDragMove : undefined}
                                          onMouseUp={activeToolIndex === 0 ? onDragEnd : undefined}
                                          onMouseLeave={activeToolIndex === 0 ? onDragEnd : undefined}
                                          onTouchStart={activeToolIndex === 0 ? onDragStart : undefined}
                                          onTouchMove={activeToolIndex === 0 ? onDragMove : undefined}
                                          onTouchEnd={activeToolIndex === 0 ? onDragEnd : undefined}
                                    >
                                          <img src={activeUrl} alt="Background" className="w-full h-full object-cover pointer-events-none" style={{ objectPosition: position }} draggable={false} />
                                          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                                          {activeToolIndex === 0 && (
                                                <div className="absolute w-7 h-7 rounded-full border-2 border-white shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{ left: position.split(' ')[0], top: position.split(' ')[1], backgroundColor: `${accentColor}99` }} />
                                          )}
                                          {activeToolIndex === 0 && (
                                                <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
                                                      <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full">Drag to reposition</span>
                                                </div>
                                          )}
                                    </div>
                              ) : (
                                    <div className="flex flex-col items-center gap-3 text-white/30">
                                          <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                          <p className="text-xs font-bold uppercase tracking-widest">No photo</p>
                                    </div>
                              )}
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
                                          const isActive = activeToolIndex === i
                                          return (
                                                <button
                                                      key={tool.id}
                                                      onClick={() => {
                                                            if (tool.id === 'change') { inputRef.current?.click(); return }
                                                            if (tool.id === 'delete') { handleRemove(); return }
                                                            setActiveToolIndex(i)
                                                      }}
                                                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                                                            tool.id === 'delete'
                                                                  ? 'text-[#C84A44] hover:bg-red-50'
                                                                  : isActive
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
                                    {activeToolIndex === 0 && (
                                          <div>
                                                <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#B0AFA5] mb-2">Reposition</p>
                                                <p className="text-[10px] text-[#B0AFA5] leading-relaxed">Drag the photo on the left to reposition the focus point.</p>
                                                <div className="mt-3 text-[9px] text-[#B0AFA5]">
                                                      <span className="font-bold">X:</span> {position.split(' ')[0]} &nbsp; <span className="font-bold">Y:</span> {position.split(' ')[1]}
                                                </div>
                                          </div>
                                    )}
                                    {activeToolIndex === 2 && (
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
                                    isLandscape={false}
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
                                    isLandscape={true}
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

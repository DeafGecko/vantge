import { useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MAX_BYTES = 50 * 1024 * 1024 // 50MB

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
                  while ((width * height * 3 * scale * scale) > MAX_BYTES && scale > 0.1) {
                        scale -= 0.05
                  }

                  canvas.width = Math.round(width * scale)
                  canvas.height = Math.round(height * scale)
                  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)

                  let quality = 0.92
                  const tryBlob = (q) => {
                        canvas.toBlob((blob) => {
                              if (!blob) return resolve(file)
                              if (blob.size <= MAX_BYTES || q <= 0.3) {
                                    resolve(new File([blob], file.name, { type: 'image/jpeg' }))
                              } else {
                                    tryBlob(q - 0.1)
                              }
                        }, 'image/jpeg', q)
                  }
                  tryBlob(quality)
            }
            img.src = url
      })
}

export default function BackgroundUploader({ eventId, currentImageUrl, currentPosition, currentTint, accentColor, onSaved }) {
      const [uploading, setUploading] = useState(false)
      const [removing, setRemoving] = useState(false)
      const [editing, setEditing] = useState(false)
      const [pendingUrl, setPendingUrl] = useState(null)
      const [position, setPosition] = useState(currentPosition || '50% 50%')
      const [tint, setTint] = useState(currentTint ?? 55)
      const [dragging, setDragging] = useState(false)
      const editorRef = useRef(null)
      const inputRef = useRef(null)
      const dragStart = useRef(null)

      const activeUrl = pendingUrl || currentImageUrl

      async function handleFile(e) {
            const file = e.target.files?.[0]
            if (!file) return

            setUploading(true)
            const compressed = await compressImage(file)
            const path = `backgrounds/${eventId}/bg-${Date.now()}.jpg`

            const { error: uploadError } = await supabase.storage
                  .from('event-media')
                  .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })

            if (uploadError) {
                  alert('Upload failed: ' + uploadError.message)
                  setUploading(false)
                  return
            }

            const { data } = supabase.storage.from('event-media').getPublicUrl(path)
            setPendingUrl(data.publicUrl)
            setPosition('50% 50%')
            setEditing(true)
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
      }

      const getPositionFromEvent = useCallback((e, rect) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX
            const clientY = e.touches ? e.touches[0].clientY : e.clientY
            const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
            const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
            return `${Math.round(x)}% ${Math.round(y)}%`
      }, [])

      function onDragStart(e) {
            e.preventDefault()
            const rect = editorRef.current.getBoundingClientRect()
            dragStart.current = rect
            setDragging(true)
            setPosition(getPositionFromEvent(e, rect))
      }

      function onDragMove(e) {
            if (!dragging || !dragStart.current) return
            e.preventDefault()
            setPosition(getPositionFromEvent(e, dragStart.current))
      }

      function onDragEnd() {
            setDragging(false)
            dragStart.current = null
      }

      async function handleConfirm() {
            const urlToSave = pendingUrl || currentImageUrl
            const { error } = await supabase
                  .from('events')
                  .update({ background_image: urlToSave, background_position: position, background_tint: tint })
                  .eq('id', eventId)

            if (error) {
                  alert('Could not save: ' + error.message)
            } else {
                  onSaved(urlToSave, position, tint)
                  setPendingUrl(null)
                  setEditing(false)
            }
      }

      function handleCancel() {
            setPendingUrl(null)
            setEditing(false)
            setPosition(currentPosition || '50% 50%')
            setTint(currentTint ?? 55)
      }

      async function handleRemove() {
            setRemoving(true)
            const { error } = await supabase
                  .from('events')
                  .update({ background_image: null, background_position: null, background_tint: 55 })
                  .eq('id', eventId)
            if (error) {
                  alert('Could not remove: ' + error.message)
            } else {
                  onSaved(null, null, 55)
                  setEditing(false)
                  setPendingUrl(null)
                  setTint(55)
            }
            setRemoving(false)
      }

      // Adjust tint on existing image without entering full edit mode
      async function saveTint(val) {
            setTint(val)
            await supabase
                  .from('events')
                  .update({ background_tint: val })
                  .eq('id', eventId)
            onSaved(currentImageUrl, currentPosition, val)
      }

      const tintAlpha = (tint / 100).toFixed(2)

      // Position + tint editor — shown after upload or clicking "Adjust"
      if (editing && activeUrl) {
            return (
                  <div>
                        <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-3">Background Photo</p>
                        <p className="text-xs text-[#88887E] mb-3">Drag to reposition. Adjust the tint to make text pop.</p>

                        <div
                              ref={editorRef}
                              className="relative rounded-2xl overflow-hidden border-2 border-[#1A1A18] select-none"
                              style={{ height: 220, cursor: dragging ? 'grabbing' : 'crosshair' }}
                              onMouseDown={onDragStart}
                              onMouseMove={onDragMove}
                              onMouseUp={onDragEnd}
                              onMouseLeave={onDragEnd}
                              onTouchStart={onDragStart}
                              onTouchMove={onDragMove}
                              onTouchEnd={onDragEnd}
                        >
                              <img
                                    src={activeUrl}
                                    alt="Background"
                                    className="w-full h-full object-cover pointer-events-none"
                                    style={{ objectPosition: position }}
                                    draggable={false}
                              />
                              {/* Live tint preview */}
                              <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                              {/* Sample text so host can judge readability */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
                                    <p className="text-[9px] font-bold tracking-widest uppercase text-white/60">Your tagline here</p>
                                    <p className="text-xl font-black text-white drop-shadow-lg">Event Name</p>
                              </div>
                              {/* Crosshair dot */}
                              <div
                                    className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2"
                                    style={{ left: position.split(' ')[0], top: position.split(' ')[1], backgroundColor: accentColor }}
                              />
                        </div>

                        {/* Tint slider */}
                        <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                    <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Black Tint</p>
                                    <span className="text-[9px] font-bold text-[#5A5A52]">{tint}%</span>
                              </div>
                              <div className="flex items-center gap-3">
                                    <span className="text-[9px] text-[#B0AFA5]">None</span>
                                    <input
                                          type="range"
                                          min={0}
                                          max={90}
                                          value={tint}
                                          onChange={(e) => setTint(Number(e.target.value))}
                                          className="flex-1 accent-[#1A1A18] h-1.5 rounded-full cursor-pointer"
                                    />
                                    <span className="text-[9px] text-[#B0AFA5]">Dark</span>
                              </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                              <button
                                    onClick={handleConfirm}
                                    className="flex-1 bg-[#1A1A18] text-white text-[10px] font-bold uppercase tracking-widest rounded-full py-2.5 hover:bg-black transition-all"
                              >
                                    Save
                              </button>
                              <button
                                    onClick={handleCancel}
                                    className="flex-1 border border-[#E8E4DA] text-[#5A5A52] text-[10px] font-bold uppercase tracking-widest rounded-full py-2.5 hover:border-[#88887E] transition-all"
                              >
                                    Cancel
                              </button>
                        </div>
                  </div>
            )
      }

      return (
            <div>
                  <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-3">Background Photo</p>

                  {currentImageUrl ? (
                        <div>
                              <div className="relative rounded-2xl overflow-hidden border border-[#E8E4DA]" style={{ height: 150 }}>
                                    <img
                                          src={currentImageUrl}
                                          alt="Background"
                                          className="w-full h-full object-cover"
                                          style={{ objectPosition: currentPosition || '50% 50%' }}
                                    />
                                    <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                                    <div className="absolute inset-0 flex items-center justify-center gap-2 flex-wrap px-4">
                                          <button
                                                onClick={() => setEditing(true)}
                                                className="bg-white text-[#1A1A18] text-[10px] font-bold uppercase tracking-widest rounded-full px-4 py-2 hover:bg-[#F7F5F0] transition-all shadow-sm"
                                          >
                                                Adjust
                                          </button>
                                          <button
                                                onClick={() => inputRef.current?.click()}
                                                disabled={uploading}
                                                className="bg-white text-[#1A1A18] text-[10px] font-bold uppercase tracking-widest rounded-full px-4 py-2 hover:bg-[#F7F5F0] transition-all shadow-sm"
                                          >
                                                {uploading ? 'Uploading...' : 'Change'}
                                          </button>
                                          <button
                                                onClick={handleRemove}
                                                disabled={removing}
                                                className="bg-white/80 text-[#C84A44] text-[10px] font-bold uppercase tracking-widest rounded-full px-4 py-2 hover:bg-white transition-all shadow-sm"
                                          >
                                                {removing ? 'Removing...' : 'Remove'}
                                          </button>
                                    </div>
                              </div>

                              {/* Quick tint slider — always visible when photo is set */}
                              <div className="mt-3">
                                    <div className="flex items-center justify-between mb-1.5">
                                          <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Black Tint</p>
                                          <span className="text-[9px] font-bold text-[#5A5A52]">{tint}%</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                          <span className="text-[9px] text-[#B0AFA5]">None</span>
                                          <input
                                                type="range"
                                                min={0}
                                                max={90}
                                                value={tint}
                                                onChange={(e) => setTint(Number(e.target.value))}
                                                onMouseUp={(e) => saveTint(Number(e.target.value))}
                                                onTouchEnd={(e) => saveTint(Number(e.target.changedTouches[0]?.target.value ?? tint))}
                                                className="flex-1 accent-[#1A1A18] h-1.5 rounded-full cursor-pointer"
                                          />
                                          <span className="text-[9px] text-[#B0AFA5]">Dark</span>
                                    </div>
                              </div>
                        </div>
                  ) : (
                        <button
                              onClick={() => inputRef.current?.click()}
                              disabled={uploading}
                              className="w-full border-2 border-dashed border-[#E8E4DA] rounded-2xl p-6 text-center hover:border-[#1A1A18] transition-colors"
                        >
                              <div className="w-10 h-10 rounded-xl bg-[#F7F5F0] flex items-center justify-center mx-auto mb-3">
                                    <svg width="20" height="20" fill="none" stroke="#B0AFA5" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              </div>
                              <p className="text-sm font-bold text-[#1A1A18] mb-1">
                                    {uploading ? 'Uploading...' : 'Upload background photo'}
                              </p>
                              <p className="text-xs text-[#B0AFA5]">
                                    Drag to reposition · Adjust tint to pop your text
                              </p>
                        </button>
                  )}

                  <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </div>
      )
}

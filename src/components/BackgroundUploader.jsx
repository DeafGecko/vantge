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

                  // Scale down until estimated file size is under 50MB
                  let scale = 1
                  while ((width * height * 3 * scale * scale) > MAX_BYTES && scale > 0.1) {
                        scale -= 0.05
                  }

                  canvas.width = Math.round(width * scale)
                  canvas.height = Math.round(height * scale)
                  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)

                  // Try quality steps until under 50MB
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

export default function BackgroundUploader({ eventId, currentImageUrl, currentPosition, accentColor, onSaved }) {
      const [uploading, setUploading] = useState(false)
      const [removing, setRemoving] = useState(false)
      const [editing, setEditing] = useState(false)
      const [pendingUrl, setPendingUrl] = useState(null)
      const [position, setPosition] = useState(currentPosition || '50% 50%')
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
                  .update({ background_image: urlToSave, background_position: position })
                  .eq('id', eventId)

            if (error) {
                  alert('Could not save: ' + error.message)
            } else {
                  onSaved(urlToSave, position)
                  setPendingUrl(null)
                  setEditing(false)
            }
      }

      function handleCancel() {
            setPendingUrl(null)
            setEditing(false)
            setPosition(currentPosition || '50% 50%')
      }

      async function handleRemove() {
            setRemoving(true)
            const { error } = await supabase
                  .from('events')
                  .update({ background_image: null, background_position: null })
                  .eq('id', eventId)
            if (error) {
                  alert('Could not remove: ' + error.message)
            } else {
                  onSaved(null, null)
                  setEditing(false)
                  setPendingUrl(null)
            }
            setRemoving(false)
      }

      // Position editor — shown after upload or when clicking "Adjust"
      if (editing && activeUrl) {
            return (
                  <div>
                        <p className="text-[10px] font-bold text-[#88887E] uppercase mb-3">Background Photo</p>
                        <p className="text-xs text-[#5A5A52] mb-3">Drag to set which part of the photo shows behind guests.</p>

                        <div
                              ref={editorRef}
                              className="relative rounded-xl overflow-hidden border-2 border-[#C84A44] select-none"
                              style={{ height: 200, cursor: dragging ? 'grabbing' : 'crosshair' }}
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
                              {/* dark tint preview */}
                              <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} />
                              {/* crosshair dot */}
                              <div
                                    className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2"
                                    style={{
                                          left: position.split(' ')[0],
                                          top: position.split(' ')[1],
                                          backgroundColor: accentColor,
                                    }}
                              />
                              <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/70 uppercase tracking-widest pointer-events-none">
                                    Drag to reposition
                              </p>
                        </div>

                        <div className="flex gap-3 mt-3">
                              <button
                                    onClick={handleConfirm}
                                    className="flex-1 bg-[#1A1A18] text-white text-[10px] font-bold uppercase tracking-widest rounded-full py-2.5 hover:bg-black transition-all"
                              >
                                    Confirm
                              </button>
                              <button
                                    onClick={handleCancel}
                                    className="flex-1 border border-[#E0D8C6] text-[#5A5A52] text-[10px] font-bold uppercase tracking-widest rounded-full py-2.5 hover:border-[#88887E] transition-all"
                              >
                                    Cancel
                              </button>
                        </div>
                  </div>
            )
      }

      return (
            <div>
                  <p className="text-[10px] font-bold text-[#88887E] uppercase mb-3">Background Photo</p>

                  {currentImageUrl ? (
                        <div className="relative rounded-xl overflow-hidden border border-[#E0D8C6]" style={{ height: 140 }}>
                              <img
                                    src={currentImageUrl}
                                    alt="Background"
                                    className="w-full h-full object-cover"
                                    style={{ objectPosition: currentPosition || '50% 50%' }}
                              />
                              <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} />
                              <div className="absolute inset-0 flex items-center justify-center gap-2 flex-wrap px-4">
                                    <button
                                          onClick={() => setEditing(true)}
                                          className="bg-white text-[#1A1A18] text-[10px] font-bold uppercase tracking-widest rounded-full px-4 py-2 hover:bg-[#F4F3F0] transition-all"
                                    >
                                          Adjust
                                    </button>
                                    <button
                                          onClick={() => inputRef.current?.click()}
                                          disabled={uploading}
                                          className="bg-white text-[#1A1A18] text-[10px] font-bold uppercase tracking-widest rounded-full px-4 py-2 hover:bg-[#F4F3F0] transition-all"
                                    >
                                          {uploading ? 'Uploading...' : 'Change'}
                                    </button>
                                    <button
                                          onClick={handleRemove}
                                          disabled={removing}
                                          className="bg-white/80 text-[#C84A44] text-[10px] font-bold uppercase tracking-widest rounded-full px-4 py-2 hover:bg-white transition-all"
                                    >
                                          {removing ? 'Removing...' : 'Remove'}
                                    </button>
                              </div>
                        </div>
                  ) : (
                        <button
                              onClick={() => inputRef.current?.click()}
                              disabled={uploading}
                              className="w-full border-2 border-dashed border-[#E0D8C6] rounded-xl p-6 text-center hover:border-[#88887E] transition-colors"
                        >
                              <p className="text-sm font-bold text-[#1A1A18] mb-1">
                                    {uploading ? 'Uploading...' : 'Upload a background photo'}
                              </p>
                              <p className="text-xs text-[#88887E]">
                                    Any size — drag to reposition after upload
                              </p>
                        </button>
                  )}

                  <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </div>
      )
}

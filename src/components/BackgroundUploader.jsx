import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

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

function UploadZone({ eventId, label, isLandscape, currentImageUrl, currentPosition, currentTint, accentColor, dbField, onSaved }) {
      const [uploading, setUploading] = useState(false)
      const [removing, setRemoving] = useState(false)
      const [editing, setEditing] = useState(false)
      const [pendingUrl, setPendingUrl] = useState(null)
      const [position, setPosition] = useState(currentPosition || '50% 50%')
      const [tint, setTint] = useState(currentTint ?? 55)
      const editorRef = useRef(null)
      const inputRef = useRef(null)

      const activeUrl = pendingUrl || currentImageUrl
      const tintAlpha = (tint / 100).toFixed(2)

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
            setEditing(true)
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
      }


      async function handleConfirm() {
            const urlToSave = pendingUrl || currentImageUrl
            const { error } = await supabase.from('events').update({ [dbField]: urlToSave, background_position: position, background_tint: tint }).eq('id', eventId)
            if (error) { alert('Could not save: ' + error.message); return }
            onSaved(urlToSave, position, tint)
            setPendingUrl(null)
            setEditing(false)
      }

      function handleCancel() {
            setPendingUrl(null)
            setEditing(false)
            setPosition(currentPosition || '50% 50%')
            setTint(currentTint ?? 55)
      }

      async function handleRemove() {
            setRemoving(true)
            const { error } = await supabase.from('events').update({ [dbField]: null }).eq('id', eventId)
            if (error) { alert('Could not remove: ' + error.message) }
            else { onSaved(null, currentPosition, currentTint); setEditing(false); setPendingUrl(null) }
            setRemoving(false)
      }

      async function saveTint(val) {
            setTint(val)
            await supabase.from('events').update({ background_tint: val }).eq('id', eventId)
            onSaved(currentImageUrl, currentPosition, val)
      }

      // Preview dimensions
      const previewH = 180
      const previewW = isLandscape ? '100%' : 100

      if (editing && activeUrl) return (
            <div className="w-full overflow-hidden">
                  <div
                        ref={editorRef}
                        className="relative rounded-xl overflow-hidden border border-[#E8E4DA] select-none w-full"
                        style={{ height: previewH, cursor: 'crosshair' }}
                        onClick={(e) => {
                              const rect = editorRef.current.getBoundingClientRect()
                              const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
                              const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
                              setPosition(`${x}% ${y}%`)
                        }}
                        onTouchEnd={(e) => {
                              const rect = editorRef.current.getBoundingClientRect()
                              const touch = e.changedTouches[0]
                              const x = Math.round(((touch.clientX - rect.left) / rect.width) * 100)
                              const y = Math.round(((touch.clientY - rect.top) / rect.height) * 100)
                              setPosition(`${x}% ${y}%`)
                        }}
                  >
                        <img src={activeUrl} alt="Background" className="w-full h-full object-cover pointer-events-none" style={{ objectPosition: position }} draggable={false} />
                        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                        {/* Focus point crosshair */}
                        <div className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{ left: position.split(' ')[0], top: position.split(' ')[1] }}>
                              <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style={{ backgroundColor: `${accentColor}99` }}>
                                    <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round"/></svg>
                              </div>
                        </div>
                  </div>
                  <p className="text-[9px] text-[#B0AFA5] mt-1.5 mb-2">Click to set focus point.</p>
                  <div className="mt-1">
                        <div className="flex items-center justify-between mb-1">
                              <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Black Tint</p>
                              <span className="text-[9px] font-bold text-[#5A5A52]">{tint}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                              <span className="text-[9px] text-[#B0AFA5]">None</span>
                              <input type="range" min={0} max={90} value={tint} onChange={(e) => setTint(Number(e.target.value))} className="flex-1 accent-[#1A1A18] h-1.5 rounded-full cursor-pointer" />
                              <span className="text-[9px] text-[#B0AFA5]">Dark</span>
                        </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                        <button onClick={handleConfirm} className="flex-1 bg-[#1A1A18] text-white text-[10px] font-bold uppercase tracking-widest rounded-full py-2 hover:bg-black transition-all">Save</button>
                        <button onClick={handleCancel} className="flex-1 border border-[#E8E4DA] text-[#5A5A52] text-[10px] font-bold uppercase tracking-widest rounded-full py-2 hover:border-[#88887E] transition-all">Cancel</button>
                  </div>
            </div>
      )

      return (
            <div className="flex flex-col items-center gap-2">
                  <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

                  {currentImageUrl ? (
                        <div className="w-full">
                              <div
                                    className="relative rounded-xl overflow-hidden border border-[#E8E4DA] mx-auto"
                                    style={{ height: previewH, width: isLandscape ? '100%' : previewW }}
                              >
                                    <img src={currentImageUrl} alt="Background" className="w-full h-full object-cover" style={{ objectPosition: currentPosition || '50% 50%' }} />
                                    <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${tintAlpha})` }} />
                                    <div className="absolute inset-0 flex items-center justify-center gap-1.5 flex-wrap px-2">
                                          <button onClick={() => setEditing(true)} className="bg-white text-[#1A1A18] text-[9px] font-bold uppercase tracking-widest rounded-full px-3 py-1.5 hover:bg-[#F7F5F0] shadow-sm">Adjust</button>
                                          <button onClick={() => inputRef.current?.click()} disabled={uploading} className="bg-white text-[#1A1A18] text-[9px] font-bold uppercase tracking-widest rounded-full px-3 py-1.5 hover:bg-[#F7F5F0] shadow-sm">{uploading ? 'Uploading...' : 'Change'}</button>
                                          <button onClick={handleRemove} disabled={removing} className="bg-white/80 text-[#C84A44] text-[9px] font-bold uppercase tracking-widest rounded-full px-3 py-1.5 hover:bg-white shadow-sm">{removing ? 'Removing...' : 'Remove'}</button>
                                    </div>
                              </div>
                              <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                          <p className="text-[9px] font-black tracking-[0.2em] uppercase text-[#B0AFA5]">Tint</p>
                                          <span className="text-[9px] font-bold text-[#5A5A52]">{tint}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                          <span className="text-[9px] text-[#B0AFA5]">None</span>
                                          <input type="range" min={0} max={90} value={tint} onChange={(e) => setTint(Number(e.target.value))} onMouseUp={(e) => saveTint(Number(e.target.value))} onTouchEnd={(e) => saveTint(Number(e.target.changedTouches[0]?.target.value ?? tint))} className="flex-1 accent-[#1A1A18] h-1.5 rounded-full cursor-pointer" />
                                          <span className="text-[9px] text-[#B0AFA5]">Dark</span>
                                    </div>
                              </div>
                        </div>
                  ) : (
                        <button
                              onClick={() => inputRef.current?.click()}
                              disabled={uploading}
                              className="border-2 border-dashed border-[#E8E4DA] rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#1A1A18] transition-colors"
                              style={{ height: previewH, width: isLandscape ? '100%' : previewW }}
                        >
                              <svg width="24" height="24" fill="none" stroke="#B0AFA5" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              <p className="text-[10px] font-bold text-[#B0AFA5] text-center px-2">{uploading ? 'Uploading...' : 'Upload photo'}</p>
                        </button>
                  )}

                  <p className="text-[10px] font-bold text-[#1A1A18] text-center">{label}</p>
            </div>
      )
}

export default function BackgroundUploader({ eventId, currentImageUrl, currentImageDesktopUrl, currentPosition, currentTint, accentColor, onSaved, onSavedDesktop }) {
      return (
            <div>
                  <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-4">Background Photo</p>
                  {/* Mobile portrait first (smaller), then landscape desktop (wider) fills remaining space */}
                  <div className="flex gap-4 items-start">
                        {/* Portrait — mobile (fixed width with room for tint slider) */}
                        <div className="shrink-0 w-[180px]">
                        <UploadZone
                              eventId={eventId}
                              label="Mobile · Portrait"
                              isLandscape={false}
                              currentImageUrl={currentImageUrl}
                              currentPosition={currentPosition}
                              currentTint={currentTint}
                              accentColor={accentColor}
                              dbField="background_image"
                              onSaved={onSaved}
                        />
                        </div>
                        {/* Landscape — desktop (fills rest) */}
                        <div className="flex-1 min-w-0">
                        <UploadZone
                              eventId={eventId}
                              label="Desktop · Landscape"
                              isLandscape={true}
                              currentImageUrl={currentImageDesktopUrl}
                              currentPosition={currentPosition}
                              currentTint={currentTint}
                              accentColor={accentColor}
                              dbField="background_image_desktop"
                              onSaved={onSavedDesktop}
                        />
                        </div>
                  </div>
            </div>
      )
}


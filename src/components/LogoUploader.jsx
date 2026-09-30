import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function LogoUploader({ eventId, currentLogoUrl, onSaved }) {
      const inputRef = useRef(null)
      const [uploading, setUploading] = useState(false)
      const [error, setError] = useState(null)

      async function handleFile(e) {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return

            const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
            if (!allowed.includes(file.type)) {
                  setError('PNG, JPEG, SVG or WebP only')
                  return
            }

            setUploading(true)
            setError(null)

            const ext = file.type === 'image/svg+xml' ? 'svg' : file.name.split('.').pop() || 'png'
            const path = `logos/${eventId}/logo-${Date.now()}.${ext}`

            const { error: uploadError } = await supabase.storage
                  .from('event-media')
                  .upload(path, file, { contentType: file.type, upsert: true })

            if (uploadError) {
                  setError(uploadError.message)
                  setUploading(false)
                  return
            }

            const { data } = supabase.storage.from('event-media').getPublicUrl(path)
            const url = data.publicUrl

            const { error: dbError } = await supabase
                  .from('events')
                  .update({ logo_url: url })
                  .eq('id', eventId)

            if (dbError) {
                  setError(dbError.message)
            } else {
                  onSaved(url)
            }
            setUploading(false)
      }

      async function removeLogo() {
            const { error: dbError } = await supabase
                  .from('events')
                  .update({ logo_url: null })
                  .eq('id', eventId)
            if (!dbError) onSaved(null)
      }

      return (
            <div className="shrink-0 flex flex-col items-center gap-2">
                  {currentLogoUrl ? (
                        <div className="relative group">
                              <div className="w-16 h-16 rounded-2xl border-2 border-[#E8E4DA] bg-[#F7F5F0] overflow-hidden flex items-center justify-center">
                                    <img src={currentLogoUrl} alt="Event logo" className="w-full h-full object-contain p-1" />
                              </div>
                              <button
                                    onClick={removeLogo}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1A1A18] text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove logo"
                              >
                                    ×
                              </button>
                        </div>
                  ) : (
                        <button
                              onClick={() => inputRef.current?.click()}
                              disabled={uploading}
                              className="w-16 h-16 rounded-2xl border-2 border-dashed border-[#E8E4DA] bg-[#F7F5F0] hover:border-[#1A1A18] transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                        >
                              {uploading ? (
                                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0AFA5" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" /><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" /></svg>
                              ) : (
                                    <>
                                          <svg width="18" height="18" fill="none" stroke="#B0AFA5" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" /><polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" /></svg>
                                          <span className="text-[8px] text-[#B0AFA5] font-bold">Upload</span>
                                    </>
                              )}
                        </button>
                  )}

                  {error && <p className="text-[9px] text-[#C84A44] text-center max-w-[4rem]">{error}</p>}
                  <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" className="hidden" onChange={handleFile} />
            </div>
      )
}

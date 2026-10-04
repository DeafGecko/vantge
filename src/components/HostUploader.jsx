import { useState, useRef, useEffect } from 'react'
import { uploadPhoto } from '../lib/uploadPhoto'
import { supabase } from '../lib/supabase'

const VIDEO_LIMIT_SECONDS = 30

async function checkVideoDuration(file) {
      return new Promise((resolve) => {
            const url = URL.createObjectURL(file)
            const vid = document.createElement('video')
            vid.preload = 'metadata'
            vid.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(vid.duration) }
            vid.onerror = () => { URL.revokeObjectURL(url); resolve(0) }
            vid.src = url
      })
}

function UploadModal({ eventId, onClose }) {
      const inputRef = useRef(null)
      const [files, setFiles] = useState([])
      const [uploading, setUploading] = useState(false)
      const [progress, setProgress] = useState(null)
      const [done, setDone] = useState(false)
      const [error, setError] = useState(null)
      const [tooLong, setTooLong] = useState([])

      async function handlePick(e) {
            const picked = Array.from(e.target.files || [])
            if (!picked.length) return
            e.target.value = ''
            const valid = []
            const long = []
            for (const file of picked) {
                  if (file.type.startsWith('video/')) {
                        const dur = await checkVideoDuration(file)
                        if (dur > VIDEO_LIMIT_SECONDS) { long.push(file.name); continue }
                  }
                  valid.push(file)
            }
            setTooLong(long)
            setFiles(valid)
            setError(null)
      }

      async function handleUpload() {
            if (!files.length) return
            setUploading(true)
            setProgress(0)
            setError(null)
            let succeeded = 0
            let failed = 0
            for (let i = 0; i < files.length; i++) {
                  const file = files[i]
                  const result = await uploadPhoto({
                        blob: file,
                        eventId,
                        guestName: 'Host',
                        status: 1,
                        is_video: file.type.startsWith('video/'),
                        is_admin_upload: true,
                  })
                  if (result.success) succeeded++
                  else failed++
                  setProgress(Math.round(((i + 1) / files.length) * 100))
            }
            setUploading(false)
            if (failed > 0) setError(`${failed} file${failed > 1 ? 's' : ''} failed to upload.`)
            setDone(true)
            setTimeout(() => onClose(), 1800)
      }

      return (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                  <div
                        className="relative w-full max-w-md bg-[#F8F5ED] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                        onClick={e => e.stopPropagation()}
                  >
                        {/* Drag handle */}
                        <div className="w-10 h-1 bg-[#D4CFBC] rounded-full mx-auto mb-5 sm:hidden" />

                        <div className="flex items-center justify-between mb-1">
                              <h2 className="text-lg font-black text-[#1A1A18]">Pre-load Gallery</h2>
                              <button onClick={onClose} className="text-[#B0AFA5] hover:text-[#1A1A18] transition-colors">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                              </button>
                        </div>
                        <p className="text-sm text-[#6B6B63] mb-5">Upload photos or videos — they go straight into the Live Gallery.</p>

                        {done ? (
                              <div className="flex flex-col items-center py-8 gap-3">
                                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                                          <svg width="24" height="24" fill="none" stroke="#16a34a" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </div>
                                    <p className="font-bold text-[#1A1A18]">{files.length} file{files.length !== 1 ? 's' : ''} added to gallery!</p>
                                    {error && <p className="text-red-500 text-xs">{error}</p>}
                              </div>
                        ) : (
                              <>
                                    {tooLong.length > 0 && (
                                          <div className="mb-4 rounded-xl px-4 py-3 text-sm bg-[#FEF2F2] text-[#991B1B] flex items-start gap-2">
                                                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                                Video{tooLong.length > 1 ? 's' : ''} too long (max 30s): {tooLong.join(', ')}
                                          </div>
                                    )}

                                    <input ref={inputRef} type="file" accept="image/*,video/*" multiple onChange={handlePick} className="hidden" />

                                    {files.length === 0 ? (
                                          <button
                                                onClick={() => inputRef.current?.click()}
                                                className="w-full border-2 border-dashed border-[#D4CFBC] rounded-2xl py-10 flex flex-col items-center gap-3 text-[#9A9A8E] hover:border-[#1A1A18] hover:text-[#1A1A18] transition-colors"
                                          >
                                                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                <span className="text-sm font-bold">Choose photos or videos</span>
                                                <span className="text-xs">Select multiple — all go straight to Live Gallery</span>
                                          </button>
                                    ) : (
                                          <div className="mb-3">
                                                <div className="flex items-center justify-between mb-2">
                                                      <p className="text-sm font-semibold text-[#1A1A18]">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
                                                      <button onClick={() => inputRef.current?.click()} className="text-xs font-bold text-[#B29746]">Change</button>
                                                </div>
                                                <div className="flex gap-1.5 overflow-x-auto pb-1">
                                                      {files.slice(0, 6).map((f, i) => (
                                                            <div key={i} className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-[#E8E4DC]">
                                                                  {f.type.startsWith('video/')
                                                                        ? <video src={URL.createObjectURL(f)} className="w-full h-full object-cover" muted />
                                                                        : <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                                                                  }
                                                            </div>
                                                      ))}
                                                      {files.length > 6 && <div className="shrink-0 w-14 h-14 rounded-lg bg-[#E8E4DC] flex items-center justify-center text-xs font-bold text-[#6B6B63]">+{files.length - 6}</div>}
                                                </div>
                                          </div>
                                    )}

                                    {progress !== null && (
                                          <div className="mt-3 mb-2">
                                                <div className="h-1.5 bg-[#E8E4DC] rounded-full overflow-hidden">
                                                      <div className="h-full bg-[#1A1A18] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                                </div>
                                                <p className="text-xs text-[#9A9A8E] mt-1 text-right">{progress}%</p>
                                          </div>
                                    )}

                                    <div className="flex gap-2 mt-4">
                                          <button
                                                onClick={handleUpload}
                                                disabled={!files.length || uploading}
                                                className="flex-1 bg-[#1A1A18] text-white text-[11px] font-bold uppercase tracking-widest rounded-full py-3.5 disabled:opacity-40 hover:bg-black transition-all"
                                          >
                                                {uploading ? `Uploading… ${progress}%` : `Upload ${files.length > 0 ? files.length + ' file' + (files.length !== 1 ? 's' : '') : 'to Gallery'}`}
                                          </button>
                                          {files.length > 0 && !uploading && (
                                                <button
                                                      onClick={() => { setFiles([]); setTooLong([]) }}
                                                      className="px-4 border border-[#E0D8C6] text-[#88887E] text-[11px] font-bold uppercase tracking-widest rounded-full hover:border-[#88887E] transition-all"
                                                >
                                                      Clear
                                                </button>
                                          )}
                                    </div>
                              </>
                        )}
                  </div>
            </div>
      )
}

function DeleteModal({ items, onClose, onDeleted, initialId }) {
      const [selected, setSelected] = useState(new Set(initialId ? [initialId] : []))
      const [deleting, setDeleting] = useState(false)

      function toggle(id) {
            setSelected(prev => {
                  const next = new Set(prev)
                  next.has(id) ? next.delete(id) : next.add(id)
                  return next
            })
      }

      function selectAll() {
            setSelected(new Set(items.map(i => i.id)))
      }

      function clearAll() {
            setSelected(new Set())
      }

      async function handleDelete() {
            if (!selected.size) return
            setDeleting(true)
            const ids = Array.from(selected)
            const { error } = await supabase.from('media_queue').delete().in('id', ids)
            setDeleting(false)
            if (!error) {
                  onDeleted(ids)
                  onClose()
            }
      }

      const allSelected = selected.size === items.length

      return (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                  <div
                        className="relative w-full max-w-md bg-[#F8F5ED] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                        onClick={e => e.stopPropagation()}
                  >
                        <div className="w-10 h-1 bg-[#D4CFBC] rounded-full mx-auto mb-5 sm:hidden" />

                        <div className="flex items-center justify-between mb-1">
                              <h2 className="text-lg font-black text-[#1A1A18]">Manage Photos</h2>
                              <button onClick={onClose} className="text-[#B0AFA5] hover:text-[#1A1A18] transition-colors">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                              </button>
                        </div>
                        <p className="text-sm text-[#6B6B63] mb-4">Tap photos to select, then delete selected.</p>

                        <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-bold text-[#88887E] uppercase tracking-widest">
                                    {selected.size > 0 ? `${selected.size} selected` : `${items.length} photo${items.length !== 1 ? 's' : ''}`}
                              </p>
                              <button
                                    onClick={allSelected ? clearAll : selectAll}
                                    className="text-xs font-bold text-[#B29746]"
                              >
                                    {allSelected ? 'Deselect All' : 'Select All'}
                              </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto pb-1">
                              {items.map(item => {
                                    const isSelected = selected.has(item.id)
                                    return (
                                          <button
                                                key={item.id}
                                                onClick={() => toggle(item.id)}
                                                className="relative aspect-square rounded-xl overflow-hidden bg-[#E8E4DC] focus:outline-none"
                                                style={{ border: isSelected ? '2.5px solid #1A1A18' : '2.5px solid transparent' }}
                                          >
                                                {item.is_video ? (
                                                      <>
                                                            <img src={item.thumbnail_url || item.original_url} alt="" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <svg width="7" height="7" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                                  </div>
                                                            </div>
                                                      </>
                                                ) : (
                                                      <img src={item.original_url} alt="" className="w-full h-full object-cover" />
                                                )}
                                                {isSelected && (
                                                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                            <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center">
                                                                  <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                            </div>
                                                      </div>
                                                )}
                                          </button>
                                    )
                              })}
                        </div>

                        <div className="flex gap-2 mt-5">
                              <button
                                    onClick={handleDelete}
                                    disabled={!selected.size || deleting}
                                    className="flex-1 bg-red-600 text-white text-[11px] font-bold uppercase tracking-widest rounded-full py-3.5 disabled:opacity-40 hover:bg-red-700 transition-all"
                              >
                                    {deleting ? 'Deleting…' : `Delete${selected.size > 0 ? ` ${selected.size}` : ''}`}
                              </button>
                              <button
                                    onClick={onClose}
                                    className="px-4 border border-border text-ink-muted text-[11px] font-bold uppercase tracking-widest rounded-full hover:border-ink-muted transition-all"
                              >
                                    Cancel
                              </button>
                        </div>
                  </div>
            </div>
      )
}

export default function HostUploader({ eventId }) {
      const [open, setOpen] = useState(false)
      const [deleteInitialId, setDeleteInitialId] = useState(null)
      const [preloaded, setPreloaded] = useState([])

      useEffect(() => {
            if (!eventId) return
            supabase
                  .from('media_queue')
                  .select('id, original_url, thumbnail_url, is_video')
                  .eq('event_id', eventId)
                  .eq('is_admin_upload', true)
                  .eq('status', 1)
                  .order('created_at', { ascending: false })
                  .then(({ data }) => setPreloaded(data || []))
      }, [eventId])

      function refreshPreloaded() {
            supabase
                  .from('media_queue')
                  .select('id, original_url, thumbnail_url, is_video')
                  .eq('event_id', eventId)
                  .eq('is_admin_upload', true)
                  .eq('status', 1)
                  .order('created_at', { ascending: false })
                  .then(({ data }) => setPreloaded(data || []))
      }

      function handleClose() {
            setOpen(false)
            refreshPreloaded()
      }

      function handleDeleted(ids) {
            setPreloaded(prev => prev.filter(i => !ids.includes(i.id)))
      }

      return (
            <>
                  <div className="bg-white rounded-2xl border border-[#E0D8C6] shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-4 mb-0">
                              <div>
                                    <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-0.5">Pre-load Gallery</p>
                                    <p className="text-[11px] text-[#88887E]">Photos go straight to Live Gallery</p>
                              </div>
                              <button
                                    onClick={() => setOpen(true)}
                                    className="shrink-0 ml-4 bg-[#1A1A18] text-white text-[10px] font-bold uppercase tracking-widest rounded-full px-4 py-2.5 hover:bg-black transition-all"
                              >
                                    Add Photos
                              </button>
                        </div>

                        {/* Thumbnails — fills full width, horizontal scroll when overflow */}
                        {preloaded.length > 0 && (
                              <div
                                    className="border-t border-[#E8E4DA] overflow-x-auto"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                              >
                                    <div style={{ display: 'flex', height: '80px', width: '100%', minWidth: preloaded.length > 5 ? `${preloaded.length * 80}px` : '100%' }}>
                                    {preloaded.map((item) => (
                                          <button
                                                key={item.id}
                                                onClick={() => setDeleteInitialId(item.id)}
                                                style={{ flex: preloaded.length <= 5 ? '1 1 0' : '0 0 80px', overflow: 'hidden', position: 'relative', backgroundColor: '#E8E4DC', border: 'none', padding: 0, cursor: 'pointer' }}
                                          >
                                                {item.is_video ? (
                                                      <>
                                                            <img
                                                                  src={item.thumbnail_url || item.original_url}
                                                                  alt=""
                                                                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                            />
                                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <svg width="7" height="7" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                                  </div>
                                                            </div>
                                                      </>
                                                ) : (
                                                      <img src={item.original_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                                )}
                                          </button>
                                    ))}
                                    </div>
                              </div>
                        )}
                  </div>
                  {open && <UploadModal eventId={eventId} onClose={handleClose} />}
                  {deleteInitialId !== null && preloaded.length > 0 && (
                        <DeleteModal
                              items={preloaded}
                              onClose={() => setDeleteInitialId(null)}
                              onDeleted={handleDeleted}
                              initialId={deleteInitialId}
                        />
                  )}
            </>
      )
}

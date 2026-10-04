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

function GalleryModal({ items, onClose, onDeleted, initialId }) {
      const initialIndex = initialId ? Math.max(items.findIndex(i => i.id === initialId), 0) : 0
      const [viewIndex, setViewIndex] = useState(initialIndex)
      const [selectMode, setSelectMode] = useState(false)
      const [selected, setSelected] = useState(new Set())
      const [deleting, setDeleting] = useState(false)

      const current = items[viewIndex]

      function prev() { setViewIndex(i => Math.max(i - 1, 0)) }
      function next() { setViewIndex(i => Math.min(i + 1, items.length - 1)) }

      function toggle(id) {
            setSelected(prev => {
                  const next = new Set(prev)
                  next.has(id) ? next.delete(id) : next.add(id)
                  return next
            })
      }

      function enterSelect() {
            setSelectMode(true)
            setSelected(new Set([current.id]))
      }

      function exitSelect() {
            setSelectMode(false)
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
                  const remaining = items.filter(i => !ids.includes(i.id))
                  if (remaining.length === 0) { onClose(); return }
                  setViewIndex(Math.min(viewIndex, remaining.length - 1))
                  exitSelect()
            }
      }

      const allSelected = selected.size === items.length

      return (
            <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }} onClick={onClose}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                    <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                              </button>
                              <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Pre-load Gallery</p>
                        </div>
                        <div className="flex items-center gap-2">
                              {selectMode ? (
                                    <>
                                          <button onClick={() => setSelected(allSelected ? new Set() : new Set(items.map(i => i.id)))} className="text-xs font-bold text-[#B29746]">
                                                {allSelected ? 'Deselect All' : 'Select All'}
                                          </button>
                                          <button onClick={exitSelect} className="text-xs font-bold text-white/50 hover:text-white transition-colors ml-2">Cancel</button>
                                    </>
                              ) : (
                                    <button onClick={enterSelect} className="text-xs font-bold text-white border border-white/20 rounded-full px-3 py-1 hover:bg-white/10 transition-colors">Select</button>
                              )}
                        </div>
                  </div>

                  {/* Main viewer */}
                  {!selectMode && (
                        <div className="flex-1 flex items-center justify-center relative min-h-0 px-4" onClick={e => e.stopPropagation()}>
                              {/* Prev */}
                              {viewIndex > 0 && (
                                    <button onClick={prev} className="absolute left-4 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors">
                                          <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </button>
                              )}
                              {/* Media */}
                              <div className="w-full max-w-lg max-h-full flex items-center justify-center">
                                    {current?.is_video ? (
                                          <video src={current.original_url} controls autoPlay playsInline className="max-w-full max-h-[60vh] rounded-2xl object-contain" />
                                    ) : (
                                          <img src={current?.original_url} alt="" className="max-w-full max-h-[60vh] rounded-2xl object-contain" />
                                    )}
                              </div>
                              {/* Next */}
                              {viewIndex < items.length - 1 && (
                                    <button onClick={next} className="absolute right-4 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors">
                                          <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </button>
                              )}
                        </div>
                  )}

                  {/* Counter + delete button (single view) */}
                  {!selectMode && (
                        <div className="flex items-center justify-between px-5 py-3 shrink-0" onClick={e => e.stopPropagation()}>
                              <p className="text-white/40 text-xs font-bold">{viewIndex + 1} / {items.length}</p>
                              <button onClick={enterSelect} className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 transition-colors">
                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                                    Delete
                              </button>
                        </div>
                  )}

                  {/* Select mode grid */}
                  {selectMode && (
                        <div className="flex-1 overflow-y-auto px-4 min-h-0" onClick={e => e.stopPropagation()}>
                              <div className="grid grid-cols-4 gap-2 pb-4">
                                    {items.map(item => {
                                          const isSelected = selected.has(item.id)
                                          return (
                                                <button
                                                      key={item.id}
                                                      onClick={() => toggle(item.id)}
                                                      className="relative aspect-square rounded-xl overflow-hidden bg-white/10 focus:outline-none"
                                                      style={{ border: isSelected ? '2.5px solid white' : '2.5px solid transparent' }}
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
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                                                                        <svg width="12" height="12" fill="none" stroke="#1A1A18" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                                  </div>
                                                            </div>
                                                      )}
                                                </button>
                                          )
                                    })}
                              </div>
                        </div>
                  )}

                  {/* Select mode action bar */}
                  {selectMode && (
                        <div className="px-5 pb-8 pt-3 shrink-0" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
                              <button
                                    onClick={handleDelete}
                                    disabled={!selected.size || deleting}
                                    className="w-full bg-red-600 text-white text-[11px] font-bold uppercase tracking-widest rounded-full py-3.5 disabled:opacity-40 hover:bg-red-700 transition-all"
                              >
                                    {deleting ? 'Deleting…' : selected.size > 0 ? `Delete ${selected.size} photo${selected.size !== 1 ? 's' : ''}` : 'Select photos to delete'}
                              </button>
                        </div>
                  )}

                  {/* Thumbnail filmstrip */}
                  {!selectMode && items.length > 1 && (
                        <div className="shrink-0 overflow-x-auto px-4 pb-6" style={{ scrollbarWidth: 'none', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
                              <div className="flex gap-2">
                                    {items.map((item, idx) => (
                                          <button
                                                key={item.id}
                                                onClick={() => setViewIndex(idx)}
                                                className="shrink-0 w-14 h-14 rounded-lg overflow-hidden"
                                                style={{ opacity: idx === viewIndex ? 1 : 0.4, outline: idx === viewIndex ? '2px solid white' : 'none', outlineOffset: '2px' }}
                                          >
                                                <img src={item.thumbnail_url || item.original_url} alt="" className="w-full h-full object-cover" />
                                          </button>
                                    ))}
                              </div>
                        </div>
                  )}
            </div>
      )
}

export default function HostUploader({ eventId, refreshKey }) {
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
      }, [eventId, refreshKey])

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

                        {/* Thumbnails — fixed 80×80 squares, scroll when overflow */}
                        {preloaded.length > 0 && (
                              <div
                                    className="border-t border-[#E8E4DA] overflow-x-auto"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                              >
                                    <div style={{ display: 'flex', gap: 0 }}>
                                    {preloaded.map((item) => (
                                          <button
                                                key={item.id}
                                                onClick={() => setDeleteInitialId(item.id)}
                                                style={{ flexShrink: 0, width: 80, height: 80, overflow: 'hidden', position: 'relative', backgroundColor: '#E8E4DC', border: 'none', padding: 0, cursor: 'pointer' }}
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
                        <GalleryModal
                              items={preloaded}
                              onClose={() => setDeleteInitialId(null)}
                              onDeleted={handleDeleted}
                              initialId={deleteInitialId}
                        />
                  )}
            </>
      )
}

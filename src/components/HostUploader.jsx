import { useState, useRef } from 'react'
import { uploadPhoto } from '../lib/uploadPhoto'

export default function HostUploader({ eventId }) {
      const inputRef = useRef(null)
      const [files, setFiles] = useState([])
      const [uploading, setUploading] = useState(false)
      const [results, setResults] = useState(null)

      const VIDEO_LIMIT_SECONDS = 30

      async function checkVideoDuration(file) {
            return new Promise((resolve) => {
                  const url = URL.createObjectURL(file)
                  const vid = document.createElement('video')
                  vid.preload = 'metadata'
                  vid.onloadedmetadata = () => {
                        URL.revokeObjectURL(url)
                        resolve(vid.duration)
                  }
                  vid.onerror = () => { URL.revokeObjectURL(url); resolve(0) }
                  vid.src = url
            })
      }

      async function handlePick(e) {
            const picked = Array.from(e.target.files || [])
            if (!picked.length) return
            e.target.value = ''

            const valid = []
            const tooLong = []

            for (const file of picked) {
                  if (file.type.startsWith('video/')) {
                        const duration = await checkVideoDuration(file)
                        if (duration > VIDEO_LIMIT_SECONDS) {
                              tooLong.push({ name: file.name, duration: Math.round(duration) })
                              continue
                        }
                  }
                  valid.push(file)
            }

            if (tooLong.length > 0) {
                  const names = tooLong.map(f => `${f.name} (${f.duration}s)`).join(', ')
                  setResults({
                        succeeded: 0,
                        failed: 0,
                        tooLong: `Video${tooLong.length > 1 ? 's' : ''} too long (max 30s): ${names}`,
                  })
            } else {
                  setResults(null)
            }

            setFiles(valid)
      }

      async function handleUpload() {
            if (!files.length || !eventId) return
            setUploading(true)
            setResults(null)

            let succeeded = 0
            let failed = 0
            for (const file of files) {
                  const isVideo = file.type.startsWith('video/')
                  const result = await uploadPhoto({
                        blob: file,
                        eventId,
                        guestName: 'Host',
                        status: 1,
                        is_video: isVideo,
                        is_admin_upload: true,
                  })
                  if (result.success) succeeded++
                  else failed++
            }

            setUploading(false)
            setFiles([])
            setResults({ succeeded, failed })
      }

      return (
            <div className="bg-white rounded-2xl border border-[#E0D8C6] p-5">
                  <p className="text-[10px] font-bold text-[#88887E] uppercase mb-1">Pre-load Gallery</p>
                  <p className="text-[11px] text-[#88887E] mb-4">Upload your own photos or videos — they go straight into the Live Gallery.</p>

                  {results?.tooLong && (
                        <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium bg-[#FEF2F2] text-[#991B1B] flex items-start gap-2">
                              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              {results.tooLong}
                        </div>
                  )}
                  {results && (results.succeeded > 0 || results.failed > 0) && (
                        <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: results.failed === 0 ? '#F0FDF4' : '#FEF2F2', color: results.failed === 0 ? '#15803D' : '#991B1B' }}>
                              {results.succeeded > 0 && `${results.succeeded} uploaded to gallery. `}
                              {results.failed > 0 && `${results.failed} failed.`}
                        </div>
                  )}

                  {files.length > 0 ? (
                        <div className="mb-4">
                              <div className="flex flex-wrap gap-2 mb-3">
                                    {files.map((f, i) => (
                                          <div key={i} className="text-[10px] bg-[#F4F3F0] rounded-lg px-3 py-1.5 text-[#1A1A18] font-medium truncate max-w-[150px]">
                                                {f.name}
                                          </div>
                                    ))}
                              </div>
                              <div className="flex gap-3">
                                    <button
                                          onClick={handleUpload}
                                          disabled={uploading}
                                          className="flex-1 bg-[#1A1A18] text-white text-[11px] font-bold uppercase tracking-widest rounded-full py-3 disabled:opacity-50 hover:bg-black transition-all"
                                    >
                                          {uploading ? `Uploading ${files.length} file${files.length > 1 ? 's' : ''}…` : `Upload ${files.length} file${files.length > 1 ? 's' : ''} to Gallery`}
                                    </button>
                                    <button
                                          onClick={() => setFiles([])}
                                          disabled={uploading}
                                          className="px-4 py-3 border border-[#E0D8C6] text-[#88887E] text-[11px] font-bold uppercase tracking-widest rounded-full hover:border-[#88887E] transition-all"
                                    >
                                          Clear
                                    </button>
                              </div>
                        </div>
                  ) : (
                        <button
                              onClick={() => inputRef.current?.click()}
                              className="w-full border-2 border-dashed border-[#E0D8C6] rounded-xl p-5 text-center hover:border-[#88887E] transition-colors"
                        >
                              <p className="text-sm font-bold text-[#1A1A18] mb-0.5">Choose photos or videos</p>
                              <p className="text-[11px] text-[#88887E]">Select multiple — all go straight to Live Gallery</p>
                        </button>
                  )}

                  <input ref={inputRef} type="file" accept="image/*,video/*" multiple onChange={handlePick} className="hidden" />
            </div>
      )
}

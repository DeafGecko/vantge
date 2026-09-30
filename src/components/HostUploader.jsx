import { useState, useRef } from 'react'
import { uploadPhoto } from '../lib/uploadPhoto'

export default function HostUploader({ eventId }) {
      const inputRef = useRef(null)
      const [files, setFiles] = useState([])
      const [uploading, setUploading] = useState(false)
      const [results, setResults] = useState(null)

      function handlePick(e) {
            const picked = Array.from(e.target.files || [])
            if (!picked.length) return
            setFiles(picked)
            setResults(null)
            e.target.value = ''
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
                        status: 1, // auto-approved into Live Gallery
                        is_video: isVideo,
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

                  {results && (
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

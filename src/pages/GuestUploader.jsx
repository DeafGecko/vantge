import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import { uploadPhoto } from '../lib/uploadPhoto'
import { getTheme } from '../lib/themes'
import { resolveFontFamily } from '../lib/fonts'
import FontLoader from '../components/FontLoader'



const MAX_FILES = 10

export default function GuestUploader() {
      const { eventSlug } = useParams()
      const { event, loading, error } = useEvent(eventSlug)
      const fileInputRef = useRef(null)

      const [files, setFiles] = useState([])
      const [guestName, setGuestName] = useState('')
      const [uploadState, setUploadState] = useState('idle')
      const [currentIndex, setCurrentIndex] = useState(0)
      const [successCount, setSuccessCount] = useState(0)
      const [failedFiles, setFailedFiles] = useState([])
      const [fileError, setFileError] = useState(null)

      function handleFileSelect(e) {
            setFileError(null)
            const picked = Array.from(e.target.files || [])
            if (picked.length === 0) return

            if (picked.length > MAX_FILES) {
                  setFileError(`Please pick ${MAX_FILES} photos or fewer. You selected ${picked.length}.`)
                  e.target.value = ''
                  return
            }

            const imagesOnly = picked.filter((f) => f.type.startsWith('image/'))
            if (imagesOnly.length < picked.length) {
                  setFileError('Some files were skipped because they weren\'t photos.')
            }

            setFiles(imagesOnly)
      }

      function openFilePicker() {
            fileInputRef.current?.click()
      }

      async function handleUpload() {
            if (!event || files.length === 0) return

            setUploadState('uploading')
            setCurrentIndex(0)
            setSuccessCount(0)
            setFailedFiles([])

            let succeeded = 0
            const failures = []

            for (let i = 0; i < files.length; i++) {
                  setCurrentIndex(i)
                  const file = files[i]

                  const result = await uploadPhoto({
                        blob: file,
                        eventId: event.id,
                        guestName: guestName,
                  })

                  if (result.success) {
                        succeeded++
                        setSuccessCount(succeeded)
                  } else {
                        failures.push({ name: file.name, error: result.error })
                  }
            }

            setFailedFiles(failures)

            if (failures.length === 0) {
                  setUploadState('success')
            } else if (succeeded > 0) {
                  setUploadState('partial')
            } else {
                  setUploadState('error')
            }
      }

      function reset() {
            setFiles([])
            setUploadState('idle')
            setCurrentIndex(0)
            setSuccessCount(0)
            setFailedFiles([])
            setFileError(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
      }

      if (loading) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-6">
                        <p className="text-sm text-[#88887E]">Loading...</p>
                  </div>
            )
      }

      if (error || !event) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-6">
                        <div className="max-w-sm text-center">
                              <h1 className="text-2xl font-extrabold text-[#1A1A18] mb-2">Event not found</h1>
                              <Link to="/" className="text-sm text-[#C84A44] hover:underline">Go home</Link>
                        </div>
                  </div>
            )
      }

      // Apply theme
      const theme = getTheme(event.theme)
      const c = theme.colors
      const selectedFontFamily = resolveFontFamily(event.font_family)
      const bgImage = event.background_image
      const bgPosition = event.background_position || '50% 50%'
      const pageStyle = bgImage
            ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition }
            : { backgroundColor: c.bg }
      const tintStyle = bgImage ? { backgroundColor: 'rgba(0,0,0,0.55)' } : {}

      const txt = bgImage ? '#FFFFFF' : c.text
      const txtMuted = bgImage ? 'rgba(255,255,255,0.75)' : c.textMuted
      const txtSubtle = bgImage ? 'rgba(255,255,255,0.55)' : c.textSubtle

      // Success state
      if (uploadState === 'success') {
            return (
                  <div className="min-h-screen p-6 relative" style={pageStyle}>
                        <div className="absolute inset-0 pointer-events-none" style={tintStyle} />
                        <div className="relative z-10 max-w-md mx-auto">
                              <div className="mb-8 pt-4">
                                    <p className="text-xs tracking-wide uppercase mt-5 mb-1" style={{ color: txtSubtle }}>{event.event_name}</p>
                                    <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: txt, fontFamily: selectedFontFamily }}>
                                          Share your <span style={{ color: bgImage ? '#fff' : c.accent }}>Photos</span>.
                                    </h1>
                              </div>
                              <h1 className="text-3xl font-extrabold tracking-tight mb-3" style={{ color: txt, fontFamily: selectedFontFamily }}>
                                    {successCount === 1 ? 'Photo sent' : `${successCount} photos sent`}
                              </h1>
                              <p className="text-sm mb-6" style={{ color: txtMuted }}>
                                    {successCount === 1 ? 'Your photo is' : 'Your photos are'} with the host for approval.
                              </p>
                              <button
                                    onClick={reset}
                                    className="font-medium rounded-full py-3 px-6 transition-colors text-sm mb-3 text-white"
                                    style={{ backgroundColor: c.accent }}
                              >
                                    Send more photos
                              </button>
                              <div>
                                    <Link to={`/${event.event_slug}`} className="text-sm" style={{ color: txtMuted }}>
                                          ← Back to event
                                    </Link>
                              </div>
                        </div>
                  </div>
            )
      }

      // Partial success
      if (uploadState === 'partial') {
            return (
                  <div className="min-h-screen flex items-center justify-center p-6 relative" style={pageStyle}>
                        <div className="absolute inset-0 pointer-events-none" style={tintStyle} />
                        <div className="relative z-10 max-w-sm text-center">
                              <h1 className="text-2xl font-extrabold mb-2" style={{ color: txt, fontFamily: selectedFontFamily }}>
                                    {successCount} of {files.length} sent
                              </h1>
                              <p className="text-sm mb-6" style={{ color: txtMuted }}>
                                    {failedFiles.length} {failedFiles.length === 1 ? 'photo' : 'photos'} failed to upload. Try again?
                              </p>
                              <button onClick={handleUpload} className="font-medium rounded-full py-3 px-6 transition-colors text-sm mb-3 text-white" style={{ backgroundColor: c.accent }}>
                                    Retry failed uploads
                              </button>
                              <div>
                                    <button onClick={reset} className="text-sm" style={{ color: txtMuted }}>Start over</button>
                              </div>
                        </div>
                  </div>
            )
      }

      // Upload failed
      if (uploadState === 'error') {
            return (
                  <div className="min-h-screen flex items-center justify-center p-6 relative" style={pageStyle}>
                        <div className="absolute inset-0 pointer-events-none" style={tintStyle} />
                        <div className="relative z-10 max-w-sm text-center">
                              <h1 className="text-2xl font-extrabold mb-2" style={{ color: txt, fontFamily: selectedFontFamily }}>Upload failed</h1>
                              <p className="text-sm mb-6" style={{ color: txtMuted }}>
                                    Something went wrong. Check your connection and try again.
                              </p>
                              <button onClick={handleUpload} className="font-medium rounded-full py-3 px-6 transition-colors text-sm text-white" style={{ backgroundColor: c.accent }}>
                                    Try again
                              </button>
                        </div>
                  </div>
            )
      }

      // Uploading
      if (uploadState === 'uploading') {
            const progress = Math.round(((currentIndex + 1) / files.length) * 100)
            return (
                  <div className="min-h-screen flex items-center justify-center p-6 relative" style={pageStyle}>
                        <div className="absolute inset-0 pointer-events-none" style={tintStyle} />
                        <div className="relative z-10 max-w-sm w-full text-center">
                              <h1 className="text-2xl font-extrabold mb-2" style={{ color: txt, fontFamily: selectedFontFamily }}>
                                    Uploading {currentIndex + 1} of {files.length}
                              </h1>
                              <p className="text-sm mb-6" style={{ color: txtMuted }}>Please keep this page open.</p>
                              <div className="w-full rounded-full h-2 mb-2" style={{ backgroundColor: bgImage ? 'rgba(255,255,255,0.3)' : c.border }}>
                                    <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: bgImage ? '#fff' : c.accent }} />
                              </div>
                              <p className="text-xs" style={{ color: txtSubtle }}>{progress}%</p>
                        </div>
                  </div>
            )
      }

      // Idle — file picker + preview
      return (
            <>
                  <FontLoader fontId={event.font_family} />
            <div className="min-h-screen p-6 relative" style={pageStyle}>
                  <div className="absolute inset-0 pointer-events-none" style={tintStyle} />
                  <div className="relative z-10 max-w-md mx-auto">

                        <div className="mb-8 pt-4">
                              <Link to={`/${event.event_slug}`} className="text-sm" style={{ color: txtMuted }}>← Back</Link>
                              <p className="text-xs tracking-wide uppercase mt-5 mb-1" style={{ color: txtSubtle }}>{event.event_name}</p>
                              <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: txt, fontFamily: selectedFontFamily }}>
                                    Share your <span style={{ color: bgImage ? '#fff' : c.accent }}>photos</span>.
                              </h1>
                              <p className="text-sm mt-2" style={{ color: txtMuted }}>Pick up to {MAX_FILES} photos from your phone.</p>
                        </div>

                        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />

                        {files.length === 0 ? (
                              <div>
                                    <button
                                          onClick={openFilePicker}
                                          className="w-full border-2 border-dashed rounded-2xl p-10 transition-colors"
                                          style={{ backgroundColor: bgImage ? 'rgba(255,255,255,0.15)' : c.surface, borderColor: bgImage ? 'rgba(255,255,255,0.4)' : c.border }}
                                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = bgImage ? '#fff' : c.accent }}
                                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = bgImage ? 'rgba(255,255,255,0.4)' : c.border }}
                                    >
                                          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: bgImage ? 'rgba(255,255,255,0.2)' : c.surfaceMuted }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke={bgImage ? '#fff' : c.textMuted} strokeWidth={1.5}>
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                          </div>
                                          <p className="text-base font-bold mb-1" style={{ color: txt }}>Choose from your gallery</p>
                                          <p className="text-xs" style={{ color: txtSubtle }}>Select up to {MAX_FILES} photos</p>
                                    </button>
                                    {fileError && (
                                          <div className="mt-4 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-sm rounded-lg px-4 py-3">{fileError}</div>
                                    )}
                              </div>
                        ) : (
                              <div>
                                    <div className="rounded-2xl border p-4 mb-5" style={{ backgroundColor: bgImage ? 'rgba(255,255,255,0.15)' : c.surface, borderColor: bgImage ? 'rgba(255,255,255,0.3)' : c.border }}>
                                          <div className="flex items-center justify-between mb-3">
                                                <p className="text-sm font-medium" style={{ color: txt }}>
                                                      {files.length} {files.length === 1 ? 'photo' : 'photos'} selected
                                                </p>
                                                <button onClick={openFilePicker} className="text-xs hover:underline font-medium" style={{ color: bgImage ? '#fff' : c.accent }}>Change</button>
                                          </div>
                                          <div className="grid grid-cols-4 gap-2">
                                                {files.map((file, i) => (
                                                      <div key={i} className="aspect-square rounded-lg overflow-hidden" style={{ backgroundColor: c.surfaceMuted }}>
                                                            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                                                      </div>
                                                ))}
                                          </div>
                                    </div>

                                    <div className="mb-5">
                                          <label className="block text-xs font-medium mb-2 tracking-wide uppercase" style={{ color: txtMuted }}>Your name (optional)</label>
                                          <input
                                                type="text"
                                                value={guestName}
                                                onChange={(e) => setGuestName(e.target.value)}
                                                placeholder="So the host knows it's from you"
                                                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors border"
                                                style={{ backgroundColor: bgImage ? 'rgba(255,255,255,0.15)' : c.surface, borderColor: bgImage ? 'rgba(255,255,255,0.3)' : c.border, color: txt }}
                                                onFocus={(e) => { e.currentTarget.style.borderColor = bgImage ? '#fff' : c.accent }}
                                                onBlur={(e) => { e.currentTarget.style.borderColor = bgImage ? 'rgba(255,255,255,0.3)' : c.border }}
                                          />
                                    </div>

                                    <button onClick={handleUpload} className="w-full font-medium rounded-full py-3.5 px-6 transition-colors text-base text-white" style={{ backgroundColor: c.accent }}>
                                          Send {files.length} {files.length === 1 ? 'photo' : 'photos'}
                                    </button>
                                    <button onClick={reset} className="w-full mt-3 text-sm" style={{ color: txtMuted }}>Cancel</button>
                              </div>
                        )}
                  </div>
            </div>
            </>
      )
}
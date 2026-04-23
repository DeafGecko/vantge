import { useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import { uploadPhoto } from '../lib/uploadPhoto'

const MAX_FILES = 10

export default function GuestUploader() {
      const { eventSlug } = useParams()
      const navigate = useNavigate()
      const { event, loading, error } = useEvent(eventSlug)
      const fileInputRef = useRef(null)

      const [files, setFiles] = useState([])
      const [guestName, setGuestName] = useState('')
      const [uploadState, setUploadState] = useState('idle') // idle | uploading | success | partial | error
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
                  e.target.value = '' // reset input
                  return
            }

            // Filter out non-images just in case
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

      // Loading event
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

      // Success state
      if (uploadState === 'success') {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-6">
                        <div className="max-w-sm text-center">
                              <div className="w-16 h-16 rounded-full bg-[#16A34A] mx-auto mb-5 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                              </div>
                              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1A18] mb-3">
                                    {successCount === 1 ? 'Photo sent' : `${successCount} photos sent`}
                              </h1>
                              <p className="text-sm text-[#5A5A52] mb-6">
                                    {successCount === 1 ? 'Your photo is' : 'Your photos are'} with the host for approval.
                              </p>
                              <button
                                    onClick={reset}
                                    className="bg-[#C84A44] hover:bg-[#B43E39] text-white font-medium rounded-full py-3 px-6 transition-colors text-sm mb-3"
                              >
                                    Send more photos
                              </button>
                              <div>
                                    <Link
                                          to={`/${event.event_slug}`}
                                          className="text-sm text-[#5A5A52] hover:text-[#C84A44]"
                                    >
                                          ← Back to event
                                    </Link>
                              </div>
                        </div>
                  </div>
            )
      }

      // Partial success state
      if (uploadState === 'partial') {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-6">
                        <div className="max-w-sm text-center">
                              <h1 className="text-2xl font-extrabold text-[#1A1A18] mb-2">
                                    {successCount} of {files.length} sent
                              </h1>
                              <p className="text-sm text-[#5A5A52] mb-6">
                                    {failedFiles.length} {failedFiles.length === 1 ? 'photo' : 'photos'} failed to upload. Try again?
                              </p>
                              <button
                                    onClick={handleUpload}
                                    className="bg-[#C84A44] hover:bg-[#B43E39] text-white font-medium rounded-full py-3 px-6 transition-colors text-sm mb-3"
                              >
                                    Retry failed uploads
                              </button>
                              <div>
                                    <button onClick={reset} className="text-sm text-[#5A5A52] hover:text-[#C84A44]">
                                          Start over
                                    </button>
                              </div>
                        </div>
                  </div>
            )
      }

      // Upload failed state
      if (uploadState === 'error') {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-6">
                        <div className="max-w-sm text-center">
                              <h1 className="text-2xl font-extrabold text-[#1A1A18] mb-2">Upload failed</h1>
                              <p className="text-sm text-[#5A5A52] mb-6">
                                    Something went wrong. Check your connection and try again.
                              </p>
                              <button
                                    onClick={handleUpload}
                                    className="bg-[#C84A44] hover:bg-[#B43E39] text-white font-medium rounded-full py-3 px-6 transition-colors text-sm"
                              >
                                    Try again
                              </button>
                        </div>
                  </div>
            )
      }

      // Uploading state
      if (uploadState === 'uploading') {
            const progress = Math.round(((currentIndex + 1) / files.length) * 100)
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-6">
                        <div className="max-w-sm w-full text-center">
                              <h1 className="text-2xl font-extrabold text-[#1A1A18] mb-2">
                                    Uploading {currentIndex + 1} of {files.length}
                              </h1>
                              <p className="text-sm text-[#5A5A52] mb-6">
                                    Please keep this page open.
                              </p>

                              <div className="w-full bg-[#E0D8C6] rounded-full h-2 mb-2">
                                    <div
                                          className="bg-[#C84A44] h-2 rounded-full transition-all duration-300"
                                          style={{ width: `${progress}%` }}
                                    />
                              </div>
                              <p className="text-xs text-[#88887E]">{progress}%</p>
                        </div>
                  </div>
            )
      }

      // Idle state — file picker + preview
      return (
            <div className="min-h-screen bg-cream p-6">
                  <div className="max-w-md mx-auto">

                        {/* Header */}
                        <div className="mb-8 pt-4">
                              <Link to={`/${event.event_slug}`} className="text-sm text-[#5A5A52] hover:text-[#C84A44]">
                                    ← Back
                              </Link>
                              <p className="text-xs text-[#88887E] tracking-wide uppercase mt-5 mb-1">
                                    {event.event_name}
                              </p>
                              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1A18]">
                                    Share your <span className="text-[#C84A44]">photos</span>.
                              </h1>
                              <p className="text-sm text-[#5A5A52] mt-2">
                                    Pick up to {MAX_FILES} photos from your phone.
                              </p>
                        </div>

                        {/* Hidden file input */}
                        <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleFileSelect}
                              className="hidden"
                        />

                        {/* File picker button (shown when no files selected) */}
                        {files.length === 0 ? (
                              <div>
                                    <button
                                          onClick={openFilePicker}
                                          className="w-full bg-white border-2 border-dashed border-[#E0D8C6] rounded-2xl p-10 hover:border-[#C84A44] transition-colors"
                                    >
                                          <div className="w-14 h-14 rounded-full bg-[#F4F3F0] mx-auto mb-4 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[#5A5A52]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                          </div>
                                          <p className="text-base font-bold text-[#1A1A18] mb-1">
                                                Choose from your gallery
                                          </p>
                                          <p className="text-xs text-[#88887E]">
                                                Select up to {MAX_FILES} photos
                                          </p>
                                    </button>

                                    {fileError ? (
                                          <div className="mt-4 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-sm rounded-lg px-4 py-3">
                                                {fileError}
                                          </div>
                                    ) : null}
                              </div>
                        ) : (
                              // Preview + upload
                              <div>
                                    <div className="bg-white rounded-2xl border border-[#E0D8C6] p-4 mb-5">
                                          <div className="flex items-center justify-between mb-3">
                                                <p className="text-sm font-medium text-[#1A1A18]">
                                                      {files.length} {files.length === 1 ? 'photo' : 'photos'} selected
                                                </p>
                                                <button
                                                      onClick={openFilePicker}
                                                      className="text-xs text-[#C84A44] hover:underline font-medium"
                                                >
                                                      Change
                                                </button>
                                          </div>

                                          {/* Thumbnails */}
                                          <div className="grid grid-cols-4 gap-2">
                                                {files.map((file, i) => (
                                                      <div key={i} className="aspect-square bg-[#F4F3F0] rounded-lg overflow-hidden">
                                                            <img
                                                                  src={URL.createObjectURL(file)}
                                                                  alt=""
                                                                  className="w-full h-full object-cover"
                                                            />
                                                      </div>
                                                ))}
                                          </div>
                                    </div>

                                    {/* Guest name */}
                                    <div className="mb-5">
                                          <label className="block text-xs font-medium text-[#5A5A52] mb-2 tracking-wide uppercase">
                                                Your name (optional)
                                          </label>
                                          <input
                                                type="text"
                                                value={guestName}
                                                onChange={(e) => setGuestName(e.target.value)}
                                                placeholder="So the host knows it's from you"
                                                className="w-full bg-white border border-[#E0D8C6] rounded-lg px-4 py-3 text-sm text-[#1A1A18] focus:outline-none focus:border-[#C84A44] transition-colors"
                                          />
                                    </div>

                                    {/* Send button */}
                                    <button
                                          onClick={handleUpload}
                                          className="w-full bg-[#C84A44] hover:bg-[#B43E39] text-white font-medium rounded-full py-3.5 px-6 transition-colors text-base"
                                    >
                                          Send {files.length} {files.length === 1 ? 'photo' : 'photos'}
                                    </button>

                                    <button
                                          onClick={reset}
                                          className="w-full mt-3 text-sm text-[#5A5A52] hover:text-[#C84A44]"
                                    >
                                          Cancel
                                    </button>
                              </div>
                        )}

                  </div>
            </div>
      )
}
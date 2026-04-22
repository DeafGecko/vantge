import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import { uploadPhoto } from '../lib/uploadPhoto'

export default function GuestCamera() {
      const { eventSlug } = useParams()
      const { event, loading: eventLoading } = useEvent(eventSlug)

      const videoRef = useRef(null)
      const canvasRef = useRef(null)
      const streamRef = useRef(null)
      const [cameraError, setCameraError] = useState(null)
      const [cameraReady, setCameraReady] = useState(false)
      const [capturedPhoto, setCapturedPhoto] = useState(null)

      // Upload state machine: 'idle' | 'uploading' | 'success' | 'error'
      const [uploadState, setUploadState] = useState('idle')
      const [uploadError, setUploadError] = useState(null)
      const [guestName, setGuestName] = useState('')

      useEffect(() => {
            async function startCamera() {
                  try {
                        const stream = await navigator.mediaDevices.getUserMedia({
                              video: {
                                    facingMode: 'environment',
                                    width: { ideal: 1920 },
                                    height: { ideal: 1080 },
                              },
                              audio: false,
                        })

                        if (videoRef.current) {
                              videoRef.current.srcObject = stream
                              streamRef.current = stream
                              setCameraReady(true)
                        }
                  } catch (err) {
                        console.error('Camera error:', err)
                        setCameraError(err.message || 'Could not access camera')
                  }
            }

            startCamera()

            return () => {
                  if (streamRef.current) {
                        streamRef.current.getTracks().forEach(track => track.stop())
                  }
            }
      }, [])

      function handleCapture() {
            const video = videoRef.current
            const canvas = canvasRef.current
            if (!video || !canvas) return

            canvas.width = video.videoWidth
            canvas.height = video.videoHeight

            const ctx = canvas.getContext('2d')
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            canvas.toBlob(
                  (blob) => {
                        if (blob) {
                              const url = URL.createObjectURL(blob)
                              setCapturedPhoto({ blob, url })
                              setUploadState('idle')
                              setUploadError(null)
                        }
                  },
                  'image/jpeg',
                  0.92
            )
      }

      function handleRetake() {
            if (capturedPhoto?.url) {
                  URL.revokeObjectURL(capturedPhoto.url)
            }
            setCapturedPhoto(null)
            setUploadState('idle')
            setUploadError(null)
      }

      async function handleUpload() {
            if (!capturedPhoto?.blob || !event?.id) return

            setUploadState('uploading')
            setUploadError(null)

            const result = await uploadPhoto({
                  blob: capturedPhoto.blob,
                  eventId: event.id,
                  guestName: guestName,
            })

            if (result.success) {
                  setUploadState('success')
                  // Clean up the blob URL
                  if (capturedPhoto.url) {
                        URL.revokeObjectURL(capturedPhoto.url)
                  }
                  // Auto-return to live camera after 2 seconds
                  setTimeout(() => {
                        setCapturedPhoto(null)
                        setUploadState('idle')
                  }, 2000)
            } else {
                  setUploadState('error')
                  setUploadError(result.error)
            }
      }

      // -----------------------------
      // Loading / error / not-found screens (same as Phase 2)
      // -----------------------------

      if (eventLoading) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center">
                        <p className="text-sm text-[#5A5A52]">Loading...</p>
                  </div>
            )
      }

      if (!event) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-8">
                        <div className="text-center">
                              <p className="text-sm text-[#5A5A52] mb-4">Event not found.</p>
                              <Link to="/" className="text-sm text-[#C84A44] font-medium">
                                    ← Back to home
                              </Link>
                        </div>
                  </div>
            )
      }

      if (cameraError) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center p-8">
                        <div className="max-w-sm w-full text-center">
                              <h1 className="text-2xl font-extrabold tracking-tight text-[#1A1A18] mb-3">
                                    Camera access needed
                              </h1>
                              <p className="text-sm text-[#5A5A52] mb-6">
                                    {cameraError}. To upload photos, tap the AA icon in Safari's address bar, choose Website Settings, and allow Camera access.
                              </p>
                              <Link
                                    to={`/${eventSlug}`}
                                    className="inline-block text-sm text-[#C84A44] font-medium"
                              >
                                    ← Back to event
                              </Link>
                        </div>
                  </div>
            )
      }

      // -----------------------------
      // Main camera UI
      // -----------------------------

      return (
            <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">

                  {/* Top bar */}
                  <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent p-4 flex items-center justify-between">
                        <Link
                              to={`/${eventSlug}`}
                              className="text-white text-sm font-medium bg-black/40 rounded-full px-3 py-1.5 backdrop-blur-sm"
                        >
                              ← Back
                        </Link>
                        <p className="text-white text-sm font-medium truncate max-w-[60%]">
                              {event.event_name}
                        </p>
                  </div>

                  {/* LIVE CAMERA MODE */}
                  {!capturedPhoto && (
                        <>
                              <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover absolute inset-0"
                              />

                              <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-20 pb-10 flex flex-col items-center">
                                    {cameraReady && (
                                          <button
                                                onClick={handleCapture}
                                                className="w-20 h-20 rounded-full bg-white border-4 border-white/50 active:scale-95 transition-transform shadow-lg flex items-center justify-center"
                                                aria-label="Take photo"
                                          >
                                                <div className="w-16 h-16 rounded-full bg-[#E8615C]"></div>
                                          </button>
                                    )}
                              </div>
                        </>
                  )}

                  {/* PHOTO PREVIEW MODE */}
                  {capturedPhoto && (
                        <>
                              <img
                                    src={capturedPhoto.url}
                                    alt="Captured photo preview"
                                    className="w-full h-full object-cover absolute inset-0"
                              />

                              {/* Success overlay */}
                              {uploadState === 'success' && (
                                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                          <div className="bg-white rounded-2xl p-6 max-w-xs mx-4 text-center">
                                                <div className="w-16 h-16 rounded-full bg-[#16A34A] mx-auto mb-3 flex items-center justify-center">
                                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                      </svg>
                                                </div>
                                                <h2 className="text-lg font-extrabold text-[#1A1A18] mb-1">Sent to host</h2>
                                                <p className="text-sm text-[#5A5A52]">The host will approve it shortly.</p>
                                          </div>
                                    </div>
                              )}

                              {/* Uploading overlay */}
                              {uploadState === 'uploading' && (
                                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                          <div className="bg-white rounded-2xl p-6 max-w-xs mx-4 text-center">
                                                <div className="w-16 h-16 rounded-full border-4 border-[#E0D8C6] border-t-[#C84A44] mx-auto mb-3 animate-spin"></div>
                                                <p className="text-sm text-[#5A5A52]">Uploading...</p>
                                          </div>
                                    </div>
                              )}

                              {/* Bottom controls — only visible in idle or error state */}
                              {(uploadState === 'idle' || uploadState === 'error') && (
                                    <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-10 px-6">

                                          {/* Guest name input — optional */}
                                          <input
                                                type="text"
                                                value={guestName}
                                                onChange={(e) => setGuestName(e.target.value)}
                                                placeholder="Your name (optional)"
                                                maxLength={50}
                                                className="w-full mb-3 bg-white/20 text-white placeholder-white/60 border border-white/30 rounded-full px-5 py-3 text-sm backdrop-blur-sm focus:outline-none focus:border-white/60"
                                          />

                                          {/* Error message */}
                                          {uploadState === 'error' && (
                                                <div className="mb-3 bg-[#C84A44]/90 text-white text-sm rounded-lg px-4 py-2 text-center">
                                                      Upload failed: {uploadError}. Try again?
                                                </div>
                                          )}

                                          {/* Action buttons */}
                                          <div className="flex gap-3">
                                                <button
                                                      onClick={handleRetake}
                                                      className="flex-1 bg-white/20 text-white font-medium rounded-full py-4 px-6 backdrop-blur-sm border border-white/30 active:scale-[0.98] transition-transform"
                                                >
                                                      Retake
                                                </button>
                                                <button
                                                      onClick={handleUpload}
                                                      className="flex-1 bg-[#C84A44] text-white font-medium rounded-full py-4 px-6 active:scale-[0.98] transition-transform"
                                                >
                                                      {uploadState === 'error' ? 'Try again' : 'Use this photo'}
                                                </button>
                                          </div>
                                    </div>
                              )}
                        </>
                  )}

                  <canvas ref={canvasRef} className="hidden" />
            </div>
      )
}
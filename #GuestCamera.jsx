// src/pages/GuestCamera.jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEvent } from './src/hooks/useEvent'
import { uploadPhoto } from './src/lib/uploadPhoto'
import { getTheme } from './src/lib/themes'
import { resolveFontFamily } from './src/lib/fonts'
import FontLoader from './src/components/FontLoader'
import { Grid, RefreshCw } from 'lucide-react'

export default function GuestCamera() {
      const { eventSlug } = useParams()
      const { event, loading: eventLoading } = useEvent(eventSlug)

      // Camera & stream refs
      const videoRef = useRef(null)
      const canvasRef = useRef(null)
      const streamRef = useRef(null)
      const videoTrackRef = useRef(null)

      // Camera state
      const [cameraError, setCameraError] = useState(null)
      const [cameraReady, setCameraReady] = useState(false)
      const [needsTapToStart, setNeedsTapToStart] = useState(false)
      const [capturedPhoto, setCapturedPhoto] = useState(null)

      // Upload state
      const [uploadState, setUploadState] = useState('idle')
      const [uploadError, setUploadError] = useState(null)
      const [guestName, setGuestName] = useState('')

      // Zoom
      const [zoomMin, setZoomMin] = useState(1)
      const [zoomMax, setZoomMax] = useState(1)
      const [zoomLevel, setZoomLevel] = useState(1)
      const [zoomSupported, setZoomSupported] = useState(false)

      // Front/Back camera
      const [facingMode, setFacingMode] = useState('environment')

      // Countdown timer
      const [countdownActive, setCountdownActive] = useState(false)
      const [countdownValue, setCountdownValue] = useState(null)
      const countdownIntervalRef = useRef(null)

      // Grid overlay
      const [gridEnabled, setGridEnabled] = useState(false)

      const stopStream = useCallback(() => {
            if (streamRef.current) {
                  streamRef.current.getTracks().forEach((track) => track.stop())
                  streamRef.current = null
            }
            if (videoRef.current) {
                  videoRef.current.srcObject = null
            }
            videoTrackRef.current = null
      }, [])

      const applyZoom = useCallback(async (value) => {
            if (!videoTrackRef.current || !zoomSupported) return
            const zoom = parseFloat(value)
            if (isNaN(zoom)) return
            try {
                  await videoTrackRef.current.applyConstraints({
                        advanced: [{ zoom: zoom }]
                  })
                  setZoomLevel(zoom)
            } catch (err) {
                  console.warn('Zoom constraint failed:', err)
            }
      }, [zoomSupported])

      const startCamera = useCallback(async () => {
            stopStream()
            setCameraReady(false)
            setCameraError(null)
            setZoomSupported(false)

            try {
                  const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                              facingMode: { exact: facingMode },
                              width: { ideal: 1920 },
                              height: { ideal: 1080 },
                        },
                        audio: false,
                  })

                  streamRef.current = stream
                  const videoTrack = stream.getVideoTracks()[0]
                  videoTrackRef.current = videoTrack

                  const capabilities = videoTrack.getCapabilities?.()
                  if (capabilities && capabilities.zoom && capabilities.zoom.max > 1) {
                        setZoomMin(capabilities.zoom.min || 1)
                        setZoomMax(capabilities.zoom.max)
                        setZoomLevel(capabilities.zoom.min || 1)
                        setZoomSupported(true)
                        await videoTrack.applyConstraints({ advanced: [{ zoom: capabilities.zoom.min || 1 }] })
                  }

                  if (videoRef.current) {
                        videoRef.current.srcObject = stream
                        videoRef.current.onloadedmetadata = () => {
                              videoRef.current?.play().catch(() => { })
                              setCameraReady(true)
                              setNeedsTapToStart(false)
                        }
                  }
            } catch (err) {
                  console.error('Camera error:', err)
                  if (err.name === 'NotAllowedError' || err.name === 'NotReadableError') {
                        setNeedsTapToStart(true)
                  } else if (err.name === 'OverconstrainedError') {
                        try {
                              const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true })
                              streamRef.current = fallbackStream
                              videoTrackRef.current = fallbackStream.getVideoTracks()[0]
                              if (videoRef.current) {
                                    videoRef.current.srcObject = fallbackStream
                                    videoRef.current.onloadedmetadata = () => {
                                          videoRef.current?.play().catch(() => { })
                                          setCameraReady(true)
                                          setNeedsTapToStart(false)
                                    }
                              }
                        } catch (fallbackErr) {
                              setCameraError(fallbackErr.message || 'Could not access camera')
                        }
                  } else {
                        setCameraError(err.message || 'Could not access camera')
                  }
            }
      }, [facingMode, stopStream])

      const switchCamera = useCallback(() => {
            const newMode = facingMode === 'environment' ? 'user' : 'environment'
            setFacingMode(newMode)
      }, [facingMode])

      const startCountdown = (seconds) => {
            if (countdownActive) return
            setCountdownValue(seconds)
            setCountdownActive(true)

            let remaining = seconds
            countdownIntervalRef.current = setInterval(() => {
                  remaining -= 1
                  if (remaining <= 0) {
                        clearInterval(countdownIntervalRef.current)
                        setCountdownActive(false)
                        setCountdownValue(null)
                        performCapture()
                  } else {
                        setCountdownValue(remaining)
                  }
            }, 1000)
      }

      const cancelCountdown = () => {
            if (countdownIntervalRef.current) {
                  clearInterval(countdownIntervalRef.current)
                  countdownIntervalRef.current = null
            }
            setCountdownActive(false)
            setCountdownValue(null)
      }

      const performCapture = () => {
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
                              stopStream()
                        }
                  },
                  'image/jpeg',
                  0.92
            )
      }

      const handleCaptureWithTimer = (seconds) => {
            if (countdownActive) {
                  cancelCountdown()
            }
            startCountdown(seconds)
      }

      const handleCaptureImmediate = () => {
            if (countdownActive) {
                  cancelCountdown()
            }
            performCapture()
      }

      function handleRetake() {
            if (capturedPhoto?.url) {
                  URL.revokeObjectURL(capturedPhoto.url)
            }
            setCapturedPhoto(null)
            setUploadState('idle')
            setUploadError(null)
            cancelCountdown()
      }

      async function handleUpload() {
            if (!capturedPhoto?.blob || !event?.id) return

            setUploadState('uploading')
            setUploadError(null)

            const result = await uploadPhoto({
                  blob: capturedPhoto.blob,
                  eventId: event.id,
                  guestName: guestName.trim() || 'Guest',
            })

            if (result.success) {
                  setUploadState('success')
                  if (capturedPhoto.url) {
                        URL.revokeObjectURL(capturedPhoto.url)
                  }
                  setTimeout(() => {
                        setCapturedPhoto(null)
                        setUploadState('idle')
                  }, 2000)
            } else {
                  setUploadState('error')
                  setUploadError(result.error)
            }
      }

      useEffect(() => {
            startCamera()
            return () => {
                  stopStream()
                  if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
            }
      }, [facingMode])

      useEffect(() => {
            if (capturedPhoto === null && streamRef.current === null) {
                  const timer = setTimeout(() => {
                        startCamera()
                  }, 300)
                  return () => clearTimeout(timer)
            }
      }, [capturedPhoto, startCamera])

      useEffect(() => {
            return () => {
                  if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
            }
      }, [])

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

      const theme = getTheme(event.theme)
      const c = theme.colors
      const selectedFontFamily = resolveFontFamily(event.font_family)

      if (cameraError) {
            return (
                  <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: c.bg }}>
                        <div className="max-w-sm w-full text-center">
                              <h1 className="text-2xl font-extrabold tracking-tight mb-3" style={{ color: c.text, fontFamily: selectedFontFamily }}>
                                    Camera access needed
                              </h1>
                              <p className="text-sm mb-6" style={{ color: c.textMuted }}>
                                    {cameraError}. To upload photos, tap the AA icon in Safari's address bar, choose Website Settings, and allow Camera access.
                              </p>
                              <Link to={`/${eventSlug}`} className="inline-block text-sm font-medium" style={{ color: c.accent }}>
                                    ← Back to event
                              </Link>
                        </div>
                  </div>
            )
      }

      return (
            <>
                  <FontLoader fontId={event.font_family} />
                  <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
                        {/* Top bar */}
                        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent p-4 flex items-center justify-between">
                              <Link
                                    to={`/${eventSlug}`}
                                    className="text-white text-sm font-medium bg-black/40 rounded-full px-3 py-1.5 backdrop-blur-sm"
                              >
                                    ← Back
                              </Link>
                              <p
                                    className="text-white text-sm font-medium truncate max-w-[60%]"
                                    style={{ fontFamily: selectedFontFamily }}
                              >
                                    {event.event_name}
                              </p>
                        </div>

                        {/* Live camera view */}
                        {!capturedPhoto && (
                              <>
                                    <video
                                          ref={videoRef}
                                          autoPlay
                                          playsInline
                                          muted
                                          className="w-full h-full object-cover absolute inset-0"
                                    />

                                    {/* Countdown overlay */}
                                    {countdownActive && countdownValue !== null && (
                                          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                                <div className="text-white text-8xl font-bold animate-ping">
                                                      {countdownValue}
                                                </div>
                                          </div>
                                    )}

                                    {/* Grid overlay */}
                                    {gridEnabled && cameraReady && !countdownActive && (
                                          <div className="absolute inset-0 z-10 pointer-events-none">
                                                <div className="absolute inset-0 flex">
                                                      <div className="w-1/3 h-full border-r border-white/40"></div>
                                                      <div className="w-1/3 h-full border-r border-white/40"></div>
                                                </div>
                                                <div className="absolute inset-0 flex flex-col">
                                                      <div className="h-1/3 w-full border-b border-white/40"></div>
                                                      <div className="h-1/3 w-full border-b border-white/40"></div>
                                                </div>
                                          </div>
                                    )}

                                    {needsTapToStart && (
                                          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black p-8 text-center">
                                                <p className="text-white text-base mb-2">Camera unavailable</p>
                                                <p className="text-white/70 text-sm mb-8 max-w-xs">
                                                      Make sure no other app or browser tab is using your camera, then tap below.
                                                </p>
                                                <button
                                                      onClick={startCamera}
                                                      className="font-medium rounded-full py-4 px-8 text-base text-white transition-colors"
                                                      style={{ backgroundColor: c.accent }}
                                                >
                                                      Tap to start camera
                                                </button>
                                          </div>
                                    )}

                                    {!needsTapToStart && !cameraReady && (
                                          <div className="absolute inset-0 z-10 flex items-center justify-center">
                                                <p className="text-white/70 text-sm">Starting camera...</p>
                                          </div>
                                    )}

                                    {/* Zoom slider */}
                                    {zoomSupported && cameraReady && (
                                          <div className="absolute bottom-32 left-4 right-4 z-20 bg-black/70 rounded-full px-4 py-2">
                                                <input
                                                      type="range"
                                                      min={zoomMin}
                                                      max={zoomMax}
                                                      step={0.1}
                                                      value={zoomLevel}
                                                      onChange={(e) => applyZoom(e.target.value)}
                                                      className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                                                      style={{ accentColor: c.accent }}
                                                />
                                                <div className="flex justify-between text-white/60 text-xs mt-1 px-1">
                                                      <span>1x</span>
                                                      <span>{zoomMax.toFixed(1)}x</span>
                                                </div>
                                          </div>
                                    )}

                                    {/* Bottom control area - new layout */}
                                    <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/70 pt-4 pb-8 flex flex-col items-center gap-4">
                                          {/* Row 1: Timer buttons + Grid (centered) */}
                                          <div className="flex items-center gap-3">
                                                <button
                                                      onClick={() => handleCaptureWithTimer(3)}
                                                      disabled={countdownActive}
                                                      className="px-3 py-1 rounded-full text-white text-xs bg-white/20 backdrop-blur-sm disabled:opacity-50"
                                                >
                                                      3s
                                                </button>
                                                <button
                                                      onClick={() => handleCaptureWithTimer(5)}
                                                      disabled={countdownActive}
                                                      className="px-3 py-1 rounded-full text-white text-xs bg-white/20 backdrop-blur-sm disabled:opacity-50"
                                                >
                                                      5s
                                                </button>
                                                <button
                                                      onClick={() => handleCaptureWithTimer(10)}
                                                      disabled={countdownActive}
                                                      className="px-3 py-1 rounded-full text-white text-xs bg-white/20 backdrop-blur-sm disabled:opacity-50"
                                                >
                                                      10s
                                                </button>
                                          </div>

                                          {/* Row 2: Shutter container (relative, shutter centered, flip absolutely positioned at right) */}
                                          <div className="relative w-full flex justify-center items-center">
                                                {/* Shutter button (always centered) */}
                                                {cameraReady && !countdownActive && (
                                                      <button
                                                            onClick={handleCaptureImmediate}
                                                            className="w-20 h-20 rounded-full bg-white border-4 border-white/50 active:scale-95 transition-transform shadow-lg flex items-center justify-center"
                                                            aria-label="Take photo"
                                                      >
                                                            <div className="w-16 h-16 rounded-full" style={{ backgroundColor: c.accentSoft }}></div>
                                                      </button>
                                                )}

                                                {/* Flip camera button pinned to the right edge with spacing */}
                                                <button
                                                      onClick={switchCamera}
                                                      className="absolute right-6 p-2 rounded-full bg-white/20 text-white backdrop-blur-sm active:scale-95 transition-transform"
                                                      aria-label="Switch camera"
                                                >
                                                      <RefreshCw size={20} />
                                                </button>
                                          </div>
                                    </div>
                              </>
                        )}

                        {/* Photo preview + upload section (unchanged) */}
                        {capturedPhoto && (
                              <>
                                    <img
                                          src={capturedPhoto.url}
                                          alt="Captured photo preview"
                                          className="w-full h-full object-cover absolute inset-0"
                                    />

                                    {uploadState === 'success' && (
                                          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                                <div className="bg-white rounded-2xl p-6 max-w-xs mx-4 text-center">
                                                      <div className="w-16 h-16 rounded-full bg-[#16A34A] mx-auto mb-3 flex items-center justify-center">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                      </div>
                                                      <h2 className="text-lg font-extrabold mb-1" style={{ color: c.text, fontFamily: selectedFontFamily }}>Sent to host</h2>
                                                      <p className="text-sm" style={{ color: c.textMuted }}>The host will approve it shortly.</p>
                                                </div>
                                          </div>
                                    )}

                                    {uploadState === 'uploading' && (
                                          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                                <div className="bg-white rounded-2xl p-6 max-w-xs mx-4 text-center">
                                                      <div
                                                            className="w-16 h-16 rounded-full border-4 mx-auto mb-3 animate-spin"
                                                            style={{ borderColor: c.border, borderTopColor: c.accent }}
                                                      ></div>
                                                      <p className="text-sm" style={{ color: c.textMuted }}>Uploading...</p>
                                                </div>
                                          </div>
                                    )}

                                    {(uploadState === 'idle' || uploadState === 'error') && (
                                          <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/70 pt-16 pb-10 px-4">
                                                <input
                                                      type="text"
                                                      value={guestName}
                                                      onChange={(e) => setGuestName(e.target.value)}
                                                      placeholder="Your name (optional)"
                                                      maxLength={50}
                                                      className="w-full mb-4 bg-white/20 text-white placeholder-white/60 border border-white/30 rounded-full px-5 py-3 text-sm backdrop-blur-sm focus:outline-none focus:border-white/60"
                                                />

                                                {uploadState === 'error' && (
                                                      <div
                                                            className="mb-4 text-white text-sm rounded-lg px-4 py-2 text-center"
                                                            style={{ backgroundColor: c.accent + 'E6' }}
                                                      >
                                                            Upload failed: {uploadError}. Try again?
                                                      </div>
                                                )}

                                                <div className="flex gap-3">
                                                      <button
                                                            onClick={handleRetake}
                                                            className="flex-1 bg-white/20 text-white font-medium rounded-full py-4 px-2 text-sm backdrop-blur-sm border border-white/30 active:scale-[0.98] transition-transform"
                                                      >
                                                            Retake
                                                      </button>
                                                      <button
                                                            onClick={handleUpload}
                                                            className="flex-1 text-white font-medium rounded-full py-4 px-2 text-sm active:scale-[0.98] transition-transform"
                                                            style={{ backgroundColor: c.accent }}
                                                      >
                                                            {uploadState === 'error' ? 'Try again' : 'Upload'}
                                                      </button>
                                                </div>
                                          </div>
                                    )}
                              </>
                        )}

                        <canvas ref={canvasRef} className="hidden" />
                  </div>
            </>
      )
}
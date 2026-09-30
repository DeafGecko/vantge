import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import { uploadPhoto } from '../lib/uploadPhoto'
import { getTheme } from '../lib/themes'
import { resolveFontFamily } from '../lib/fonts'
import FontLoader from '../components/FontLoader'

// The camera interface for guests to capture and upload photos/videos.
export default function GuestCamera() {
      const { eventSlug } = useParams()
      const navigate = useNavigate()
      const { event, loading: eventLoading } = useEvent(eventSlug)

      // Refs for media elements and stream
      const videoRef = useRef(null)
      const canvasRef = useRef(null)
      const streamRef = useRef(null)
      const galleryInputRef = useRef(null)

      // Camera and media state
      const [cameraError, setCameraError] = useState(null)
      const [cameraReady, setCameraReady] = useState(false)
      const [needsTapToStart, setNeedsTapToStart] = useState(false)
      const [capturedPhoto, setCapturedPhoto] = useState(null)
      const [uploadState, setUploadState] = useState('idle')
      const [uploadError, setUploadError] = useState(null)
      const [guestName, setGuestName] = useState('')

      // UI state
      const [mode, setMode] = useState('photo')
      const [zoom, setZoom] = useState(1)
      const [showGrid, setShowGrid] = useState(false)
      const [facingMode, setFacingMode] = useState('environment')

      // ── Media recording state (video mode) ────────────────────────────
      const mediaRecorderRef = useRef(null)
      const recordedChunksRef = useRef([])
      const [isRecording, setIsRecording] = useState(false)

      // Stop and clean up the media stream
      const stopStream = useCallback(() => {
            if (streamRef.current) {
                  streamRef.current.getTracks().forEach((track) => track.stop())
                  streamRef.current = null
            }
            if (videoRef.current) {
                  videoRef.current.srcObject = null
            }
      }, [])

      //Camera setup and teardown ───────────────────────────────────────────
      const startCamera = useCallback(async () => {
            stopStream()
            setCameraReady(false)
            setCameraError(null)

            try {
                  const stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                              facingMode: facingMode,
                              width: { ideal: 1920 },
                              height: { ideal: 1080 },
                        },
                        audio: mode === 'video',
                  })

                  streamRef.current = stream

                  if (videoRef.current) {
                        videoRef.current.srcObject = stream
                        videoRef.current.onloadedmetadata = () => {
                              videoRef.current?.play().catch(() => { })
                              setCameraReady(true)
                              setNeedsTapToStart(false)
                        }
                  }
            } catch (err) {
                  if (err.name === 'NotAllowedError' || err.name === 'NotReadableError') {
                        setNeedsTapToStart(true)
                  } else {
                        setCameraError(err.message || 'Could not access camera')
                  }
            }
      }, [stopStream, facingMode, mode])

      // Start camera on mount, and clean up on unmount
      useEffect(() => {
            startCamera()
            return () => stopStream()
      }, [startCamera, stopStream])

      // ── Photo capture ──────────────────────────────────────────────────
      function handleCapturePhoto() {
            const video = videoRef.current
            const canvas = canvasRef.current
            if (!video || !canvas) return

            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            canvas.toBlob((blob) => {
                  if (blob) {
                        const url = URL.createObjectURL(blob)
                        setCapturedPhoto({ blob, url, type: 'photo' })
                        setUploadState('idle')
                        setUploadError(null)
                        stopStream()
                  }
            }, 'image/jpeg', 0.92)
      }

      // ── Video recording ────────────────────────────────────────────────
      function handleStartRecording() {
            if (!streamRef.current) return
            recordedChunksRef.current = []

            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                  ? 'video/webm;codecs=vp9'
                  : 'video/webm'

            const recorder = new MediaRecorder(streamRef.current, { mimeType })
            mediaRecorderRef.current = recorder

            recorder.ondataavailable = (e) => {
                  if (e.data.size > 0) recordedChunksRef.current.push(e.data)
            }

            recorder.onstop = () => {
                  const blob = new Blob(recordedChunksRef.current, { type: mimeType })
                  const url = URL.createObjectURL(blob)
                  setCapturedPhoto({ blob, url, type: 'video' })
                  setUploadState('idle')
                  setUploadError(null)
                  stopStream()
            }

            recorder.start()
            setIsRecording(true)
      }

      function handleStopRecording() {
            mediaRecorderRef.current?.stop()
            setIsRecording(false)
      }

      // ── Unified shutter button handler ────────────────────────────────
      function handleShutter() {
            if (mode === 'photo') {
                  handleCapturePhoto()
            } else {
                  if (isRecording) {
                        handleStopRecording()
                  } else {
                        handleStartRecording()
                  }
            }
      }

      // Gallery / file picker ─────────────────────────────────────────
      function handleGalleryPick(e) {
            const file = e.target.files?.[0]
            if (!file) return

            const url = URL.createObjectURL(file)
            const isVideo = file.type.startsWith('video/')
            setCapturedPhoto({ blob: file, url, type: isVideo ? 'video' : 'photo' })
            setUploadState('idle')
            setUploadError(null)
            stopStream()
            e.target.value = ''
      }

      // Upload ────────────────────────────────────────────────────────
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
                  if (capturedPhoto.url) URL.revokeObjectURL(capturedPhoto.url)
            } else {
                  setUploadState('error')
                  setUploadError(result.error)
            }
      }

      if (eventLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>

      if (!event) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Event not found.</div>

      const theme = getTheme(event.theme)
      const c = theme.colors
      const selectedFontFamily = resolveFontFamily(event.font_family)

      return (
            <>
                  <FontLoader fontId={event.font_family} />
                  <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">


                        {/* Top bar with back button, event name, and controls ___________________________________________________*/}
                        <div className="absolute top-0 left-0 right-0 z-30 p-6 flex items-center justify-between pointer-events-none">

                              {/* Back → event gateway (/:eventSlug) */}
                              <button
                                    onClick={() => navigate(`/${eventSlug}`)}
                                    className="pointer-events-auto w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full text-white"
                              >
                                    <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
                              </button>

                              {/* Event name in the center */}
                              <div className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                                    <p className="text-white text-sm font-medium" style={{ fontFamily: selectedFontFamily }}>
                                          {event.event_name}
                                    </p>
                              </div>


                              {/* Right-side controls: flash, grid toggle */}
                              <div className="flex gap-3 pointer-events-auto">
                                    {/* Flash toggle (placeholder, as browser APIs don't support controlling flash) */}
                                    <button className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full text-white">
                                          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                    </button>

                                    {/* Grid toggle */}
                                    <button
                                          onClick={() => setShowGrid(!showGrid)}
                                          className={`w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full ${showGrid ? 'text-red-500' : 'text-white'}`}
                                    >
                                          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg>
                                    </button>
                              </div>
                        </div>

                        {/* ── Live viewfinder ──────────────────────────────────────── */}
                        {!capturedPhoto && (
                              <>
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover absolute inset-0" />

                                    {showGrid && (
                                          <div className="absolute inset-0 z-10 pointer-events-none grid grid-cols-3 grid-rows-3">
                                                {[...Array(9)].map((_, i) => (
                                                      <div key={i} className="border-[0.5px] border-white/10"></div>
                                                ))}
                                          </div>
                                    )}

                                    {/* Zoom — numbers left, slider bar right */}
                                    <div className="absolute right-4 top-1/2  -translate-y-1/2 z-20 flex flex-row items-center gap-2">
                                          <div className="flex flex-col items-end mr-4 gap-9">
                                                {[2, 1.5, 1, 0.5].map((level) => (
                                                      <button
                                                            key={level}
                                                            onClick={() => setZoom(level)}
                                                            className={`text-xs font-bold w-8 text-right transition-all ${zoom === level ? 'text-red-500 scale-125' : 'text-white/60'}`}
                                                      >
                                                            {level.toFixed(1)}
                                                      </button>
                                                ))}
                                          </div>
                                          {}
                                          <div className="w-2 h-52 mr-6 bg-black/50 rounded-full relative overflow-hidden">
                                                <div
                                                      className="absolute w-full bg-red-500 rounded-full transition-all duration-300"
                                                      style={{
                                                            height: '25%',
                                                            top: zoom === 2 ? '0%' : zoom === 1.5 ? '25%' : zoom === 1 ? '50%' : '75%'
                                                      }}
                                                />
                                          </div>
                                    </div>

                                    {/* ── Bottom controls ──────────────────────────────────── */}
                                    <div className="absolute bottom-10 left-0 right-0 z-20 flex flex-col items-center gap-8">
                                          <button
                                                onClick={handleShutter}
                                                className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center"
                                          >
                                                <div className={`w-20 h-20 rounded-full shadow-xl transition-all ${mode === 'video'
                                                      ? isRecording ? 'bg-red-600 animate-pulse scale-90' : 'bg-red-600'
                                                      : 'bg-white'
                                                      }`} />
                                          </button>

                                          <div className="flex items-center bg-black/40 backdrop-blur-xl rounded-full p-1 border border-white/10">
                                                <button
                                                      onClick={() => { setMode('photo'); setIsRecording(false) }}
                                                      className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${mode === 'photo' ? 'bg-red-600 text-white' : 'text-white/60'}`}
                                                >
                                                      PHOTO
                                                </button>
                                                <button
                                                      onClick={() => { setMode('video'); setIsRecording(false) }}
                                                      className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${mode === 'video' ? 'bg-red-600 text-white' : 'text-white/60'}`}
                                                >
                                                      VIDEO
                                                </button>
                                          </div>
                                    </div>

                                    {/* Bottom-left: gallery picker */}
                                    <div className="absolute bottom-10 left-8 z-20">
                                          <input
                                                ref={galleryInputRef}
                                                type="file"
                                                accept="image/*,video/*"
                                                className="hidden"
                                                onChange={handleGalleryPick}
                                          />
                                          <button
                                                onClick={() => galleryInputRef.current?.click()}
                                                className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/10"
                                                aria-label="Open photo gallery"
                                          >
                                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                      <rect x="3" y="3" width="18" height="18" rx="2" />
                                                      <circle cx="8.5" cy="8.5" r="1.5" />
                                                      <path d="M21 15l-5-5L5 21" />
                                                </svg>
                                          </button>
                                    </div>

                                    {/* Bottom-right: flip camera */}
                                    <div className="absolute bottom-10 right-8 z-20">
                                          <button
                                                onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
                                                className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10"
                                                aria-label="Flip camera"
                                          >
                                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
                                          </button>
                                    </div>
                              </>
                        )}

                        {/* ── Preview / upload screen ──────────────────────────────── */}
                        {capturedPhoto && (
                              <div className="absolute inset-0 z-40 bg-black flex flex-col">

                                    {/* Success screen */}
                                    {uploadState === 'success' ? (
                                          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
                                                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: c?.accent }}>
                                                      <svg width="36" height="36" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                                                </div>
                                                <div>
                                                      <p className="text-white text-2xl font-bold mb-2">Photo sent!</p>
                                                      <p className="text-white/60 text-sm">The host will review and add it to the gallery.</p>
                                                </div>
                                                <div className="flex flex-col gap-3 w-full max-w-xs">
                                                      <button
                                                            onClick={() => { setCapturedPhoto(null); setUploadState('idle'); startCamera() }}
                                                            className="w-full py-4 text-white rounded-full font-bold"
                                                            style={{ backgroundColor: c?.accent }}
                                                      >
                                                            Take Another Photo
                                                      </button>
                                                      <button
                                                            onClick={() => navigate(`/${eventSlug}`)}
                                                            className="w-full py-4 bg-white/10 text-white rounded-full font-bold"
                                                      >
                                                            Back to Event
                                                      </button>
                                                </div>
                                          </div>
                                    ) : (
                                          <>
                                                {/* Photo/video preview — leaves room for bottom panel */}
                                                <div className="flex-1 relative overflow-hidden">
                                                      {capturedPhoto.type === 'video' ? (
                                                            <video
                                                                  src={capturedPhoto.url}
                                                                  className="w-full h-full object-cover"
                                                                  controls
                                                                  autoPlay
                                                                  loop
                                                                  playsInline
                                                            />
                                                      ) : (
                                                            <img src={capturedPhoto.url} className="w-full h-full object-cover" alt="Preview" />
                                                      )}
                                                </div>

                                                {/* Bottom panel — pinned above iOS browser bar */}
                                                <div className="shrink-0 bg-black px-6 pt-5 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
                                                      <input
                                                            type="text"
                                                            value={guestName}
                                                            onChange={(e) => setGuestName(e.target.value)}
                                                            placeholder="Your name (optional)"
                                                            className="w-full mb-4 bg-white/10 text-white rounded-full px-6 py-4 border border-white/20 outline-none text-base"
                                                      />
                                                      {uploadError && (
                                                            <p className="text-red-400 text-sm text-center mb-3">{uploadError}</p>
                                                      )}
                                                      <div className="flex gap-3">
                                                            <button
                                                                  onClick={() => { setCapturedPhoto(null); startCamera() }}
                                                                  className="flex-1 py-4 bg-white/10 text-white rounded-full font-bold text-sm"
                                                            >
                                                                  Retake
                                                            </button>
                                                            <button
                                                                  onClick={handleUpload}
                                                                  disabled={uploadState === 'uploading'}
                                                                  className="flex-1 py-4 text-white rounded-full font-bold text-sm disabled:opacity-60"
                                                                  style={{ backgroundColor: c?.accent }}
                                                            >
                                                                  {uploadState === 'uploading'
                                                                        ? 'Sending…'
                                                                        : capturedPhoto.type === 'video'
                                                                              ? 'Use Video'
                                                                              : 'Use Photo'}
                                                            </button>
                                                      </div>
                                                </div>
                                          </>
                                    )}
                              </div>
                        )}

                        <canvas ref={canvasRef} className="hidden" />
                  </div>
            </>
      )
}
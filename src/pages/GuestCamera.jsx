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
      const [showGrid, setShowGrid] = useState(false)
      const [facingMode, setFacingMode] = useState('environment')

      // ── Media recording state (video mode) ────────────────────────────
      const mediaRecorderRef = useRef(null)
      const recordedChunksRef = useRef([])
      const [isRecording, setIsRecording] = useState(false)
      const [recordingSeconds, setRecordingSeconds] = useState(0)
      const recordingTimerRef = useRef(null)
      const VIDEO_LIMIT = 30

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
            setRecordingSeconds(0)

            // Auto-stop at VIDEO_LIMIT seconds
            recordingTimerRef.current = setInterval(() => {
                  setRecordingSeconds((s) => {
                        const next = s + 1
                        if (next >= VIDEO_LIMIT) {
                              handleStopRecording()
                        }
                        return next
                  })
            }, 1000)
      }

      function handleStopRecording() {
            mediaRecorderRef.current?.stop()
            setIsRecording(false)
            setRecordingSeconds(0)
            clearInterval(recordingTimerRef.current)
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
      async function handleGalleryPick(e) {
            const file = e.target.files?.[0]
            if (!file) return
            e.target.value = ''

            const isVideo = file.type.startsWith('video/')

            if (isVideo) {
                  const duration = await new Promise((resolve) => {
                        const url = URL.createObjectURL(file)
                        const vid = document.createElement('video')
                        vid.preload = 'metadata'
                        vid.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(vid.duration) }
                        vid.onerror = () => { URL.revokeObjectURL(url); resolve(0) }
                        vid.src = url
                  })

                  if (duration > 30) {
                        setUploadError(`Sorry, unable to upload — this video is ${Math.round(duration)} seconds. Videos must be 30 seconds or less.`)
                        return
                  }
            }

            const url = URL.createObjectURL(file)
            setCapturedPhoto({ blob: file, url, type: isVideo ? 'video' : 'photo' })
            setUploadState('idle')
            setUploadError(null)
            stopStream()
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
                  is_video: capturedPhoto.type === 'video',
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
                                    aria-label="Back to event"
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
                                    <button aria-label="Toggle flash" className="w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full text-white">
                                          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                    </button>

                                    {/* Grid toggle */}
                                    <button
                                          onClick={() => setShowGrid(!showGrid)}
                                          aria-label={showGrid ? 'Hide grid overlay' : 'Show grid overlay'}
                                          aria-pressed={showGrid}
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

                                    {/* Recording timer */}
                                    {isRecording && (
                                          <div className="absolute top-20 left-0 right-0 z-20 flex justify-center pointer-events-none">
                                                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2">
                                                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                      <span className="text-white text-sm font-bold tabular-nums">
                                                            {recordingSeconds}s / {VIDEO_LIMIT}s
                                                      </span>
                                                </div>
                                          </div>
                                    )}

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

                        {/* Video-too-long error banner (shown on camera screen, before capturedPhoto is set) */}
                        {uploadError && !capturedPhoto && (
                              <div className="absolute bottom-44 left-4 right-4 z-30 bg-black/75 border border-red-500/50 text-red-300 text-sm font-medium rounded-2xl px-4 py-3 text-center">
                                    {uploadError}
                              </div>
                        )}

                        {/* ── Preview / upload screen ──────────────────────────────── */}
                        {capturedPhoto && (
                              <div className="absolute inset-0 z-40 bg-black flex flex-col">

                                    {/* Success screen */}
                                    {uploadState === 'success' ? (
                                          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
                                                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-1" style={{ backgroundColor: c?.accent }}>
                                                      <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                                                </div>
                                                <div>
                                                      <p className="text-white text-2xl font-extrabold mb-1">
                                                            {capturedPhoto.type === 'video' ? 'Video sent!' : 'Photo sent!'}
                                                      </p>
                                                      <p className="text-white/50 text-sm">The host will review and add it to the gallery.</p>
                                                </div>
                                                <div className="flex flex-col gap-2.5 w-full max-w-xs mt-2">
                                                      <button
                                                            onClick={() => { setCapturedPhoto(null); setUploadState('idle'); startCamera() }}
                                                            className="w-full py-3.5 text-white rounded-2xl font-bold text-sm"
                                                            style={{ backgroundColor: c?.accent }}
                                                      >
                                                            Take Another
                                                      </button>
                                                      <button
                                                            onClick={() => navigate(`/${eventSlug}`)}
                                                            className="w-full py-3.5 text-white/70 rounded-2xl font-bold text-sm border border-white/15"
                                                            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                                                      >
                                                            Back to Event
                                                      </button>
                                                </div>
                                          </div>
                                    ) : (
                                          <>
                                                {/* Photo/video preview */}
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

                                                      {/* Media type badge */}
                                                      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/50 rounded-full px-3 py-1">
                                                            {capturedPhoto.type === 'video' ? (
                                                                  <>
                                                                        <svg width="11" height="11" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                                        <span className="text-white text-[10px] font-bold uppercase tracking-widest">Video</span>
                                                                  </>
                                                            ) : (
                                                                  <>
                                                                        <svg width="11" height="11" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                                                                        <span className="text-white text-[10px] font-bold uppercase tracking-widest">Photo</span>
                                                                  </>
                                                            )}
                                                      </div>
                                                </div>

                                                {/* Bottom panel */}
                                                <div
                                                      className="shrink-0 px-5 pt-5"
                                                      style={{ paddingBottom: 'max(1.75rem, env(safe-area-inset-bottom))', backgroundColor: '#0a0a0a' }}
                                                >
                                                      {/* Name input */}
                                                      <div className="mb-3">
                                                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1.5">Your name</p>
                                                            <input
                                                                  type="text"
                                                                  value={guestName}
                                                                  onChange={(e) => setGuestName(e.target.value)}
                                                                  placeholder="Optional — so the host knows it's from you"
                                                                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-white/30 transition-colors"
                                                                  style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                                                            />
                                                      </div>

                                                      {uploadError && (
                                                            <p className="text-red-400 text-xs text-center mb-3">{uploadError}</p>
                                                      )}

                                                      {/* Action buttons */}
                                                      <div className="flex gap-2.5">
                                                            <button
                                                                  onClick={() => { setCapturedPhoto(null); startCamera() }}
                                                                  className="flex-none px-5 py-3.5 text-white/70 rounded-xl font-bold text-sm border border-white/15 transition-all"
                                                                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                                                            >
                                                                  Retake
                                                            </button>
                                                            <button
                                                                  onClick={handleUpload}
                                                                  disabled={uploadState === 'uploading'}
                                                                  className="flex-1 py-3.5 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                                                  style={{ backgroundColor: c?.accent }}
                                                            >
                                                                  {uploadState === 'uploading' ? (
                                                                        <>
                                                                              <svg className="animate-spin" width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/></svg>
                                                                              Sending…
                                                                        </>
                                                                  ) : capturedPhoto.type === 'video' ? (
                                                                        <>
                                                                              <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                                              Send Video
                                                                        </>
                                                                  ) : (
                                                                        <>
                                                                              <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                                              Send Photo
                                                                        </>
                                                                  )}
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
import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../hooks/useAuth'
import { useHostEvent } from '../hooks/useHostEvent'
import { supabase } from '../lib/supabase'
import ApprovalQueue from '../components/ApprovalQueue'

export default function HostDashboard() {
      const { user, signOut } = useAuth()
      const { event, loading: eventLoading } = useHostEvent()
      const [toggling, setToggling] = useState(false)
      const [localUnlocked, setLocalUnlocked] = useState(null)
      const [showQR, setShowQR] = useState(false)

      const isUnlocked = localUnlocked !== null ? localUnlocked : event?.gallery_unlocked

      async function toggleGallery() {
            if (!event) return
            setToggling(true)
            const newValue = !isUnlocked
            setLocalUnlocked(newValue)
            const { error } = await supabase
                  .from('events')
                  .update({ gallery_unlocked: newValue })
                  .eq('id', event.id)
            if (error) {
                  setLocalUnlocked(!newValue)
                  alert("Couldn't update gallery: " + error.message)
            }
            setToggling(false)
      }

      if (eventLoading) {
            return (
                  <div className="min-h-screen bg-cream p-6">
                        <p className="text-sm text-[#5A5A52]">Loading event...</p>
                  </div>
            )
      }

      if (!event) {
            return (
                  <div className="min-h-screen bg-cream p-6">
                        <div className="max-w-5xl mx-auto">
                              <div className="bg-white rounded-2xl border border-[#E0D8C6] p-6">
                                    <p className="text-sm text-[#5A5A52]">No event found for this account.</p>
                              </div>
                        </div>
                  </div>
            )
      }

      return (
            <div className="min-h-screen bg-cream p-6">
                  <div className="max-w-5xl mx-auto">
                        <header className="flex items-center justify-between mb-8">
                              <div>
                                    <h1 className="text-2xl font-extrabold tracking-tight text-[#1A1A18]">vantge</h1>
                                    <p className="text-xs text-[#88887E] tracking-wide uppercase mt-0.5">Host dashboard</p>
                              </div>
                              <button onClick={signOut} className="text-sm text-[#5A5A52] hover:text-[#C84A44] font-medium transition-colors">
                                    Sign out
                              </button>
                        </header>

                        <div className="bg-white rounded-2xl border border-[#E0D8C6] p-5 mb-6">
                              <div className="flex items-baseline justify-between mb-2">
                                    <h2 className="text-xl font-extrabold text-[#1A1A18]">{event.event_name}</h2>
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A5A52]">
                                          <span className={"w-2 h-2 rounded-full " + (isUnlocked ? "bg-[#16A34A]" : "bg-[#88887E]")}></span>
                                          Gallery {isUnlocked ? "open" : "locked"}
                                    </span>
                              </div>
                              <p className="text-xs text-[#88887E] mb-4">
                                    /{event.event_slug} · Signed in as {user?.email}
                              </p>

                              <button
                                    onClick={toggleGallery}
                                    disabled={toggling}
                                    className={"inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 " + (isUnlocked ? "bg-[#F4F3F0] hover:bg-[#E8E5DC] text-[#5A5A52] border border-[#E0D8C6]" : "bg-[#C84A44] hover:bg-[#B43E39] text-white")}
                              >
                                    {toggling ? "Updating..." : isUnlocked ? "Lock gallery" : "Open gallery to guests"}
                              </button>

                              {isUnlocked ? (
                                    <p className="text-xs text-[#88887E] mt-3">
                                          Guests can see photos at /gallery/{event.event_slug}
                                    </p>
                              ) : null}

                              <button
                                    onClick={() => setShowQR(!showQR)}
                                    className="block mt-4 text-sm text-[#C84A44] hover:underline font-medium"
                              >
                                    {showQR ? "Hide QR code" : "Show QR code for guests"}
                              </button>

                              {showQR ? (
                                    <QRCodeSection eventSlug={event.event_slug} eventName={event.event_name} />
                              ) : null}
                        </div>

                        <ApprovalQueue eventId={event.id} />
                  </div>
            </div>
      )
}

function QRCodeSection({ eventSlug, eventName }) {
      const qrRef = useRef(null)

      // Build the URL guests will land on when they scan
      // In production, this will use your actual domain
      const guestUrl = `${window.location.origin}/${eventSlug}`

      function downloadQR() {
            const svg = qrRef.current?.querySelector('svg')
            if (!svg) return

            // Convert SVG to downloadable PNG
            const svgData = new XMLSerializer().serializeToString(svg)
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            const img = new Image()

            img.onload = () => {
                  // Create a high-res canvas for print quality
                  canvas.width = 800
                  canvas.height = 800
                  ctx.fillStyle = '#FFFFFF'
                  ctx.fillRect(0, 0, 800, 800)
                  ctx.drawImage(img, 100, 100, 600, 600)

                  canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${eventSlug}-qr-code.png`
                        a.click()
                        URL.revokeObjectURL(url)
                  })
            }

            img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
      }

      return (
            <div className="mt-5 pt-5 border-t border-[#E0D8C6]">
                  <div className="flex flex-col sm:flex-row gap-5 items-start">

                        {/* QR code */}
                        <div ref={qrRef} className="bg-white p-4 rounded-xl border border-[#E0D8C6] flex-shrink-0">
                              <QRCodeSVG
                                    value={guestUrl}
                                    size={180}
                                    level="M"
                                    marginSize={0}
                                    fgColor="#1A1A18"
                                    bgColor="#FFFFFF"
                              />
                        </div>

                        {/* Info + download */}
                        <div className="flex-1">
                              <p className="text-xs text-[#88887E] tracking-wide uppercase mb-1">
                                    Scan to join
                              </p>
                              <h3 className="text-lg font-extrabold text-[#1A1A18] mb-2">
                                    {eventName}
                              </h3>
                              <p className="text-xs text-[#5A5A52] mb-4 break-all">
                                    {guestUrl}
                              </p>

                              <button
                                    onClick={downloadQR}
                                    className="inline-flex items-center gap-2 bg-[#1A1A18] hover:bg-[#333333] text-white text-sm font-medium rounded-full px-5 py-2.5 transition-colors"
                              >
                                    Download PNG
                              </button>

                              <p className="text-xs text-[#88887E] mt-3">
                                    Print and display at the event. Guests scan with their phone camera to join.
                              </p>
                        </div>
                  </div>
            </div>
      )
}
import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../hooks/useAuth'
import { useHostEvent } from '../hooks/useHostEvent'
import { supabase } from '../lib/supabase'
import PhotoManager from '../components/PhotoManager'
import { getAllThemes, getTheme } from '../lib/themes'

export default function HostDashboard() {
      const { user, signOut } = useAuth()
      const { event, loading: eventLoading } = useHostEvent()
      const [toggling, setToggling] = useState(false)
      const [localUnlocked, setLocalUnlocked] = useState(null)
      const [showQR, setShowQR] = useState(false)
      const [activeTab, setActiveTab] = useState(0)
      const [localTheme, setLocalTheme] = useState(null)
      const [savingTheme, setSavingTheme] = useState(false)

      const isUnlocked = localUnlocked !== null ? localUnlocked : event?.gallery_unlocked
      const currentThemeId = localTheme || event?.theme || 'warm_editorial'
      const currentTheme = getTheme(currentThemeId)

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

      async function handleThemeChange(themeId) {
            if (!event || themeId === currentThemeId) return

            const previousTheme = currentThemeId
            setLocalTheme(themeId)
            setSavingTheme(true)

            const { error } = await supabase
                  .from('events')
                  .update({ theme: themeId })
                  .eq('id', event.id)

            if (error) {
                  setLocalTheme(previousTheme)
                  alert("Couldn't save theme: " + error.message)
            }
            setSavingTheme(false)
      }

      if (eventLoading) {
            return (
                  <div className="min-h-screen bg-cream p-6 text-center">
                        <p className="text-sm text-[#5A5A52]">Loading event...</p>
                  </div>
            )
      }

      if (!event) {
            return (
                  <div className="min-h-screen bg-cream p-6">
                        <div className="max-w-6xl mx-auto text-center">
                              <p className="text-sm text-[#5A5A52]">No event found for this account.</p>
                        </div>
                  </div>
            )
      }

      return (
            <div className="min-h-screen bg-cream px-6 py-8">
                  <div className="max-w-6xl mx-auto">

                        {/* THE NEW INTEGRATED HEADER */}
                        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-8 border-b border-[#E0D8C6]">
                              <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3">
                                          <h1 className="text-2xl font-black tracking-tighter text-[#1A1A18]">vantge</h1>
                                          <span className="w-[1px] h-4 bg-[#E0D8C6]"></span>
                                          <div className="flex items-center gap-2">
                                                <h2 className="text-lg font-bold text-[#1A1A18] leading-tight">{event.event_name}</h2>
                                                <span className={"w-2 h-2 rounded-full " + (isUnlocked ? "bg-[#16A34A]" : "bg-[#88887E]")} title={isUnlocked ? "Gallery Open" : "Gallery Locked"}></span>
                                          </div>
                                    </div>
                                    <p className="text-xs text-[#88887E] font-medium tracking-wide">
                                          /{event.event_slug} · {user?.email}
                                    </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-4">
                                    <button
                                          onClick={() => setShowQR(!showQR)}
                                          className="text-sm font-bold text-[#C84A44] hover:text-[#B43E39] transition-colors"
                                    >
                                          {showQR ? "Hide QR code" : "Show QR code"}
                                    </button>

                                    <button
                                          onClick={toggleGallery}
                                          disabled={toggling}
                                          className={"px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 " +
                                                (isUnlocked
                                                      ? "bg-transparent border border-[#E0D8C6] text-[#5A5A52] hover:bg-[#F4F3F0]"
                                                      : "bg-[#1A1A18] text-white hover:bg-[#333333]")}
                                    >
                                          {toggling ? "..." : isUnlocked ? "Lock Gallery" : "Open Gallery"}
                                    </button>

                                    <button onClick={signOut} className="text-xs font-bold text-[#88887E] hover:text-[#1A1A18] uppercase tracking-widest transition-colors ml-2">
                                          Sign out
                                    </button>
                              </div>
                        </header>

                        {/* QR Code Expansion Section */}
                        {showQR && (
                              <div className="mb-12">
                                    <QRCodeSection eventSlug={event.event_slug} eventName={event.event_name} />
                              </div>
                        )}

                        {/* Theme Picker Section */}
                        <div className="mb-12">
                              <div className="flex items-baseline justify-between mb-4">
                                    <div>
                                          <h3 className="text-lg font-bold text-[#1A1A18]">Gallery Theme</h3>
                                          <p className="text-xs text-[#88887E]">Pick colors that match the wedding. Changes apply to the event page and gallery guests see.</p>
                                    </div>
                                    {savingTheme && <span className="text-[10px] font-bold text-[#C84A44] uppercase tracking-widest">Saving...</span>}
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    <div className="lg:col-span-5">
                                          <ThemePreview theme={currentTheme} eventName={event.event_name} />
                                    </div>
                                    <div className="lg:col-span-7">
                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {getAllThemes().map((theme) => (
                                                      <ThemeOption
                                                            key={theme.id}
                                                            theme={theme}
                                                            isActive={theme.id === currentThemeId}
                                                            onClick={() => handleThemeChange(theme.id)}
                                                      />
                                                ))}
                                          </div>
                                    </div>
                              </div>
                        </div>

                        {/* Tab navigation */}
                        <div className="mb-8 flex justify-center border-b border-[#E0D8C6] pb-2">
                              <div className="flex gap-8">
                                    <SimpleTab label="Pending" count={null} isActive={activeTab === 0} onClick={() => setActiveTab(0)} />
                                    <SimpleTab label="Live Gallery" count={null} isActive={activeTab === 1} onClick={() => setActiveTab(1)} />
                                    <SimpleTab label="Trash" count={null} isActive={activeTab === 2} onClick={() => setActiveTab(2)} />
                              </div>
                        </div>

                        <PhotoManager key={activeTab} eventId={event.id} status={activeTab} />
                  </div>
            </div>
      )
}

/* REFACTORED SUB-COMPONENTS FOR MINIMALISM */

function SimpleTab({ label, isActive, onClick }) {
      return (
            <button
                  onClick={onClick}
                  className={"pb-2 text-sm font-bold transition-all relative " +
                        (isActive ? "text-[#1A1A18]" : "text-[#88887E] hover:text-[#5A5A52]")}
            >
                  {label}
                  {isActive && <div className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-[#1A1A18]"></div>}
            </button>
      )
}

function ThemeOption({ theme, isActive, onClick }) {
      const { colors } = theme
      return (
            <button
                  onClick={onClick}
                  className={"text-left p-4 rounded-xl border transition-all " +
                        (isActive ? "border-[#1A1A18] bg-[#F4F3F0] ring-1 ring-[#1A1A18]" : "border-[#E0D8C6] hover:border-[#88887E] bg-white")}
            >
                  <div className="flex gap-1 mb-3">
                        <span className="w-4 h-4 rounded-full border border-black/5" style={{ backgroundColor: colors.accent }} />
                        <span className="w-4 h-4 rounded-full border border-black/5" style={{ backgroundColor: colors.bg }} />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-tight text-[#1A1A18]">{theme.name}</p>
                  <p className="text-[10px] text-[#88887E]">{theme.vibe}</p>
            </button>
      )
}

function ThemePreview({ theme, eventName }) {
      const { colors } = theme
      return (
            <div className="rounded-2xl border p-10 text-center transition-all duration-500"
                  style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                  <h3 className="text-xl font-black tracking-tighter mb-6" style={{ color: colors.text }}>
                        {eventName}
                  </h3>
                  <div className="flex gap-2 justify-center">
                        <span className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white rounded-full"
                              style={{ backgroundColor: colors.accent }}>Take Photo</span>
                        <span className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest border rounded-full"
                              style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}>Gallery</span>
                  </div>
            </div>
      )
}

function QRCodeSection({ eventSlug, eventName }) {
      const qrRef = useRef(null)
      const guestUrl = `${window.location.origin}/${eventSlug}`

      function downloadQR() {
            const svg = qrRef.current?.querySelector('svg')
            if (!svg) return
            const svgData = new XMLSerializer().serializeToString(svg)
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            const img = new Image()
            img.onload = () => {
                  canvas.width = 800; canvas.height = 800
                  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 800, 800)
                  ctx.drawImage(img, 100, 100, 600, 600)
                  canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url; a.download = `${eventSlug}-qr-code.png`; a.click()
                        URL.revokeObjectURL(url)
                  })
            }
            img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
      }

      return (
            <div className="bg-white rounded-2xl border border-[#E0D8C6] p-6 flex flex-col md:flex-row gap-8 items-center">
                  <div ref={qrRef} className="bg-white p-4 rounded-xl border border-[#E0D8C6]">
                        <QRCodeSVG value={guestUrl} size={150} level="M" fgColor="#1A1A18" />
                  </div>
                  <div className="text-center md:text-left">
                        <p className="text-[10px] font-bold text-[#88887E] uppercase tracking-widest mb-1">Guest Access</p>
                        <h3 className="text-lg font-bold text-[#1A1A18] mb-1">{eventName}</h3>
                        <p className="text-xs text-[#5A5A52] mb-5">{guestUrl}</p>
                        <button onClick={downloadQR} className="bg-[#1A1A18] text-white text-[10px] font-bold uppercase tracking-widest rounded-full px-8 py-3 hover:bg-[#333333] transition-colors">
                              Download PNG for Print
                        </button>
                  </div>
            </div>
      )
}
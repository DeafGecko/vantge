import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../hooks/useAuth'
import { useHostEvent } from '../hooks/useHostEvent'
import { supabase } from '../lib/supabase'
import PhotoManager from '../components/PhotoManager'
import { getAllThemes, getTheme } from '../lib/themes'
import { getAllFonts, getFontsByCategory, getFont, DEFAULT_FONT_ID } from '../lib/fonts'

const fontCategories = getFontsByCategory()
const categoryLabels = {
      elegant: 'Elegant & Script',
      modern: 'Modern & Clean',
      display: 'Display & Tech',
}

export default function HostDashboard() {
      const { user, signOut } = useAuth()
      const { event, loading: eventLoading } = useHostEvent()
      const [toggling, setToggling] = useState(false)
      const [localUnlocked, setLocalUnlocked] = useState(null)
      const [showQR, setShowQR] = useState(false)
      const [activeTab, setActiveTab] = useState(0)
      const [localTheme, setLocalTheme] = useState(null)
      const [localFont, setLocalFont] = useState(null)
      const [savingSettings, setSavingSettings] = useState(false)

      const isUnlocked = localUnlocked !== null ? localUnlocked : event?.gallery_unlocked
      const currentThemeId = localTheme || event?.theme || 'warm_editorial'
      const currentTheme = getTheme(currentThemeId)

      const currentFontId = localFont || event?.font_family || DEFAULT_FONT_ID
      const currentFont = getFont(currentFontId)

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

      async function updateEventSettings(updates) {
            if (!event) return
            setSavingSettings(true)

            const { error } = await supabase
                  .from('events')
                  .update(updates)
                  .eq('id', event.id)

            if (error) {
                  alert("Error saving settings: " + error.message)
            }
            setSavingSettings(false)
      }

      if (eventLoading) return <div className="min-h-screen bg-cream p-6 text-center">Loading...</div>

      if (!event) {
            return (
                  <div className="min-h-screen bg-cream p-6 text-center">
                        <p className="text-sm text-[#5A5A52]">No event found.</p>
                  </div>
            )
      }

      return (
            <div className="min-h-screen bg-cream px-6 py-8">
                  <div className="max-w-6xl mx-auto">

                        {/* INTEGRATED HEADER */}
                        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-8 border-b border-[#E0D8C6]">
                              <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3">
                                          <h1 className="text-2xl font-black tracking-tighter text-[#1A1A18]">vantge</h1>
                                          <span className="w-[1px] h-4 bg-[#E0D8C6]"></span>
                                          <div className="flex items-center gap-2">
                                                <h2
                                                      className="text-xl font-bold text-[#1A1A18] leading-tight"
                                                      style={{ fontFamily: currentFont.cssFamily }}
                                                >
                                                      {event.event_name}
                                                </h2>
                                                <span className={"w-2 h-2 rounded-full " + (isUnlocked ? "bg-[#16A34A]" : "bg-[#88887E]")}></span>
                                          </div>
                                    </div>
                                    <p className="text-xs text-[#88887E] font-medium tracking-wide">
                                          /{event.event_slug} · {user?.email}
                                    </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-4">
                                    <button onClick={() => setShowQR(!showQR)} className="text-sm font-bold text-[#C84A44] hover:text-[#B43E39] transition-colors">
                                          {showQR ? "Hide QR code" : "Show QR code"}
                                    </button>
                                    <button
                                          onClick={toggleGallery}
                                          disabled={toggling}
                                          className={"px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all " +
                                                (isUnlocked ? "bg-transparent border border-[#E0D8C6] text-[#5A5A52]" : "bg-[#1A1A18] text-white")}
                                    >
                                          {toggling ? "..." : isUnlocked ? "Lock Gallery" : "Open Gallery"}
                                    </button>
                                    <button onClick={signOut} className="text-xs font-bold text-[#88887E] hover:text-[#1A1A18] uppercase tracking-widest ml-2">
                                          Sign out
                                    </button>
                              </div>
                        </header>

                        {showQR && <QRCodeSection eventSlug={event.event_slug} eventName={event.event_name} />}

                        {/* DESIGN CUSTOMIZATION SECTION */}
                        <div className="mb-12">
                              <div className="flex items-baseline justify-between mb-6">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1A1A18]">Event Branding</h3>
                                    {savingSettings && <span className="text-[10px] font-bold text-[#C84A44] animate-pulse">Saving...</span>}
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                    <div className="lg:col-span-4">
                                          <p className="text-[10px] font-bold text-[#88887E] uppercase mb-3">Live Preview</p>
                                          <ThemePreview theme={currentTheme} eventName={event.event_name} font={currentFont} />
                                    </div>

                                    <div className="lg:col-span-8 flex flex-col gap-8">
                                          {/* FONT SELECTION — 3 rows by category */}
                                          <div>
                                                <p className="text-[10px] font-bold text-[#88887E] uppercase mb-3">Title Font</p>
                                                <div className="flex flex-col gap-5">
                                                      {Object.entries(fontCategories).map(([catKey, fonts]) => (
                                                            <div key={catKey}>
                                                                  <p className="text-[9px] font-bold text-[#B0AFA5] uppercase tracking-widest mb-2">
                                                                        {categoryLabels[catKey]}
                                                                  </p>
                                                                  <div className="flex flex-wrap gap-2">
                                                                        {fonts.map((font) => (
                                                                              <button
                                                                                    key={font.id}
                                                                                    onClick={() => { setLocalFont(font.id); updateEventSettings({ font_family: font.id }); }}
                                                                                    className={"px-4 py-2 rounded-lg border text-xs transition-all " +
                                                                                          (currentFontId === font.id ? "border-[#1A1A18] bg-white ring-1 ring-[#1A1A18]" : "border-[#E0D8C6] bg-white hover:border-[#88887E]")}
                                                                                    style={{ fontFamily: font.cssFamily }}
                                                                              >
                                                                                    {font.name}
                                                                              </button>
                                                                        ))}
                                                                  </div>
                                                            </div>
                                                      ))}
                                                </div>
                                          </div>

                                          {/* THEME SELECTION */}
                                          <div>
                                                <p className="text-[10px] font-bold text-[#88887E] uppercase mb-3">Color Palette</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                      {getAllThemes().map((theme) => (
                                                            <ThemeOption
                                                                  key={theme.id}
                                                                  theme={theme}
                                                                  isActive={theme.id === currentThemeId}
                                                                  onClick={() => { setLocalTheme(theme.id); updateEventSettings({ theme: theme.id }); }}
                                                            />
                                                      ))}
                                                </div>
                                          </div>
                                    </div>
                              </div>
                        </div>

                        {/* TAB NAVIGATION */}
                        <div className="mb-8 flex gap-8 border-b border-[#E0D8C6]">
                              <SimpleTab label="Pending" isActive={activeTab === 0} onClick={() => setActiveTab(0)} />
                              <SimpleTab label="Live Gallery" isActive={activeTab === 1} onClick={() => setActiveTab(1)} />
                              <SimpleTab label="Trash" isActive={activeTab === 2} onClick={() => setActiveTab(2)} />
                        </div>

                        <PhotoManager key={activeTab} eventId={event.id} status={activeTab} />
                  </div>
            </div>
      )
}

function SimpleTab({ label, isActive, onClick }) {
      return (
            <button onClick={onClick} className={"pb-3 text-sm font-bold transition-all relative " + (isActive ? "text-[#1A1A18]" : "text-[#88887E]")}>
                  {label}
                  {isActive && <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#1A1A18]"></div>}
            </button>
      )
}

function ThemeOption({ theme, isActive, onClick }) {
      return (
            <button onClick={onClick} className={"p-3 rounded-xl border text-left transition-all " + (isActive ? "border-[#1A1A18] bg-white ring-1 ring-[#1A1A18]" : "border-[#E0D8C6] bg-white")}>
                  <div className="flex gap-1 mb-2">
                        <span className="w-3 h-3 rounded-full border border-black/5" style={{ backgroundColor: theme.colors.accent }} />
                        <span className="w-3 h-3 rounded-full border border-black/5" style={{ backgroundColor: theme.colors.bg }} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-tight text-[#1A1A18]">{theme.name}</p>
            </button>
      )
}

function ThemePreview({ theme, eventName, font }) {
      return (
            <div className="rounded-2xl border p-10 text-center transition-all duration-500 shadow-sm" style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.border }}>
                  <h3 className="text-2xl font-bold mb-6" style={{ color: theme.colors.text, fontFamily: font.cssFamily }}>
                        {eventName}
                  </h3>
                  <div className="flex gap-2 justify-center">
                        <span className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white rounded-full" style={{ backgroundColor: theme.colors.accent }}>Take Photo</span>
                        <span className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest border rounded-full" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }}>Gallery</span>
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
            <div className="mb-12 bg-white rounded-2xl border border-[#E0D8C6] p-8 flex flex-col md:flex-row gap-8 items-center">
                  <div ref={qrRef} className="bg-white p-4 rounded-xl border border-[#E0D8C6]">
                        <QRCodeSVG value={guestUrl} size={160} level="M" fgColor="#1A1A18" />
                  </div>
                  <div className="text-center md:text-left flex-1">
                        <p className="text-[10px] font-bold text-[#88887E] uppercase tracking-widest mb-1">Guest Entry Link</p>
                        <h3 className="text-xl font-bold text-[#1A1A18] mb-2">{eventName}</h3>
                        <p className="text-sm text-[#5A5A52] mb-6">{guestUrl}</p>
                        <button onClick={downloadQR} className="bg-[#1A1A18] text-white text-[10px] font-bold uppercase tracking-widest rounded-full px-10 py-4 hover:bg-black transition-all">
                              Download PNG for Signage
                        </button>
                  </div>
            </div>
      )
}
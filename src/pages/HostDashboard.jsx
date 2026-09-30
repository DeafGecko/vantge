import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Bell, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useHostEvent } from '../hooks/useHostEvent'
import { supabase } from '../lib/supabase'
import PhotoManager from '../components/PhotoManager'
import { getAllThemes, getTheme } from '../lib/themes'
import { getFontsByCategory, getFont, getAllFonts, getGoogleFontsUrl, DEFAULT_FONT_ID } from '../lib/fonts'
import FontLoader from '../components/FontLoader'
import BackgroundUploader from '../components/BackgroundUploader'


const fontCategories = getFontsByCategory()

// Preload all Google Fonts so the picker buttons render correctly
getAllFonts().forEach((font) => {
      const id = `font-loader-${font.id}`
      if (document.getElementById(id)) return
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = getGoogleFontsUrl(font.id)
      document.head.appendChild(link)
})
const categoryLabels = {
      elegant: 'Elegant & Script',
      modern: 'Modern & Clean',
      display: 'Display & Tech',
}

export default function HostDashboard() {
      const { user, signOut } = useAuth()
      const navigate = useNavigate()
      const { event, loading: eventLoading } = useHostEvent()
      const [toggling, setToggling] = useState(false)
      const [localUnlocked, setLocalUnlocked] = useState(null)
      const [activeTab, setActiveTab] = useState(0)
      const [localTheme, setLocalTheme] = useState(null)
      const [localFont, setLocalFont] = useState(null)
      const [localBgImage, setLocalBgImage] = useState(null)
      const [localEventName, setLocalEventName] = useState(null)
      const [savingName, setSavingName] = useState(false)
      const [savingSettings, setSavingSettings] = useState(false)
      const [pendingCount, setPendingCount] = useState(0)
      const photoSectionRef = useRef(null)

      const isUnlocked = localUnlocked !== null ? localUnlocked : event?.gallery_unlocked
      const currentThemeId = localTheme || event?.theme || 'warm_editorial'
      const currentTheme = getTheme(currentThemeId)

      const currentFontId = localFont || event?.font_family || DEFAULT_FONT_ID
      const currentFont = getFont(currentFontId)
      const currentBgImage = localBgImage !== null ? localBgImage : event?.background_image ?? null
      const currentEventName = localEventName !== null ? localEventName : event?.event_name ?? ''
      const [localBgPosition, setLocalBgPosition] = useState(null)
      const currentBgPosition = localBgPosition !== null ? localBgPosition : event?.background_position ?? '50% 50%'

      useEffect(() => {
            if (!event?.id) return

            const fetchCount = () =>
                  supabase.from('media_queue').select('id', { count: 'exact', head: true })
                        .eq('event_id', event.id).eq('status', 0)
                        .then(({ count }) => setPendingCount(count ?? 0))

            fetchCount()

            // Realtime for instant updates
            const channel = supabase.channel(`pending-count-${event.id}`)
                  .on('postgres_changes', { event: '*', schema: 'public', table: 'media_queue', filter: `event_id=eq.${event.id}` }, fetchCount)
                  .subscribe()

            // Poll every 3s as reliable fallback in case realtime misses an event
            const poll = setInterval(fetchCount, 3000)

            return () => { supabase.removeChannel(channel); clearInterval(poll) }
      }, [event?.id])

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
                  <>
                        <FontLoader fontId={currentFontId} />
                        <div className="min-h-screen bg-cream p-6 text-center">
                              <p className="text-sm text-[#5A5A52]">No event found.</p>
                        </div>
                  </>
            )
      }
      return (
            <>
            <FontLoader fontId={currentFontId} />
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
                                          {user?.email}
                                    </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-4">
                                    {/* Pending notification bell */}
                                    <button onClick={() => { setActiveTab(0); setTimeout(() => photoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} className="relative p-2 rounded-full hover:bg-[#F4F3F0] transition-colors">
                                          <Bell size={20} className="text-[#1A1A18]" />
                                          {pendingCount > 0 && (
                                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#C84A44] text-white text-[10px] font-bold flex items-center justify-center px-1">
                                                      {pendingCount > 99 ? '99+' : pendingCount}
                                                </span>
                                          )}
                                    </button>
                                    <button
                                          onClick={toggleGallery}
                                          disabled={toggling}
                                          className={"px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all " +
                                                (isUnlocked ? "bg-transparent border border-[#E0D8C6] text-[#5A5A52]" : "bg-[#1A1A18] text-white")}
                                    >
                                          {toggling ? "..." : isUnlocked ? "Lock Gallery" : "Open Gallery"}
                                    </button>
                                    <button onClick={async () => { await signOut(); navigate('/host/login') }} title="Sign out" className="p-2 rounded-full hover:bg-[#F4F3F0] transition-colors text-[#88887E] hover:text-[#1A1A18]">
                                          <LogOut size={20} />
                                    </button>
                              </div>
                        </header>

                        {/* EVENT BRANDING — BENTO LAYOUT */}
                        <div className="mb-12">
                              <div className="flex items-baseline justify-between mb-6">
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#1A1A18]">Event Branding</h3>
                                    {savingSettings && <span className="text-[10px] font-bold text-[#C84A44] animate-pulse">Saving...</span>}
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                                    {/* LEFT COLUMN — Phone + QR */}
                                    <div className="lg:col-span-4 flex flex-col gap-4">
                                          {/* Phone preview card */}
                                          <div className="bg-white rounded-2xl border border-[#E0D8C6] p-5">
                                                <p className="text-[10px] font-bold text-[#88887E] uppercase mb-4">Live Preview</p>
                                                <ThemePreview theme={currentTheme} eventName={currentEventName} font={currentFont} bgImage={currentBgImage} bgPosition={currentBgPosition} />
                                          </div>
                                          {/* QR card */}
                                          <QRCodeSection eventSlug={event.event_slug} eventName={event.event_name} />
                                    </div>

                                    {/* RIGHT COLUMN — Bento grid of controls */}
                                    <div className="lg:col-span-8 flex flex-col gap-4">

                                          {/* ROW 1: Display Name (full width) */}
                                          <div className="bg-white rounded-2xl border border-[#E0D8C6] p-5">
                                                <p className="text-[10px] font-bold text-[#88887E] uppercase mb-3">Display Name</p>
                                                <div className="flex gap-2 items-center">
                                                      <input
                                                            type="text"
                                                            value={currentEventName}
                                                            onChange={(e) => setLocalEventName(e.target.value)}
                                                            onBlur={async () => {
                                                                  if (currentEventName === event.event_name) return
                                                                  setSavingName(true)
                                                                  await updateEventSettings({ event_name: currentEventName })
                                                                  setSavingName(false)
                                                            }}
                                                            placeholder="e.g. Rogers & Bottrell Wedding"
                                                            className="flex-1 bg-[#F9F8F5] border border-[#E0D8C6] rounded-xl px-4 py-3 text-sm font-bold text-[#1A1A18] focus:outline-none focus:border-[#C84A44] transition-colors"
                                                      />
                                                      {savingName && <span className="text-[10px] font-bold text-[#C84A44] animate-pulse shrink-0">Saving...</span>}
                                                </div>
                                                <p className="text-[10px] text-[#88887E] mt-2">This is what guests see on their screen.</p>
                                          </div>

                                          {/* ROW 2: Font + Color side by side */}
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                                {/* Title Font card */}
                                                <div className="bg-white rounded-2xl border border-[#E0D8C6] p-5">
                                                      <p className="text-[10px] font-bold text-[#88887E] uppercase mb-4">Title Font</p>
                                                      <div className="flex flex-col gap-4">
                                                            {Object.entries(fontCategories).map(([catKey, fonts]) => (
                                                                  <div key={catKey}>
                                                                        <p className="text-[9px] font-bold text-[#B0AFA5] uppercase tracking-widest mb-2">
                                                                              {categoryLabels[catKey]}
                                                                        </p>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                              {fonts.map((font) => (
                                                                                    <button
                                                                                          key={font.id}
                                                                                          onClick={() => { setLocalFont(font.id); updateEventSettings({ font_family: font.id }); }}
                                                                                          className={"px-3 py-1.5 rounded-lg border text-xs transition-all " +
                                                                                                (currentFontId === font.id ? "border-[#1A1A18] bg-[#F9F8F5] ring-1 ring-[#1A1A18]" : "border-[#E0D8C6] bg-white hover:border-[#88887E]")}
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

                                                {/* Color Palette card */}
                                                <div className="bg-white rounded-2xl border border-[#E0D8C6] p-5">
                                                      <p className="text-[10px] font-bold text-[#88887E] uppercase mb-4">Color Palette</p>
                                                      <div className="grid grid-cols-2 gap-2">
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

                                          {/* ROW 3: Background Photo (full width) */}
                                          <div className="bg-white rounded-2xl border border-[#E0D8C6] p-5">
                                                <BackgroundUploader
                                                      eventId={event.id}
                                                      currentImageUrl={currentBgImage}
                                                      currentPosition={currentBgPosition}
                                                      accentColor={currentTheme.colors.accent}
                                                      onSaved={(url, pos) => { setLocalBgImage(url); setLocalBgPosition(pos) }}
                                                />
                                          </div>

                                    </div>
                              </div>
                        </div>

                        {/* TAB NAVIGATION */}
                        <div ref={photoSectionRef} className="mb-8 flex gap-8 border-b border-[#E0D8C6]">
                              <SimpleTab label="Pending" isActive={activeTab === 0} onClick={() => setActiveTab(0)} />
                              <SimpleTab label="Live Gallery" isActive={activeTab === 1} onClick={() => setActiveTab(1)} />
                              <SimpleTab label="Trash" isActive={activeTab === 2} onClick={() => setActiveTab(2)} />
                        </div>

                        <PhotoManager key={activeTab} eventId={event.id} status={activeTab} />
                  </div>
            </div>
            </>
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

function ThemePreview({ theme, eventName, font, bgImage, bgPosition }) {
      const c = theme.colors
      const hasBg = !!bgImage
      const txt = hasBg ? '#fff' : c.text
      const txtMuted = hasBg ? 'rgba(255,255,255,0.7)' : c.textMuted
      const txtSubtle = hasBg ? 'rgba(255,255,255,0.5)' : c.textSubtle
      const cardBg = hasBg ? 'rgba(255,255,255,0.15)' : c.surface
      const cardBorder = hasBg ? 'rgba(255,255,255,0.25)' : c.border

      return (
            /* Phone frame */
            <div className="mx-auto relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-[#1A1A18]" style={{ width: 220, height: 420 }}>
                  {/* Screen */}
                  <div
                        className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center"
                        style={hasBg
                              ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition || '50% 50%' }
                              : { backgroundColor: c.bg }}
                  >
                        {/* Tint */}
                        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: hasBg ? 'rgba(0,0,0,0.52)' : c.accent + '11' }} />

                        <div className="relative z-10 w-full">
                              <p className="text-[8px] font-bold uppercase tracking-widest mb-2" style={{ color: txtSubtle }}>
                                    Welcome to the celebration
                              </p>
                              <h3 className="font-extrabold leading-tight mb-4" style={{ color: txt, fontFamily: font.cssFamily, fontSize: '1.1rem' }}>
                                    {eventName}
                              </h3>
                              <p className="text-[8px] mb-5" style={{ color: txtMuted }}>Scan. Snap. Share.</p>
                              <div className="flex flex-col gap-2">
                                    <div className="rounded-xl px-2.5 py-2 text-[9px] font-bold text-white flex items-center gap-2" style={{ backgroundColor: c.accent }}>
                                          <span className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                                                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                                      <circle cx="12" cy="13" r="4" />
                                                </svg>
                                          </span>
                                          Open Camera
                                    </div>
                                    <div className="rounded-xl px-2.5 py-2 text-[9px] font-bold flex items-center gap-2 border" style={{ backgroundColor: cardBg, borderColor: cardBorder, color: txt }}>
                                          <span className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: hasBg ? 'rgba(255,255,255,0.2)' : c.surfaceMuted }}>
                                                <svg width="11" height="11" fill="none" stroke={hasBg ? '#fff' : c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <rect x="3" y="3" width="18" height="18" rx="2" />
                                                      <circle cx="8.5" cy="8.5" r="1.5" />
                                                      <path d="M21 15l-5-5L5 21" />
                                                </svg>
                                          </span>
                                          Upload a Photo
                                    </div>
                                    <div className="rounded-xl px-2.5 py-2 text-[9px] font-bold flex items-center gap-2 border" style={{ backgroundColor: cardBg, borderColor: cardBorder, color: txt }}>
                                          <span className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: hasBg ? 'rgba(255,255,255,0.2)' : c.surfaceMuted }}>
                                                <svg width="11" height="11" fill="none" stroke={hasBg ? '#fff' : c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <rect x="3" y="3" width="7" height="7" rx="1" />
                                                      <rect x="14" y="3" width="7" height="7" rx="1" />
                                                      <rect x="3" y="14" width="7" height="7" rx="1" />
                                                      <rect x="14" y="14" width="7" height="7" rx="1" />
                                                </svg>
                                          </span>
                                          View Gallery
                                    </div>
                              </div>
                        </div>
                  </div>

                  {/* Phone notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-[#1A1A18] rounded-full z-20" />
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
            <div className="bg-white rounded-2xl border border-[#E0D8C6] p-5 flex flex-col items-center text-center gap-4">
                  <p className="text-[10px] font-bold text-[#88887E] uppercase tracking-widest self-start">Scan to Test / Share</p>
                  <div ref={qrRef} className="bg-white p-3 rounded-xl border border-[#E0D8C6]">
                        <QRCodeSVG value={guestUrl} size={140} level="M" fgColor="#1A1A18" />
                  </div>
                  <p className="text-[10px] text-[#5A5A52] break-all">{guestUrl}</p>
                  <button
                        onClick={downloadQR}
                        className="w-full bg-[#1A1A18] text-white text-[10px] font-bold uppercase tracking-widest rounded-full py-3 hover:bg-black transition-all"
                  >
                        Download QR PNG
                  </button>
            </div>
      )
}
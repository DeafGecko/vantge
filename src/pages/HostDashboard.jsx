import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Images, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useHostEvent } from '../hooks/useHostEvent'
import { supabase } from '../lib/supabase'
import PhotoManager from '../components/PhotoManager'
import { getAllThemes, getTheme } from '../lib/themes'
import { getFontsByCategory, getFont, getAllFonts, getGoogleFontsUrl, DEFAULT_FONT_ID } from '../lib/fonts'
import { EVENT_TYPES, getEventType, DEFAULT_EVENT_TYPE_ID } from '../lib/eventTypes'
import FontLoader from '../components/FontLoader'
import BackgroundUploader from '../components/BackgroundUploader'
import HostUploader from '../components/HostUploader'
import LogoUploader from '../components/LogoUploader'

const fontCategories = getFontsByCategory()

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
      display: 'Display & Bold',
}

export default function HostDashboard() {
      const { signOut } = useAuth()
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
      const [menuOpen, setMenuOpen] = useState(false)
      const [localBgPosition, setLocalBgPosition] = useState(null)
      const [localBgTint, setLocalBgTint] = useState(null)
      const [localEventType, setLocalEventType] = useState(null)
      const [localLogoUrl, setLocalLogoUrl] = useState(undefined)
      const photoSectionRef = useRef(null)

      const isUnlocked = localUnlocked !== null ? localUnlocked : event?.gallery_unlocked
      const currentThemeId = localTheme || event?.theme || 'warm_editorial'
      const currentTheme = getTheme(currentThemeId)
      const currentFontId = localFont || event?.font_family || DEFAULT_FONT_ID
      const currentFont = getFont(currentFontId)
      const currentBgImage = localBgImage !== null ? localBgImage : event?.background_image ?? null
      const currentEventName = localEventName !== null ? localEventName : event?.event_name ?? ''
      const currentBgPosition = localBgPosition !== null ? localBgPosition : event?.background_position ?? '50% 50%'
      const currentBgTint = localBgTint !== null ? localBgTint : event?.background_tint ?? 55
      const currentEventTypeId = localEventType !== null ? localEventType : event?.event_type ?? DEFAULT_EVENT_TYPE_ID
      const currentLogoUrl = localLogoUrl !== undefined ? localLogoUrl : event?.logo_url ?? null
      const currentEventType = getEventType(currentEventTypeId)

      useEffect(() => {
            if (!event?.id) return
            const fetchCount = () =>
                  supabase.from('media_queue').select('id', { count: 'exact', head: true })
                        .eq('event_id', event.id).eq('status', 0)
                        .then(({ count }) => setPendingCount(count ?? 0))
            fetchCount()
            const channel = supabase.channel(`pending-count-${event.id}`)
                  .on('postgres_changes', { event: '*', schema: 'public', table: 'media_queue', filter: `event_id=eq.${event.id}` }, fetchCount)
                  .subscribe()
            const poll = setInterval(fetchCount, 3000)
            return () => { supabase.removeChannel(channel); clearInterval(poll) }
      }, [event?.id])

      async function toggleGallery() {
            if (!event) return
            setToggling(true)
            const newValue = !isUnlocked
            setLocalUnlocked(newValue)
            const { error } = await supabase.from('events').update({ gallery_unlocked: newValue }).eq('id', event.id)
            if (error) { setLocalUnlocked(!newValue); alert("Couldn't update gallery: " + error.message) }
            setToggling(false)
      }

      async function updateEventSettings(updates) {
            if (!event) return
            setSavingSettings(true)
            const { error } = await supabase.from('events').update(updates).eq('id', event.id)
            if (error) alert("Error saving settings: " + error.message)
            setSavingSettings(false)
      }

      if (eventLoading) return (
            <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                        <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A18" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".2" /><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" /></svg>
                        <p className="text-xs text-[#88887E] tracking-widest uppercase">Loading</p>
                  </div>
            </div>
      )

      if (!event) return (
            <>
                  <FontLoader fontId={currentFontId} />
                  <div className="min-h-screen bg-[#F7F5F0] p-6 text-center">
                        <p className="text-sm text-[#5A5A52]">No event found.</p>
                  </div>
            </>
      )

      function scrollToPhotos() {
            setActiveTab(0)
            setTimeout(() => photoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
      }

      return (
            <>
                  <FontLoader fontId={currentFontId} />
                  <div className="min-h-screen bg-[#F7F5F0]">

                        {/* HEADER — dark refined bar */}
                        <header className="bg-[#1A1A18] sticky top-0 z-50">
                              <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between gap-4">

                                    {/* Brand */}
                                    <div className="flex items-center gap-2.5 shrink-0">
                                          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                                                <circle cx="14" cy="14" r="14" fill="white" fillOpacity=".12" />
                                                <path d="M8 14a2 2 0 012-2h4l2-4 2 4h0a2 2 0 012 2v4a2 2 0 01-2 2H10a2 2 0 01-2-2v-4z" fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                                                <circle cx="14" cy="14" r="2" fill="white" />
                                          </svg>
                                          <span className="text-base font-black tracking-tighter text-white">vantge</span>
                                    </div>

                                    {/* Desktop controls */}
                                    <div className="hidden md:flex items-center gap-2">
                                          <button
                                                onClick={toggleGallery}
                                                disabled={toggling}
                                                className={"px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all border " +
                                                      (isUnlocked
                                                            ? "border-white/20 text-white/60 hover:border-white/40 hover:text-white"
                                                            : "bg-white text-[#1A1A18] border-white hover:bg-white/90")}
                                          >
                                                {toggling ? "..." : isUnlocked ? "Lock Gallery" : "Open Gallery"}
                                          </button>

                                          {/* Notification badge */}
                                          <button
                                                onClick={scrollToPhotos}
                                                className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
                                                title="Pending reviews"
                                          >
                                                <Images size={18} className="text-white/70" />
                                                {pendingCount > 0 && (
                                                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#C84A44] text-white text-[10px] font-bold flex items-center justify-center px-1">
                                                            {pendingCount > 99 ? '99+' : pendingCount}
                                                      </span>
                                                )}
                                          </button>

                                          <button
                                                onClick={async () => { await signOut(); navigate('/host/login') }}
                                                title="Sign out"
                                                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                                          >
                                                <LogOut size={18} />
                                          </button>
                                    </div>

                                    {/* Mobile burger */}
                                    <div className="relative md:hidden shrink-0">
                                          <button onClick={() => setMenuOpen(o => !o)} className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white">
                                                {menuOpen ? <X size={20} /> : <Menu size={20} />}
                                                {!menuOpen && pendingCount > 0 && (
                                                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-[#C84A44] text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                                                            {pendingCount > 99 ? '99+' : pendingCount}
                                                      </span>
                                                )}
                                          </button>
                                          {menuOpen && (
                                                <>
                                                      <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                                                      <div className="absolute right-0 top-11 z-40 w-56 bg-white rounded-2xl border border-[#E8E4DA] shadow-2xl overflow-hidden">
                                                            <button
                                                                  onClick={() => { toggleGallery(); setMenuOpen(false) }}
                                                                  disabled={toggling}
                                                                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-[#1A1A18] hover:bg-[#F7F5F0] transition-colors border-b border-[#E8E4DA]"
                                                            >
                                                                  <span className={"w-2 h-2 rounded-full shrink-0 " + (isUnlocked ? "bg-[#16A34A]" : "bg-[#B0AFA5]")} />
                                                                  {toggling ? "Updating..." : isUnlocked ? "Lock Gallery" : "Open Gallery"}
                                                            </button>
                                                            <button
                                                                  onClick={() => { scrollToPhotos(); setMenuOpen(false) }}
                                                                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-[#1A1A18] hover:bg-[#F7F5F0] transition-colors border-b border-[#E8E4DA]"
                                                            >
                                                                  <span className="relative">
                                                                        <Images size={16} />
                                                                        {pendingCount > 0 && (
                                                                              <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-[#C84A44] text-white text-[8px] font-bold flex items-center justify-center">
                                                                                    {pendingCount}
                                                                              </span>
                                                                        )}
                                                                  </span>
                                                                  Pending Reviews
                                                                  {pendingCount > 0 && <span className="ml-auto text-[#C84A44] text-xs font-bold">{pendingCount}</span>}
                                                            </button>
                                                            <button
                                                                  onClick={async () => { await signOut(); navigate('/host/login') }}
                                                                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-[#88887E] hover:bg-[#F7F5F0] transition-colors"
                                                            >
                                                                  <LogOut size={16} />
                                                                  Sign Out
                                                            </button>
                                                      </div>
                                                </>
                                          )}
                                    </div>
                              </div>
                        </header>

                        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-10">

                              {/* PAGE TITLE */}
                              <div className="mb-8 flex items-end justify-between">
                                    <div>
                                          <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#B0AFA5] mb-1">Event Dashboard</p>
                                          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#1A1A18]">{event.event_name}</h2>
                                    </div>
                                    {savingSettings && (
                                          <span className="text-[10px] font-bold text-[#C84A44] animate-pulse tracking-widest uppercase">Saving…</span>
                                    )}
                              </div>

                              {/* BENTO GRID */}
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-10">

                                    {/* LEFT — phone preview + QR */}
                                    <div className="md:col-span-4 flex flex-col gap-4">

                                          {/* Phone preview */}
                                          <div className="bg-white rounded-3xl border border-[#E8E4DA] p-6 shadow-sm">
                                                <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-5">Live Preview</p>
                                                <ThemePreview theme={currentTheme} eventName={currentEventName} font={currentFont} bgImage={currentBgImage} bgPosition={currentBgPosition} bgTint={currentBgTint} eventType={currentEventType} logoUrl={currentLogoUrl} />
                                          </div>

                                          {/* QR code */}
                                          <QRCodeSection eventSlug={event.event_slug} />
                                    </div>

                                    {/* RIGHT — controls */}
                                    <div className="md:col-span-8 flex flex-col gap-4">

                                          {/* Logo | Display Name | Event Type */}
                                          <div className="bg-white rounded-3xl border border-[#E8E4DA] p-6 shadow-sm">
                                                <div className="flex items-end gap-3">

                                                      {/* Logo */}
                                                      <div className="shrink-0 flex flex-col">
                                                            <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-2">Logo</p>
                                                            <LogoUploader
                                                                  eventId={event.id}
                                                                  currentLogoUrl={currentLogoUrl}
                                                                  onSaved={(url) => setLocalLogoUrl(url)}
                                                            />
                                                      </div>

                                                      {/* Display Name — grows */}
                                                      <div className="flex-1 min-w-0 flex flex-col">
                                                            <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-2">Display Name</p>
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
                                                                        className="flex-1 min-w-0 bg-[#F7F5F0] border-2 border-[#E8E4DA] rounded-xl px-4 py-3 text-sm font-bold text-[#1A1A18] focus:outline-none focus:border-[#1A1A18] transition-colors placeholder:text-[#C0BFB5] placeholder:font-normal"
                                                                  />
                                                                  {savingName && <span className="text-[10px] font-bold text-[#C84A44] animate-pulse shrink-0">Saving…</span>}
                                                            </div>
                                                      </div>

                                                      {/* Event Type */}
                                                      <div className="shrink-0 w-36 flex flex-col">
                                                            <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-2">Event Type</p>
                                                            <div className="relative">
                                                                  <select
                                                                        value={currentEventTypeId}
                                                                        onChange={async (e) => {
                                                                              const val = e.target.value
                                                                              setLocalEventType(val)
                                                                              await updateEventSettings({ event_type: val })
                                                                        }}
                                                                        className="w-full appearance-none bg-[#F7F5F0] border-2 border-[#E8E4DA] rounded-xl px-3 py-3 text-sm font-bold text-[#1A1A18] focus:outline-none focus:border-[#1A1A18] transition-colors pr-8 cursor-pointer"
                                                                  >
                                                                        {EVENT_TYPES.map((t) => (
                                                                              <option key={t.id} value={t.id}>
                                                                                    {t.label}
                                                                              </option>
                                                                        ))}
                                                                  </select>
                                                                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#B0AFA5]" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                            </div>
                                                            <p className="text-[10px] text-[#B0AFA5] mt-2 text-center">{currentEventType.tagline}</p>
                                                      </div>
                                                </div>
                                          </div>

                                          {/* Host uploader */}
                                          <HostUploader eventId={event.id} />

                                          {/* Font + Color side by side */}
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                                <div className="bg-white rounded-3xl border border-[#E8E4DA] p-6 shadow-sm">
                                                      <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-4">Title Font</p>
                                                      <div className="flex flex-col gap-4">
                                                            {Object.entries(fontCategories).map(([catKey, fonts]) => (
                                                                  <div key={catKey}>
                                                                        <p className="text-[8px] font-bold text-[#C0BFB5] uppercase tracking-widest mb-2">
                                                                              {categoryLabels[catKey]}
                                                                        </p>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                              {fonts.map((font) => (
                                                                                    <button
                                                                                          key={font.id}
                                                                                          onClick={() => { setLocalFont(font.id); updateEventSettings({ font_family: font.id }) }}
                                                                                          className={"px-3 py-1.5 rounded-lg border text-xs transition-all " +
                                                                                                (currentFontId === font.id
                                                                                                      ? "border-[#1A1A18] bg-[#1A1A18] text-white"
                                                                                                      : "border-[#E8E4DA] bg-white text-[#5A5A52] hover:border-[#1A1A18] hover:text-[#1A1A18]")}
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

                                                <div className="bg-white rounded-3xl border border-[#E8E4DA] p-6 shadow-sm">
                                                      <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-4">Color Palette</p>
                                                      <div className="grid grid-cols-2 gap-2">
                                                            {getAllThemes().map((theme) => (
                                                                  <ThemeOption
                                                                        key={theme.id}
                                                                        theme={theme}
                                                                        isActive={theme.id === currentThemeId}
                                                                        onClick={() => { setLocalTheme(theme.id); updateEventSettings({ theme: theme.id }) }}
                                                                  />
                                                            ))}
                                                      </div>
                                                </div>
                                          </div>

                                          {/* Background photo */}
                                          <div className="bg-white rounded-3xl border border-[#E8E4DA] p-6 shadow-sm">
                                                <BackgroundUploader
                                                      eventId={event.id}
                                                      currentImageUrl={currentBgImage}
                                                      currentPosition={currentBgPosition}
                                                      currentTint={currentBgTint}
                                                      accentColor={currentTheme.colors.accent}
                                                      onSaved={(url, pos, tint) => { setLocalBgImage(url); setLocalBgPosition(pos); setLocalBgTint(tint) }}
                                                />
                                          </div>
                                    </div>
                              </div>

                              {/* PHOTO MANAGEMENT */}
                              <div ref={photoSectionRef} className="bg-white rounded-3xl border border-[#E8E4DA] shadow-sm overflow-hidden">
                                    {/* Tab bar */}
                                    <div className="flex border-b border-[#E8E4DA] px-6">
                                          {[
                                                { label: 'Pending', count: pendingCount },
                                                { label: 'Live Gallery', count: null },
                                                { label: 'Trash', count: null },
                                          ].map(({ label, count }, i) => (
                                                <button
                                                      key={i}
                                                      onClick={() => setActiveTab(i)}
                                                      className={"pb-3.5 pt-4 mr-6 text-sm font-bold transition-all relative whitespace-nowrap " +
                                                            (activeTab === i ? "text-[#1A1A18]" : "text-[#B0AFA5] hover:text-[#5A5A52]")}
                                                >
                                                      {label}
                                                      {count > 0 && (
                                                            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#C84A44] text-white text-[9px] font-bold">
                                                                  {count}
                                                            </span>
                                                      )}
                                                      {activeTab === i && <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#1A1A18] rounded-full" />}
                                                </button>
                                          ))}
                                    </div>
                                    <div className="p-6">
                                          <PhotoManager key={activeTab} eventId={event.id} status={activeTab} />
                                    </div>
                              </div>

                        </div>
                  </div>
            </>
      )
}

function ThemeOption({ theme, isActive, onClick }) {
      return (
            <button
                  onClick={onClick}
                  className={"p-3 rounded-2xl border-2 text-left transition-all " +
                        (isActive ? "border-[#1A1A18] bg-[#F7F5F0]" : "border-[#E8E4DA] bg-white hover:border-[#C0BFB5]")}
            >
                  <div className="flex gap-1.5 mb-2">
                        <span className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.colors.accent }} />
                        <span className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.colors.bg }} />
                        <span className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.colors.surface }} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-tight text-[#1A1A18] leading-tight">{theme.name}</p>
            </button>
      )
}

function ThemePreview({ theme, eventName, font, bgImage, bgPosition, bgTint, eventType, logoUrl }) {
      const c = theme.colors
      const hasBg = !!bgImage
      const txt = hasBg ? '#fff' : c.text
      const txtMuted = hasBg ? 'rgba(255,255,255,0.7)' : c.textMuted
      const txtSubtle = hasBg ? 'rgba(255,255,255,0.5)' : c.textSubtle
      const cardBg = hasBg ? 'rgba(255,255,255,0.15)' : c.surface
      const cardBorder = hasBg ? 'rgba(255,255,255,0.25)' : c.border

      return (
            <div className="mx-auto relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-[#1A1A18]" style={{ width: 220, height: 420 }}>
                  {/* Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-[#1A1A18] rounded-full z-20" />

                  <div
                        className="absolute inset-0 flex flex-col justify-end"
                        style={hasBg
                              ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: bgPosition || '50% 50%' }
                              : { backgroundColor: c.bg }}
                  >
                        {/* Cinematic gradient overlay */}
                        {hasBg && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(0,0,0,${((bgTint ?? 55) / 100).toFixed(2)})` }} />}
                        {!hasBg && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: c.accent + '11' }} />}

                        <div className="relative z-10 p-4 text-center">
                              {logoUrl && (
                                    <img src={logoUrl} alt="Logo" className="mx-auto mb-2 max-h-8 max-w-[80px] object-contain" style={{ filter: hasBg ? 'brightness(0) invert(1)' : 'none' }} />
                              )}
                              <p className="text-[7px] font-bold uppercase tracking-widest mb-2" style={{ color: txtSubtle }}>
                                    {eventType?.tagline || 'Welcome to the celebration'}
                              </p>
                              <h3 className="font-extrabold leading-tight mb-3" style={{ color: txt, fontFamily: font.cssFamily, fontSize: '1.05rem' }}>
                                    {eventName || 'Your Event'}
                              </h3>
                              <p className="text-[7px] mb-4" style={{ color: txtMuted }}>Scan. Snap. Share.</p>

                              <div className="flex flex-col gap-1.5">
                                    <div className="rounded-xl px-2.5 py-2 text-[8px] font-bold text-white flex items-center gap-1.5" style={{ backgroundColor: c.accent }}>
                                          <span className="w-4 h-4 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                                <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                                      <circle cx="12" cy="13" r="4" />
                                                </svg>
                                          </span>
                                          Open Camera
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                          <div className="rounded-xl px-2 py-1.5 text-[7px] font-bold flex items-center gap-1 border" style={{ backgroundColor: cardBg, borderColor: cardBorder, color: txt }}>
                                                <svg width="8" height="8" fill="none" stroke={hasBg ? '#fff' : c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                                                </svg>
                                                Upload
                                          </div>
                                          <div className="rounded-xl px-2 py-1.5 text-[7px] font-bold flex items-center gap-1 border" style={{ backgroundColor: cardBg, borderColor: cardBorder, color: txt }}>
                                                <svg width="8" height="8" fill="none" stroke={hasBg ? '#fff' : c.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                                                </svg>
                                                Gallery
                                          </div>
                                    </div>
                              </div>
                        </div>
                  </div>
            </div>
      )
}

function QRCodeSection({ eventSlug }) {
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
            <div className="bg-white rounded-3xl border border-[#E8E4DA] p-6 shadow-sm flex flex-col items-center gap-4">
                  <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] self-start">Scan to Share</p>
                  <div ref={qrRef} className="bg-[#F7F5F0] p-4 rounded-2xl">
                        <QRCodeSVG value={guestUrl} size={136} level="M" fgColor="#1A1A18" bgColor="#F7F5F0" />
                  </div>
                  <p className="text-[10px] text-[#B0AFA5] break-all text-center leading-relaxed">{guestUrl}</p>
                  <button
                        onClick={downloadQR}
                        className="w-full bg-[#1A1A18] hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full py-3 transition-all"
                  >
                        Download QR PNG
                  </button>
            </div>
      )
}

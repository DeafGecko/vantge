import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Images, LogOut, Menu, X, Copy, Check as CheckIcon } from 'lucide-react'
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
import VantgeLogo from '../components/VantgeLogo'

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
      const { user, loading: authLoading, signOut } = useAuth()
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
      const [approvedPhotoCount, setApprovedPhotoCount] = useState(0)
      const [approvedVideoCount, setApprovedVideoCount] = useState(0)
      const [menuOpen, setMenuOpen] = useState(false)
      const [localBgPosition, setLocalBgPosition] = useState(null)
      const [localBgTint, setLocalBgTint] = useState(null)
      const [localEventType, setLocalEventType] = useState(null)
      const [localLogoUrl, setLocalLogoUrl] = useState(undefined)
      const [localAllowDownloads, setLocalAllowDownloads] = useState(null)
      const [localAllowSharing, setLocalAllowSharing] = useState(null)
      const [previewUnlocked, setPreviewUnlocked] = useState(true)
      const photoSectionRef = useRef(null)

      const allowDownloads = localAllowDownloads !== null ? localAllowDownloads : (event?.allow_downloads ?? true)
      const allowSharing = localAllowSharing !== null ? localAllowSharing : (event?.allow_sharing ?? true)

      async function toggleAllowDownloads() {
            const newVal = !allowDownloads
            setLocalAllowDownloads(newVal)
            await updateEventSettings({ allow_downloads: newVal })
      }
      async function toggleAllowSharing() {
            const newVal = !allowSharing
            setLocalAllowSharing(newVal)
            await updateEventSettings({ allow_sharing: newVal })
      }

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
            if (!user) return
            supabase.from('profiles').select('approved').eq('id', user.id).single().then(({ data }) => {
                  if (data && data.approved === false) navigate('/pending', { replace: true })
            })
      }, [user, navigate])

      useEffect(() => {
            if (!event?.id) return
            const fetchCount = async () => {
                  const [pendingRes, approvedRes] = await Promise.all([
                        supabase.from('media_queue').select('id', { count: 'exact', head: true }).eq('event_id', event.id).eq('status', 0),
                        supabase.from('media_queue').select('is_video').eq('event_id', event.id).eq('status', 1),
                  ])
                  setPendingCount(pendingRes.count ?? 0)
                  const approved = approvedRes.data ?? []
                  setApprovedPhotoCount(approved.filter(r => !r.is_video).length)
                  setApprovedVideoCount(approved.filter(r => r.is_video).length)
            }
            fetchCount()
            const channel = supabase.channel(`pending-count-${event.id}`)
                  .on('postgres_changes', { event: '*', schema: 'public', table: 'media_queue', filter: `event_id=eq.${event.id}` }, fetchCount)
                  .subscribe()
            const poll = setInterval(fetchCount, 3000)
            return () => { supabase.removeChannel(channel); clearInterval(poll) }
      }, [event?.id])

      async function toggleGallery() {
            if (!event) return
            if (isUnlocked) {
                  const ok = window.confirm('Close the gallery? Guests will see "This event is not open yet."')
                  if (!ok) return
            }
            setToggling(true)
            const newValue = !isUnlocked
            setLocalUnlocked(newValue)
            const { data, error } = await supabase.from('events').update({ gallery_unlocked: newValue }).eq('id', event.id).select('gallery_unlocked').single()
            if (error) {
                  setLocalUnlocked(!newValue)
                  alert("Couldn't update gallery: " + error.message)
            } else if (data?.gallery_unlocked !== newValue) {
                  setLocalUnlocked(!newValue)
                  alert("Gallery update was blocked. Please sign out and sign back in, then try again.")
            }
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
                        <p className="text-xs text-ink-muted tracking-widest uppercase">Loading</p>
                  </div>
            </div>
      )

      if (!authLoading && !user) {
            navigate('/login', { replace: true })
            return null
      }

      if (!event) return <CreateEventOnboarding onCreated={() => window.location.reload()} signOut={async () => { await signOut(); navigate('/login') }} />



      function scrollToPhotos() {
            setActiveTab(0)
            setTimeout(() => photoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
      }

      return (
            <>
                  <FontLoader fontId={currentFontId} />
                  <div className="min-h-screen bg-[#F7F5F0]">

                        {/* HEADER — dark refined bar */}
                        <header className="bg-ink sticky top-0 z-50">
                              <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between gap-4">

                                    {/* Brand */}
                                    <div className="shrink-0">
                                          <VantgeLogo size="sm" variant="dark" />
                                    </div>

                                    {/* Desktop controls */}
                                    <div className="hidden md:flex items-center gap-2">
                                          <button
                                                onClick={toggleGallery}
                                                disabled={toggling}
                                                className={"px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all border " +
                                                      (isUnlocked
                                                            ? "bg-white text-ink border-white hover:bg-white/90"
                                                            : "border-white/20 text-white/60 hover:border-white/40 hover:text-white")}
                                          >
                                                {toggling ? "..." : isUnlocked ? (
                                                      <span style={{display:'flex',alignItems:'center',gap:6}}>
                                                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="-1 -1 26 26" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,overflow:'visible'}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0117 0"/></svg>
                                                            Gallery Open
                                                      </span>
                                                ) : (
                                                      <span style={{display:'flex',alignItems:'center',gap:6}}>
                                                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="-1 -1 26 26" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,overflow:'visible'}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                                            Gallery Closed
                                                      </span>
                                                )}
                                          </button>

                                          {/* Notification badge */}
                                          <button
                                                onClick={scrollToPhotos}
                                                className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
                                                aria-label={`Review pending photos${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
                                                title="Pending reviews"
                                          >
                                                <Images size={18} className="text-white/70" />
                                                {pendingCount > 0 && (
                                                      <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 rounded-full bg-coral-text text-white text-[10px] font-bold flex items-center justify-center px-1">
                                                            {pendingCount > 99 ? '99+' : pendingCount}
                                                      </span>
                                                )}
                                          </button>

                                          <button
                                                onClick={async () => { await signOut(); navigate('/login') }}
                                                aria-label="Sign out"
                                                title="Sign out"
                                                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                                          >
                                                <LogOut size={18} />
                                          </button>
                                    </div>

                                    {/* Mobile burger */}
                                    <div className="relative md:hidden shrink-0">
                                          <button onClick={() => setMenuOpen(o => !o)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white">
                                                {menuOpen ? <X size={20} /> : <Menu size={20} />}
                                                {!menuOpen && pendingCount > 0 && (
                                                      <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full bg-coral-text text-white text-[9px] font-bold flex items-center justify-center px-0.5">
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
                                                                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold text-ink hover:bg-[#F7F5F0] transition-colors border-b border-[#E8E4DA]"
                                                            >
                                                                  {isUnlocked
                                                                        ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#16A34A]"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                                                                        : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#B0AFA5]"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0117 0"/></svg>
                                                                  }
                                                                  {toggling ? "Updating..." : isUnlocked ? "Gallery Open" : "Gallery Closed"}
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
                                                                  onClick={async () => { await signOut(); navigate('/login') }}
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

                        <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-7">

                              {/* PAGE TITLE */}
                              <div className="mb-5 flex items-end justify-between">
                                    <div>
                                          <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#B0AFA5] mb-0.5">Event Dashboard</p>
                                          <h2 className="text-xl md:text-2xl font-black tracking-tight text-[#1A1A18]">{event.event_name}</h2>
                                    </div>
                                    {savingSettings && (
                                          <span className="text-[10px] font-bold text-[#C84A44] animate-pulse tracking-widest uppercase">Saving…</span>
                                    )}
                              </div>

                              {/* BENTO GRID */}
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-7">

                                    {/* LEFT — phone preview + QR */}
                                    <div className="md:col-span-4 flex flex-col gap-3 md:self-start md:sticky md:top-20">

                                          {/* Phone preview */}
                                          <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-sm">
                                                <div className="flex items-center justify-between mb-4">
                                                      <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Live Preview</p>
                                                      <button
                                                            onClick={() => setPreviewUnlocked(v => !v)}
                                                            className={"flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all " +
                                                                  (previewUnlocked
                                                                        ? "bg-[#DCFCE7] border-[#86EFAC] text-[#15803D]"
                                                                        : "bg-[#F3F4F6] border-[#D1D5DB] text-[#6B7280]")}
                                                      >
                                                            {previewUnlocked ? (
                                                                  <>
                                                                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8" />
                                                                              <path d="M14 2v6h6" />
                                                                              <path d="M10 12h4" />
                                                                        </svg>
                                                                        Gallery Open
                                                                  </>
                                                            ) : (
                                                                  <>
                                                                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                                              <rect x="3" y="11" width="18" height="11" rx="2" />
                                                                              <path d="M7 11V7a5 5 0 0110 0v4" />
                                                                        </svg>
                                                                        Gallery Closed
                                                                  </>
                                                            )}
                                                      </button>
                                                </div>
                                                <ThemePreview theme={currentTheme} eventName={currentEventName} font={currentFont} bgImage={currentBgImage} bgPosition={currentBgPosition} bgTint={currentBgTint} eventType={currentEventType} logoUrl={currentLogoUrl} isUnlocked={previewUnlocked} />
                                          </div>

                                          {/* QR code */}
                                          <QRCodeSection eventSlug={event.event_slug} />

                                          {/* Guest Sharing controls */}
                                          <div className="bg-white rounded-3xl border border-[#E8E4DA] p-5 shadow-sm flex flex-col gap-3">
                                                <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5]">Guest Sharing</p>
                                                {[
                                                      { label: 'Allow Downloads', sub: 'Guests can save photos', value: allowDownloads, toggle: toggleAllowDownloads },
                                                      { label: 'Allow Sharing', sub: 'Guests can share photos', value: allowSharing, toggle: toggleAllowSharing },
                                                ].map(({ label, sub, value, toggle }) => (
                                                      <div key={label} className="flex items-center justify-between gap-3">
                                                            <div>
                                                                  <p className="text-sm font-semibold text-[#1A1A18]">{label}</p>
                                                                  <p className="text-[11px] text-[#88887E]">{sub}</p>
                                                            </div>
                                                            <button
                                                                  onClick={toggle}
                                                                  aria-label={label}
                                                                  className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-[#1A1A18]' : 'bg-[#E0D8C6]'}`}
                                                            >
                                                                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
                                                            </button>
                                                      </div>
                                                ))}
                                          </div>
                                    </div>

                                    {/* RIGHT — controls */}
                                    <div className="md:col-span-8 flex flex-col gap-3">

                                          {/* Logo | Display Name | Event Type */}
                                          <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-sm">
                                                {/* Row 1 — controls all on same baseline */}
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
                                                                        className="flex-1 min-w-0 bg-[#F7F5F0] border-2 border-[#E8E4DA] rounded-xl px-3 py-2.5 text-sm font-bold text-[#1A1A18] focus:outline-none focus:border-[#1A1A18] transition-colors placeholder:text-[#C0BFB5] placeholder:font-normal"
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
                                                                        className="w-full appearance-none bg-[#F7F5F0] border-2 border-[#E8E4DA] rounded-xl px-3 py-2.5 text-sm font-bold text-[#1A1A18] focus:outline-none focus:border-[#1A1A18] transition-colors pr-8 cursor-pointer"
                                                                  >
                                                                        {EVENT_TYPES.map((t) => (
                                                                              <option key={t.id} value={t.id}>
                                                                                    {t.label}
                                                                              </option>
                                                                        ))}
                                                                  </select>
                                                                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#B0AFA5]" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                            </div>
                                                      </div>
                                                </div>

                                                {/* Row 2 — motto aligned under Event Type only */}
                                                <div className="flex gap-3 mt-1.5">
                                                      <div className="shrink-0 w-11" />
                                                      <div className="flex-1 min-w-0" />
                                                      <p className="shrink-0 w-36 text-[10px] text-[#B0AFA5] text-center">{currentEventType.tagline}</p>
                                                </div>
                                          </div>

                                          {/* Background photo */}
                                          <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-sm">
                                                <BackgroundUploader
                                                      eventId={event.id}
                                                      currentImageUrl={currentBgImage}
                                                      currentPosition={currentBgPosition}
                                                      currentTint={currentBgTint}
                                                      accentColor={currentTheme.colors.accent}
                                                      onSaved={(url, pos, tint) => { setLocalBgImage(url); setLocalBgPosition(pos); setLocalBgTint(tint) }}
                                                />
                                          </div>

                                          {/* Font + Color side by side */}
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                                <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-sm">
                                                      <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-3">Title Font</p>
                                                      <div className="flex flex-col gap-5">
                                                            {Object.entries(fontCategories).map(([catKey, fonts]) => (
                                                                  <div key={catKey}>
                                                                        <p className="text-[8px] font-bold text-[#C0BFB5] uppercase tracking-widest mb-1.5">
                                                                              {categoryLabels[catKey]}
                                                                        </p>
                                                                        <div className="grid grid-cols-3 gap-1.5">
                                                                              {fonts.map((font) => (
                                                                                    <button
                                                                                          key={font.id}
                                                                                          onClick={() => { setLocalFont(font.id); updateEventSettings({ font_family: font.id }) }}
                                                                                          title={font.name}
                                                                                          className={"flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-xl border transition-all " +
                                                                                                (currentFontId === font.id
                                                                                                      ? "border-[#1A1A18] bg-[#1A1A18] text-white"
                                                                                                      : "border-[#E8E4DA] bg-[#FAFAF8] text-[#1A1A18] hover:border-[#1A1A18]")}
                                                                                    >
                                                                                          <span className="text-lg leading-none" style={{ fontFamily: font.cssFamily }}>Aa</span>
                                                                                          <span className="text-[8px] font-bold uppercase tracking-wide text-current opacity-40 truncate w-full text-center">{font.name}</span>
                                                                                    </button>
                                                                              ))}
                                                                        </div>
                                                                  </div>
                                                            ))}
                                                      </div>
                                                </div>

                                                <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-sm">
                                                      <p className="text-[9px] font-black tracking-[0.25em] uppercase text-[#B0AFA5] mb-3">Color Palette</p>
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

                                          {/* Host uploader */}
                                          <HostUploader eventId={event.id} />
                                    </div>
                              </div>

                              {/* APPROVED STATS */}
                              <div className="bg-white rounded-2xl border border-[#E8E4DA] shadow-sm px-5 py-4 flex items-center gap-4">
                                    <div className="flex-1 flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-[#F4F3F0] flex items-center justify-center shrink-0">
                                                <svg width="15" height="15" fill="none" stroke="#1A1A18" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                                          </div>
                                          <div>
                                                <p className="text-[10px] font-bold text-[#88887E] uppercase tracking-widest">Photos</p>
                                                <p className="text-xl font-extrabold text-[#1A1A18] leading-tight">{approvedPhotoCount}</p>
                                          </div>
                                    </div>
                                    <div className="w-px h-10 bg-[#E8E4DA]" />
                                    <div className="flex-1 flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-[#F4F3F0] flex items-center justify-center shrink-0">
                                                <svg width="15" height="15" fill="none" stroke="#1A1A18" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
                                          </div>
                                          <div>
                                                <p className="text-[10px] font-bold text-[#88887E] uppercase tracking-widest">Videos</p>
                                                <p className="text-xl font-extrabold text-[#1A1A18] leading-tight">{approvedVideoCount}</p>
                                          </div>
                                    </div>
                                    <div className="w-px h-10 bg-[#E8E4DA]" />
                                    <div className="flex-1 flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-lg bg-[#F4F3F0] flex items-center justify-center shrink-0">
                                                <svg width="15" height="15" fill="none" stroke="#1A1A18" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                                          </div>
                                          <div>
                                                <p className="text-[10px] font-bold text-[#88887E] uppercase tracking-widest">In Gallery</p>
                                                <p className="text-xl font-extrabold text-[#1A1A18] leading-tight">{approvedPhotoCount + approvedVideoCount}</p>
                                          </div>
                                    </div>
                              </div>

                              {/* PHOTO MANAGEMENT */}
                              <div ref={photoSectionRef} className="bg-white rounded-2xl border border-[#E8E4DA] shadow-sm overflow-hidden">
                                    {/* Tab bar */}
                                    <div className="flex border-b border-[#E8E4DA] px-5">
                                          {[
                                                { label: 'Pending', count: pendingCount },
                                                { label: 'Live Gallery', count: null },
                                                { label: 'Trash', count: null },
                                          ].map(({ label, count }, i) => (
                                                <button
                                                      key={i}
                                                      onClick={() => setActiveTab(i)}
                                                      className={"pb-3 pt-3.5 mr-5 text-sm font-bold transition-all relative whitespace-nowrap " +
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
                                    <div className="p-4">
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

function ThemePreview({ theme, eventName, font, bgImage, bgPosition, bgTint, eventType, logoUrl, isUnlocked }) {
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

                  {/* Gallery status icon — top right */}
                  <div className="absolute top-3 right-4 z-20 flex items-center gap-1">
                        {isUnlocked ? (
                              /* Open door */
                              <svg width="14" height="14" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <path d="M13 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2v-5" />
                                    <path d="M13 4l5 2v6" />
                                    <circle cx="18" cy="9" r="0" />
                              </svg>
                        ) : (
                              /* Closed lock */
                              <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                              </svg>
                        )}
                  </div>

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

                              {isUnlocked ? (
                                    <>
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
                                    </>
                              ) : (
                                    <div className="mt-2 px-3 py-4 rounded-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                          <svg width="20" height="20" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="mx-auto mb-2">
                                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                                <path d="M7 11V7a5 5 0 0110 0v4" />
                                          </svg>
                                          <p className="text-[7px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>This event is not open yet.</p>
                                          <p className="text-[6px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Check back soon.</p>
                                    </div>
                              )}
                        </div>
                  </div>
            </div>
      )
}

function QRCodeSection({ eventSlug }) {
      const qrRef = useRef(null)
      const guestUrl = `${window.location.origin}/${eventSlug}`
      const [copied, setCopied] = useState(false)

      function copyLink() {
            navigator.clipboard.writeText(guestUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
      }

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
                  <div className="w-full flex items-center gap-2 bg-[#F7F5F0] border border-[#E8E4DA] rounded-xl px-3 py-2.5">
                        <a href={guestUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-[10px] text-[#6B6B63] truncate hover:text-[#1A1A18] transition-colors">
                              {guestUrl}
                        </a>
                        <button onClick={copyLink} aria-label="Copy link" className="shrink-0 text-[#B0AFA5] hover:text-[#1A1A18] transition-colors">
                              {copied ? <CheckIcon size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                  </div>
                  <button
                        onClick={downloadQR}
                        className="w-full bg-[#1A1A18] hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-full py-3 transition-all"
                  >
                        Download QR PNG
                  </button>
            </div>
      )
}

function CreateEventOnboarding({ onCreated, signOut }) {
      const { user } = useAuth()
      const [eventName, setEventName] = useState('')
      const [saving, setSaving] = useState(false)
      const [error, setError] = useState(null)

      async function handleCreate(e) {
            e.preventDefault()
            const name = eventName.trim()
            if (!name) return
            setSaving(true)
            setError(null)
            const { error: insertError } = await supabase
                  .from('events')
                  .insert({
                        host_id: user.id,
                        event_name: name,
                        event_slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 7),
                        gallery_unlocked: false,
                        theme: 'warm_editorial',
                        font_family: DEFAULT_FONT_ID,
                        event_type: DEFAULT_EVENT_TYPE_ID,
                  })
            if (insertError) {
                  setError(insertError.message)
                  setSaving(false)
                  return
            }
            onCreated()
      }

      return (
            <div className="min-h-screen bg-[#0E0E0C] flex flex-col items-center justify-center px-6">
                  <div className="w-full max-w-sm">
                        <div className="mb-10 flex flex-col items-center text-center">
                              <VantgeLogo variant="dark" className="mb-8" />
                              <h1 className="text-white text-2xl font-semibold tracking-tight mb-1">Create your event</h1>
                              <p className="text-white/50 text-sm">Give your event a name to get started.</p>
                        </div>
                        <form onSubmit={handleCreate} className="flex flex-col gap-3">
                              <input
                                    type="text"
                                    placeholder="e.g. Ashley &amp; James Wedding"
                                    value={eventName}
                                    onChange={e => setEventName(e.target.value)}
                                    maxLength={80}
                                    required
                                    className="w-full bg-white/[0.07] border border-white/12 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
                              />
                              {error && <p className="text-red-400 text-xs">{error}</p>}
                              <button
                                    type="submit"
                                    disabled={saving || !eventName.trim()}
                                    className="w-full bg-white text-[#0E0E0C] font-semibold rounded-xl py-3 text-sm transition-opacity disabled:opacity-40"
                              >
                                    {saving ? 'Creating…' : 'Create Event'}
                              </button>
                        </form>
                        <button
                              onClick={signOut}
                              className="mt-6 w-full text-white/30 text-xs text-center hover:text-white/50 transition-colors"
                        >
                              Sign out
                        </button>
                  </div>
            </div>
      )
}

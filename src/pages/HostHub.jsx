// src/pages/HostHub.jsx
// Landing page after login — shows Gallery card always, RSVP card once rsvp_enabled
import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useHostEvent } from '../hooks/useHostEvent'
import VantgeLogo from '../components/VantgeLogo'

export default function HostHub() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { event, loading: eventLoading } = useHostEvent()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true })
  }, [authLoading, user, navigate])

  const loading = authLoading || eventLoading

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0E0C] flex items-center justify-center">
        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" />
          <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  if (!user) return null

  const rsvpEnabled = event?.rsvp_enabled === true

  return (
    <div className="min-h-screen bg-[#0E0E0C] flex flex-col items-center justify-center px-5 py-12">

      {/* Logo */}
      <div className="mb-12 flex flex-col items-center">
        <a href="/"><VantgeLogo size="lg" variant="dark" /></a>
        <p className="text-[11px] text-white/30 tracking-[0.2em] uppercase mt-2">Event Tools</p>
      </div>

      {/* Greeting */}
      <div className="text-center mb-8">
        <p className="text-white/50 text-sm">Where would you like to go?</p>
        {event && <p className="text-white/30 text-xs mt-1">{event.event_name}</p>}
      </div>

      {/* Dashboard cards */}
      <div className="w-full max-w-sm flex flex-col gap-3">

        {/* Gallery */}
        <p className="text-[9px] font-black tracking-[0.25em] uppercase text-white/25 px-1 mb-1">Gallery</p>
        <Link to="/dashboard"
          className="group relative bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 hover:border-white/20 rounded-3xl p-6 flex items-center gap-5 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors">
            <svg width="22" height="22" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base leading-tight">Gallery Dashboard</p>
            <p className="text-white/40 text-xs mt-0.5">Photos, QR code, event settings</p>
          </div>
          <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="text-white/30 group-hover:text-white/60 transition-colors shrink-0">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>

        {/* RSVP */}
        <div className="h-px bg-white/[0.06] my-3" />
        <p className="text-[9px] font-black tracking-[0.25em] uppercase text-white/25 px-1 mb-1">RSVP</p>

        {/* RSVP card — shown once rsvp_enabled */}
        {rsvpEnabled ? (
          <Link to="/rsvp-dashboard"
            className="group relative bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 hover:border-white/20 rounded-3xl p-6 flex items-center gap-5 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors">
              <svg width="22" height="22" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base leading-tight">RSVP Dashboard</p>
              <p className="text-white/40 text-xs mt-0.5">Responses, food sign-up, invitations</p>
            </div>
            <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="text-white/30 group-hover:text-white/60 transition-colors shrink-0">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        ) : (
          /* Teaser card — RSVP not yet enabled */
          <Link to="/rsvp-dashboard"
            className="group relative border border-dashed border-white/[0.12] hover:border-white/25 rounded-3xl p-6 flex items-center gap-5 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center shrink-0">
              <svg width="22" height="22" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" opacity="0.35">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white/35 font-bold text-base leading-tight">RSVP Dashboard</p>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/25 border border-white/15 rounded-full px-2 py-0.5">Set up</span>
              </div>
              <p className="text-white/25 text-xs mt-0.5">Enable RSVP to add this dashboard</p>
            </div>
            <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="text-white/20 shrink-0">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </Link>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={async () => { await signOut(); navigate('/login') }}
        className="mt-10 text-xs text-white/25 hover:text-white/50 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}

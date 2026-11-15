import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import VantgeLogo from './VantgeLogo'

// One header for the Event and RSVP dashboards, so the logo and buttons never move between pages
export default function DashboardHeader({ active, onSignOut }) {
  const pill = 'px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all'
  const on = 'bg-white text-[#1A1A18] border-white'
  const off = 'border-white/20 text-white/60 hover:border-white/40 hover:text-white'
  // The demo (/try) has its own links and no sign-out, so the header stays inside it
  const inDemo = typeof window !== 'undefined' && (window.location.pathname === '/try' || window.location.pathname.startsWith('/try/'))
  return (
    <header className="bg-ink sticky top-0 z-50">
      <div className="max-w-[1024px] mx-auto px-5 md:px-8 h-14 flex items-center justify-between gap-4">
        <a href="/" aria-label="Go to home page" className="shrink-0">
          <VantgeLogo size="sm" variant="dark" />
        </a>
        <div className="flex items-center gap-2">
          {!inDemo && <Link to="/dashboard" className={`${pill} ${active === 'event' ? on : off}`}>Event</Link>}
          {!inDemo && <Link to="/rsvp-dashboard" className={`${pill} ${active === 'rsvp' ? on : off}`}>RSVP</Link>}
          {!inDemo && (
            <button onClick={onSignOut} aria-label="Sign out" title="Sign out"
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

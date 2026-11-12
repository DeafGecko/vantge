import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import VantgeLogo from './VantgeLogo'

// One header for the Event and RSVP dashboards, so the logo and buttons never move between pages
export default function DashboardHeader({ active, onSignOut }) {
  const pill = 'px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all'
  const on = 'bg-white text-[#1A1A18] border-white'
  const off = 'border-white/20 text-white/60 hover:border-white/40 hover:text-white'
  return (
    <header className="bg-ink sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between gap-4">
        <Link to="/" aria-label="Go to home page" className="shrink-0">
          <VantgeLogo size="sm" variant="dark" />
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className={`${pill} ${active === 'event' ? on : off}`}>Event</Link>
          <Link to="/rsvp-dashboard" className={`${pill} ${active === 'rsvp' ? on : off}`}>RSVP</Link>
          <button onClick={onSignOut} aria-label="Sign out" title="Sign out"
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}

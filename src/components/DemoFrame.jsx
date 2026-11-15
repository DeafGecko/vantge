import { Link } from 'react-router-dom'

// Wraps the demo dashboards with a bar that explains the demo and links between them
export default function DemoFrame({ children }) {
  return (
    <>
      {children}
      <div className="fixed bottom-0 inset-x-0 z-[100] bg-[#1A1A18]/90 backdrop-blur text-white text-xs flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-3">
        <span className="font-bold uppercase tracking-widest">Demo</span>
        <span className="text-white/60">Changes stay in this tab. Reload the page to reset.</span>
        <Link to="/try/event" className="font-bold underline underline-offset-4 hover:text-white/80">Event dashboard</Link>
        <Link to="/try/rsvp" className="font-bold underline underline-offset-4 hover:text-white/80">RSVP dashboard</Link>
        <Link to="/" className="text-white/60 hover:text-white">Back to Vantge</Link>
      </div>
    </>
  )
}

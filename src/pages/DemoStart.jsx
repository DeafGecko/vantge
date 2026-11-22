import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetDemo } from '../demo/demoClient'
import VantgeLogo from '../components/VantgeLogo'

// Start of the browser-only playground: Demo or Full access, then the dashboard
export default function DemoStart() {
  const navigate = useNavigate()
  const [choice, setChoice] = useState(null) // null | 'full'
  const [eventName, setEventName] = useState('')

  // Demo: the sample party, ready to look at
  function openDemo() {
    resetDemo('')
    navigate('/try/event')
  }

  // Full access: a new event with your own name, every feature available in this browser
  function openFull(e) {
    e.preventDefault()
    resetDemo(eventName)
    navigate('/try/event')
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#1A1A18] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E0D8C6] shadow-sm p-8 text-center">
        <div className="flex flex-col items-center">
          <a href="/" aria-label="Vantge home"><VantgeLogo size="lg" variant="light" /></a>
          <p className="text-[11px] text-[#8A7D6A] tracking-[0.2em] uppercase mt-2">Event Photo Sharing</p>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#8A7D6A] mt-8">Vantge demo</p>
        <h1 className="text-2xl font-bold mt-2">Try the event dashboard</h1>
        <p className="text-sm text-[#5A5448] mt-2">
          Nothing to sign up for. Your changes stay in this browser, and you can reset at any time.
        </p>

        {choice === null ? (
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={openDemo}
              className="w-full rounded-xl bg-[#1A1A18] text-white font-bold py-3 text-sm"
            >
              Demo
              <span className="block text-xs font-normal opacity-70 mt-0.5">Look at Sam's Birthday Party</span>
            </button>
            <button
              type="button"
              onClick={() => setChoice('full')}
              className="w-full rounded-xl border border-[#E0D8C6] font-bold py-3 text-sm hover:bg-[#F4F3F0]"
            >
              Full access
              <span className="block text-xs font-normal text-[#5A5448] mt-0.5">Create your own event and try every feature</span>
            </button>
          </div>
        ) : (
          <form onSubmit={openFull} className="mt-6 space-y-3 text-left">
            <label htmlFor="demo-event" className="block text-sm font-bold">Name of your party or event</label>
            <input
              id="demo-event"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              placeholder="e.g. Sam's 40th Birthday"
              className="w-full rounded-xl border border-[#E0D8C6] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A18]/20"
            />
            <button type="submit" className="w-full rounded-xl bg-[#1A1A18] text-white font-bold py-3 text-sm">
              Open event dashboard
            </button>
            <button
              type="button"
              onClick={() => setChoice(null)}
              className="w-full text-xs text-[#8A7D6A] underline underline-offset-4 py-2"
            >
              Back to the two choices
            </button>
          </form>
        )}

        <a href="/" className="block text-center text-xs text-[#8A7D6A] underline underline-offset-4 mt-6">Back to Vantge</a>
      </div>
    </div>
  )
}

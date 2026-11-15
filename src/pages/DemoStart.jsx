import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetDemo } from '../demo/demoClient'
import VantgeLogo from '../components/VantgeLogo'

const ACCESS_CODE = 'demo'

// Start of the browser-only playground: access code, then the event title, then the dashboard
export default function DemoStart() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [codeOk, setCodeOk] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [eventName, setEventName] = useState('')

  function checkCode(e) {
    e.preventDefault()
    if (code.trim().toLowerCase() === ACCESS_CODE) {
      setCodeOk(true)
      setCodeError('')
    } else {
      setCodeError('That access code is not right. Try "Demo".')
    }
  }

  function start(e) {
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

        {!codeOk ? (
          <form onSubmit={checkCode} className="mt-6 space-y-3 text-left">
            <label htmlFor="demo-code" className="block text-sm font-bold">Access code</label>
            <input
              id="demo-code"
              value={code}
              onChange={e => setCode(e.target.value)}
              autoComplete="off"
              className="w-full rounded-xl border border-[#E0D8C6] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A18]/20"
            />
            {codeError && <p className="text-xs text-red-700">{codeError}</p>}
            <button type="submit" className="w-full rounded-xl bg-[#1A1A18] text-white font-bold py-3 text-sm">
              Continue
            </button>
          </form>
        ) : (
          <form onSubmit={start} className="mt-6 space-y-3">
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
              onClick={() => { resetDemo(''); navigate('/try/event') }}
              className="w-full rounded-xl border border-[#E0D8C6] font-bold py-3 text-sm hover:bg-[#F4F3F0]"
            >
              Use the sample party instead
            </button>
          </form>
        )}

        <a href="/" className="block text-center text-xs text-[#8A7D6A] underline underline-offset-4 mt-6">Back to Vantge</a>
      </div>
    </div>
  )
}

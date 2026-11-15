import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ExternalLink } from 'lucide-react'
import { resetDemo } from '../demo/demoClient'

const PHONE_WIDTH = 390
const PHONE_HEIGHT = 844

// Wraps the demo dashboard with a bar that explains the demo and links to the parts of it that are shown
export default function DemoFrame({ children }) {
  const [showQr, setShowQr] = useState(false)
  const origin = window.location.origin
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const phoneUrl = `${origin}/try/demo`

  function reset() {
    resetDemo('')
    window.location.reload()
  }

  // Opens the demo in a window the size of a phone, to check the mobile layout on the computer
  function openPhoneView() {
    window.open(phoneUrl, 'vantge-phone-view', `width=${PHONE_WIDTH},height=${PHONE_HEIGHT}`)
  }

  return (
    <>
      {children}
      {showQr && (
        <div className="fixed bottom-16 right-4 z-[100] w-64 bg-white text-[#1A1A18] rounded-2xl border border-[#E0D8C6] shadow-lg p-4 text-xs">
          <p className="font-bold text-sm">Open on your phone</p>
          <p className="text-[#5A5448] mt-1">Scan with the phone camera. Phone and computer must be on the same Wi-Fi.</p>
          <div className="flex justify-center my-3">
            <QRCodeSVG value={phoneUrl} size={136} level="M" fgColor="#1A1A18" bgColor="#F7F5F0" />
          </div>
          <div className="flex items-center gap-2">
            <input readOnly value={phoneUrl} onFocus={e => e.target.select()} className="min-w-0 flex-1 rounded-lg border border-[#E0D8C6] px-2 py-1.5 text-[11px]" />
            <button type="button" onClick={openPhoneView} aria-label="Open phone-size view in a window" title="Open phone-size view"
              className="shrink-0 p-2 rounded-lg border border-[#E0D8C6] hover:bg-[#F4F3F0]">
              <ExternalLink size={16} />
            </button>
          </div>
          {isLocalhost && (
            <p className="text-[#8A7D6A] mt-2">This is localhost, so a phone cannot reach it. Open the site with your computer's network address (for example http://192.168.1.248:4173/try) and use that QR code.</p>
          )}
        </div>
      )}
      <div className="fixed bottom-0 inset-x-0 z-[100] bg-[#1A1A18]/90 backdrop-blur text-white text-xs flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-3">
        <span className="font-bold uppercase tracking-widest">Demo</span>
        <span className="text-white/60">Changes stay in this browser.</span>
        <button type="button" onClick={() => setShowQr(v => !v)} className="font-bold underline underline-offset-4 hover:text-white/80">Phone QR</button>
        <button type="button" onClick={openPhoneView} className="font-bold underline underline-offset-4 hover:text-white/80 inline-flex items-center gap-1">
          <ExternalLink size={12} /> Phone view
        </button>
        <Link to="/try/event" className="font-bold underline underline-offset-4 hover:text-white/80">Event dashboard</Link>
        <Link to="/try/demo" className="font-bold underline underline-offset-4 hover:text-white/80">Guest page</Link>
        <button type="button" onClick={reset} className="text-white/60 hover:text-white underline underline-offset-4">Reset demo</button>
        <Link to="/try" className="text-white/60 hover:text-white">Start again</Link>
      </div>
    </>
  )
}

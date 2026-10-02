import VantgeLogo from '../components/VantgeLogo'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function PendingApproval() {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#0E0E0C] flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="mb-10">
          <a href="/"><VantgeLogo size="lg" variant="dark" /></a>
        </div>

        <div className="bg-white/[0.05] border border-white/[0.08] rounded-3xl p-8 w-full">
          <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-5">
            <svg width="22" height="22" fill="none" stroke="#F59E0B" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <h1 className="text-white font-black text-xl mb-2 tracking-tight">Pending approval</h1>
          <p className="text-white/45 text-sm leading-relaxed mb-6">
            Your account is awaiting approval. We'll review your request and get back to you shortly.
          </p>

          <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl px-4 py-3 mb-6">
            <p className="text-white/30 text-xs">During the beta, each account is manually reviewed before access is granted.</p>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl bg-white/[0.07] border border-white/10 text-white/50 text-sm hover:text-white hover:bg-white/[0.12] transition-all"
          >
            Sign out
          </button>
        </div>

        <p className="text-white/20 text-xs mt-5">Questions? Contact us at hello@vantge.app</p>
      </div>
    </div>
  )
}

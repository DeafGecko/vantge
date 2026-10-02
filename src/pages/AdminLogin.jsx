import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../hooks/useAdminAuth'
import VantgeLogo from '../components/VantgeLogo'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { adminUser, loading, adminSignIn } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    if (!loading && adminUser) navigate('/admin', { replace: true })
  }, [adminUser, loading, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: err } = await adminSignIn(email, password)
    if (err) { setError(err.message); setSubmitting(false) }
    else navigate('/admin', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#0A0A08] flex items-center justify-center px-5 py-12 relative overflow-hidden">
      {/* Subtle grid bg */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo + label */}
        <div className="flex flex-col items-center mb-10">
          <VantgeLogo size="lg" variant="dark" />
          <div className="mt-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-red-400/80">Master Admin</span>
          </div>
        </div>

        <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-7 shadow-2xl">
          <h1 className="text-xl font-black text-white mb-1 tracking-tight">Admin access</h1>
          <p className="text-sm text-white/35 mb-6">Restricted to super admins only.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-white/40 mb-1.5 tracking-widest uppercase">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@vantge.com"
                className="w-full bg-white/[0.08] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-white/40 mb-1.5 tracking-widest uppercase">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-white/[0.08] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors pr-12"
                />
                <button type="button" onClick={() => setShowPw(s => !s)} tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPw
                    ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-white hover:bg-[#F0EEE8] text-[#1A1A18] font-bold rounded-xl py-3.5 px-6 transition-all text-sm tracking-wide disabled:opacity-40 flex items-center justify-center gap-2 group mt-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" /><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" /></svg>
                  Verifying…
                </>
              ) : (
                <>
                  Enter Admin
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-[10px] text-white/20 text-center mt-5 tracking-widest uppercase">
          Not a host login — go to <a href="/login" className="text-white/40 hover:text-white/60 underline transition-colors">/login</a>
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import VantgeLogo from '../components/VantgeLogo'

const HERO_PHOTOS = [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80',
      'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=80',
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80',
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&q=80',
]

export default function HostLogin() {
      const navigate = useNavigate()
      const { user, loading: authLoading, signIn, signOut } = useAuth()
      const [email, setEmail] = useState('')
      const [password, setPassword] = useState('')
      const [submitting, setSubmitting] = useState(false)
      const [error, setError] = useState(null)
      const [showPassword, setShowPassword] = useState(false)
      const [signingOut, setSigningOut] = useState(false)

      async function handleSignOut() {
            setSigningOut(true)
            await signOut()
            setSigningOut(false)
      }

      async function handleSubmit(e) {
            e.preventDefault()
            setError(null)
            setSubmitting(true)
            const { error: signInError } = await signIn(email, password)
            if (signInError) {
                  setError(signInError.message)
                  setSubmitting(false)
            } else {
                  navigate('/dashboard')
            }
      }

      if (!authLoading && user) return (
            <div className="min-h-screen bg-[#0E0E0C] flex flex-col items-center justify-center px-5">
                  <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ marginBottom: 40 }}>
                              <VantgeLogo size="lg" variant="dark" />
                        </div>
                        <p className="text-white/60 text-sm" style={{ marginBottom: 4 }}>You're already signed in as</p>
                        <p className="text-white font-semibold text-sm" style={{ marginBottom: 32, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                        <button
                              onClick={() => navigate('/dashboard')}
                              style={{ width: '100%', marginBottom: 12 }}
                              className="bg-white text-[#1A1A18] font-bold rounded-xl py-3.5 text-sm transition-opacity hover:opacity-90"
                        >
                              Go to Dashboard
                        </button>
                        <button
                              onClick={handleSignOut}
                              disabled={signingOut}
                              style={{ width: '100%' }}
                              className="bg-white/[0.07] border border-white/10 text-white/60 hover:text-white font-semibold rounded-xl py-3.5 text-sm transition-all disabled:opacity-40"
                        >
                              {signingOut ? 'Signing out…' : 'Sign out'}
                        </button>
                  </div>
            </div>
      )

      return (
            <div className="min-h-screen bg-[#0E0E0C] flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden">

                  {/* Background photo strip — decorative */}
                  <div className="absolute inset-0 flex">
                        {HERO_PHOTOS.map((src, i) => (
                              <div key={i} className="flex-1 relative overflow-hidden" style={{ opacity: 0.18 }}>
                                    <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                              </div>
                        ))}
                  </div>

                  {/* Vignette overlay */}
                  <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 10%, #0E0E0C 75%)' }} />

                  {/* Card */}
                  <div className="relative z-10 w-full max-w-sm">

                        {/* Brand mark */}
                        <div className="flex flex-col items-center mb-10">
                              <VantgeLogo size="lg" variant="dark" />
                              <p className="text-[11px] text-white/40 tracking-[0.2em] uppercase mt-2">Event Photo Sharing</p>
                        </div>

                        {/* Form card */}
                        <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl">

                              <h1 className="text-xl font-black text-white mb-1 tracking-tight">Welcome back</h1>
                              <p className="text-sm text-white/40 mb-6">Sign in to manage your event.</p>

                              <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                          <label className="block text-[10px] font-bold text-white/40 mb-1.5 tracking-widest uppercase">
                                                Email
                                          </label>
                                          <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                autoComplete="email"
                                                placeholder="you@example.com"
                                                className="w-full bg-white/[0.08] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
                                          />
                                    </div>

                                    <div>
                                          <label className="block text-[10px] font-bold text-white/40 mb-1.5 tracking-widest uppercase">
                                                Password
                                          </label>
                                          <div className="relative">
                                                <input
                                                      type={showPassword ? 'text' : 'password'}
                                                      value={password}
                                                      onChange={(e) => setPassword(e.target.value)}
                                                      required
                                                      autoComplete="current-password"
                                                      placeholder="••••••••"
                                                      className="w-full bg-white/[0.08] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors pr-12"
                                                />
                                                <button
                                                      type="button"
                                                      onClick={() => setShowPassword(s => !s)}
                                                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                                      tabIndex={-1}
                                                >
                                                      {showPassword ? (
                                                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                      ) : (
                                                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                      )}
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
                                          className="w-full bg-white hover:bg-[#F0EEE8] text-[#1A1A18] font-bold rounded-xl py-3.5 px-6 transition-all text-sm tracking-wide disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 group mt-2"
                                    >
                                          {submitting ? (
                                                <>
                                                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" /><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" /></svg>
                                                      Signing in...
                                                </>
                                          ) : (
                                                <>
                                                      Sign in
                                                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                </>
                                          )}
                                    </button>
                              </form>

                        </div>

                        <p className="text-xs text-white/30 text-center mt-5">
                              Don't have an account?{' '}
                              <a href="/signup" className="text-white/60 hover:text-white underline transition-colors">
                                    Create one
                              </a>
                        </p>
                        <p className="text-[10px] text-white/20 text-center mt-4 tracking-widest uppercase">
                              Host access only — guests use your event link
                        </p>
                  </div>
            </div>
      )
}

import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const PHOTO_COLLAGE = [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80', // wedding couple
      'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80', // party balloons
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80', // conference keynote stage
      'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=600&q=80', // conference audience
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80', // celebration
      'https://images.unsplash.com/photo-1510076857177-7470076d4098?w=600&q=80', // wedding flowers
]

export default function HostLogin() {
      const navigate = useNavigate()
      const { user, loading: authLoading, signIn } = useAuth()
      const [email, setEmail] = useState('')
      const [password, setPassword] = useState('')
      const [submitting, setSubmitting] = useState(false)
      const [error, setError] = useState(null)
      const [showPassword, setShowPassword] = useState(false)

      if (!authLoading && user) {
            return <Navigate to="/host/dashboard" replace />
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
                  navigate('/host/dashboard')
            }
      }

      return (
            <div className="min-h-screen flex">

                  {/* LEFT — Login form */}
                  <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16 bg-[#FDFCF8]" style={{ minWidth: 0 }}>
                        <div className="max-w-md w-full mx-auto">

                              {/* Brand */}
                              <div className="mb-12">
                                    <div className="flex items-center gap-2.5 mb-6">
                                          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                                <circle cx="14" cy="14" r="14" fill="#1A1A18" />
                                                <path d="M8 14a2 2 0 012-2h4l2-4 2 4h0a2 2 0 012 2v4a2 2 0 01-2 2H10a2 2 0 01-2-2v-4z" fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                                                <circle cx="14" cy="14" r="2" fill="white" />
                                          </svg>
                                          <span className="text-xl font-black tracking-tighter text-[#1A1A18]">vantge</span>
                                    </div>
                                    <h1 className="text-4xl font-black tracking-tight text-[#1A1A18] leading-tight mb-3">
                                          Welcome back
                                    </h1>
                                    <p className="text-[#6B6B63] text-base leading-relaxed">
                                          Sign in to manage your event, review photos, and share memories with your guests.
                                    </p>
                              </div>

                              {/* Form */}
                              <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                          <label className="block text-xs font-bold text-[#1A1A18] mb-2 tracking-widest uppercase">
                                                Email address
                                          </label>
                                          <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                autoComplete="email"
                                                placeholder="you@example.com"
                                                className="w-full bg-white border-2 border-[#E8E4DA] rounded-xl px-4 py-3.5 text-sm text-[#1A1A18] placeholder:text-[#B0AFA5] focus:outline-none focus:border-[#1A1A18] transition-colors"
                                          />
                                    </div>

                                    <div>
                                          <label className="block text-xs font-bold text-[#1A1A18] mb-2 tracking-widest uppercase">
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
                                                      className="w-full bg-white border-2 border-[#E8E4DA] rounded-xl px-4 py-3.5 text-sm text-[#1A1A18] placeholder:text-[#B0AFA5] focus:outline-none focus:border-[#1A1A18] transition-colors pr-12"
                                                />
                                                <button
                                                      type="button"
                                                      onClick={() => setShowPassword(s => !s)}
                                                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#88887E] hover:text-[#1A1A18] transition-colors"
                                                      tabIndex={-1}
                                                >
                                                      {showPassword ? (
                                                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                      ) : (
                                                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                      )}
                                                </button>
                                          </div>
                                    </div>

                                    {error && (
                                          <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                                {error}
                                          </div>
                                    )}

                                    <button
                                          type="submit"
                                          disabled={submitting}
                                          className="w-full bg-[#1A1A18] hover:bg-black text-white font-bold rounded-xl py-4 px-6 transition-all text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                                    >
                                          {submitting ? (
                                                <>
                                                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" /><path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" /></svg>
                                                      Signing in...
                                                </>
                                          ) : (
                                                <>
                                                      Sign in
                                                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="transition-transform group-hover:translate-x-0.5"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                </>
                                          )}
                                    </button>
                              </form>

                              <p className="text-xs text-[#B0AFA5] text-center mt-8">
                                    Host access only — guests use your event link.
                              </p>
                        </div>
                  </div>

                  {/* RIGHT — Photo collage panel (hidden on small screens) */}
                  <div className="hidden lg:flex w-[52%] relative overflow-hidden bg-[#1A1A18]">
                        {/* Collage grid */}
                        <div className="absolute inset-0 grid grid-cols-2 gap-2 p-4 opacity-90">
                              {PHOTO_COLLAGE.map((src, i) => (
                                    <div
                                          key={i}
                                          className="rounded-2xl overflow-hidden bg-[#2A2A28]"
                                          style={{ gridRow: i === 0 ? 'span 2' : 'auto' }}
                                    >
                                          <img
                                                src={src}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                          />
                                    </div>
                              ))}
                        </div>

                        {/* Dark gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A18] via-transparent to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#1A1A18]/30 to-transparent" />

                        {/* Text overlay */}
                        <div className="absolute bottom-10 left-10 right-10 z-10">
                              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/50 mb-3">Event Photography</p>
                              <h2 className="text-4xl font-black tracking-tight text-white leading-tight mb-3">
                                    Capture<br />What Matters
                              </h2>
                              <p className="text-white/60 text-sm leading-relaxed max-w-xs">
                                    Simple tools for hosts. Beautiful experiences for guests.
                              </p>
                              <div className="flex flex-col gap-2.5 mt-6">
                                    {[
                                          { icon: 'camera', label: 'Manage Events', sub: 'Organize and control your galleries' },
                                          { icon: 'users', label: 'Engage Guests', sub: 'Easy access and sharing' },
                                          { icon: 'bar', label: 'Track Performance', sub: 'See real-time insights' },
                                    ].map(({ label, sub }) => (
                                          <div key={label} className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                                      <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                                                </div>
                                                <div>
                                                      <p className="text-white text-sm font-bold leading-tight">{label}</p>
                                                      <p className="text-white/50 text-xs">{sub}</p>
                                                </div>
                                          </div>
                                    ))}
                              </div>
                        </div>
                  </div>
            </div>
      )
}

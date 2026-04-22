import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function HostLogin() {
      const navigate = useNavigate()
      const { user, loading: authLoading, signIn } = useAuth()
      const [email, setEmail] = useState('')
      const [password, setPassword] = useState('')
      const [submitting, setSubmitting] = useState(false)
      const [error, setError] = useState(null)

      // If already logged in, redirect to dashboard
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
                  // Success — AuthProvider's listener will update user state,
                  // and navigate will trigger the redirect
                  navigate('/host/dashboard')
            }
      }

      return (
            <div className="min-h-screen bg-cream flex items-center justify-center p-6">
                  <div className="max-w-sm w-full">

                        {/* Small brand wordmark at top */}
                        <div className="text-center mb-10">
                              <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1A18] mb-2">
                                    vantge
                              </h1>
                              <p className="text-xs text-[#88887E] tracking-wide uppercase">
                                    Host login
                              </p>
                        </div>

                        {/* Login card */}
                        <div className="bg-white rounded-2xl border border-[#E0D8C6] p-6">

                              <form onSubmit={handleSubmit} className="space-y-4">

                                    {/* Email field */}
                                    <div>
                                          <label className="block text-xs font-medium text-[#5A5A52] mb-2 tracking-wide uppercase">
                                                Email
                                          </label>
                                          <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                autoComplete="email"
                                                className="w-full bg-[#FDFCF7] border border-[#E0D8C6] rounded-lg px-4 py-3 text-sm text-[#1A1A18] focus:outline-none focus:border-[#C84A44] transition-colors"
                                          />
                                    </div>

                                    {/* Password field */}
                                    <div>
                                          <label className="block text-xs font-medium text-[#5A5A52] mb-2 tracking-wide uppercase">
                                                Password
                                          </label>
                                          <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                autoComplete="current-password"
                                                className="w-full bg-[#FDFCF7] border border-[#E0D8C6] rounded-lg px-4 py-3 text-sm text-[#1A1A18] focus:outline-none focus:border-[#C84A44] transition-colors"
                                          />
                                    </div>

                                    {/* Error message */}
                                    {error && (
                                          <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-sm rounded-lg px-4 py-3">
                                                {error}
                                          </div>
                                    )}

                                    {/* Submit button */}
                                    <button
                                          type="submit"
                                          disabled={submitting}
                                          className="w-full bg-[#C84A44] hover:bg-[#B43E39] text-white font-medium rounded-full py-3 px-6 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                          {submitting ? 'Signing in...' : 'Sign in'}
                                    </button>
                              </form>
                        </div>

                        <p className="text-xs text-[#88887E] text-center mt-6">
                              For hosts only. Guests upload via event URL.
                        </p>

                  </div>
            </div>
      )
}
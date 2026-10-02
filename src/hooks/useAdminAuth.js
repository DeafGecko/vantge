import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAdminAuth() {
  const [adminUser, setAdminUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role
        if (role === 'super_admin') {
          setAdminUser(session.user)
        } else {
          setAdminUser(null)
        }
      } else {
        setAdminUser(null)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role
        setAdminUser(role === 'super_admin' ? session.user : null)
      } else {
        setAdminUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function adminSignIn(email, password) {
    setError(null)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(signInError.message); return { error: signInError } }
    const role = data.user?.user_metadata?.role
    if (role !== 'super_admin') {
      await supabase.auth.signOut()
      const msg = 'Access denied. Super admin only.'
      setError(msg)
      return { error: { message: msg } }
    }
    setAdminUser(data.user)
    return { error: null }
  }

  async function adminSignOut() {
    await supabase.auth.signOut()
    setAdminUser(null)
  }

  return { adminUser, loading, error, adminSignIn, adminSignOut }
}

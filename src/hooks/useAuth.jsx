import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

/**
 * AuthProvider wraps your app and makes auth state available everywhere.
 * Tracks: current user session, loading state, and auth methods.
 */
export function AuthProvider({ children }) {
      const [session, setSession] = useState(null)
      const [loading, setLoading] = useState(true)

      useEffect(() => {
            // On mount: check if there's already a session (e.g., user refreshed the page)
            supabase.auth.getSession().then(({ data: { session } }) => {
                  setSession(session)
                  setLoading(false)
            })

            // Subscribe to future auth changes (login, logout, token refresh)
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                  (_event, session) => {
                        setSession(session)
                        setLoading(false)
                  }
            )

            // Cleanup: unsubscribe when AuthProvider unmounts
            return () => subscription.unsubscribe()
      }, [])

      const signIn = async (email, password) => {
            const { data, error } = await supabase.auth.signInWithPassword({
                  email,
                  password,
            })
            return { data, error }
      }

      const signOut = async () => {
            const { error } = await supabase.auth.signOut()
            return { error }
      }

      const value = {
            session,
            user: session?.user ?? null,
            loading,
            signIn,
            signOut,
      }

      return (
            <AuthContext.Provider value={value}>
                  {children}
            </AuthContext.Provider>
      )
}

/**
 * Hook that any component can call to access auth state.
 * Example: const { user, signIn, signOut } = useAuth()
 */
export function useAuth() {
      const context = useContext(AuthContext)
      if (!context) {
            throw new Error('useAuth must be used inside AuthProvider')
      }
      return context
}
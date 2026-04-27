import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
      const [session, setSession] = useState(null)
      const [loading, setLoading] = useState(true)

      useEffect(() => {
            // Check current session
            supabase.auth.getSession().then(({ data: { session } }) => {
                  setSession(session)
                  setLoading(false)
            })

            // Listen for changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                  (_event, session) => {
                        setSession(session)
                        setLoading(false)
                  }
            )

            return () => subscription.unsubscribe()
      }, [])

      const signIn = async (email, password) => {
            return await supabase.auth.signInWithPassword({ email, password })
      }

      const signOut = async () => {
            return await supabase.auth.signOut()
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
                  {!loading && children}
            </AuthContext.Provider>
      )
}

export function useAuth() {
      const context = useContext(AuthContext)
      if (!context) throw new Error('useAuth must be used inside AuthProvider')
      return context
}
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }) {
      const { user, loading } = useAuth()

      // While checking if user is logged in, show a loading state
      if (loading) {
            return (
                  <div className="min-h-screen bg-cream flex items-center justify-center">
                        <p className="text-sm text-[#5A5A52]">Loading...</p>
                  </div>
            )
      }

      // Not logged in? Kick them to login
      if (!user) {
            return <Navigate to="/login" replace />
      }

      // Logged in — render whatever was inside <ProtectedRoute>
      return children
}
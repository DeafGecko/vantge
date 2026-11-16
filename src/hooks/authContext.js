import { createContext } from 'react'

// Shared sign-in state object; used by AuthProvider (component) and useAuth (hook)
export const AuthContext = createContext(null)

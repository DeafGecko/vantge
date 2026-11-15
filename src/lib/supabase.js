import { createClient } from '@supabase/supabase-js'
import { createDemoClient } from '../demo/demoClient'

const realClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
)

const demoClient = createDemoClient()

// Pages under /try/ use the in-browser demo, so they never touch the real database.
// Checked on every call, not once at load, because in-app navigation (e.g. /try -> /try/event)
// does not reload this module.
const isDemoPage = () => {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  return path === '/try' || path.startsWith('/try/')
}

export const supabase = new Proxy({}, {
  get(_, prop) {
    const client = isDemoPage() ? demoClient : realClient
    const value = client[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

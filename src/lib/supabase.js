import { createClient } from '@supabase/supabase-js'
import { createDemoClient } from '../demo/demoClient'

const realClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Pages under /try/ use the in-browser demo, so they never touch the real database
const isDemoPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/try/')

export const supabase = isDemoPage ? createDemoClient() : realClient

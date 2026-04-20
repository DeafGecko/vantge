import { useEffect, useState } from 'react' // Standard React tools
import { supabase } from './lib/supabase'   // Your connection to the database

function App() { // Now the function starts AFTER all imports are finished
  const [status, setStatus] = useState('Checking...')

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setStatus('❌ Connection failed: ' + error.message)
        console.error(error)
      } else {
        setStatus('✅ Supabase connected. Session: ' + (data.session ? 'logged in' : 'null (expected)'))
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#F8F5ED] flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <h1 className="text-5xl font-extrabold tracking-tight text-[#1A1A18] mb-2">
          vantge
        </h1>
        <p className="text-sm text-[#5A5A52] mb-6">Day 1 — infrastructure check</p>
        <div className="bg-white rounded-2xl border border-[#E0D8C6] p-4">
          <p className="text-sm text-[#1A1A18]">{status}</p>
        </div>
      </div>
    </div>
  )
}

export default App
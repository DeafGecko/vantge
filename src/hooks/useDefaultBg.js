import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getEventType } from '../lib/eventTypes'

export function useDefaultBg(eventType) {
  const key = eventType || 'none'
  const fallback = eventType ? (getEventType(eventType)?.defaultBg ?? null) : null
  const [bg, setBg] = useState(fallback)

  useEffect(() => {
    let cancelled = false
    supabase.from('admin_branding').select('background_url').eq('event_type', key).maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setBg(data?.background_url || fallback)
      })
    return () => { cancelled = true }
  }, [key, fallback])

  return bg
}

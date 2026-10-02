import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getEventType } from '../lib/eventTypes'

const cache = {}

export function useDefaultBg(eventType) {
  const key = eventType || 'none'
  const fallback = eventType ? (getEventType(eventType)?.defaultBg ?? null) : null
  const [bg, setBg] = useState(cache[key] !== undefined ? cache[key] : fallback)

  useEffect(() => {
    if (cache[key] !== undefined) { setBg(cache[key]); return }
    supabase.from('admin_branding').select('background_url').eq('event_type', key).maybeSingle()
      .then(({ data }) => {
        const url = data?.background_url || fallback
        cache[key] = url ?? null
        setBg(url ?? null)
      })
  }, [key, fallback])

  return bg
}

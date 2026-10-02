import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getEventType } from '../lib/eventTypes'

const cache = {}

export function useDefaultBg(eventType) {
  const fallback = getEventType(eventType)?.defaultBg
  const [bg, setBg] = useState(cache[eventType] || fallback)

  useEffect(() => {
    if (cache[eventType]) { setBg(cache[eventType]); return }
    supabase.from('admin_branding').select('background_url').eq('event_type', eventType).maybeSingle()
      .then(({ data }) => {
        const url = data?.background_url || fallback
        cache[eventType] = url
        setBg(url)
      })
  }, [eventType, fallback])

  return bg
}

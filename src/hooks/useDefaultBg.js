import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getEventType } from '../lib/eventTypes'

const cache = {}

export function useDefaultBg(eventType) {
  const fallback = eventType ? getEventType(eventType)?.defaultBg : null
  const [bg, setBg] = useState(eventType ? (cache[eventType] || fallback) : null)

  useEffect(() => {
    if (!eventType) { setBg(null); return }
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

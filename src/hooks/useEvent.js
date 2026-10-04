import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useEvent(eventSlug) {
      const [event, setEvent] = useState(null)
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)

      useEffect(() => {
            if (!eventSlug) {
                  setLoading(false)
                  return
            }

            let channel = null

            async function fetchAndSubscribe() {
                  setLoading(true)
                  setError(null)

                  const { data, error: queryError } = await supabase
                        .from('events')
                        .select('*')
                        .eq('event_slug', eventSlug)
                        .maybeSingle()

                  if (queryError) {
                        setError(queryError.message)
                        setEvent(null)
                        setLoading(false)
                        return
                  }

                  setEvent(data)
                  setLoading(false)

                  if (!data?.id) return

                  // Subscribe to any updates on this event row
                  channel = supabase
                        .channel(`event-updates-${data.id}`)
                        .on(
                              'postgres_changes',
                              {
                                    event: 'UPDATE',
                                    schema: 'public',
                                    table: 'events',
                                    filter: `id=eq.${data.id}`,
                              },
                              (payload) => {
                                    setEvent(payload.new)
                              }
                        )
                        .subscribe()
            }

            fetchAndSubscribe()

            // Polling fallback — re-fetch every 10s in case realtime misses updates
            const poll = setInterval(async () => {
                  const { data } = await supabase.from('events').select('*').eq('event_slug', eventSlug).maybeSingle()
                  if (data) setEvent(data)
            }, 10000)

            return () => {
                  if (channel) supabase.removeChannel(channel)
                  clearInterval(poll)
            }
      }, [eventSlug])

      return { event, loading, error }
}

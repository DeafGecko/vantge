import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fetches an event by its URL slug.
 * Returns: { event, loading, error }
 *   - event: the event row, or null if not found
 *   - loading: true while fetching, false when done
 *   - error: error message if something broke, null otherwise
 */
export function useEvent(eventSlug) {
      const [event, setEvent] = useState(null)
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)

      useEffect(() => {
            // If no slug in URL, don't even try
            if (!eventSlug) {
                  setLoading(false)
                  return
            }

            async function fetchEvent() {
                  setLoading(true)
                  setError(null)

                  const { data, error: queryError } = await supabase
                        .from('events')
                        .select('*')
                        .eq('event_slug', eventSlug)
                        .maybeSingle() // returns null instead of error if 0 rows

                  if (queryError) {
                        setError(queryError.message)
                        setEvent(null)
                  } else {
                        setEvent(data) // data is the event row, or null if not found
                  }

                  setLoading(false)
            }

            fetchEvent()
      }, [eventSlug])

      return { event, loading, error }
}
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Fetches the event owned by the currently logged-in host.
 * For MVP: assumes one event per host.
 */
export function useHostEvent() {
      const { user } = useAuth()
      const [event, setEvent] = useState(null)
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)

      useEffect(() => {
            if (!user) {
                  setLoading(false)
                  return
            }

            async function fetchEvent() {
                  setLoading(true)
                  const { data, error: queryError } = await supabase
                        .from('events')
                        .select('*')
                        .eq('host_id', user.id)
                        .maybeSingle()

                  if (queryError) {
                        setError(queryError.message)
                        setEvent(null)
                  } else {
                        setEvent(data)
                  }
                  setLoading(false)
            }

            fetchEvent()
      }, [user])

      return { event, loading, error }
}
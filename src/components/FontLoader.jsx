import { useEffect } from 'react'
import { getGoogleFontsUrl } from '../lib/fonts'

/**
 * Dynamically loads a Google Font by injecting a <link> into <head>.
 * Use: <FontLoader fontId={event.font} />
 *
 * Only loads the specific font the event is using — faster than loading
 * all 10 fonts upfront. Cleans up on unmount.
 */
export default function FontLoader({ fontId }) {
      useEffect(() => {
            if (!fontId) return

            const url = getGoogleFontsUrl(fontId)
            const linkId = `font-loader-${fontId}`

            // Remove stale link if URL doesn't match (e.g. after a fix to getGoogleFontsUrl)
            const existing = document.getElementById(linkId)
            if (existing) {
                  if (existing.href === url) return
                  existing.remove()
            }

            const link = document.createElement('link')
            link.id = linkId
            link.rel = 'stylesheet'
            link.href = url
            document.head.appendChild(link)
      }, [fontId])

      return null
}
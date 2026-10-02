import { useState, useEffect } from 'react'

export function useResponsiveBg(mobileBg, desktopBg) {
  const [isWide, setIsWide] = useState(
    () => window.matchMedia('(min-width: 1024px)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e) => setIsWide(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  console.log('[bg] isWide:', isWide, '| desktop:', desktopBg, '| mobile:', mobileBg)
  if (isWide && desktopBg) return desktopBg
  return mobileBg
}

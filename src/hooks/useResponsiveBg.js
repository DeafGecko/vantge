import { useState, useEffect } from 'react'

// Same breakpoint as useResponsiveBg, so framing and photo switch together
export function useIsWide() {
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e) => setWide(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return wide
}

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

  if (isWide && desktopBg) return desktopBg
  return mobileBg
}

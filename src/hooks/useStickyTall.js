import { useEffect } from 'react'

// Keeps a column that is taller than the window in view beside a shorter scrolling column.
// 1. The column stays pinned at the top while the page scrolls past the other column.
// 2. Once the other column's last card reaches the bottom of the window, the column stays
//    attached to the page and slides on with it, so its own bottom comes into view.
// Below the lg breakpoint the columns stack, so nothing is moved.
const TOP_GAP = 96 // matches the top-24 offset used before
const BAR_CLEARANCE = 56 // room for the demo bar at the bottom of the window
const BOTTOM_GAP = 30 + BAR_CLEARANCE // 30px margin under the last card, above the bar
const GRID_MARGIN_BOTTOM = 40 // mb-10 on the grid
const LG_WIDTH = 1024
const RIGHT_CLEARANCE = 72 // room above the demo bar, so the last card is never hidden under it

export function useStickyTall(ref, enabled) {
  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return undefined

    const grid = el.parentElement
    const rightCol = grid.children[1]
    let frame = 0
    let tall = false
    let slideStart = 0
    let gridTop = 0

    // Runs on load and resize only. Changing the page height while scrolling makes the page jump.
    function layout() {
      const height = el.offsetHeight
      const vh = window.innerHeight
      tall = window.innerWidth >= LG_WIDTH && height + TOP_GAP + BOTTOM_GAP > vh
      grid.style.marginBottom = ''
      if (!tall) {
        el.style.transform = ''
        return
      }

      gridTop = grid.getBoundingClientRect().top + window.scrollY
      const rightBottom = rightCol.getBoundingClientRect().bottom + window.scrollY
      // Scroll position where the other column's last card reaches the bottom of the window
      slideStart = rightBottom + RIGHT_CLEARANCE - vh

      // Give the page enough room below the grid to scroll until the column's bottom is visible
      const docNeeded = slideStart + TOP_GAP + height + BOTTOM_GAP
      const wrapperPaddingBottom = parseFloat(getComputedStyle(grid.parentElement).paddingBottom) || 0
      const naturalDocEnd = gridTop + grid.offsetHeight + GRID_MARGIN_BOTTOM + wrapperPaddingBottom
      const extra = Math.max(0, docNeeded - naturalDocEnd)
      grid.style.marginBottom = `${GRID_MARGIN_BOTTOM + extra}px`
      place()
    }

    // Runs on every scroll frame. Only moves the column, never the page height.
    function place() {
      frame = 0
      if (!tall) return
      const shiftFinal = slideStart + TOP_GAP - gridTop
      const shift = Math.min(shiftFinal, Math.max(0, window.scrollY + TOP_GAP - gridTop))
      el.style.transform = shift ? `translateY(${shift}px)` : ''
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(place)
    }

    function onResize() {
      layout()
    }

    layout()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (frame) cancelAnimationFrame(frame)
      el.style.transform = ''
      grid.style.marginBottom = ''
    }
  }, [ref, enabled])
}

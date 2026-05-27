import { useCallback, useRef } from 'react'

interface Options {
  /** ms before long-press fires (default 500) */
  delay?: number
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void
}

/**
 * Returns event props for an element.
 * - Desktop: long-press fires after `delay` ms of mousedown (no mouseup click)
 * - Mobile:  long-press fires after `delay` ms of touchstart (prevents scroll-cancel)
 */
export function useLongPress({ delay = 500, onLongPress }: Options) {
  const timer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired  = useRef(false)
  const coords = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      fired.current = false
      // Capture initial position to detect scroll vs press on touch
      if ('touches' in e) {
        coords.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
      timer.current = setTimeout(() => {
        fired.current = true
        onLongPress(e)
      }, delay)
    },
    [delay, onLongPress],
  )

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel if the finger moved more than 10px (user is scrolling)
    const dx = Math.abs(e.touches[0].clientX - coords.current.x)
    const dy = Math.abs(e.touches[0].clientY - coords.current.y)
    if (dx > 10 || dy > 10) cancel()
  }, [cancel])

  return {
    onMouseDown:  start  as React.MouseEventHandler,
    onMouseUp:    cancel as React.MouseEventHandler,
    onMouseLeave: cancel as React.MouseEventHandler,
    onTouchStart: start  as React.TouchEventHandler,
    onTouchEnd:   cancel as React.TouchEventHandler,
    onTouchMove,
    /** True if the last interaction triggered long-press (use to suppress click) */
    firedRef: fired,
  }
}

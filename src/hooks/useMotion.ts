import { useEffect, useRef, useState } from 'react'

/** Honour the OS setting: every helper here falls back to the final state. */
export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * False on first paint, true one frame later. Render the "from" state while
 * false so a CSS transition carries the element to its real value.
 */
export function useEntered() {
  const [on, setOn] = useState(reducedMotion)
  useEffect(() => {
    if (on) return
    let live = true
    const id = requestAnimationFrame(() => requestAnimationFrame(() => { if (live) setOn(true) }))
    return () => { live = false; cancelAnimationFrame(id) }
  }, [on])
  return on
}

/**
 * Eases a number towards `target`: from 0 on mount, then from whatever was
 * last shown whenever the target changes. Ease-out cubic, ~0.9s.
 */
export function useCountUp(target: number, duration = 900) {
  const [shown, setShown] = useState(() => (reducedMotion() ? target : 0))
  const last = useRef(shown)
  useEffect(() => {
    if (reducedMotion() || !Number.isFinite(target)) { last.current = target; setShown(target); return }
    const from = last.current
    const delta = target - from
    if (delta === 0) return
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const v = from + delta * (1 - Math.pow(1 - p, 3))
      last.current = v
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return shown
}

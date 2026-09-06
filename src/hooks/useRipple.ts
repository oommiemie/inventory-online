import { useEffect } from 'react'

/**
 * Attaches a pointer-positioned ripple to buttons, globally.
 *
 * Uses one delegated listener rather than per-component handlers so the
 * effect applies to every button without touching call sites.
 */
export function useRipple() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('.btn, .hero-cta')
      if (!el || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return

      const r = el.getBoundingClientRect()
      el.style.setProperty('--rx', `${e.clientX - r.left}px`)
      el.style.setProperty('--ry', `${e.clientY - r.top}px`)

      el.classList.remove('rippling')
      void el.offsetWidth          // restart the animation
      el.classList.add('rippling')
    }

    const onEnd = (e: AnimationEvent) => {
      if (e.animationName === 'ripple') (e.target as HTMLElement).classList.remove('rippling')
    }

    document.addEventListener('pointerdown', onDown)
    document.addEventListener('animationend', onEnd, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('animationend', onEnd, true)
    }
  }, [])
}

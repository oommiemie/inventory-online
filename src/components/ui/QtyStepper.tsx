import { useRef, useState } from 'react'
import { Icon } from './Icon'

/**
 * Quantity control: type a figure, or nudge it with the buttons at either end.
 * Holding a button repeats, so a large figure does not mean a hundred clicks.
 */
export function QtyStepper(
  { value, onChange, ariaLabel, min = 1, max = 999999, step = 1, className = '', disabled }:
  { value: number; onChange: (v: number) => void; ariaLabel: string
    min?: number; max?: number; step?: number; className?: string; disabled?: boolean },
) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const timers = useRef<{ delay?: number; repeat?: number }>({})
  /* While typing, the box shows exactly what was typed. Clamping every
     keystroke made an emptied field snap back to the minimum, so the next
     digits landed after it — typing 250 gave 1250. The draft is dropped on
     blur and whenever a button takes over, so the value always wins. */
  const [draft, setDraft] = useState<string | null>(null)

  const stop = () => {
    window.clearTimeout(timers.current.delay)
    window.clearInterval(timers.current.repeat)
    timers.current = {}
  }
  /* A press nudges once; holding past the delay repeats until release. */
  const hold = (dir: 1 | -1) => {
    setDraft(null)
    onChange(clamp(value + dir * step))
    let v = value
    timers.current.delay = window.setTimeout(() => {
      timers.current.repeat = window.setInterval(() => {
        v = clamp(v + dir * step)
        onChange(v)
      }, 70)
    }, 420)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); setDraft(null); onChange(clamp(value + step)) }
    if (e.key === 'ArrowDown') { e.preventDefault(); setDraft(null); onChange(clamp(value - step)) }
    if (e.key === 'Enter') { e.preventDefault(); setDraft(null) }
  }

  return (
    <div className={`qty-stepper ${className}`.trim()}>
      <button type="button" className="qty-stepper-btn" aria-label={`− ${ariaLabel}`}
              disabled={disabled || value <= min}
              onPointerDown={() => hold(-1)} onPointerUp={stop}
              onPointerLeave={stop} onPointerCancel={stop}>
        <Icon name="minus" size={14} />
      </button>
      <input className="qty-stepper-input num" inputMode="numeric" size={1}
             value={draft ?? String(value)}
             aria-label={ariaLabel} disabled={disabled} onKeyDown={onKey}
             onBlur={() => setDraft(null)}
             onChange={e => {
               const raw = String(e.target.value).replace(/[^\d]/g, '')
               setDraft(raw)
               if (raw) onChange(clamp(Number(raw)))
             }} />
      <button type="button" className="qty-stepper-btn" aria-label={`+ ${ariaLabel}`}
              disabled={disabled || value >= max}
              onPointerDown={() => hold(1)} onPointerUp={stop}
              onPointerLeave={stop} onPointerCancel={stop}>
        <Icon name="plus" size={14} />
      </button>
    </div>
  )
}

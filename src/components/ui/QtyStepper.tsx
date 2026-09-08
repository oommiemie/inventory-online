import { useRef } from 'react'
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

  const stop = () => {
    window.clearTimeout(timers.current.delay)
    window.clearInterval(timers.current.repeat)
    timers.current = {}
  }
  /* A press nudges once; holding past the delay repeats until release. */
  const hold = (dir: 1 | -1) => {
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
    if (e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + step)) }
    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - step)) }
  }

  return (
    <div className={`qty-stepper ${className}`.trim()}>
      <button type="button" className="qty-stepper-btn" aria-label={`− ${ariaLabel}`}
              disabled={disabled || value <= min}
              onPointerDown={() => hold(-1)} onPointerUp={stop}
              onPointerLeave={stop} onPointerCancel={stop}>
        <Icon name="minus" size={14} />
      </button>
      <input className="qty-stepper-input num" inputMode="numeric" value={value}
             aria-label={ariaLabel} disabled={disabled} onKeyDown={onKey}
             onChange={e => onChange(clamp(Number(String(e.target.value).replace(/[^\d]/g, '')) || 0))} />
      <button type="button" className="qty-stepper-btn" aria-label={`+ ${ariaLabel}`}
              disabled={disabled || value >= max}
              onPointerDown={() => hold(1)} onPointerUp={stop}
              onPointerLeave={stop} onPointerCancel={stop}>
        <Icon name="plus" size={14} />
      </button>
    </div>
  )
}

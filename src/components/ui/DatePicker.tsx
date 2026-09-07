import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { useT } from '@/hooks/useT'

/* The app shows Buddhist-era dates everywhere, so the calendar does too while
   the value it carries stays a plain ISO string. */
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parse = (v: string) => {
  const [y, m, d] = v.split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d) : null
}
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Today, fixed to the prototype's clock so the calendar agrees with the data. */
const TODAY = new Date(2026, 7, 27)

/**
 * Date field with the app's own month grid, rather than whatever the browser
 * draws. Shows Thai months and Buddhist years while `value` stays ISO.
 */
export function DatePicker(
  { value, onChange, ariaLabel, className = '', disabled }:
  { value: string; onChange: (v: string) => void; ariaLabel: string
    className?: string; disabled?: boolean },
) {
  const { t, lang } = useT()
  const selected = parse(value)

  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => selected ?? TODAY)
  const [pos, setPos] = useState({ top: 0, left: 0, above: false })
  const anchor = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  const locale = lang === 'EN' ? 'en-GB' : 'th-TH'
  const label = selected
    ? selected.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : t('c.pickDate')

  const weekdays = useMemo(() => {
    /* A known Sunday, walked forward, so the header matches the grid's start. */
    const base = new Date(2026, 0, 4)
    return Array.from({ length: 7 }, (_, i) =>
      new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
        .toLocaleDateString(locale, { weekday: 'narrow' }))
  }, [locale])

  /* Six weeks from the Sunday on or before the first of the month, so the grid
     never changes height as months change. */
  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1)
    const start = new Date(first)
    start.setDate(1 - first.getDay())
    return Array.from({ length: 42 }, (_, i) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }, [view])

  const place = () => {
    const r = anchor.current?.getBoundingClientRect()
    if (!r) return
    const height = 340
    const above = window.innerHeight - r.bottom < height && r.top > height
    setPos({
      top: above ? r.top - 6 : r.bottom + 6,
      left: Math.max(8, Math.min(r.left, window.innerWidth - 300 - 8)),
      above,
    })
  }
  useLayoutEffect(() => { if (open) place() }, [open])

  useEffect(() => {
    if (!open) return
    setView(selected ?? TODAY)
    const onDown = (e: PointerEvent) => {
      const el = e.target as Node
      if (!anchor.current?.contains(el) && !panel.current?.contains(el)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); anchor.current?.focus() } }
    const onScroll = () => place()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const shift = (months: number) =>
    setView(v => new Date(v.getFullYear(), v.getMonth() + months, 1))
  const pick = (d: Date) => { onChange(iso(d)); setOpen(false); anchor.current?.focus() }

  return (
    <>
      <button type="button" ref={anchor} disabled={disabled}
              className={`datefield ${className}`.trim()}
              aria-haspopup="dialog" aria-expanded={open} aria-label={ariaLabel}
              onClick={() => setOpen(o => !o)}>
        <i className="fi fi-rr-calendar" aria-hidden="true" />
        <span className={`datefield-value${selected ? '' : ' is-empty'}`}>{label}</span>
        <Icon name="chevD" size={16} />
      </button>

      {open && createPortal(
        <div ref={panel} className={`cal${pos.above ? ' is-above' : ''}`}
             role="dialog" aria-label={ariaLabel} style={{ top: pos.top, left: pos.left }}>
          <div className="cal-head">
            <button type="button" className="cal-nav" aria-label={t('login.prev')}
                    onClick={() => shift(-1)}><Icon name="chevL" size={16} /></button>
            <b>{view.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</b>
            <button type="button" className="cal-nav" aria-label={t('login.next')}
                    onClick={() => shift(1)}><Icon name="chevR" size={16} /></button>
          </div>

          <div className="cal-week" aria-hidden="true">
            {weekdays.map((w, i) => <span key={i}>{w}</span>)}
          </div>

          <div className="cal-grid">
            {days.map(d => {
              const outside = d.getMonth() !== view.getMonth()
              const on = selected ? sameDay(d, selected) : false
              return (
                <button type="button" key={iso(d)}
                        className={`cal-day${outside ? ' is-out' : ''}${on ? ' is-on' : ''}${sameDay(d, TODAY) ? ' is-today' : ''}`}
                        aria-current={sameDay(d, TODAY) ? 'date' : undefined}
                        aria-pressed={on}
                        onClick={() => pick(d)}>
                  {d.getDate()}
                </button>
              )
            })}
          </div>

          <div className="cal-foot">
            <button type="button" className="linkbtn" onClick={() => pick(TODAY)}>{t('c.today')}</button>
            {selected && (
              <button type="button" className="linkbtn" onClick={() => { onChange(''); setOpen(false) }}>
                {t('c.clear')}
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

import {
  Children, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { useT } from '@/hooks/useT'

/** A choice, read off the `<option>` elements a caller already writes. */
interface Item { value: string; label: ReactNode; text: string }

/** Flattens an option's children into the string the search matches against. */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}

function readOptions(children: ReactNode): Item[] {
  const out: Item[] = []
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child) || child.type !== 'option') continue
    const props = child.props as { value?: string; children?: ReactNode }
    const label = props.children
    out.push({ value: String(props.value ?? ''), label, text: textOf(label) })
  }
  return out
}

/**
 * Dropdown drawn by the app rather than the platform, so it matches the rest of
 * the surface and can filter a long list.
 *
 * The API mirrors a native select — `value` plus `<option>` children — so a
 * caller swaps one for the other without restructuring.
 */
export function Combo(
  { value, onChange, children, ariaLabel, className = '', disabled, searchFrom = 8 }:
  { value: string; onChange: (v: string) => void; children: ReactNode
    ariaLabel: string; className?: string; disabled?: boolean
    /** Show the search box once the list is at least this long. */
    searchFrom?: number },
) {
  const { t } = useT()
  const id = useId()
  const items = useMemo(() => readOptions(children), [children])
  const selected = items.find(i => i.value === value)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, above: false })

  const anchor = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter(i => i.text.toLowerCase().includes(q)) : items
  }, [items, query])
  const withSearch = items.length >= searchFrom

  const place = () => {
    const r = anchor.current?.getBoundingClientRect()
    if (!r) return
    const room = window.innerHeight - r.bottom
    const height = Math.min(320, window.innerHeight * 0.6)
    const above = room < height && r.top > room
    setPos({
      top: above ? r.top - 6 : r.bottom + 6,
      left: Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)),
      width: r.width, above,
    })
  }

  useLayoutEffect(() => { if (open) place() }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const el = e.target as Node
      if (!anchor.current?.contains(el) && !panel.current?.contains(el)) setOpen(false)
    }
    const onScroll = () => place()
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(Math.max(0, items.findIndex(i => i.value === value)))
    if (withSearch) requestAnimationFrame(() => search.current?.focus())
  }, [open])

  /* Keep the highlighted row in view while arrowing through a long list. */
  useEffect(() => {
    if (!open) return
    panel.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, open, query])

  const pick = (v: string) => { onChange(v); setOpen(false); anchor.current?.focus() }

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); setOpen(true) }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); anchor.current?.focus() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(shown.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(shown.length - 1) }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) pick(shown[active].value) }
    else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <>
      <button type="button" ref={anchor} disabled={disabled}
              className={`combo ${className}`.trim()}
              role="combobox" aria-haspopup="listbox" aria-expanded={open}
              aria-controls={open ? `${id}-list` : undefined} aria-label={ariaLabel}
              onClick={() => setOpen(o => !o)} onKeyDown={onKey}>
        <span className="combo-value">{selected ? selected.label : items[0]?.label}</span>
        <Icon name="chevD" size={16} />
      </button>

      {open && createPortal(
        <div ref={panel} className={`combo-panel${pos.above ? ' is-above' : ''}`}
             style={{ top: pos.top, left: pos.left, minWidth: pos.width }}>
          {withSearch && (
            <div className="combo-search">
              <Icon name="search" size={14} />
              <input ref={search} value={query} placeholder={t('c.search')}
                     aria-label={t('c.search')} autoComplete="off"
                     onChange={e => { setQuery(e.target.value); setActive(0) }}
                     onKeyDown={onKey} />
            </div>
          )}
          <ul className="combo-list" id={`${id}-list`} role="listbox" aria-label={ariaLabel}>
            {shown.length === 0 && <li className="combo-empty">{t('c.noResults')}</li>}
            {shown.map((item, i) => (
              <li key={item.value} role="option" aria-selected={item.value === value}
                  data-active={i === active}
                  className={`combo-option${item.value === value ? ' is-on' : ''}`}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => pick(item.value)}>
                <span>{item.label}</span>
                {item.value === value && <Icon name="check" size={14} />}
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchIndex, type Hit, type HitKind } from './useSearchIndex'
import { useT } from '@/hooks/useT'
import { Icon } from '@/components/ui'
import './spotlight.css'

const GROUP_ORDER: HitKind[] = ['page', 'doc', 'item', 'facility', 'warehouse']

/** Spotlight-style palette: search everything, navigate with the keyboard. */
export function Spotlight({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const hits = useSearchIndex(q)

  const groupLabel: Record<HitKind, string> = useMemo(() => ({
    page: t('nav.group.work'),
    doc: t('req.title'),
    item: t('c.items'),
    facility: t('req.facility'),
    warehouse: t('stk.tree'),
  }), [t])

  /* Flatten into render order so the cursor maps 1:1 onto the visible list. */
  const grouped = useMemo(() => {
    const by = new Map<HitKind, Hit[]>()
    for (const h of hits) {
      const arr = by.get(h.kind) ?? []
      arr.push(h); by.set(h.kind, arr)
    }
    return GROUP_ORDER.filter(k => by.has(k)).map(k => ({ kind: k, items: by.get(k)! }))
  }, [hits])

  const flat = useMemo(() => grouped.flatMap(g => g.items), [grouped])

  useEffect(() => { setCursor(0) }, [q])

  useEffect(() => {
    if (!open) return
    setQ(''); setCursor(0)
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

  /* Keep the highlighted row in view while arrowing. */
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const go = (h?: Hit) => {
    if (!h) return
    onClose()
    nav(h.to)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setCursor(c => (flat.length ? (c + 1) % flat.length : 0)); return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault(); setCursor(c => (flat.length ? (c - 1 + flat.length) % flat.length : 0)); return
    }
    if (e.key === 'Enter') { e.preventDefault(); go(flat[cursor]) }
  }

  if (!open) return null

  let running = -1
  return (
    <div className="sl-backdrop" onMouseDown={onClose} role="presentation">
      <div className="sl-panel" role="dialog" aria-modal="true" aria-label={t('c.search')}
           onMouseDown={e => e.stopPropagation()}>
        <div className="sl-field">
          <Icon name="search" size={20} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('sl.placeholder')}
            aria-label={t('c.search')}
            aria-autocomplete="list"
            aria-controls="sl-results"
          />
          <kbd className="sl-kbd">esc</kbd>
        </div>

        <div className="sl-results" id="sl-results" ref={listRef} role="listbox">
          {flat.length === 0 ? (
            <div className="sl-empty">
              <Icon name="search" size={28} />
              <b>{t('c.noResults')}</b>
              <span>{t('sl.emptyHint')}</span>
            </div>
          ) : grouped.map(g => (
            <div className="sl-group" key={g.kind}>
              <div className="sl-group-label">{groupLabel[g.kind]}</div>
              {g.items.map(h => {
                running++
                const i = running
                return (
                  <button
                    key={h.id}
                    role="option"
                    aria-selected={i === cursor}
                    data-active={i === cursor}
                    className="sl-row"
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(h)}
                  >
                    <span className="sl-ico"><i className={`fi fi-rr-${h.icon}`} aria-hidden="true" /></span>
                    <span className="sl-text">
                      <b>{h.title}</b>
                      {h.sub && <small>{h.sub}</small>}
                    </span>
                    <Icon name="arrowR" size={16} />
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="sl-foot">
          <span><kbd className="sl-kbd">↑</kbd><kbd className="sl-kbd">↓</kbd> {t('sl.navigate')}</span>
          <span><kbd className="sl-kbd">↵</kbd> {t('sl.open')}</span>
          <span className="sl-count">{flat.length} {t('c.items')}</span>
        </div>
      </div>
    </div>
  )
}

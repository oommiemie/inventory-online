import { useRef, useState, type ReactNode } from 'react'
import { useStore } from '@/app/store'
import { ROLES, ORGS } from '@/data/seed'
import { useT } from '@/hooks/useT'
import { Icon } from '@/components/ui'
import { asset } from '@/lib/asset'
import type { RoleId } from '@/types'

/**
 * The blue bar every page opens with (the Figma design has no separate
 * topbar). `title`/`eyebrow` set the copy; `controls` holds page-specific
 * search and filters; the identity cluster is always on the right.
 */
export function HeroBar(
  { title, eyebrow, sub, controls, actions, onMenu, identity = true, art = true }:
  { title?: ReactNode; eyebrow?: ReactNode; sub?: ReactNode
    controls?: ReactNode; actions?: ReactNode; onMenu?: () => void
    /** Role switch, notifications and the user card. Off for focused pages. */
    identity?: boolean
    /** The decorative supplies artwork. */
    art?: boolean },
) {
  const { t, lang } = useT()
  const role = useStore(s => s.role)
  const setRole = useStore(s => s.setRole)
  const profile = useStore(s => s.profile)
  const notifs = useStore(s => s.notifs)

  const markNotifsRead = useStore(s => s.markNotifsRead)
  const [notifOpen, setNotifOpen] = useState(false)
  // Small grace period so the pointer can cross the gap to the panel.
  const closeTimer = useRef<number | undefined>(undefined)
  const anchorRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const openNotifs = () => {
    window.clearTimeout(closeTimer.current)
    const r = anchorRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 10, right: window.innerWidth - r.right })
    setNotifOpen(true)
  }
  const closeNotifs = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setNotifOpen(false), 180)
  }

  const r = ROLES[role]
  const unread = notifs.filter(n => !n.read).length
  // Scope: notifications addressed to this role's org, or broadcast.
  const myNotifs = notifs.filter(n => !n.to || n.to === r.org || role === 'BMS').slice(0, 12)

  return (
    <header className={`herobar${identity ? '' : ' herobar--plain'}`}>
     <div className="herobar-inner">
      {art && (
        <picture>
          <img className="herobar-art" src={asset("/img/hero-1-760.png")} alt="" aria-hidden="true" />
        </picture>
      )}

      <div className="herobar-row herobar-row--top">
        {onMenu && (
          <button className="hero-icon-btn menu-toggle" onClick={onMenu} aria-label={t('nav.expand')}>
            <Icon name="menu" />
          </button>
        )}

        <div style={{ minWidth: 0 }}>
          {eyebrow && <div className="herobar-eyebrow">{eyebrow}</div>}
          {title && <h1 className="herobar-title">{title}</h1>}
          {sub && <p className="herobar-sub">{sub}</p>}
        </div>

        <div className="spacer" />

        {identity && <>
        <select
          className="hero-select hide-sm"
          value={role}
          aria-label={t('role.switch')}
          onChange={e => setRole(e.target.value as RoleId)}
        >
          {(Object.keys(ROLES) as RoleId[]).map(id => (
            <option key={id} value={id}>{lang === 'EN' ? ROLES[id].label : ROLES[id].labelTh}</option>
          ))}
        </select>

        <div className="notif-anchor" ref={anchorRef}
             onMouseEnter={openNotifs} onMouseLeave={closeNotifs}>
          <button className="hero-icon-btn" aria-label={t('dash.notifs')}
                  aria-expanded={notifOpen} aria-haspopup="true"
                  onFocus={openNotifs} onBlur={closeNotifs}
                  onClick={() => { setNotifOpen(o => !o); markNotifsRead() }}>
            <Icon name="bell" size={16} />
            {unread > 0 && <span className="ping" />}
          </button>

          {notifOpen && (
            <div className="popover" role="dialog" aria-label={t('dash.notifs')}
                 style={{ top: pos.top, right: pos.right }}>
              <div className="popover-head">
                {t('dash.notifs')}
                {unread > 0 && <span className="popover-count">{unread}</span>}
              </div>
              {myNotifs.length === 0 ? (
                <p className="popover-empty">{t('dash.noNotifs')}</p>
              ) : (
                <div className="popover-list">
                  {myNotifs.map(n => (
                    <div key={n.id} className={`popover-item${n.read ? '' : ' is-unread'}`}>
                      <span className="bar" />
                      <div style={{ minWidth: 0 }}>
                        <p>{n.text}</p>
                        <small>{n.t}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hero-divider hide-sm" />

        <div className="hero-user hide-sm">
          <div className="hero-user-meta">
            <b>{lang === 'EN' ? profile.nameEn : profile.name}</b>
            <small>{lang === 'EN' ? r.label : r.labelTh}</small>
          </div>
          <div className="hero-user-avatar">
            {profile.avatar
              ? <img src={profile.avatar} alt="" aria-hidden="true" />
              : (
                <picture>
                  <source srcSet={asset("/img/avatar.webp")} type="image/webp" />
                  <img src={asset("/img/avatar.png")} alt="" aria-hidden="true" />
                </picture>
              )}
          </div>
        </div>
        </>}
      </div>

      {(controls || actions) && (
        <div className="herobar-row" style={{ marginTop: 'auto' }}>
          {controls}
          <div className="spacer" />
          {actions}
        </div>
      )}
     </div>
    </header>
  )
}

/** Search field styled for the blue hero bar. */
export function HeroSearch(
  { value, onChange, placeholder }:
  { value: string; onChange: (v: string) => void; placeholder?: string },
) {
  return (
    <div className="hero-search">
      <Icon name="search" />
      <input type="search" value={value} placeholder={placeholder}
             onChange={e => onChange(e.target.value)} />
    </div>
  )
}

/** Opens the Spotlight palette. Looks like a field, behaves like a button. */
export function HeroSearchTrigger(
  { placeholder, onOpen }: { placeholder?: string; onOpen: () => void },
) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  return (
    <button type="button" className="hero-search hero-search--trigger" onClick={onOpen}>
      <Icon name="search" />
      <span className="hero-search-text">{placeholder}</span>
      <kbd className="hero-search-kbd">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
    </button>
  )
}

/** Select styled for the blue hero bar. */
export function HeroSelect(
  { value, onChange, children, ariaLabel }:
  { value: string; onChange: (v: string) => void; children: ReactNode; ariaLabel: string },
) {
  return (
    <select className="hero-select hero-select--filter" value={value} aria-label={ariaLabel}
            onChange={e => onChange(e.target.value)}>
      {children}
    </select>
  )
}

/** White pill CTA for the blue hero bar. */
export function HeroCta(
  { children, onClick, icon, variant = 'solid' }:
  { children: ReactNode; onClick?: () => void; icon?: 'plus' | 'download' | 'refresh' | 'check' | 'logout'
    /** 'ghost' is the translucent secondary action beside a solid CTA. */
    variant?: 'solid' | 'ghost' },
) {
  return (
    <button className={`hero-cta${variant === 'ghost' ? ' hero-cta--ghost' : ''}`} onClick={onClick}>
      {icon && <Icon name={icon} size={18} />}{children}
    </button>
  )
}

export const orgLabel = (id: string) => ORGS[id]?.name ?? id

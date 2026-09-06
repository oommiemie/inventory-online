import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useOriginMenu } from '@/hooks/useOriginMenu'
import { useStore } from '@/app/store'
import { NAV, ROUTE_OF } from '@/app/nav'
import { navCount } from '@/app/selectors'
import { ROLES } from '@/data/seed'
import { useT } from '@/hooks/useT'
import { asset } from '@/lib/asset'
import { Icon } from '@/components/ui'

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const from = useOriginMenu()

  const { t, lang, orgName, orgSub } = useT()
  const role = useStore(s => s.role)
  const docs = useStore(s => s.docs)
  const maps = useStore(s => s.mappings)
  const supply = useStore(s => s.supply)
  const jobs = useStore(s => s.jobs)
  const collapsed = useStore(s => s.sidebarCollapsed)
  const profile = useStore(s => s.profile)
  const signOut = useStore(s => s.signOut)
  const toggle = useStore(s => s.toggleSidebar)

  const menu = ROLES[role].menu
  const me = ROLES[role]
  const fullName = lang === 'EN' ? profile.nameEn : profile.name
  const shortName = fullName.split(' ')[0]
  const Photo = () => profile.avatar
    ? <img src={profile.avatar} alt="" aria-hidden="true" />
    : (
      <picture>
        <source srcSet={asset("/img/avatar.webp")} type="image/webp" />
        <img src={asset("/img/avatar.png")} alt="" aria-hidden="true" />
      </picture>
    )
  const roleLabel = lang === 'EN' ? me.label : me.labelTh
  const [profileOpen, setProfileOpen] = useState(false)
  const failed = jobs.filter(j => j.status === 'FAILED').length

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label={t('app.name')}>
      <button className="collapse-btn" onClick={toggle}
              aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}>
        <Icon name={collapsed ? 'chevR' : 'chevL'} size={16} />
      </button>

      <div className="brand">
        <div className="brand-mark"><Icon name="box" size={22} /></div>
        <div className="brand-text">
          <b>{t('app.name')}</b>
          <span>{t('app.tagline')}</span>
        </div>
      </div>

      <nav className="sidebar-scroll">
        {NAV.map(group => {
          const items = group.items.filter(i => menu.includes(i.id))
          if (!items.length) return null
          return (
            <div className="nav-group" key={group.labelKey}>
              <div className="nav-label">{t(group.labelKey)}</div>
              <div className="nav-list">
                {items.map(item => {
                  const count = navCount(item.id, docs, role, maps, supply, failed, 'PCU01')
                  return (
                    <NavLink
                      key={item.id}
                      to={ROUTE_OF[item.id]}
                      end={item.id === 'dashboard'}
                      className={({ isActive }) =>
                        `nav-item ${(from ? from === item.id : isActive) ? 'active' : ''}`}
                      onClick={onNavigate}
                      title={collapsed ? t(item.labelKey) : undefined}
                    >
                      {({ isActive }) => { const on = from ? from === item.id : isActive; return (<>
                        {/* solid glyph when active, regular otherwise */}
                        <i className={`nav-ico fi fi-${on ? 'sr' : 'rr'}-${item.icon}`}
                           aria-hidden="true" />
                        <span className="label">{t(item.labelKey)}</span>
                        {count > 0 && <span className="nav-count" key={count}>{count > 99 ? '99+' : count}</span>}
                      </>) }}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="sidebar-foot">
        {/* Identity row: avatar + name/role + sign-out. Hover or focus it
            for the full profile popover. */}
        <div className="user-anchor"
             onMouseEnter={() => setProfileOpen(true)}
             onMouseLeave={() => setProfileOpen(false)}
             onFocus={() => setProfileOpen(true)}
             onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setProfileOpen(false) }}>
          <div className="user-card">
            <div className="user-card-avatar">
              <Photo />
              <i className="user-card-dot" aria-hidden="true" />
            </div>
            <div className="user-card-meta">
              <b title={fullName}>{shortName}</b>
              <small>{roleLabel}</small>
            </div>
            <button type="button" className="user-card-logout" onClick={signOut}
                    aria-label={t('c.logout')} title={t('c.logout')}>
              <Icon name="logout" size={16} />
            </button>
          </div>

          {profileOpen && (
            <div className="profile-pop" role="dialog" aria-label={t('user.profile')}>
              <div className="profile-pop-head">
                <div className="profile-pop-avatar">
                  <Photo />
                </div>
                <div className="profile-pop-id">
                  <b>{fullName}</b>
                  <small>{roleLabel}</small>
                  <span className="profile-pop-role">{me.id}</span>
                </div>
              </div>

              <dl className="profile-pop-rows">
                <div className="profile-pop-row">
                  <i className="fi fi-rr-building" aria-hidden="true" />
                  <dt>{t('user.org')}</dt>
                  <dd>{orgName(me.org)}<small>{orgSub(me.org)}</small></dd>
                </div>
                <div className="profile-pop-row">
                  <i className="fi fi-rr-globe" aria-hidden="true" />
                  <dt>{t('role.scope')}</dt>
                  <dd>{t(`scope.${me.scope}` as never)}</dd>
                </div>
                <div className="profile-pop-row">
                  <i className="fi fi-rr-apps" aria-hidden="true" />
                  <dt>{t('set.visibleMenus')}</dt>
                  <dd>{me.menu.length} {t('user.menuUnit')}</dd>
                </div>
                <div className="profile-pop-row">
                  <i className="fi fi-rr-shield-check" aria-hidden="true" />
                  <dt>{t('user.perms')}</dt>
                  <dd>{me.can.length} {t('user.permUnit')}</dd>
                </div>
              </dl>

              <div className="profile-pop-foot">
                <Link to="/settings/account" onClick={onNavigate}>
                  <Icon name="gear" size={12} /> {t('set.account')}
                </Link>
                {me.can.includes('settings.users' as never) && (
                  <Link to="/settings/users" onClick={onNavigate}>
                    {t('user.manage')} <Icon name="arrowR" size={12} />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </aside>
  )
}

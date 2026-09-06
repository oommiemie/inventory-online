import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore, hospitalWarehouses, supplyLinkFor } from '@/app/store'
import { facilitiesInScope } from '@/app/selectors'
import { ROLES, ORGS, WAREHOUSES } from '@/data/seed'
import { useT } from '@/hooks/useT'
import {
  Card, PanelHead, Button, Badge, Select, TableWrap,
  Chip, Empty, Icon, Switch, Segmented,
} from '@/components/ui'
import { MapBadge } from '@/components/StateBadge'
import { DocSummary } from '@/components/DocParts'
import type { IssueMode, RoleId, MapState } from '@/types'
import { HeroBar, HeroSearch, HeroCta } from '@/components/layout/HeroBar'
import { useMenuToggle } from '@/components/layout/AppShell'
import { PALETTES, FONTS } from '@/lib/appearance'
import { AccountPanel } from './AccountPanel'
import { NotificationPanel } from './NotificationPanel'
import './settings.css'

export function SettingsView() {
  const { t, lang, orgName, orgSub, whName } = useT()
  const role = useStore(s => s.role)
  const onMenu = useMenuToggle()
  const cfg = useStore(s => s.cfg)
  const setCfg = useStore(s => s.setCfg)
  const supply = useStore(s => s.supply)
  const setSupplyWh = useStore(s => s.setSupplyWh)
  const supplyAction = useStore(s => s.supplyAction)
  const whAction = useStore(s => s.whAction)
  const prefs = useStore(s => s.prefs)
  const setPref = useStore(s => s.setPref)
  const setLang = useStore(s => s.setLang)
  const setRole = useStore(s => s.setRole)
  const signOut = useStore(s => s.signOut)

  const { topic } = useParams()
  const nav = useNavigate()
  const section = topic ?? null
  const [q, setQ] = useState('')

  const r = ROLES[role]
  const can = (p: string) => r.can.includes(p as never)
  const facilities = facilitiesInScope(role, supply)
  const warehouses = Object.keys(WAREHOUSES)
    .filter(w => r.scope !== 'OWN_ORG' || WAREHOUSES[w].org === r.org)

  return (
    <>
      {!section && (
        <HeroBar
          onMenu={onMenu}
          identity={false}
          art={false}
          title={t('set.title')}
          sub={t('set.subtitle')}
          controls={
            <HeroSearch value={q} placeholder={t('set.searchPh')}
                        onChange={v => { setQ(v); if (v && topic) nav('/settings') }} />
          }
          actions={<HeroCta variant="ghost" icon="logout" onClick={signOut}>{t('c.logout')}</HeroCta>}
        />
      )}

      {(() => {
        const MENU = [
          { id: 'account', group: 'users', icon: 'user', tone: 'info',
            title: t('set.account'), desc: t('set.accountDesc'), show: true,
            body: <AccountPanel /> },
          { id: 'notify', group: 'notify', icon: 'bell', tone: 'amber',
            title: t('set.notify'), desc: t('set.notifyDesc'), show: true,
            body: <NotificationPanel /> },
          { id: 'operational', group: 'general', icon: 'settings-sliders', tone: 'info',
            title: t('set.operational'), desc: t('set.operationalDesc'), show: true,
            body: (
      <Card>
        <PanelHead title={t('set.operational')} />
        <div className="panel-body set-rows">
          <div className="set-row">
            <div className="set-row-main">
              <b>{t('set.issueMode')}</b>
              <small>{t('set.issueModeNote')}</small>
            </div>
            <div className="opt-pick" role="radiogroup" aria-label={t('set.issueMode')}>
              {(['HOSXP', 'PORTAL'] as IssueMode[]).map(m => (
                <button key={m} type="button" role="radio"
                        aria-checked={cfg.issueMode === m}
                        className={`opt-card${cfg.issueMode === m ? ' is-on' : ''}`}
                        onClick={() => setCfg('issueMode', m)}>
                  <span className="opt-card-head">
                    <b>{m}</b>
                    {cfg.issueMode === m && <em className="opt-badge">{t('set.inUse')}</em>}
                  </span>
                  <small>{m === 'HOSXP' ? t('iss.modeHosxp') : t('iss.modePortal')}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="set-row">
            <div className="set-row-main">
              <b>{t('set.forceReview')}</b>
              <small>{t('rev.needReview')}</small>
            </div>
            <Switch checked={cfg.forceReview} ariaLabel={t('set.forceReview')}
                    onChange={v => setCfg('forceReview', v)} />
          </div>


          <div className="set-row">
            <div className="set-row-main">
              <b>{t('set.failNext')}</b>
              <small>{t('mon.retryNote')}</small>
            </div>
            <Switch checked={cfg.failNext} ariaLabel={t('set.failNext')}
                    onChange={v => setCfg('failNext', v)} />
          </div>
        </div>
      </Card>
            ) },
          { id: 'theme', group: 'general', icon: 'palette', tone: 'violet',
            title: t('set.themeTitle'), desc: t('set.themeDesc'), show: true,
            body: (
        <>
        <Card>
          <PanelHead title={t('set.paletteTitle')} />
          <div className="panel-body set-rows">
            <div className="set-row">
              <div className="set-row-main"><b>{t('set.appearance')}</b></div>
              <Segmented<'light' | 'dark' | 'auto'>
                value={prefs.appearance}
                onChange={v => setPref('appearance', v)}
                ariaLabel={t('set.appearance')}
                options={[
                  { value: 'light', label: t('set.themeLight') },
                  { value: 'dark',  label: t('set.themeDark') },
                  { value: 'auto',  label: t('set.appAuto') },
                ]}
              />
            </div>

            <div className="set-row set-row--stack">
              <div className="set-row-main"><b>{t('set.paletteBase')}</b></div>
              <div className="pal-grid" role="radiogroup" aria-label={t('set.paletteBase')}>
                {PALETTES.map(pl => (
                  <button key={pl.id} type="button" role="radio"
                          aria-checked={prefs.palette === pl.id}
                          className={`opt-card pal-card${prefs.palette === pl.id ? ' is-on' : ''}`}
                          onClick={() => setPref('palette', pl.id)}>
                    <span className="opt-card-head">
                      <span className="pal-swatches" aria-hidden="true">
                        {pl.swatches.map((c, i) => <i key={i} style={{ background: c }} />)}
                      </span>
                      {prefs.palette === pl.id && <em className="opt-badge">{t('set.inUse')}</em>}
                    </span>
                    <b>{t(pl.nameKey as never)}</b>
                    <small>{t(pl.descKey as never)}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="set-row">
              <div className="set-row-main">
                <b>{t('set.seasonal')}</b>
                <small>{t('set.seasonalDesc')}</small>
              </div>
              <Switch checked={prefs.seasonal} ariaLabel={t('set.seasonal')}
                      onChange={v => setPref('seasonal', v)} />
            </div>
          </div>
        </Card>

        <Card>
          <PanelHead title={t('set.fontTitle')} />
          <div className="panel-body set-rows">
            <div className="set-row set-row--stack">
              <div className="set-row-main"><b>{t('set.appearance')}</b></div>
              <div className="pal-grid" role="radiogroup" aria-label={t('set.fontTitle')}>
                {FONTS.map(f => (
                  <button key={f.id} type="button" role="radio"
                          aria-checked={prefs.font === f.id}
                          className={`opt-card font-card${prefs.font === f.id ? ' is-on' : ''}`}
                          onClick={() => setPref('font', f.id)}
                          style={{ fontFamily: f.stack }}>
                    <span className="opt-card-head">
                      <b>สบายดี</b>
                      <span className="font-aa" aria-hidden="true">Aa</span>
                    </span>
                    <small>
                      {f.name}{f.defaultFont ? ` · ${t('set.default')}` : ''}
                      {prefs.font === f.id && <em className="opt-badge">{t('set.inUse')}</em>}
                    </small>
                  </button>
                ))}
              </div>
            </div>

            <div className="set-row">
              <div className="set-row-main">
                <b>{t('set.fontBold')}</b>
                <small>{t('set.fontBoldDesc')}</small>
              </div>
              <Switch checked={prefs.bold} ariaLabel={t('set.fontBold')}
                      onChange={v => setPref('bold', v)} />
            </div>

            <div className="set-row set-row--stack">
              <div className="set-row-main"><b>{t('set.fontSize')}</b></div>
              <div className="size-slider">
                <span aria-hidden="true" style={{ fontSize: 12 }}>a</span>
                <div className="size-range"
                     style={{ '--p': `${((prefs.scale - 80) / 40) * 100}%` } as React.CSSProperties}>
                  <span className="size-ticks" aria-hidden="true">
                    {[80, 90, 100, 110, 120].map(v => (
                      <i key={v} className={prefs.scale >= v ? 'is-passed' : undefined} />
                    ))}
                  </span>
                  <input type="range" min={80} max={120} step={10}
                         value={prefs.scale} aria-label={t('set.fontSize')}
                         onChange={e => setPref('scale', Number(e.target.value))} />
                </div>
                <span aria-hidden="true" style={{ fontSize: 18, fontWeight: 700 }}>A</span>
              </div>
              <small className="size-note">
                {t('set.fontSizeNow')} · {t(`size.${prefs.scale}` as never)} ({prefs.scale}%)
                {prefs.scale === 100 ? ` — ${t('set.default')}` : ''}
              </small>
            </div>
          </div>
        </Card>

        <Card>
          <PanelHead title={t('set.langTitle')} sub={t('set.langDesc')} />
          <div className="panel-body lang-rows" role="radiogroup" aria-label={t('set.langTitle')}>
            {([['TH', '🇹🇭', 'ไทย', 'Thai'], ['EN', '🇬🇧', 'English', 'อังกฤษ']] as const).map(([code, flag, name, sub]) => (
              <button key={code} type="button" role="radio" aria-checked={lang === code}
                      className={`opt-card lang-row${lang === code ? ' is-on' : ''}`}
                      onClick={() => setLang(code)}>
                <span className="lang-flag" aria-hidden="true">{flag}</span>
                <span className="set-item-main">
                  <b>{name}</b>
                  <small>{sub}</small>
                </span>
                {lang === code && <em className="opt-badge">{t('set.inUse')}</em>}
              </button>
            ))}
          </div>
        </Card>
        </>
            ) },
          { id: 'supply', group: 'link', icon: 'warehouse-alt', tone: 'teal',
            title: t('set.supply'), desc: t('set.supplyDesc'),
            show: can('map.propose') || can('map.approve'),
            body: (() => {
              const links = facilities.map(o => ({ o, sp: supplyLinkFor(supply, o) }))
              const count = (st: MapState) => links.filter(x => x.sp?.state === st).length
              const unset = links.filter(x => !x.sp?.wh || x.sp.state === 'DRAFT' || x.sp.state === 'REJECTED').length
              return (
        <Card>
          <PanelHead title={t('set.supply')} sub={t('set.supplyNote')} />
          <div className="panel-body link-body">
            <DocSummary tiles={[
              { label: t('req.facility'), value: links.length, tone: 'info', icon: 'building' },
              { label: t('map.ACTIVE'), value: count('ACTIVE'), tone: 'green', icon: 'check-circle' },
              { label: t('map.PENDING_APPROVAL'), value: count('PENDING_APPROVAL'), tone: 'amber', icon: 'clock' },
              { label: t('ref.notMapped'), value: unset, tone: 'gray', icon: 'triangle-warning' },
            ]} />
            <TableWrap>
              <thead>
                <tr>
                  <th>{t('req.facility')}</th>
                  <th>{t('set.supply')}</th>
                  <th>{t('mapa.whOwner')}</th>
                  <th>{t('c.status')}</th>
                  <th className="cell-action" aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {links.map(({ o, sp }) => {
                  const cur = sp?.wh ?? ''
                  const owner = cur ? WAREHOUSES[cur].org : ''
                  const editable = can('map.propose') && (!sp || ['DRAFT', 'REJECTED'].includes(sp.state))
                  const mayApprove = can('map.approve') &&
                    (r.scope === 'ALL' || r.scope === 'PROVINCE' || owner === r.org)
                  const cross = !!owner && owner !== ORGS[o].parent
                  const actions =
                    sp?.state === 'PENDING_APPROVAL' ? (
                      mayApprove ? (<>
                        <Button size="sm" variant="danger" onClick={() => supplyAction(o, 'reject')}>{t('mapa.reject')}</Button>
                        <Button size="sm" variant="primary" onClick={() => supplyAction(o, 'approve')}>{t('mapa.approve')}</Button>
                      </>) : <span className="cell-sub">{t('mat.awaiting')}</span>
                    ) : editable && sp ? (
                      <Button size="sm" variant="primary" disabled={!cur}
                              onClick={() => supplyAction(o, 'propose')}>{t('set.requestApproval')}</Button>
                    ) : sp?.state === 'ACTIVE' && can('map.propose') ? (
                      <Button size="sm" variant="ghost" onClick={() => supplyAction(o, 'change')}>{t('set.requestChange')}</Button>
                    ) : null
                  return (
                    <tr key={o}>
                      <td>
                        <div className="link-cell">
                          <span className="link-card-ico tone-teal" aria-hidden="true"><i className="fi fi-rr-building" /></span>
                          <div>
                            <span className="cell-strong">{orgName(o)}</span>
                            <span className="cell-sub">{orgSub(o)}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {editable ? (
                          <Select value={cur} style={{ minWidth: 240 }}
                                  aria-label={`${t('set.supply')} ${orgName(o)}`}
                                  onChange={e => setSupplyWh(o, e.target.value)}>
                            <option value="">{t('set.pickSupply')}</option>
                            {hospitalWarehouses().map(w => (
                              <option key={w} value={w}>{whName(w)} · {orgName(WAREHOUSES[w].org)}</option>
                            ))}
                          </Select>
                        ) : cur
                          ? <span className="cell-strong">{whName(cur)}</span>
                          : <span className="cell-sub">{t('ref.notMapped')}</span>}
                      </td>
                      <td>
                        {owner ? orgName(owner) : '—'}
                        {cross && <> <Chip warn>{t('mapa.crossHospital')}</Chip></>}
                      </td>
                      <td><MapBadge state={sp?.state ?? 'UNMAPPED'} /></td>
                      <td className="cell-action">{actions && <div className="row-actions">{actions}</div>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </TableWrap>
          </div>
        </Card>
              )
            })() },
          { id: 'wh', group: 'link', icon: 'link-alt', tone: 'indigo',
            title: t('set.whMapping'), desc: t('set.whMappingDesc'),
            show: can('map.propose') || can('map.approve'),
            body: (() => {
              const count = (st: MapState) => warehouses.filter(w => WAREHOUSES[w].mapState === st).length
              return (
        <Card>
          <PanelHead title={t('set.whMapping')} sub={t('set.whMappingDesc')}><Chip accent>1 : 1</Chip></PanelHead>
          <div className="panel-body link-body">
            <DocSummary tiles={[
              { label: t('stk.tree'), value: warehouses.length, tone: 'indigo', icon: 'warehouse-alt' },
              { label: t('map.ACTIVE'), value: count('ACTIVE'), tone: 'green', icon: 'check-circle' },
              { label: t('map.PENDING_APPROVAL'), value: count('PENDING_APPROVAL'), tone: 'amber', icon: 'clock' },
              { label: t('ref.notMapped'), value: warehouses.length - count('ACTIVE') - count('PENDING_APPROVAL'), tone: 'gray', icon: 'triangle-warning' },
            ]} />
            <TableWrap>
              <thead>
                <tr>
                  <th>{t('stk.tree')}</th>
                  <th>{t('req.facility')}</th>
                  <th>{t('set.codeInSystem')}</th>
                  <th>{t('set.codeInTarget')}</th>
                  <th>{t('c.status')}</th>
                  <th className="cell-action" aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {warehouses.map(w => {
                  const wh = WAREHOUSES[w]
                  const actions =
                    wh.mapState === 'PENDING_APPROVAL'
                      ? (can('map.approve')
                          ? <Button size="sm" variant="primary" onClick={() => whAction(w, 'approve')}>{t('mapa.approve')}</Button>
                          : <span className="cell-sub">{t('mat.awaiting')}</span>)
                      : wh.mapState === 'DRAFT' && (can('map.propose') || can('map.approve'))
                        ? <Button size="sm" variant="primary" icon="link" onClick={() => whAction(w, 'propose')}>{t('set.linkCode')}</Button>
                        : null
                  return (
                    <tr key={w}>
                      <td>
                        <div className="link-cell">
                          <span className="link-card-ico tone-indigo" aria-hidden="true"><i className="fi fi-rr-warehouse-alt" /></span>
                          <div><span className="cell-strong">{whName(w)}</span></div>
                        </div>
                      </td>
                      <td>{orgName(wh.org)}</td>
                      <td><em className="code-chip">{w}</em></td>
                      <td><em className={`code-chip${wh.ext ? '' : ' is-empty'}`}>{wh.ext || t('ref.notMapped')}</em></td>
                      <td><MapBadge state={wh.mapState} /></td>
                      <td className="cell-action">{actions && <div className="row-actions">{actions}</div>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </TableWrap>
          </div>
        </Card>
              )
            })() },
          { id: 'connector', group: 'link', icon: 'plug-connection', tone: 'cyan',
            title: t('set.connector'), desc: t('set.connectorDesc'),
            show: can('settings.connector'),
            body: (() => {
              const endpointOf = (org: string) => `10.8.${org === 'HOSP' ? '1.20:8443' : '14.5:9100'}`
              const whOf = (org: string) => Object.values(WAREHOUSES).filter(w => w.org === org)
              const orgs = Object.values(ORGS).filter(o => whOf(o.id).length > 0)
              const ready = orgs.filter(o => whOf(o.id).every(w => w.ext)).length
              return (
        <Card>
          <PanelHead title={t('set.connector')} sub={t('set.connectorDesc')} />
          <div className="panel-body link-body">
            <DocSummary tiles={[
              { label: t('req.facility'), value: orgs.length, tone: 'cyan', icon: 'building' },
              { label: t('mon.endpoint'), value: new Set(orgs.map(o => endpointOf(o.id))).size, tone: 'info', icon: 'plug-connection' },
              { label: t('set.linkedAll'), value: ready, tone: 'green', icon: 'check-circle' },
              { label: t('map.DRAFT'), value: orgs.length - ready, tone: 'gray', icon: 'triangle-warning' },
            ]} />
            <TableWrap>
              <thead>
                <tr>
                  <th>{t('req.facility')}</th>
                  <th>{t('mon.endpoint')}</th>
                  <th>{t('set.codeInSystem')}</th>
                  <th>{t('set.codeInTarget')}</th>
                  <th>{t('c.status')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(WAREHOUSES).map(w => (
                  <tr key={w.id}>
                    <td>
                      <div className="link-cell">
                        <span className={`link-card-ico ${w.ext ? 'tone-cyan' : 'tone-gray'}`} aria-hidden="true">
                          <i className="fi fi-rr-plug-connection" />
                        </span>
                        <div>
                          <span className="cell-strong">{orgName(w.org)}</span>
                          <span className="cell-sub">{whName(w.id)}</span>
                        </div>
                      </div>
                    </td>
                    <td><em className="code-chip">{endpointOf(w.org)}</em></td>
                    <td><em className="code-chip">{w.id}</em></td>
                    <td><em className={`code-chip${w.ext ? '' : ' is-empty'}`}>{w.ext || t('ref.notMapped')}</em></td>
                    <td><MapBadge state={w.ext ? 'ACTIVE' : 'DRAFT'} /></td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        </Card>
              )
            })() },
          { id: 'users', group: 'users', icon: 'users-alt', tone: 'green',
            title: t('set.users'), desc: t('set.usersDesc'),
            show: can('settings.users'),
            body: (() => {
              const ids = Object.keys(ROLES) as RoleId[]
              return (
        <Card>
          <PanelHead title={t('set.users')} sub={t('set.usersDesc')} />
          <div className="panel-body link-body">
            <DocSummary tiles={[
              { label: t('set.roles'), value: ids.length, tone: 'green', icon: 'users-alt' },
              { label: t('role.scope'), value: new Set(ids.map(id => ROLES[id].scope)).size, tone: 'info', icon: 'globe' },
              { label: t('set.visibleMenus'), value: Math.max(...ids.map(id => ROLES[id].menu.length)), tone: 'indigo', icon: 'apps' },
              { label: t('user.perms'), value: Math.max(...ids.map(id => ROLES[id].can.length)), tone: 'amber', icon: 'shield-check' },
            ]} />
            <TableWrap>
              <thead>
                <tr>
                  <th>{t('set.roles')}</th>
                  <th>{t('req.facility')}</th>
                  <th>{t('role.scope')}</th>
                  <th className="num">{t('set.visibleMenus')}</th>
                  <th className="num">{t('user.perms')}</th>
                  <th className="cell-action" aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {ids.map(id => {
                  const R = ROLES[id]
                  const on = id === role
                  return (
                    <tr key={id}>
                      <td>
                        <div className="link-cell">
                          <span className={`link-card-ico ${on ? 'tone-green' : 'tone-gray'}`} aria-hidden="true">
                            <i className="fi fi-rr-users-alt" />
                          </span>
                          <div>
                            <span className="cell-strong">{lang === 'EN' ? R.label : R.labelTh}</span>
                            <span className="cell-sub"><em className="code-chip">{R.id}</em></span>
                          </div>
                        </div>
                      </td>
                      <td>{orgName(R.org)}</td>
                      <td>{t(`scope.${R.scope}`)}</td>
                      <td className="num">{R.menu.length}</td>
                      <td className="num">{R.can.length}</td>
                      <td className="cell-action">
                        <div className="row-actions">
                          {on
                            ? <Badge tone="green">{t('set.currentRole')}</Badge>
                            : <Button size="sm" variant="primary" onClick={() => setRole(id)}>{t('role.switch')}</Button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </TableWrap>
          </div>
        </Card>
              )
            })() },
        ]
        const GROUPS: [string, string][] = [
          ['general', t('set.groupGeneral')],
          ['notify', t('set.groupNotify')],
          ['link', t('set.groupLink')],
          ['users', t('set.groupUsers')],
        ]
        const needle = q.trim().toLowerCase()
        const visible = MENU.filter(m => m.show &&
          (!needle || `${m.title} ${m.desc}`.toLowerCase().includes(needle)))
        const active = MENU.find(m => m.id === section && m.show)

        if (active) {
          return (
            <>
              <header className="glass card doc-head">
                {/* Topic icon as the oversized watermark, like document pages. */}
                <i className={`fi fi-rr-${active.icon} doc-head-mark`} aria-hidden="true" />
                <div className="doc-head-top">
                  <button className="doc-back" onClick={() => nav('/settings')} aria-label={t('c.back')}>
                    <Icon name="chevL" size={16} />
                  </button>
                  <div className="doc-head-id">
                    <h1>{active.title}</h1>
                    <p>{active.desc}</p>
                  </div>
                </div>
              </header>

              {active.body}
            </>
          )
        }

        return (
          <div className="set-hub">
              {visible.length === 0 ? (
                <Card><Empty icon="search" title={t('c.noResults')} hint={t('c.noResultsHint')} /></Card>
              ) : GROUPS.map(([gid, glabel]) => {
                const items = visible.filter(m => m.group === gid)
                if (!items.length) return null
                return (
                  <div className="set-group" key={gid}>
                    <div className="set-group-label">{glabel}</div>
                    <div className="set-items">
                      {items.map(m => (
                        <button type="button" className="set-item" key={m.id}
                                onClick={() => { nav(`/settings/${m.id}`); setQ('') }}>
                          <span className={`set-item-ico tone-${m.tone}`} aria-hidden="true">
                            <i className={`fi fi-rr-${m.icon}`} />
                          </span>
                          <span className="set-item-main">
                            <b>{m.title}</b>
                            <small>{m.desc}</small>
                          </span>
                          <Icon name="chevR" size={16} />
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        )
      })()}
    </>
  )
}

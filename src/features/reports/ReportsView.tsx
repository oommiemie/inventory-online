import { useMemo, useState } from 'react'
import { useStore, visibleDocs } from '@/app/store'
import { ROLES, WAREHOUSES } from '@/data/seed'
import { M, num, isTerminal } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import { Card, PanelHead, TableWrap, Empty, Badge } from '@/components/ui'
import { KpiCard } from '@/components/Kpi'
import { CountUp } from '@/components/CountUp'
import { useEntered } from '@/hooks/useMotion'
import { BarChart } from '@/components/charts/BarChart'
import { STATE_TONE } from '@/lib/domain'
import type { DocState } from '@/types'
import { HeroBar, HeroSelect, HeroCta } from '@/components/layout/HeroBar'
import { useMenuToggle } from '@/components/layout/AppShell'
import './reports.css'

/** CSS variable behind each badge tone, for chart strokes. */
const TONE_VAR: Record<string, string> = {
  gray: '--n-400', amber: '--warn', violet: '--violet', indigo: '--indigo',
  cyan: '--cyan', info: '--info', teal: '--teal', green: '--ok',
  'ok-done': '--done', rose: '--rose', danger: '--danger', slate: '--slate',
}

/** Donut of documents by state — a floating glass ring: soft drop shadow
    below, specular sheen across the top, centre total on a clean well. */
function StateDonut({ data, total, label, names }:
  { data: [DocState, number][]; total: number; label: string
    names: (st: DocState) => string }) {
  const R = 56, W = 18, C = 2 * Math.PI * R
  const [hov, setHov] = useState<DocState | null>(null)
  const entered = useEntered()   // arcs sweep out from zero length on first paint
  let acc = 0
  const hovItem = data.find(([st]) => st === hov)
  return (
    <div className="donut-box">
    <svg className="donut" viewBox="0 0 150 150" role="img" aria-label={label}>
      <defs>
        <filter id="donut-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#12275C" floodOpacity="0.22" />
        </filter>
        <linearGradient id="donut-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g filter="url(#donut-shadow)">
        <circle cx="75" cy="75" r={R} fill="none" stroke="var(--n-100)" strokeWidth={W} />
        {data.map(([st, n], i) => {
          const len = (n / total) * C
          const off = (acc / total) * C
          acc += n
          return (
            <circle key={st} cx="75" cy="75" r={R} fill="none"
              stroke={`var(${TONE_VAR[STATE_TONE[st]] ?? '--n-400'})`}
              strokeWidth={hov === st ? W + 4 : W} strokeLinecap="butt"
              strokeDasharray={entered ? `${Math.max(len - 2, 0.6)} ${C - Math.max(len - 2, 0.6)}` : `0 ${C}`}
              strokeDashoffset={-off}
              opacity={hov === null || hov === st ? 1 : 0.35}
              style={{ transition: `stroke-dasharray .8s var(--ease-out) ${i * 90}ms, stroke-width 120ms ease, opacity 120ms ease` }}
              onMouseEnter={() => setHov(st)} onMouseLeave={() => setHov(null)}
              transform="rotate(-90 75 75)" />
          )
        })}
      </g>

      {/* Specular sheen riding the whole ring. */}
      <circle cx="75" cy="75" r={R} fill="none" pointerEvents="none"
              stroke="url(#donut-gloss)" strokeWidth={W} />

      <text x="75" y="70" textAnchor="middle" className="donut-total">
        {hovItem ? hovItem[1] : <CountUp value={total} />}
      </text>
      <text x="75" y="90" textAnchor="middle" className="donut-label">
        {hovItem
          ? `${names(hovItem[0])} · ${Math.round((hovItem[1] / total) * 100)}%`
          : label}
      </text>
    </svg>
    </div>
  )
}


export function ReportsView() {
  const { t, lang, orgName, whName, itemName } = useT()
  const role = useStore(s => s.role)
  const onMenu = useMenuToggle()
  const docs = useStore(s => s.docs)
  const stock = useStore(s => s.stock)
  const expiryAlert = useStore(s => s.cfg.expiryAlert)
  const toast = useStore(s => s.toast)

  const r = ROLES[role]
  const all = visibleDocs(docs, role)

  const [fOrg, setFOrg] = useState('')
  const [range, setRange] = useState<'all' | '30' | '90'>('all')
  const orgs = useMemo(() => [...new Set(all.map(d => d.org))], [all])

  // "dd/mm/yy hh:mm" with a two-digit Buddhist year -> CE Date.
  const dateOf = (created: string) => {
    const [dd, mm, yy] = created.split(' ')[0].split('/').map(Number)
    return new Date(2500 + yy - 543, mm - 1, dd)
  }
  const now = new Date(2026, 7, 27)
  const mine = useMemo(() => all.filter(d => {
    if (fOrg && d.org !== fOrg) return false
    if (range !== 'all') {
      const days = (now.getTime() - dateOf(d.created).getTime()) / 86400000
      if (days > Number(range)) return false
    }
    return true
  }), [all, fOrg, range])

  const stats = useMemo(() => {
    const value = mine.reduce((a, d) => a + d.lines.reduce((x, l) => x + M(l.item).price * l.approved, 0), 0)
    const done = mine.filter(d => d.state === 'COMPLETED')
    const active = mine.filter(d => !isTerminal(d.state))
    const transit = mine.reduce((a, d) => a + d.transit, 0)
    const issued = mine.reduce((a, d) => a + d.lines.reduce((x, l) => x + l.issued, 0), 0)
    const approved = mine.reduce((a, d) => a + d.lines.reduce((x, l) => x + l.approved, 0), 0)
    return { value, done, active, transit, fulfil: approved ? Math.round((issued / approved) * 100) : 0 }
  }, [mine])

  const byOrg = useMemo(() => {
    const acc: Record<string, { n: number; value: number; done: number }> = {}
    for (const d of mine) {
      const a = acc[d.org] ??= { n: 0, value: 0, done: 0 }
      a.n++
      a.value += d.lines.reduce((x, l) => x + M(l.item).price * l.approved, 0)
      if (d.state === 'COMPLETED') a.done++
    }
    return Object.entries(acc).sort((a, b) => b[1].value - a[1].value)
  }, [mine])

  const byState = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const d of mine) acc[d.state] = (acc[d.state] ?? 0) + 1
    return Object.entries(acc).sort((a, b) => b[1] - a[1]) as [DocState, number][]
  }, [mine])

  const topItems = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const d of mine) for (const l of d.lines) acc[l.item] = (acc[l.item] ?? 0) + l.approved
    const rows = Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const max = rows[0]?.[1] ?? 1
    return rows.map(([item, qty]) => ({ item, qty, pct: Math.round((qty / max) * 100) }))
  }, [mine])

  const chartData = byOrg.slice(0, 5).map(([org, v]) => ({
    label: (lang === 'EN' ? orgName(org) : orgName(org)).replace(/^(รพ\.สต\.|Khok |Ho |Wisit |Som )/, '').slice(0, 8),
    values: { docs: v.n, done: v.done },
  }))

  const maxOrgValue = byOrg[0]?.[1].value || 1

  /* Lots bucketed by days to expiry, within scope and the facility filter. */
  const expiry = useMemo(() => {
    const whs = Object.keys(WAREHOUSES).filter(w =>
      (r.scope !== 'OWN_ORG' || WAREHOUSES[w].org === r.org) && (!fOrg || WAREHOUSES[w].org === fOrg))
    const daysLeft = (exp: string) => Math.ceil((dateOf(exp).getTime() - now.getTime()) / 86400000)
    const lots = stock
      .filter(x => x.qty > 0 && whs.includes(x.wh))
      .map(x => ({ ...x, left: daysLeft(x.exp) }))
      .sort((a, b) => a.left - b.left)
    const buckets = ([
      { key: 'expired', max: 0,        tone: 'danger' },
      { key: 'd30',     max: 30,       tone: 'danger' },
      { key: 'd60',     max: 60,       tone: 'amber' },
      { key: 'd90',     max: 90,       tone: 'amber' },
      { key: 'later',   max: Infinity, tone: 'green' },
    ] as const).map(b => ({ ...b, lots: 0, qty: 0, value: 0 }))
    for (const l of lots) {
      const b = buckets.find(x => l.left <= x.max)!
      b.lots++; b.qty += l.qty; b.value += l.qty * M(l.item).price
    }
    /* Bars compare the alert bands only; healthy stock dwarfs them and is
       reported as a context line instead. */
    const bands = buckets.filter(b => b.key !== 'later')
    return {
      bands, later: buckets[buckets.length - 1], total: lots.length,
      soonest: lots.filter(l => l.left <= 90).slice(0, 5),
      atRisk: lots.filter(l => l.left <= expiryAlert).length,
      maxQty: Math.max(1, ...bands.map(b => b.qty)),
    }
  }, [stock, fOrg, role, expiryAlert])

  return (
    <>
      <HeroBar
        onMenu={onMenu}
        identity={false}
        art={false}
        title={t('rep.title')}
        sub={`${t('rep.subtitle')} · ${t(`scope.${r.scope}`)}`}
        controls={<>
          <HeroSelect value={fOrg} onChange={setFOrg} ariaLabel={t('req.filterOrg')}>
            <option value="">{t('req.filterOrg')} ({all.length})</option>
            {orgs.map(o => <option key={o} value={o}>{orgName(o)}</option>)}
          </HeroSelect>
          <HeroSelect value={range} onChange={v => setRange(v as 'all' | '30' | '90')}
                      ariaLabel={t('rep.rangeAll')}>
            <option value="all">{t('rep.rangeAll')}</option>
            <option value="30">{t('rep.range30')}</option>
            <option value="90">{t('rep.range90')}</option>
          </HeroSelect>
        </>}
        actions={
          <HeroCta variant="ghost" icon="download"
                   onClick={() => toast(t('c.exportQueued'), 'ok')}>{t('c.export')}</HeroCta>
        }
      />

      <div className="kpi-row kpi-row--5">
        <KpiCard tone="info"   icon="analytics" label={t('rep.totalValue')}
                 value={`${t('c.baht')} ${num(Math.round(stats.value))}`}
                 hint={`${mine.length} ${t('c.docs')}`} />
        <KpiCard tone="green"  icon="box-check" label={t('rep.completed')} value={stats.done.length}
                 hint={`${mine.length ? Math.round(stats.done.length / mine.length * 100) : 0}% ${t('c.of')} ${mine.length}`}
                 progress={mine.length ? (stats.done.length / mine.length) * 100 : 0} />
        <KpiCard tone="amber"  icon="assessment" label={t('rep.inProgress')} value={stats.active.length}
                 hint={`${t('c.of')} ${mine.length} ${t('c.docs')}`}
                 progress={mine.length ? (stats.active.length / mine.length) * 100 : 0} />
        <KpiCard tone="teal"   icon="quick-box" label={t('rep.inTransit')} value={num(stats.transit)}
                 hint={t('c.units')} />
        <KpiCard tone="violet" icon="folder-check" label={t('rep.fulfilment')} value={`${stats.fulfil}%`}
                 hint={t('rcv.issuedQty')} progress={stats.fulfil} />
      </div>

      <div className="rep-grid">
        <div className="rep-col">
        <Card>
          <PanelHead title={t('rep.byFacility')} sub={`${byOrg.length}`} />
          {byOrg.length === 0 ? <Empty icon="chart" title={t('c.noResults')} /> : (
            <TableWrap>
              <thead>
                <tr>
                  <th>{t('req.facility')}</th>
                  <th className="num">{t('c.docs')}</th>
                  <th style={{ width: '38%' }}>{t('c.value')}</th>
                  <th className="num">{t('rep.completed')}</th>
                </tr>
              </thead>
              <tbody>
                {byOrg.map(([org, v]) => (
                  <tr key={org}>
                    <td className="cell-strong">{orgName(org)}</td>
                    <td className="num">{v.n}</td>
                    <td>
                      <div className="val-cell">
                        <b className="num">{t('c.baht')} {num(Math.round(v.value))}</b>
                        <span className="val-track">
                          <span className="val-fill" style={{ width: `${(v.value / maxOrgValue) * 100}%` }} />
                        </span>
                      </div>
                    </td>
                    <td className="num">
                      <span className="done-cell">
                        <b>{v.done}</b>/{v.n}
                        <span className="val-track val-track--ok">
                          <span className="val-fill" style={{ width: `${(v.done / v.n) * 100}%` }} />
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>

        <Card>
          <PanelHead title={t('dash.trend')} sub={t('rep.byFacility')} />
          <div className="panel-body">
            {chartData.length === 0 ? <Empty icon="chart" title={t('c.noResults')} /> : (
              <BarChart
                data={chartData}
                series={[
                  { key: 'docs', label: t('c.docs'),        color: 'var(--brand-500)' },
                  { key: 'done', label: t('rep.completed'), color: 'var(--ok)' },
                ]}
              />
            )}
          </div>
        </Card>

        <Card>
          <PanelHead title={t('rep.expiry')}
                     sub={`${expiry.total} ${t('rep.lots')} · ${t('rep.alertWindow')} ${expiryAlert} ${t('rep.days')}`}>
            <Badge tone={expiry.atRisk ? 'danger' : 'green'}>{expiry.atRisk} {t('rep.lotsAtRisk')}</Badge>
          </PanelHead>
          <div className="panel-body exp-grid">
            <ul className="exp-buckets">
              {expiry.bands.map(b => (
                <li key={b.key} className={`exp-bucket tone-${b.tone}`}>
                  <span className="exp-label">{t(`rep.exp.${b.key}` as never)}</span>
                  <span className="exp-figs">
                    <b className="num">{num(b.qty)}</b>
                    <small>{b.lots} {t('rep.lots')} · {t('c.baht')} {num(Math.round(b.value))}</small>
                  </span>
                  <span className="exp-track">
                    <span className="exp-fill" style={{ width: `${Math.round((b.qty / expiry.maxQty) * 100)}%` }} />
                  </span>
                </li>
              ))}
              <li className="exp-later">
                <span>{t('rep.exp.later')}</span>
                <b className="num">{num(expiry.later.qty)}</b>
                <small>{expiry.later.lots} {t('rep.lots')}</small>
              </li>
            </ul>
            <div className="exp-soon">
              <span className="exp-soon-title">{t('rep.soonest')}</span>
              {expiry.soonest.length === 0 ? <Empty icon="check" title={t('c.noResults')} /> : expiry.soonest.map(l => (
                <div key={`${l.wh}-${l.item}-${l.lot}`} className="exp-lot">
                  <span className="exp-lot-main">
                    <b>{M(l.item).code} <em>{itemName(l.item)}</em></b>
                    <small>{whName(l.wh)} · {l.lot} · {l.exp}</small>
                  </span>
                  <Badge tone={l.left <= 30 ? 'danger' : l.left <= 90 ? 'amber' : 'green'}>
                    {l.left <= 0 ? t('rep.exp.expired') : `${l.left} ${t('rep.days')}`}
                  </Badge>
                  <b className="num exp-lot-qty">{num(l.qty)}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>

        </div>

        <div className="rep-col">
        <Card>
          <PanelHead title={t('rep.byState')} sub={`${mine.length} ${t('c.docs')}`} />
          <div className="panel-body">
            {byState.length === 0 ? <Empty icon="doc" title={t('c.noResults')} /> : (
              <div className="donut-wrap">
                <StateDonut data={byState} total={mine.length} label={t('c.docs')}
                            names={st => t(`st.${st}`)} />
                <ul className="donut-legend">
                  {byState.map(([st, n]) => (
                    <li key={st}>
                      <i style={{ background: `var(${TONE_VAR[STATE_TONE[st]] ?? '--n-400'})` }} />
                      <span>{t(`st.${st}`)}</span>
                      <b className="num">{n}</b>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <PanelHead title={t('rep.topItems')} />
          <div className="panel-body">
            {topItems.length === 0 ? <Empty icon="box" title={t('c.noResults')} /> : (
              <ol className="rank-list">
                {topItems.map((x, i) => (
                  <li className="rank-row" key={x.item}>
                    <span className={`rank-no rank-no--${i < 3 ? i + 1 : 'rest'}`}>{i + 1}</span>
                    <span className="rank-main">
                      <b>{M(x.item).code}</b>
                      <small>{itemName(x.item)}</small>
                    </span>
                    <b className="rank-qty num">{num(x.qty)}</b>
                    <span className="rank-track">
                      <span className="rank-fill" style={{ width: `${x.pct}%` }} />
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>
        </div>
      </div>
    </>
  )
}

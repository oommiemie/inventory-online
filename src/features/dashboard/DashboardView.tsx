import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, visibleDocs } from '@/app/store'
import { viewForDoc } from '@/app/selectors'
import { ROUTE_OF } from '@/app/nav'
import { ROLES, ORGS, WAREHOUSES, REORDER } from '@/data/seed'
import { M, num, available, isTerminal, STATE_TONE } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import { Card, PanelHead, Button, Icon, Empty, Badge } from '@/components/ui'
import { KpiCard } from '@/components/Kpi'
import { HeroBar, HeroSearchTrigger, HeroSelect, HeroCta } from '@/components/layout/HeroBar'
import { useMenuToggle, useSpotlight } from '@/components/layout/AppShell'
import './dashboard.css'

export function DashboardView() {
  const { t, lang, orgName, whName, itemName } = useT()
  const nav = useNavigate()
  const role = useStore(s => s.role)
  const docs = useStore(s => s.docs)
  const stock = useStore(s => s.stock)
  const jobs = useStore(s => s.jobs)
  const createDraft = useStore(s => s.createDraft)
  const onMenu = useMenuToggle()
  const openSpotlight = useSpotlight()

  const r = ROLES[role]
  const all = visibleDocs(docs, role)
  /* Facility filter: every tile and list below follows it. */
  const [fOrg, setFOrg] = useState('')
  const orgs = useMemo(() => [...new Set([
    ...all.map(d => d.org),
    ...Object.values(WAREHOUSES).filter(w => r.scope !== 'OWN_ORG' || w.org === r.org).map(w => w.org),
  ])].filter(o => ORGS[o]), [all, r])
  const mine = fOrg ? all.filter(d => d.org === fOrg) : all
  const can = (p: string) => r.can.includes(p as never)

  const kpi = useMemo(() => ({
    draft:   mine.filter(d => ['DRAFT', 'RETURNED'].includes(d.state)).length,
    pending: mine.filter(d => d.state === 'REQUESTED').length,
    reviewed:mine.filter(d => d.state === 'REQUESTED' && d.review === 'REVIEWED').length,
    toIssue: mine.filter(d => ['APPROVED', 'PARTIALLY_ISSUED'].includes(d.state)).length,
    transit: mine.filter(d => d.transit > 0),
    failed:  jobs.filter(j => j.status === 'FAILED' &&
               (!fOrg || docs.find(d => d.no === j.doc)?.org === fOrg)).length,
    done:    mine.filter(d => d.state === 'COMPLETED').length,
  }), [mine, jobs, docs, fOrg])

  /* Queue ranks documents by how directly this role can act on them:
     rank 0 = waiting on me, rank 1 = mine but waiting on someone else. */
  const queue = useMemo(() => {
    const actionable = (d: typeof mine[number]) =>
      (can('req.review') || can('req.approve')) && d.state === 'REQUESTED' ? true
      : can('req.issue') && ['APPROVED', 'PARTIALLY_ISSUED'].includes(d.state) ? true
      : can('req.receive') && ['ISSUED', 'PARTIALLY_RECEIVED'].includes(d.state) ? true
      : can('req.create') && ['DRAFT', 'RETURNED'].includes(d.state) ? true
      : can('req.settle') && d.state === 'DISCREPANCY'

    return mine
      .filter(d => !isTerminal(d.state))
      .map(d => ({ d, rank: actionable(d) ? 0 : 1 }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 6)
      .map(x => x.d)
  }, [mine, role])

  const lastSync = useStore(s => s.lastSync)

  const lowStock = useMemo(() => {
    const out: { item: string; wh: string; qty: number; rp: number }[] = []
    for (const wh of Object.keys(WAREHOUSES)) {
      if (r.scope === 'OWN_ORG' && WAREHOUSES[wh].org !== r.org) continue
      if (fOrg && WAREHOUSES[wh].org !== fOrg) continue
      for (const [item, rp] of Object.entries(REORDER[wh] ?? {})) {
        const qty = available(stock, wh, item)
        if (qty < rp) out.push({ item, wh, qty, rp })
      }
    }
    return out.sort((a, b) => a.qty / a.rp - b.qty / b.rp).slice(0, 5)
  }, [stock, role, fOrg])

  /* Each bar shows the metric as a share of all documents in scope, so the
     five tracks are comparable rather than arbitrary. */
  const pct = (n: number) => (mine.length ? Math.round((n / mine.length) * 100) : 0)

  const greetName = lang === 'EN' ? 'Anong' : 'คุณอนงค์'
  const today = new Date(2026, 7, 27).toLocaleDateString(
    lang === 'EN' ? 'en-GB' : 'th-TH',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const onNew = () => {
    const org = ORGS[r.org].type === 'PCU' ? r.org : 'PCU01'
    const created = createDraft(org)
    if (created) nav(`/requisitions/${created}`)
  }

  return (
    <>
      <HeroBar
        onMenu={onMenu}
        eyebrow={today}
        title={`${t('dash.greeting')}, ${greetName}`}
        sub={`${t('nav.systemOk')} · ${t('nav.lastSync')} ${lastSync.master}`}
        controls={<HeroSearchTrigger placeholder={t('sl.trigger')} onOpen={openSpotlight} />}
        filterCount={fOrg ? 1 : 0}
        filters={orgs.length > 1 ? (
          <HeroSelect value={fOrg} onChange={setFOrg} ariaLabel={t('req.filterOrg')}>
            <option value="">{t('req.filterOrg')}</option>
            {orgs.map(o => <option key={o} value={o}>{orgName(o)}</option>)}
          </HeroSelect>
        ) : undefined}
        actions={can('req.create')
          ? <HeroCta icon="plus" onClick={onNew}>{t('req.new')}</HeroCta>
          : undefined}
      />

      {/* ---- KPIs ---- */}
      <div className="kpi-row">
        <KpiCard tone="info"   icon="document"       label={t('dash.kpi.draft')}
                 value={kpi.draft}   hint={t('req.nextStep')}
                 progress={pct(kpi.draft)}   onClick={() => nav(ROUTE_OF.requisitions)} />
        <KpiCard tone="amber"  icon="assessment"     label={t('dash.kpi.pending')}
                 value={kpi.pending} hint={`${kpi.reviewed} ${t('rev.reviewed')}`}
                 progress={pct(kpi.pending)} onClick={() => nav(ROUTE_OF.review)} />
        <KpiCard tone="green"  icon="quick-box"      label={t('dash.kpi.toIssue')}
                 value={kpi.toIssue} hint={t('iss.allocated')}
                 progress={pct(kpi.toIssue)} onClick={() => nav(ROUTE_OF.issue)} />
        <KpiCard tone="violet" icon="box-check"      label={t('dash.kpi.transit')}
                 value={kpi.transit.length}
                 hint={`${num(kpi.transit.reduce((a, d) => a + d.transit, 0))} ${t('c.units')}`}
                 progress={pct(kpi.transit.length)} onClick={() => nav(ROUTE_OF.receive)} />
        <KpiCard tone="danger" icon="pulse"          label={t('dash.kpi.failed')}
                 value={kpi.failed} hint={t('mon.deadletter')}
                 progress={kpi.failed ? 100 : 0}   onClick={() => nav(ROUTE_OF.monitor)} />
      </div>

      {/* ---- Main grid ---- */}
      <div className="dash-grid">
        <Card>
          <PanelHead title={t('dash.queue')} sub={t('dash.queueHint')}>
            <Button size="sm" variant="ghost" iconRight="arrowR"
                    onClick={() => nav(ROUTE_OF.requisitions)}>{t('c.all')}</Button>
          </PanelHead>
          <div className="panel-body">
            {queue.length === 0 ? (
              <Empty icon="check" title={t('dash.queueEmpty')} hint={t('dash.queueEmptyHint')} />
            ) : (
              <ul className="queue">
                {queue.map(d => (
                  <li key={d.no}>
                    <button className="queue-row" onClick={() => nav(`${ROUTE_OF[viewForDoc(d)]}/${d.no}`)}>
                      <span className={`queue-ico tone-${STATE_TONE[d.state]}`} aria-hidden="true">
                        <i className="fi fi-rr-document" />
                      </span>
                      <span className="queue-main">
                        <b>{d.no}</b>
                        <em>{orgName(d.org)}</em>
                        <small>
                          {d.lines.length} {t('c.items')} ·{' '}
                          {t('c.baht')} {num(Math.round(d.lines.reduce((a, l) => a + M(l.item).price * l.approved, 0)))}
                        </small>
                      </span>
                      <Badge tone={STATE_TONE[d.state]}>{t(`st.${d.state}`)}</Badge>
                      <Icon name="arrowR" size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <PanelHead title={t('dash.lowStock')} sub={`${lowStock.length}`}>
            <Button size="sm" variant="ghost" iconRight="arrowR"
                    onClick={() => nav(ROUTE_OF.stock)}>{t('nav.stock')}</Button>
          </PanelHead>
          <div className="panel-body">
            {lowStock.length === 0 ? (
              <Empty icon="check" title={t('stk.normal')} />
            ) : (
              <ul className="low-list">
                {lowStock.map(l => {
                  const ratio = l.rp ? Math.min(100, Math.round((l.qty / l.rp) * 100)) : 0
                  // Empty is critical; under a third is a warning.
                  const level = l.qty === 0 ? 'out' : ratio < 34 ? 'crit' : 'warn'
                  return (
                    <li key={`${l.wh}-${l.item}`} className={`low-${level}`}>
                      <span className="low-ico" aria-hidden="true">
                        <i className={`fi fi-sr-${l.qty === 0 ? 'triangle-warning' : 'boxes'}`} />
                      </span>
                      <span className="low-main">{M(l.item).code}</span>
                      <span className="low-desc">{itemName(l.item)} · {whName(l.wh)}</span>
                      <span className="low-figure">
                        <b className="num">{num(l.qty)}</b>
                        <em className="num">/ {num(l.rp)}</em>
                      </span>
                      <span className="low-track">
                        <span className="low-fill" style={{ width: `${Math.max(ratio, 2)}%` }} />
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}

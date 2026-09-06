import { useState } from 'react'
import { useStore } from '@/app/store'
import { ROLES, ORGS } from '@/data/seed'
import { num } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import {
  Card, PanelHead, TableWrap, Badge, Empty, LinkButton,
} from '@/components/ui'
import { SyncBadge } from '@/components/StateBadge'
import './monitor.css'
import { HeroBar, HeroSearch, HeroSelect, HeroCta } from '@/components/layout/HeroBar'
import { useMenuToggle } from '@/components/layout/AppShell'

export function MonitorView() {
  const { t, orgName } = useT()
  const role = useStore(s => s.role)
  const onMenu = useMenuToggle()
  const jobs = useStore(s => s.jobs)
  const apiLog = useStore(s => s.apiLog)
  const docs = useStore(s => s.docs)
  const retry = useStore(s => s.retryJob)
  const toast = useStore(s => s.toast)

  const [q, setQ] = useState('')
  const [fOrg, setFOrg] = useState('')
  /* Jobs carry no org of their own; they belong to the document they sync. */
  const orgOfJob = (doc: string) => docs.find(d => d.no === doc)?.org ?? ''
  const orgs = [...new Set([...apiLog.map(a => a.org), ...jobs.map(j => orgOfJob(j.doc))])]
    .filter(o => ORGS[o])
  const canRetry = ROLES[role].can.includes('monitor.retry')

  const failed = jobs.filter(j => j.status === 'FAILED').length
  const hosxp = jobs.filter(j => j.target === 'HOSXP')
  const pcu = jobs.filter(j => j.target !== 'HOSXP')
  const stuck = docs.filter(d => d.sync === 'FAILED').length
  const transit = docs.filter(d => d.transit > 0).length

  const connectors = [
    { code: 'HX', name: 'HOSxP', sub: 'transfer_out / stock / master',
      tone: failed ? 'amber' : 'green', jobs: hosxp },
    { code: 'PC', name: 'PCU Connectors',
      sub: `transfer_in · ${Object.values(ORGS).filter(o => o.type === 'PCU').length}`,
      tone: 'green', jobs: pcu },
  ] as const

  const needle = q.trim().toLowerCase()
  const jobRows = jobs.filter(j => (!fOrg || orgOfJob(j.doc) === fOrg) && (!needle ||
    [j.id, j.key, j.doc, j.action, j.target, j.err ?? ''].join(' ').toLowerCase().includes(needle)))
  const apiRows = apiLog.filter(a => (!fOrg || a.org === fOrg) && (!needle ||
    [a.endpoint, a.key, a.dir, String(a.code), orgName(a.org) ?? a.org].join(' ').toLowerCase().includes(needle)))

  return (
    <>
      <HeroBar
        onMenu={onMenu}
        identity={false}
        art={false}
        title={t('mon.title')}
        sub={t('mon.subtitle')}
        controls={<>
          <HeroSearch value={q} onChange={setQ} placeholder={t('c.search')} />
          {orgs.length > 1 && (
            <HeroSelect value={fOrg} onChange={setFOrg} ariaLabel={t('req.filterOrg')}>
              <option value="">{t('req.filterOrg')}</option>
              {orgs.map(o => <option key={o} value={o}>{orgName(o)}</option>)}
            </HeroSelect>
          )}
        </>}
        actions={
          <HeroCta icon="refresh" onClick={() => toast(t('mon.refresh'), 'ok')}>{t('mon.refresh')}</HeroCta>
        }
      />

      {/* Connector health, straight under the hero like the dashboard KPIs. */}
      <div className="conn-grid">
        {connectors.map(c => (
          <Card key={c.code} className="card-pad">
            <div className="conn-top">
              <div className={`conn-ico tone-${c.tone}`}>{c.code}</div>
              <div style={{ minWidth: 0 }}>
                <b>{c.name}</b>
                <small>{c.sub}</small>
              </div>
              <Badge tone={c.tone === 'green' ? 'green' : 'amber'}>
                {c.tone === 'green' ? t('mon.healthy') : t('mon.degraded')}
              </Badge>
            </div>
            <div className="conn-metrics">
              <div><span>{t('mon.jobs')}</span><b className="num">{c.jobs.length}</b></div>
              <div><span>{t('mon.success')}</span><b className="num">{c.jobs.filter(j => j.status === 'SYNCED').length}</b></div>
              <div className={c.jobs.some(j => j.status === 'FAILED') ? 'is-bad' : undefined}>
                <span>{t('mon.failed')}</span>
                <b className="num">{c.jobs.filter(j => j.status === 'FAILED').length}</b>
              </div>
            </div>
          </Card>
        ))}

        <Card className="card-pad">
          <div className="conn-top">
            <div className="conn-ico tone-danger">DL</div>
            <div style={{ minWidth: 0 }}>
              <b>{t('mon.deadletter')}</b>
              <small>{t('mon.retryNote')}</small>
            </div>
            <Badge tone={failed ? 'danger' : 'green'}>{failed}</Badge>
          </div>
          <div className="conn-metrics">
            <div><span>API</span><b className="num">{apiLog.length}</b></div>
            <div className={stuck ? 'is-bad' : undefined}>
              <span>{t('mon.stuckDocs')}</span><b className="num">{stuck}</b>
            </div>
            <div><span>{t('rep.inTransit')}</span><b className="num">{transit}</b></div>
          </div>
        </Card>
      </div>

      {/* Both logs share one row, 2:1 — no tab switching. */}
      <div className="detail-grid fill-grid mon-split">
        <Card>
          <PanelHead
            title={t('mon.tabSync')}
            sub={`${t('c.showing')} ${jobRows.length} ${t('c.of')} ${jobs.length}`}
          />
          {jobRows.length === 0
            ? <Empty icon="pulse" title={jobs.length ? t('c.noResults') : t('mon.emptyJobs')} />
            : <TableWrap>
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>{t('req.no')}</th>
                    <th>Action</th>
                    <th className="num">{t('mon.attempt')}</th>
                    <th>{t('c.status')}</th>
                    <th aria-label="actions" />
                  </tr>
                </thead>
                <tbody>
                  {jobRows.map(j => (
                    <tr key={j.id}>
                      <td>
                        <span className="cell-strong">{j.id}</span>
                        <span className="cell-sub">{j.key}</span>
                      </td>
                      <td>
                        {j.doc}
                        <span className="cell-sub">{j.target}{j.err ? ` · ${j.err}` : ''}</span>
                      </td>
                      <td>{j.action}</td>
                      <td className="num">{j.attempt}/5</td>
                      <td><SyncBadge state={j.status} /></td>
                      <td className="cell-action">
                        {j.status === 'FAILED' && canRetry &&
                          <LinkButton onClick={() => retry(j.id)}>{t('mon.retry')}</LinkButton>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>}
        </Card>

        <Card>
          <PanelHead
            title={t('mon.tabApi')}
            sub={`${t('c.showing')} ${apiRows.length} ${t('c.of')} ${apiLog.length}`}
          />
          {apiRows.length === 0
            ? <Empty icon="pulse" title={apiLog.length ? t('c.noResults') : t('mon.emptyApi')} />
            : <TableWrap>
                <thead>
                  <tr>
                    <th>{t('c.date')}</th>
                    <th>{t('mon.endpoint')}</th>
                    <th className="num">HTTP</th>
                  </tr>
                </thead>
                <tbody>
                  {apiRows.map(a => (
                    <tr key={a.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{a.t.split(' ')[1] ?? a.t}</td>
                      <td>
                        <span className="cell-strong">{a.endpoint}</span>
                        <span className="cell-sub">
                          {a.dir} · {ORGS[a.org] ? orgName(a.org) : a.org} · {num(a.ms)} ms
                        </span>
                      </td>
                      <td className="num">
                        <Badge tone={a.code < 300 ? 'green' : a.code < 500 ? 'amber' : 'danger'}>{a.code}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>}
        </Card>
      </div>
    </>
  )
}

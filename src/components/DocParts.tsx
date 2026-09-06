import { useEffect, useMemo, useState } from 'react'
import { CountUp } from '@/components/CountUp'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Requisition } from '@/types'
import { STEP_OF, num, M, STATE_TONE } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import { Card, PanelHead, Empty, TableWrap, Icon, Pagination } from '@/components/ui'
import { useStore } from '@/app/store'
import { HeroBar, HeroSearch, HeroSelect, HeroCta } from '@/components/layout/HeroBar'
import { StateBadge, SyncBadge } from '@/components/StateBadge'
import { ROUTE_OF } from '@/app/nav'
import { viewForDoc } from '@/app/selectors'
import { downloadCsv, csvName } from '@/lib/csv'
import './docparts.css'



/** Document header used by every workflow screen. */
export function DocHeader(
  { doc, backTo, extra }: { doc: Requisition; backTo: string; extra?: React.ReactNode },
) {
  const { t, whName } = useT()
  const nav = useNavigate()
  const loc = useLocation()
  // Go back the way the user came in; `backTo` is the fallback for a document
  // opened directly by URL, where there is no in-app history to return to.
  const goBack = () => {
    if (loc.key !== 'default') nav(-1)
    else nav(backTo)
  }
  return (
    <header className="glass card doc-head">
      {/* Oversized document glyph bleeding off the right edge, as a watermark. */}
      <i className="fi fi-rr-document doc-head-mark" aria-hidden="true" />

      <div className="doc-head-top">
        <button className="doc-back" onClick={goBack} aria-label={t('c.back')}>
          <Icon name="chevL" size={16} />
        </button>

        <div className="doc-head-id">
          <h1>{doc.no}</h1>
          <p>{whName(doc.whFrom)} <span aria-hidden="true">→</span> {whName(doc.whTo)}</p>
        </div>

        {extra && <div className="actions">{extra}</div>}
      </div>
    </header>
  )
}

/** Timeline of state transitions (append-only audit trail). */
export function DocTimeline({ doc, title }: { doc: Requisition; title?: string }) {
  const { t } = useT()
  // Stage labels mirror the six workflow steps the stepper used to show.
  const stages = [t('step.request'), t('step.submit'), t('step.approve'),
                  t('step.issue'), t('step.receive'), t('step.done')]
  const at = STEP_OF[doc.state]
  const off = doc.state === 'REJECTED' || doc.state === 'CANCELLED'

  return (
    <Card>
      <PanelHead title={title ?? t('req.timeline')} sub={`${t('c.step')} ${at + 1}/${stages.length}`} />
      <div className="panel-body">
        <div className="timeline">
          {doc.events.map((e, i) => (
            <div className="tl-item is-done" key={`e${i}`}>
              <b>{t(`ev.${e.action}` as never) || e.action}</b>
              {e.from !== e.to && (
                <span className="tl-flow">
                  {t(`st.${e.from}` as never)} <span aria-hidden="true">→</span> {t(`st.${e.to}` as never)}
                </span>
              )}
              <p>{e.by} · {e.t}{e.note ? <><br />{e.note}</> : null}</p>
            </div>
          ))}

          {/* Stages still ahead, so the card carries the whole journey. */}
          {!off && stages.slice(at + 1).map((label, i) => (
            <div className="tl-item is-todo" key={`s${i}`}>
              <b>{label}</b>
              <p>{t('req.pending')}</p>
            </div>
          ))}

          {doc.events.length === 0 && off && <Empty icon="clock" title={t('req.timelineEmpty')} />}
        </div>
      </div>
    </Card>
  )
}


/** Compact summary tiles above a document's line table. */
export function DocSummary(
  { tiles }: { tiles: { label: string; value: React.ReactNode; tone?: string; icon?: string }[] },
) {
  return (
    <div className="doc-summary">
      {tiles.map((x, i) => (
        <div className={`doc-summary-item tone-${x.tone ?? TILE_TONES[i % TILE_TONES.length]}`} key={x.label}>
          {x.icon && (
            <span className="doc-summary-ico" aria-hidden="true">
              <i className={`fi fi-rr-${x.icon}`} />
            </span>
          )}
          <span className="doc-summary-text">
            <span>{x.label}</span>
            <b className="num">{typeof x.value === 'number' ? <CountUp value={x.value} /> : x.value}</b>
          </span>
        </div>
      ))}
    </div>
  )
}

/** Default tint order, so a summary reads as a set even without explicit tones. */
const TILE_TONES = ['info', 'indigo', 'teal', 'amber'] as const

/** Table of documents shared by the list screens. */
export function DocTable(
  { docs, routeFor, emptyTitle, emptyHint }:
  { docs: Requisition[]; routeFor?: (d: Requisition) => string; emptyTitle: string; emptyHint?: string },
) {
  const { t, orgName, whName } = useT()
  const nav = useNavigate()
  if (!docs.length) return <Empty icon="doc" title={emptyTitle} hint={emptyHint} />

  return (
    <TableWrap className="doc-table">
      <colgroup>
        <col className="c-doc" /><col className="c-facility" /><col className="c-date" />
        <col className="c-items" /><col className="c-value" /><col className="c-status" />
        <col className="c-sync" /><col className="c-action" />
      </colgroup>
      <thead>
        <tr>
          <th>{t('req.no')}</th>
          <th>{t('req.facility')}</th>
          <th>{t('c.date')}</th>
          <th className="num">{t('c.items')}</th>
          <th className="num">{t('c.value')}</th>
          <th>{t('c.status')}</th>
          <th>{t('c.sync')}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {docs.map(d => {
          const value = d.lines.reduce((a, l) => a + M(l.item).price * l.approved, 0)
          const to = routeFor ? routeFor(d) : `${ROUTE_OF[viewForDoc(d)]}/${d.no}`
          // "27/08/69 10:42" -> date and time on separate lines.
          const [day, time] = d.created.split(' ')
          return (
            <tr key={d.no} className="doc-row" onClick={() => nav(to)}
                tabIndex={0} role="link" aria-label={`${d.no} ${orgName(d.org)}`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(to) }
                }}>
              <td>
                <div className="doc-cell">
                  <span className={`doc-ico tone-${STATE_TONE[d.state]}`} aria-hidden="true">
                    <i className="fi fi-rr-document" />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="docno">{d.no}</span>
                    <span className="cell-sub">{whName(d.whFrom)} → {whName(d.whTo)}</span>
                  </span>
                </div>
              </td>
              <td className="cell-strong">{orgName(d.org)}</td>
              <td>
                {day}
                <span className="cell-sub">{time}</span>
              </td>
              <td className="num">{d.lines.length}</td>
              <td className="num cell-strong">{t('c.baht')} {num(Math.round(value))}</td>
              <td><StateBadge state={d.state} showCode={false} /></td>
              <td><SyncBadge state={d.sync} /></td>
              <td className="cell-action" aria-hidden="true">
                <Icon name="chevR" size={16} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </TableWrap>
  )
}


/**
 * Shared queue-list screen (review / issue / receive), styled like the
 * requisition register: plain hero with search + facility filter + export,
 * and a viewport-filling card that pages at 12 rows.
 */
export function DocListPage(
  { title, sub, docs, routeFor, emptyTitle, onMenu }:
  { title: string; sub?: string; docs: Requisition[]; routeFor: (d: Requisition) => string
    emptyTitle: string; onMenu?: () => void },
) {
  const { t, orgName } = useT()
  const toast = useStore(s => s.toast)
  const [q, setQ] = useState('')
  const [fOrg, setFOrg] = useState('')
  const [page, setPage] = useState(1)

  const orgs = useMemo(() => [...new Set(docs.map(d => d.org))], [docs])
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return docs.filter(d =>
      (!fOrg || d.org === fOrg) &&
      (!needle || d.no.toLowerCase().includes(needle) ||
        orgName(d.org).toLowerCase().includes(needle)))
  }, [docs, q, fOrg, orgName])

  const PER_PAGE = 12
  const pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const safePage = Math.min(page, pageCount)
  const rows = useMemo(
    () => list.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [list, safePage],
  )
  useEffect(() => { setPage(1) }, [q, fOrg])

  /* Exports what the filters currently show, not the whole table. */
  const exportCsv = () => {
    if (!list.length) { toast(t('c.exportEmpty'), 'warn'); return }
    const ok = downloadCsv(csvName('requisitions'),
      [t('req.no'), t('req.facility'), t('c.status'), t('c.items'), t('c.value'), t('req.created')],
      list.map(d => [
        d.no, orgName(d.org), t(`st.${d.state}`), d.lines.length,
        Math.round(d.lines.reduce((a, l) => a + M(l.item).price * l.approved, 0)),
        d.created,
      ]))
    toast(t(ok ? 'c.exported' : 'c.exportFailed'), ok ? 'ok' : 'danger')
  }


  return (
    <>
      <HeroBar
        onMenu={onMenu}
        identity={false}
        art={false}
        title={title}
        sub={sub}
        controls={<>
          <HeroSearch value={q} onChange={setQ} placeholder={t('req.searchPh')} />
          {orgs.length > 1 && (
            <HeroSelect value={fOrg} onChange={setFOrg} ariaLabel={t('req.filterOrg')}>
              <option value="">{t('req.filterOrg')}</option>
              {orgs.map(o => <option key={o} value={o}>{orgName(o)}</option>)}
            </HeroSelect>
          )}
        </>}
        actions={
          <HeroCta variant="ghost" icon="download" onClick={exportCsv}>{t('c.export')}</HeroCta>
        }
      />

      <Card className="fill-view">
        <PanelHead title={t('c.items')}
                   sub={`${t('c.showing')} ${rows.length} ${t('c.of')} ${list.length}`} />
        <DocTable docs={rows} routeFor={routeFor} emptyTitle={emptyTitle} />
        <Pagination page={safePage} pageCount={pageCount} onPage={setPage} />
      </Card>
    </>
  )
}

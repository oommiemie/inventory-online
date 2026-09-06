import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from '@/app/store'
import { byState } from '@/app/selectors'
import { ROLES } from '@/data/seed'
import { M, num, fefo } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import {
  Card, PanelHead, Button, KV, Note, TableWrap,
} from '@/components/ui'
import { DocHeader, DocSummary, DocTimeline, DocListPage } from '@/components/DocParts'
import { StateBadge, SyncBadge } from '@/components/StateBadge'
import { useMenuToggle } from '@/components/layout/AppShell'

export function IssueView() {
  const { no } = useParams()
  const { t, orgName, whName, itemName, uomName } = useT()

  const role = useStore(s => s.role)
  const onMenu = useMenuToggle()
  const docs = useStore(s => s.docs)
  const stock = useStore(s => s.stock)
  const act = useStore(s => s.act)

  const r = ROLES[role]
  const can = (p: string) => r.can.includes(p as never)
  const queue = byState(docs, role, 'APPROVED', 'PARTIALLY_ISSUED')
  const doc = no ? docs.find(d => d.no === no) : undefined

  /* Derived before any early return so hook order stays stable across the
     list and detail branches (Rules of Hooks). */
  const alloc = useMemo(
    () => (doc?.lines ?? []).map(l => ({
      line: l,
      plan: l.lots.length
        ? { lots: l.lots, short: Math.max(0, l.approved - l.lots.reduce((a, x) => a + x.qty, 0)) }
        : fefo(stock, doc!.whFrom, l.item, l.approved),
    })),
    [doc, stock])

  /* ---- List ---- */
  if (!doc || !['APPROVED', 'PARTIALLY_ISSUED'].includes(doc.state)) {
    return (
      <>
        <DocListPage onMenu={onMenu} title={t('iss.title')}
                     sub={`${t('iss.subtitle')} · ${queue.length} ${t('c.docs')}`} docs={queue}
                     routeFor={d => `/issue/${d.no}`} emptyTitle={t('iss.empty')} />
      </>
    )
  }

  /* ---- Detail ---- */
  const totalApproved = doc.lines.reduce((a, l) => a + l.approved, 0)
  const totalAlloc = alloc.reduce((a, x) => a + x.plan.lots.reduce((b, y) => b + y.qty, 0), 0)
  const anyShort = alloc.some(x => x.plan.short > 0)
  const busy = doc.sync === 'QUEUED' || doc.sync === 'SENDING'
  const portal = doc.issueMode === 'PORTAL'

  return (
    <>
      <DocHeader doc={doc} backTo="/issue" />

      <div className="detail-grid">
        <div>
          <Card>
            <PanelHead
              title={portal ? t('iss.workbench') : t('iss.modeHosxp')}
              sub={portal ? t('iss.fefo') : t('iss.awaitHosxp')}
            />
            <div className="panel-body panel-body--summary">
              {portal && (
                <div style={{ marginBottom: 'var(--s-4)' }}>
                  <Note tone="info">{t('iss.transitNote')}</Note>
                </div>
              )}
              <DocSummary tiles={[
                { label: t('rev.approvedQty'), value: num(totalApproved),
                  icon: 'check-circle', tone: 'info' },
                { label: t('iss.allocated'), value: num(totalAlloc), icon: 'box-open-full',
                  tone: totalAlloc === totalApproved ? 'green' : 'amber' },
                { label: t('c.items'), value: doc.lines.length, icon: 'boxes', tone: 'indigo' },
                { label: t('iss.short'), value: num(totalApproved - totalAlloc),
                  icon: 'arrow-trend-down', tone: anyShort ? 'danger' : 'green' },
              ]} />
            </div>

            {/* One table for the whole allocation: a row per lot, grouped by
               item in the first column. */}
            <TableWrap>
              <thead>
                <tr>
                  <th>{t('c.items')}</th>
                  <th>Lot</th>
                  <th>{t('stk.exp')}</th>
                  <th className="num">{t('stk.onHand')}</th>
                  <th className="num">{t('iss.allocated')}</th>
                </tr>
              </thead>
              <tbody>
                {alloc.flatMap(({ line, plan }) => {
                  const itemCell = (
                    <>
                      <span className="cell-strong">{M(line.item).code}</span>
                      <span className="cell-sub">
                        {itemName(line.item)} · {t('rev.approvedQty')} {num(line.approved)} {uomName(line.item)}
                        {plan.short > 0 && <> · <b style={{ color: 'var(--danger)' }}>
                          {t('iss.short')} {num(plan.short)}</b></>}
                      </span>
                    </>
                  )
                  if (plan.lots.length === 0) {
                    return [(
                      <tr key={line.item}>
                        <td>{itemCell}</td>
                        <td colSpan={4} style={{ color: 'var(--danger)' }}>{t('iss.noStock')}</td>
                      </tr>
                    )]
                  }
                  return plan.lots.map((x, i) => {
                    const row = stock.find(s => s.wh === doc.whFrom && s.item === line.item && s.lot === x.lot)
                    return (
                      <tr key={`${line.item}-${x.lot}`}>
                        <td>{i === 0 ? itemCell : null}</td>
                        <td>{x.lot}</td>
                        <td>{x.exp}</td>
                        <td className="num">{num(row?.qty ?? 0)}</td>
                        <td className="num cell-alloc">{num(x.qty)}</td>
                      </tr>
                    )
                  })
                })}
              </tbody>
            </TableWrap>
          </Card>
        </div>

        <div className="detail-side">
        <Card className="side-panel">
          <PanelHead title={t('iss.title')} />
          <div className="panel-body">
            <KV k={t('req.requester')}>{orgName(doc.org)}</KV>
            <KV k={t('req.whFrom')}>{whName(doc.whFrom)}</KV>
            <KV k={t('iss.mode')}>{doc.issueMode}</KV>
            <KV k={t('rev.approvedQty')}>{num(totalApproved)} {t('c.units')}</KV>
            <KV k={t('iss.allocated')}>{num(totalAlloc)} {t('c.units')}</KV>
            <KV k={t('iss.extRef')}>{doc.extRef || t('iss.awaitHosxp')}</KV>
            <KV k={t('c.status')}><StateBadge state={doc.state} showCode={false} /></KV>
            <KV k={t('c.sync')}><SyncBadge state={doc.sync} /></KV>

            <div className="side-actions">
              {busy ? (
                <Note tone="info">{t('sync.SENDING')}…</Note>
              ) : can('req.issue') ? (
                <Button
                  variant="teal" block icon="truck"
                  disabled={totalAlloc === 0}
                  onClick={() => act(doc.no, portal ? 'issue' : 'hosxp_callback')}
                >
                  {portal ? t('iss.confirm') : t('iss.callback')}
                </Button>
              ) : <Note tone="info">{t('acl.readOnly')}</Note>}

              {can('req.close_short') && doc.state === 'PARTIALLY_ISSUED' && (
                <Button block onClick={() => act(doc.no, 'close_short')}>{t('iss.closeShort')}</Button>
              )}
            </div>

            {anyShort && (
              <div style={{ marginTop: 'var(--s-3)' }}>
                <Note tone="warn">{t('st.PARTIALLY_ISSUED')}</Note>
              </div>
            )}
          </div>
        </Card>

        <DocTimeline doc={doc} />
        </div>
      </div>
    </>
  )
}

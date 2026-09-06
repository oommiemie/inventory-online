import { useNavigate } from 'react-router-dom'
import type { Requisition } from '@/types'
import { useStore } from '@/app/store'
import { ROLES } from '@/data/seed'
import { M, num, uomOf, toLocal } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import { Card, PanelHead, Button, TableWrap, KV, Note } from '@/components/ui'
import { DocHeader, DocSummary, DocTimeline } from '@/components/DocParts'
import { StateBadge, SyncBadge } from '@/components/StateBadge'

/** Read-only view of a document, from any screen that isn't its action screen. */
export function DocDetail({ doc }: { doc: Requisition }) {
  const { t, orgName, whName, itemName, uomName } = useT()
  const nav = useNavigate()
  const role = useStore(s => s.role)
  const maps = useStore(s => s.mappings)
  const act = useStore(s => s.act)

  const r = ROLES[role]
  const can = (p: string) => r.can.includes(p as never)
  const reqValue = doc.lines.reduce((a, l) => a + M(l.item).price * l.req, 0)
  const appValue = doc.lines.reduce((a, l) => a + M(l.item).price * l.approved, 0)

  const jump =
    can('req.approve') && doc.state === 'REQUESTED' ? { to: `/review/${doc.no}`, label: t('rev.title') }
    : can('req.issue') && ['APPROVED', 'PARTIALLY_ISSUED'].includes(doc.state) ? { to: `/issue/${doc.no}`, label: t('iss.title') }
    : can('req.receive') && ['ISSUED', 'PARTIALLY_RECEIVED'].includes(doc.state) ? { to: `/receive/${doc.no}`, label: t('rcv.title') }
    : null

  return (
    <>
      <DocHeader doc={doc} backTo="/requisitions" />

      <div className="detail-grid">
        <div>
          <Card>
            <PanelHead title={t('req.lines')} sub={`${doc.lines.length} ${t('c.items')}`} />
            <div className="panel-body panel-body--summary">
              <DocSummary tiles={[
                { label: t('c.items'), value: doc.lines.length, icon: 'boxes', tone: 'info' },
                { label: t('rep.totalValue'), value: `${t('c.baht')} ${num(Math.round(reqValue))}`,
                  icon: 'coins', tone: 'indigo' },
                { label: t('rev.approvedQty'), value: `${t('c.baht')} ${num(Math.round(appValue))}`,
                  icon: 'check-circle', tone: 'teal' },
                { label: t('rep.inTransit'), value: num(doc.transit), icon: 'truck-side',
                  tone: doc.transit ? 'amber' : 'green' },
              ]} />
            </div>
            <TableWrap>
              <thead>
                <tr>
                  <th>{t('c.items')}</th>
                  <th>{t('req.localUnit')}</th>
                  <th className="num">{t('req.reqQty')}</th>
                  <th className="num">{t('rev.approvedQty')}</th>
                  <th className="num">{t('rcv.issuedQty')}</th>
                  <th className="num">{t('rcv.actualQty')}</th>
                  <th>{t('stk.lot')}</th>
                </tr>
              </thead>
              <tbody>
                {doc.lines.map(l => {
                  const u = uomOf(maps, doc.org, l.item)
                  return (
                    <tr key={l.item}>
                      <td>
                        <span className="cell-strong">{M(l.item).code}</span>
                        <span className="cell-sub">{itemName(l.item)}</span>
                      </td>
                      <td>
                        {num(toLocal(maps, doc.org, l.item, l.req))} {u.uom}
                        <span className="cell-sub">1 {u.uom} = {num(u.factor)} {uomName(l.item)}</span>
                      </td>
                      <td className="num">{num(l.req)}</td>
                      <td className="num">{num(l.approved)}</td>
                      <td className="num">{l.issued ? num(l.issued) : '—'}</td>
                      <td className="num">{l.received ? num(l.received) : '—'}</td>
                      <td>
                        {l.lots.length
                          ? l.lots.map(x => <div key={x.lot}>{x.lot} · {x.exp}</div>)
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </TableWrap>
          </Card>

        </div>

        <div className="detail-side">
        <Card className="side-panel">
          <PanelHead title={t('req.info')} />
          <div className="panel-body">
            <KV k={t('req.requester')}>{orgName(doc.org)}</KV>
            <KV k={t('req.whFrom')}>{whName(doc.whFrom)}</KV>
            <KV k={t('req.whTo')}>{whName(doc.whTo)}</KV>
            <KV k={t('iss.mode')}>{doc.issueMode}</KV>
            <KV k={t('iss.extRef')}>{doc.extRef || '—'}</KV>
            <KV k={t('c.status')}><StateBadge state={doc.state} showCode={false} /></KV>
            <KV k={t('c.sync')}><SyncBadge state={doc.sync} /></KV>

            {doc.note && (
              <div style={{ marginTop: 'var(--s-4)' }}>
                <Note>{doc.note}</Note>
              </div>
            )}

            <div className="side-actions">
              {jump && (
                <Button variant="primary" block iconRight="arrowR" onClick={() => nav(jump.to)}>
                  {jump.label}
                </Button>
              )}
              {can('req.cancel') && ['DRAFT', 'RETURNED', 'REQUESTED'].includes(doc.state) && (
                <Button variant="danger" block onClick={() => act(doc.no, 'cancel')}>
                  {t('req.cancelDoc')}
                </Button>
              )}
              {!jump && !can('req.cancel') && (
                <Note tone="info">{t('acl.readOnly')}</Note>
              )}
            </div>
          </div>
        </Card>

        <DocTimeline doc={doc} />
        </div>
      </div>
    </>
  )
}

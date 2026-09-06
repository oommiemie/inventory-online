import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '@/app/store'
import { byState } from '@/app/selectors'
import { ROLES } from '@/data/seed'
import { M, num, uomOf, toLocal, available, onHand, mapIsActive } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import {
  Card, PanelHead, Button, NumberInput, TableWrap, KV,
  Badge, Modal, Textarea, Field, Note,
} from '@/components/ui'
import { DocHeader, DocSummary, DocTimeline, DocListPage } from '@/components/DocParts'
import { StateBadge, SyncBadge } from '@/components/StateBadge'
import { useMenuToggle } from '@/components/layout/AppShell'

export function ReviewView() {
  const { no } = useParams()
  const { t, orgName, whName, itemName, uomName } = useT()
  const nav = useNavigate()

  const role = useStore(s => s.role)
  const onMenu = useMenuToggle()
  const docs = useStore(s => s.docs)
  const maps = useStore(s => s.mappings)
  const stock = useStore(s => s.stock)
  const cfg = useStore(s => s.cfg)
  const setLineQty = useStore(s => s.setLineQty)
  const act = useStore(s => s.act)

  const [dialog, setDialog] = useState<'reject' | 'return' | null>(null)
  const [reason, setReason] = useState('')

  const r = ROLES[role]
  const can = (p: string) => r.can.includes(p as never)
  const queue = byState(docs, role, 'REQUESTED')
  const doc = no ? docs.find(d => d.no === no) : undefined

  /* ---- List ---- */
  if (!doc || doc.state !== 'REQUESTED') {
    return (
      <>
        <DocListPage onMenu={onMenu} title={t('rev.title')}
                     sub={`${t('rev.subtitle')} · ${queue.length} ${t('c.docs')}`} docs={queue}
                     routeFor={d => `/review/${d.no}`} emptyTitle={t('rev.empty')} />
      </>
    )
  }

  /* ---- Detail ---- */
  const reqValue = doc.lines.reduce((a, l) => a + M(l.item).price * l.req, 0)
  const appValue = doc.lines.reduce((a, l) => a + M(l.item).price * l.approved, 0)
  const reduced = doc.lines.reduce((a, l) => a + (l.req - l.approved), 0)
  const blockedByReview = cfg.forceReview && doc.review !== 'REVIEWED'

  const submitDialog = () => {
    if (!reason.trim()) return
    act(doc.no, dialog === 'reject' ? 'reject' : 'return', reason.trim())
    setDialog(null); setReason(''); nav('/review')
  }

  return (
    <>
      <DocHeader doc={doc} backTo="/review" />

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
                { label: t('rev.reduced'), value: `${num(reduced)}`,
                  icon: 'arrow-trend-down', tone: reduced ? 'amber' : 'gray' },
              ]} />
            </div>
            <TableWrap>
              <thead>
                <tr>
                  <th>{t('c.items')}</th>
                  <th>{t('req.localUnit')}</th>
                  <th className="num">{t('req.reqQty')}</th>
                  <th className="num">{t('req.onHandLocal')}</th>
                  <th className="num">{t('req.availSource')}</th>
                  <th className="num">{t('rev.approvedQty')}</th>
                  <th>{t('req.mapping')}</th>
                </tr>
              </thead>
              <tbody>
                {doc.lines.map((l, i) => {
                  const u = uomOf(maps, doc.org, l.item)
                  const avail = available(stock, doc.whFrom, l.item)
                  const shortfall = avail < l.approved
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
                      <td className="num">{num(onHand(stock, doc.whTo, l.item))}</td>
                      <td className="num" style={shortfall ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>
                        {num(avail)}
                      </td>
                      <td className="num">
                        {can('req.approve') ? (
                          <NumberInput
                            style={{ width: 96 }}
                            value={l.approved}
                            aria-label={`${t('rev.approvedQty')} ${M(l.item).code}`}
                            onChange={e => {
                              const v = Number(String(e.target.value).replace(/[^\d]/g, '')) || 0
                              setLineQty(doc.no, i, 'approved', Math.min(v, l.req))
                            }}
                          />
                        ) : num(l.approved)}
                      </td>
                      <td>
                        {mapIsActive(maps, doc.org, l.item)
                          ? <Badge tone="green">{t('map.ACTIVE')}</Badge>
                          : <Badge tone="danger">{t('map.UNMAPPED')}</Badge>}
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
            <KV k={t('c.status')}><StateBadge state={doc.state} showCode={false} /></KV>
            <KV k={t('c.sync')}><SyncBadge state={doc.sync} /></KV>
            <KV k={t('rev.reviewStatus')}>
              {doc.review === 'REVIEWED' ? t('rev.reviewed') : t('rev.pendingReview')}
            </KV>

            {doc.note && <div style={{ marginTop: 'var(--s-4)' }}><Note>{doc.note}</Note></div>}

            <div className="side-actions">
              {can('req.review') && doc.review !== 'REVIEWED' && (
                <Button block icon="check" onClick={() => act(doc.no, 'mark_reviewed')}>
                  {t('rev.markReviewed')}
                </Button>
              )}
              {can('req.approve') && (
                <Button variant="primary" block icon="check"
                        disabled={blockedByReview}
                        title={blockedByReview ? t('rev.needReview') : undefined}
                        onClick={() => { act(doc.no, 'approve'); nav('/review') }}>
                  {t('rev.approve')}
                </Button>
              )}
              {can('req.return') && (
                <Button block onClick={() => { setDialog('return'); setReason('') }}>{t('rev.return')}</Button>
              )}
              {can('req.reject') && (
                <Button variant="danger" block onClick={() => { setDialog('reject'); setReason('') }}>
                  {t('rev.reject')}
                </Button>
              )}
              {!can('req.approve') && !can('req.review') && <Note tone="info">{t('acl.readOnly')}</Note>}
            </div>
          </div>
        </Card>

        <DocTimeline doc={doc} />
        </div>
      </div>

      <Modal
        open={dialog !== null}
        title={dialog === 'reject' ? t('rev.reject') : t('rev.return')}
        onClose={() => setDialog(null)}
        footer={<>
          <Button onClick={() => setDialog(null)}>{t('c.cancel')}</Button>
          <Button variant={dialog === 'reject' ? 'danger' : 'primary'}
                  disabled={!reason.trim()} onClick={submitDialog}>
            {t('c.confirm')}
          </Button>
        </>}
      >
        <Field label={t('c.reason')} hint={doc.no}>
          <Textarea rows={3} value={reason} autoFocus
                    placeholder={t('rev.reasonPh')}
                    onChange={e => setReason(e.target.value)} />
        </Field>
      </Modal>
    </>
  )
}

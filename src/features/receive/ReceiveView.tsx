import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '@/app/store'
import { byState } from '@/app/selectors'
import { ROLES } from '@/data/seed'
import { M, num } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import {
  Card, PanelHead, Button, NumberInput, Select, Textarea, Field,
  TableWrap, Badge, KV, Note, Modal,
} from '@/components/ui'
import { DocHeader, DocSummary, DocTimeline, DocListPage } from '@/components/DocParts'
import { StateBadge, SyncBadge } from '@/components/StateBadge'
import { useMenuToggle } from '@/components/layout/AppShell'

export function ReceiveView() {
  const { no } = useParams()
  const { t, orgName, whName, itemName } = useT()
  const nav = useNavigate()

  const role = useStore(s => s.role)
  const onMenu = useMenuToggle()
  const docs = useStore(s => s.docs)
  const setLineQty = useStore(s => s.setLineQty)
  const act = useStore(s => s.act)

  const [dialog, setDialog] = useState(false)
  const [dType, setDType] = useState('qty')
  const [dNote, setDNote] = useState('')

  const r = ROLES[role]
  const can = (p: string) => r.can.includes(p as never)
  const queue = byState(docs, role, 'ISSUED', 'PARTIALLY_RECEIVED', 'DISCREPANCY')
  const doc = no ? docs.find(d => d.no === no) : undefined

  /* ---- List ---- */
  if (!doc || !['ISSUED', 'PARTIALLY_RECEIVED', 'DISCREPANCY'].includes(doc.state)) {
    return (
      <>
        <DocListPage onMenu={onMenu} title={t('rcv.title')}
                     sub={`${t('rcv.subtitle')} · ${queue.length} ${t('c.docs')}`} docs={queue}
                     routeFor={d => `/receive/${d.no}`} emptyTitle={t('rcv.empty')} />
      </>
    )
  }

  /* ---- Detail ---- */
  const totalIssued = doc.lines.reduce((a, l) => a + l.issued, 0)
  const totalRecv = doc.lines.reduce((a, l) => a + (l.received || 0), 0)
  const diffs = doc.lines.filter(l => (l.received || 0) !== l.issued)
  const busy = doc.sync === 'QUEUED' || doc.sync === 'SENDING'
  const locked = doc.state === 'DISCREPANCY'

  return (
    <>
      <DocHeader doc={doc} backTo="/receive" />

      <div className="detail-grid">
        <div>
          <Card>
            <PanelHead title={t('rcv.title')} sub={doc.extRef || '—'} />
            <div className="panel-body panel-body--summary">
              <Note>{t('rcv.note')}</Note>
              <div style={{ marginTop: 'var(--s-4)' }}>
                <DocSummary tiles={[
                  { label: t('rcv.issuedQty'), value: num(totalIssued),
                    icon: 'box-open-full', tone: 'info' },
                  { label: t('rcv.actualQty'), value: num(totalRecv),
                    icon: 'check-circle', tone: 'teal' },
                  { label: t('rep.inTransit'), value: num(doc.transit), icon: 'truck-side',
                    tone: doc.transit ? 'amber' : 'green' },
                  { label: t('c.items'), value: doc.lines.length, icon: 'boxes', tone: 'indigo' },
                ]} />
              </div>
            </div>

            <TableWrap>
              <thead>
                <tr>
                  <th>{t('c.items')}</th>
                  <th>{t('stk.lot')}</th>
                  <th className="num">{t('rcv.issuedQty')}</th>
                  <th className="num">{t('rcv.actualQty')}</th>
                  <th>{t('rcv.checkResult')}</th>
                </tr>
              </thead>
              <tbody>
                {doc.lines.map((l, i) => {
                  const got = l.received || 0
                  return (
                    <tr key={l.item}>
                      <td>
                        <span className="cell-strong">{M(l.item).code}</span>
                        <span className="cell-sub">{itemName(l.item)}</span>
                      </td>
                      <td>
                        {l.lots.length
                          ? l.lots.map(x => <div key={x.lot}>{x.lot} · {x.exp}</div>)
                          : '—'}
                      </td>
                      <td className="num">{num(l.issued)}</td>
                      <td className="num">
                        {can('req.receive') && !locked ? (
                          <NumberInput
                            style={{ width: 96 }}
                            value={got}
                            aria-label={`${t('rcv.actualQty')} ${M(l.item).code}`}
                            onChange={e => {
                              const v = Number(String(e.target.value).replace(/[^\d]/g, '')) || 0
                              setLineQty(doc.no, i, 'received', v)
                            }}
                          />
                        ) : num(got)}
                      </td>
                      <td>
                        {got === l.issued
                          ? <Badge tone="green">{t('rcv.matched')}</Badge>
                          : got < l.issued
                            ? <Badge tone="danger">{t('iss.short')} {num(l.issued - got)}</Badge>
                            : <Badge tone="amber">{t('rcv.over')} {num(got - l.issued)}</Badge>}
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
            <KV k={t('iss.extRef')}>{doc.extRef || '—'}</KV>
            <KV k={t('req.whTo')}>{whName(doc.whTo)}</KV>
            <KV k={t('rcv.issuedQty')}>{num(totalIssued)} {t('c.units')}</KV>
            <KV k={t('rep.inTransit')}>{num(doc.transit)} {t('c.units')}</KV>
            <KV k={t('c.status')}><StateBadge state={doc.state} showCode={false} /></KV>
            <KV k={t('c.sync')}><SyncBadge state={doc.sync} /></KV>

            <div className="side-actions">
              {busy ? <Note tone="info">{t('sync.SENDING')}…</Note> : <>
                {can('req.receive') && !locked && (
                  <Button variant="primary" block icon="check" onClick={() => act(doc.no, 'receive')}>
                    {t('rcv.confirm')}
                  </Button>
                )}
                {can('req.receive') && doc.state === 'PARTIALLY_RECEIVED' && (
                  <Button block variant="danger" onClick={() => { setDialog(true); setDNote('') }}>
                    {t('rcv.raise')}
                  </Button>
                )}
                {can('req.settle') && doc.state === 'DISCREPANCY' && (
                  <Button variant="primary" block onClick={() => { act(doc.no, 'settle'); nav('/receive') }}>
                    {t('rcv.settle')}
                  </Button>
                )}
                {!can('req.receive') && !can('req.settle') && <Note tone="info">{t('acl.readOnly')}</Note>}
              </>}
            </div>

            <div style={{ marginTop: 'var(--s-3)' }}>
              {diffs.length === 0
                ? <Note tone="ok">{t('rcv.allMatched')}</Note>
                : <Note tone="warn">{t('st.DISCREPANCY')} · {diffs.length} {t('c.items')}</Note>}
            </div>
          </div>
        </Card>

        <DocTimeline doc={doc} />
        </div>
      </div>

      <Modal
        open={dialog}
        title={t('rcv.raise')}
        onClose={() => setDialog(false)}
        footer={<>
          <Button onClick={() => setDialog(false)}>{t('c.cancel')}</Button>
          <Button variant="danger" onClick={() => {
            const summary = diffs.map(l => `${M(l.item).code} ${(l.received || 0) - l.issued}`).join(', ')
            act(doc.no, 'raise_discrepancy', `${dType}: ${summary}${dNote ? ` — ${dNote}` : ''}`)
            setDialog(false); nav('/receive')
          }}>{t('c.confirm')}</Button>
        </>}
      >
        <div className="stack">
          <Field label={t('rcv.discrepancyType')}>
            <Select value={dType} onChange={e => setDType(e.target.value)}>
              <option value="qty">{t('rcv.dt.qty')}</option>
              <option value="lot">{t('rcv.dt.lot')}</option>
              <option value="damaged">{t('rcv.dt.damaged')}</option>
            </Select>
          </Field>
          <Field label={t('c.note')}
                 hint={diffs.map(l => `${M(l.item).code} ${(l.received || 0) - l.issued}`).join(', ')}>
            <Textarea rows={3} value={dNote} onChange={e => setDNote(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </>
  )
}

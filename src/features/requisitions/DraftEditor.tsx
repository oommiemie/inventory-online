import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Requisition } from '@/types'
import { useStore } from '@/app/store'
import { ROLES, MASTER } from '@/data/seed'
import { M, num, mapOf, uomOf, toBase, toLocal, available, onHand, mapIsActive } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import {
  Card, PanelHead, Button, Select, Input, NumberInput, Textarea, Field,
  TableWrap, Empty, Note, LinkButton, Modal, KV,
} from '@/components/ui'
import { DocHeader } from '@/components/DocParts'
import { MapBadge, StateBadge } from '@/components/StateBadge'

export function DraftEditor({ doc }: { doc: Requisition }) {
  const { t, orgName, whName, itemName, uomName } = useT()
  const nav = useNavigate()

  const role = useStore(s => s.role)
  const maps = useStore(s => s.mappings)
  const stock = useStore(s => s.stock)
  const addLine = useStore(s => s.addLine)
  const removeLine = useStore(s => s.removeLine)
  const setLineQty = useStore(s => s.setLineQty)
  const setNote = useStore(s => s.setNote)
  const act = useStore(s => s.act)
  const toast = useStore(s => s.toast)

  const [confirmCancel, setConfirmCancel] = useState(false)
  const r = ROLES[role]

  const unmapped = useMemo(
    () => doc.lines.filter(l => !mapIsActive(maps, doc.org, l.item)),
    [doc.lines, maps, doc.org])

  const emptyQty = doc.lines.filter(l => l.req <= 0)
  const totalValue = doc.lines.reduce((a, l) => a + M(l.item).price * l.req, 0)
  const available_ = MASTER.filter(m => !doc.lines.some(l => l.item === m.code))

  return (
    <>
      <DocHeader doc={doc} backTo="/requisitions" />

      <div className="detail-grid">
        <div>
      <Card>
        <PanelHead
          title={t('req.lines')}
          sub={`${doc.lines.length} ${t('c.items')} · ${t('c.baht')} ${num(Math.round(totalValue))}`}
        >
          <Select
            className="select-cta"
            value=""
            aria-label={t('req.addLine')}
            onChange={e => { if (e.target.value) addLine(doc.no, e.target.value) }}
          >
            <option value="">+ {t('req.addLine')}…</option>
            {available_.map(m => (
              <option key={m.code} value={m.code}>{m.code} · {itemName(m.code)}</option>
            ))}
          </Select>
        </PanelHead>

        {doc.lines.length === 0 ? (
          <Empty icon="box" title={t('req.noLines')} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th>{t('c.items')}</th>
                <th>{t('req.localUnit')}</th>
                <th className="num">{t('req.reqQty')}</th>
                <th className="num">{t('req.baseQty')}</th>
                <th className="num">{t('req.onHandLocal')}</th>
                <th className="num">{t('req.availSource')}</th>
                <th>{t('req.mapping')}</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {doc.lines.map((l, i) => {
                const m = M(l.item)
                const mp = mapOf(maps, doc.org, l.item)
                const u = uomOf(maps, doc.org, l.item)
                const localQty = toLocal(maps, doc.org, l.item, l.req)
                return (
                  <tr key={l.item}>
                    <td>
                      <span className="cell-strong">{m.code}</span>
                      <span className="cell-sub">{itemName(l.item)}</span>
                    </td>
                    <td>
                      <span className="cell-strong">{u.uom}</span>
                      <span className="cell-sub">1 {u.uom} = {num(u.factor)} {uomName(l.item)}</span>
                    </td>
                    <td className="num">
                      <NumberInput
                        style={{ width: 96 }}
                        value={localQty === 0 ? '' : localQty}
                        placeholder="0"
                        aria-label={`${t('req.reqQty')} ${m.code}`}
                        onChange={e => {
                          const v = Number(String(e.target.value).replace(/[^\d.]/g, '')) || 0
                          setLineQty(doc.no, i, 'req', toBase(maps, doc.org, l.item, v))
                        }}
                      />
                    </td>
                    <td className="num">
                      <span className="cell-strong">{num(l.req)}</span>
                      <span className="cell-sub">{uomName(l.item)}</span>
                    </td>
                    <td className="num">{num(onHand(stock, doc.whTo, l.item))}</td>
                    <td className="num">{num(available(stock, doc.whFrom, l.item))}</td>
                    <td><MapBadge state={mp?.state ?? 'UNMAPPED'} /></td>
                    <td>
                      <LinkButton danger onClick={() => removeLine(doc.no, i)}>{t('c.delete')}</LinkButton>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        )}
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

              <div className="side-fields">
                <Field label={t('req.needBy')}>
                  <Input type="date" defaultValue="2026-08-31" />
                </Field>
                <Field label={t('c.note')}>
                  <Textarea rows={3} value={doc.note} onChange={e => setNote(doc.no, e.target.value)} />
                </Field>
              </div>

              <div className="side-actions">
                {unmapped.length > 0 && (
                  <Note tone="danger">
                    {t('req.blockedByMapping')} — {unmapped.map(l => M(l.item).code).join(', ')}
                  </Note>
                )}
                <Button
                  variant="primary" block icon="arrowR"
                  disabled={doc.lines.length === 0 || unmapped.length > 0 || emptyQty.length > 0}
                  onClick={() => { act(doc.no, 'submit'); nav('/requisitions') }}
                >
                  {t('req.submit')}
                </Button>
                <Button block onClick={() => toast('Draft saved', 'ok')}>{t('req.saveDraft')}</Button>
                {r.can.includes('req.cancel') && (
                  <Button variant="danger" block onClick={() => setConfirmCancel(true)}>
                    {t('req.cancelDoc')}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmCancel}
        title={t('req.cancelDoc')}
        onClose={() => setConfirmCancel(false)}
        footer={<>
          <Button onClick={() => setConfirmCancel(false)}>{t('c.cancel')}</Button>
          <Button variant="danger" onClick={() => { act(doc.no, 'cancel'); setConfirmCancel(false); nav('/requisitions') }}>
            {t('c.confirm')}
          </Button>
        </>}
      >
        <p>{doc.no} · {orgName(doc.org)}</p>
      </Modal>
    </>
  )
}

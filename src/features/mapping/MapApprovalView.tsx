import { useState } from 'react'
import { useStore } from '@/app/store'
import { pendingItemMaps, pendingWhMaps, pendingSupply } from '@/app/selectors'
import { ORGS, WAREHOUSES } from '@/data/seed'
import { num } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import {
  Card, PanelHead, Button, Input, TableWrap, Empty, Chip,
} from '@/components/ui'
import { HeroBar, HeroSelect } from '@/components/layout/HeroBar'
import { useMenuToggle } from '@/components/layout/AppShell'

export function MapApprovalView() {
  const { t, orgName, whName, itemName, uomName } = useT()
  const role = useStore(s => s.role)
  const onMenu = useMenuToggle()
  const maps = useStore(s => s.mappings)
  const supply = useStore(s => s.supply)
  // WAREHOUSES is mutated in place by whAction, which bumps `clock` to signal
  // the change; subscribing keeps this list in sync with those approvals.
  useStore(s => s.clock)
  const patch = useStore(s => s.patchMapping)
  const approve = useStore(s => s.approveMapping)
  const reject = useStore(s => s.rejectMapping)
  const approveMany = useStore(s => s.approveMappings)
  const supplyAction = useStore(s => s.supplyAction)
  const whAction = useStore(s => s.whAction)

  const [picked, setPicked] = useState<Set<number>>(new Set())

  const allItems = pendingItemMaps(maps, role, supply)
  const allWhs = pendingWhMaps(role, supply)
  const allSups = pendingSupply(role, supply)
  /* One facility filter across all three sections. */
  const [fOrg, setFOrg] = useState('')
  const orgs = [...new Set([
    ...allItems.map(x => x.m.org), ...allSups.map(x => x.org), ...allWhs.map(w => WAREHOUSES[w].org),
  ])]
  const items = fOrg ? allItems.filter(x => x.m.org === fOrg) : allItems
  const whs = fOrg ? allWhs.filter(w => WAREHOUSES[w].org === fOrg) : allWhs
  const sups = fOrg ? allSups.filter(x => x.org === fOrg) : allSups
  const total = items.length + whs.length + sups.length
  const pickedCount = items.filter(x => picked.has(x.i)).length
  const allPicked = items.length > 0 && items.every(x => picked.has(x.i))

  const toggle = (i: number) =>
    setPicked(prev => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i); else n.add(i)
      return n
    })

  const facilities = new Set(items.map(x => x.m.org)).size

  return (
    <>
      <HeroBar
        onMenu={onMenu}
        identity={false}
        art={false}
        title={t('mapa.title')}
        sub={`${t('mapa.subtitle')} · ${total} ${t('c.items')}${facilities ? ` · ${facilities} ${t('req.facility')}` : ''}`}
        controls={orgs.length > 1 ? (
          <HeroSelect value={fOrg} onChange={setFOrg} ariaLabel={t('req.filterOrg')}>
            <option value="">{t('req.filterOrg')}</option>
            {orgs.map(o => <option key={o} value={o}>{orgName(o)}</option>)}
          </HeroSelect>
        ) : undefined}
      />

      {total === 0 && (
        <Card><Empty icon="check" title={t('mapa.empty')} /></Card>
      )}

      {items.length > 0 && (
        <Card>
          <PanelHead title={t('mapa.itemSection')} sub={`${items.length} ${t('c.items')}`} />
          <TableWrap>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={allPicked} aria-label={t('c.all')}
                         onChange={e => setPicked(e.target.checked ? new Set(items.map(x => x.i)) : new Set())} />
                </th>
                <th>{t('req.facility')}</th>
                <th>{t('mat.ourItem')}</th>
                <th>{t('mat.master')}</th>
                <th>{t('mat.conversion')}</th>
                <th>{t('mapa.proposedAt')}</th>
                <th>{t('mapa.rejectReasonPh')}</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {items.map(({ m, i }) => (
                <tr key={`${m.org}-${m.local}`}>
                  <td>
                    <input type="checkbox" checked={picked.has(i)}
                           aria-label={`${t('c.selected')} ${m.local}`} onChange={() => toggle(i)} />
                  </td>
                  <td className="cell-strong">{orgName(m.org)}</td>
                  <td>
                    <span className="cell-strong">{m.local}</span>
                    <span className="cell-sub">{m.localName}</span>
                  </td>
                  <td>
                    <span className="cell-strong">{m.item}</span>
                    <span className="cell-sub">{itemName(m.item)}</span>
                  </td>
                  <td><Chip accent>1 {m.localUom} = {num(m.factor)} {uomName(m.item)}</Chip></td>
                  <td>{m.proposedAt ?? '—'}</td>
                  <td>
                    <Input style={{ minWidth: 160 }} value={m.pendingReason ?? ''}
                           placeholder={t('mapa.rejectReasonPh')}
                           aria-label={`${t('c.reason')} ${m.local}`}
                           onChange={e => patch(i, { pendingReason: e.target.value })} />
                  </td>
                  <td className="cell-action">
                    <div className="row-actions">
                      <Button size="sm" variant="primary"
                              onClick={() => { approve(i); setPicked(p => { const n = new Set(p); n.delete(i); return n }) }}>
                        {t('mapa.approve')}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => reject(i)}>{t('mapa.reject')}</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      )}

      {(sups.length > 0 || whs.length > 0) && (
      <div className="mapa-split">
      {sups.length > 0 && (
        <Card>
          <PanelHead title={t('mapa.supplySection')} sub={`${sups.length}`} />
          <TableWrap>
            <thead>
              <tr>
                <th>{t('req.facility')}</th>
                <th>{t('set.supply')}</th>
                <th>{t('mapa.whOwner')}</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {sups.map(x => {
                const owner = WAREHOUSES[x.wh]?.org
                const cross = owner !== ORGS[x.org].parent
                return (
                  <tr key={x.org}>
                    <td className="cell-strong">{orgName(x.org)}</td>
                    <td>{whName(x.wh)}</td>
                    <td>
                      {owner ? orgName(owner) : '—'}
                      {cross && <> <Chip warn>{t('mapa.crossHospital')}</Chip></>}
                    </td>
                    <td className="cell-action">
                      <div className="row-actions">
                        <Button size="sm" variant="primary"
                                onClick={() => supplyAction(x.org, 'approve')}>{t('mapa.approve')}</Button>
                        <Button size="sm" variant="danger"
                                onClick={() => supplyAction(x.org, 'reject')}>{t('mapa.reject')}</Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        </Card>
      )}

      {whs.length > 0 && (
        <Card>
          <PanelHead title={t('mapa.whSection')} sub={`${whs.length}`} />
          <TableWrap>
            <thead>
              <tr>
                <th>{t('stk.tree')}</th>
                <th>{t('req.facility')}</th>
                <th>{t('set.linkCode')}</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {whs.map(w => (
                <tr key={w}>
                  <td>
                    <span className="cell-strong">{w}</span>
                    <span className="cell-sub">{whName(w)}</span>
                  </td>
                  <td>{orgName(WAREHOUSES[w].org)}</td>
                  <td className="cell-strong">{WAREHOUSES[w].ext}</td>
                  <td className="cell-action">
                    <Button size="sm" variant="primary"
                            onClick={() => whAction(w, 'approve')}>{t('mapa.approve')}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      )}

      </div>
      )}

      {picked.size > 0 && (
        <div className="actionbar">
          <span>{t('c.selected')} <b className="num">{pickedCount}</b></span>
          <div className="spacer" />
          <Button onClick={() => setPicked(new Set())}>{t('c.clear')}</Button>
          <Button variant="primary" icon="check" disabled={pickedCount === 0}
                  onClick={() => { approveMany([...picked]); setPicked(new Set()) }}>
            {t('mapa.approveSelected')} ({pickedCount})
          </Button>
        </div>
      )}
    </>
  )
}

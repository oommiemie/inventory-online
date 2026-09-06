import { useEffect, useMemo, useState } from 'react'
import { useStore, visibleDocs } from '@/app/store'
import { ROLES, WAREHOUSES, ORGS, REORDER } from '@/data/seed'
import { M, num, stockRows, available } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import {
  Card, PanelHead, TableWrap, Badge, Empty, Note, Chip, Segmented,
} from '@/components/ui'
import './stock.css'
import { HeroBar, HeroSearch, HeroSelect, HeroCta } from '@/components/layout/HeroBar'
import { downloadCsv, csvName } from '@/lib/csv'
import { useMenuToggle } from '@/components/layout/AppShell'

export function StockView() {
  const { t, orgName, whName, itemName } = useT()
  const role = useStore(s => s.role)
  const onMenu = useMenuToggle()
  const stock = useStore(s => s.stock)
  const ledger = useStore(s => s.ledger)
  const docs = useStore(s => s.docs)
  const adjust = useStore(s => s.adjustStock)
  const toast = useStore(s => s.toast)

  const [q, setQ] = useState('')
  const [wh, setWh] = useState('')

  const r = ROLES[role]
  const canAdjust = r.can.includes('stock.adjust')

  const scopedWh = useMemo(
    () => Object.keys(WAREHOUSES).filter(w => r.scope === 'OWN_ORG' ? WAREHOUSES[w].org === r.org : true),
    [role])
  /* Facility filter narrows the warehouse list; a warehouse outside it is dropped. */
  const [org, setOrg] = useState('')
  const orgs = useMemo(() => [...new Set(scopedWh.map(w => WAREHOUSES[w].org))], [scopedWh])
  const warehouses = useMemo(
    () => scopedWh.filter(w => !org || WAREHOUSES[w].org === org), [scopedWh, org])
  useEffect(() => { if (wh && !warehouses.includes(wh)) setWh('') }, [warehouses, wh])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const out = warehouses
      .filter(w => !wh || w === wh)
      .flatMap(w => stockRows(stock, w))
    return out.filter(s =>
      !needle ||
      M(s.item).code.toLowerCase().includes(needle) ||
      itemName(s.item).toLowerCase().includes(needle) ||
      s.lot.toLowerCase().includes(needle))
  }, [warehouses, wh, stock, q, itemName])

  const transitDocs = visibleDocs(docs, role).filter(d => d.transit > 0)
  const totalReserved = stock.reduce((a, s) => a + s.reserved, 0)

  const lowStock = useMemo(() => {
    const out: string[] = []
    for (const w of warehouses) {
      for (const [item, rp] of Object.entries(REORDER[w] ?? {})) {
        const qty = available(stock, w, item)
        if (qty < rp) out.push(`${M(item).code} @ ${whName(w)} (${num(qty)}/${num(rp)})`)
      }
    }
    return out
  }, [warehouses, stock, whName])

  const [view, setView] = useState<'stock' | 'ledger'>('stock')

  /* Exports whichever table is on screen, with the filters applied. */
  const exportCsv = () => {
    const empty = view === 'stock' ? !rows.length : !ledger.length
    if (empty) { toast(t('c.exportEmpty'), 'warn'); return }
    const ok = view === 'stock'
      ? downloadCsv(csvName('stock'),
          [t('stk.tree'), t('c.items'), t('mat.ourItem'), t('stk.lot'), t('stk.exp'),
           t('stk.onHand'), t('stk.reserved'), t('stk.avail'), t('stk.reorder')],
          rows.map(s => [
            whName(s.wh), M(s.item).code, itemName(s.item), s.lot, s.exp,
            s.qty, s.reserved, s.qty - s.reserved, (REORDER[s.wh] ?? {})[s.item] ?? '',
          ]))
      : downloadCsv(csvName('ledger'),
          [t('c.date'), t('stk.tree'), t('c.items'), t('stk.lot'), t('c.qty'), t('req.no')],
          ledger.map(e => [e.t, whName(e.wh), M(e.item).code, e.lot, e.delta, e.ref]))
    toast(t(ok ? 'c.exported' : 'c.exportFailed'), ok ? 'ok' : 'danger')
  }

  return (
    <>
      <HeroBar
        onMenu={onMenu}
        identity={false}
        art={false}
        title={t('stk.title')}
        sub={t('stk.subtitle')}
        controls={<>
          <HeroSearch value={q} onChange={setQ} placeholder={t('stk.searchPh')} />
          {orgs.length > 1 && (
            <HeroSelect value={org} onChange={setOrg} ariaLabel={t('req.filterOrg')}>
              <option value="">{t('req.filterOrg')}</option>
              {orgs.map(o => <option key={o} value={o}>{orgName(o)}</option>)}
            </HeroSelect>
          )}
          <HeroSelect value={wh} onChange={setWh} ariaLabel={t('stk.allWh')}>
            <option value="">{t('stk.allWh')}</option>
            {warehouses.map(w => <option key={w} value={w}>{whName(w)}</option>)}
          </HeroSelect>
        </>}
        actions={<>
          <HeroCta variant="ghost" icon="download" onClick={exportCsv}>{t('c.export')}</HeroCta>
          {canAdjust && (
            <HeroCta icon="plus" onClick={() => {
              const target = stock.find(s => s.wh === (ORGS[r.org].wh ?? warehouses[0])) ?? stock[0]
              if (target) adjust(target.wh, target.item, target.lot, 10)
            }}>{t('stk.adjust')}</HeroCta>
          )}
        </>}
      />

      <div className="detail-grid fill-grid">
        <div>
          <Card className="fill-view">
            <PanelHead
              title={view === 'stock' ? t('stk.title') : t('stk.ledger')}
              sub={view === 'stock' ? `${rows.length} ${t('c.items')}` : `${ledger.length}`}
            >
              <Segmented<'stock' | 'ledger'>
                value={view}
                onChange={setView}
                ariaLabel={t('stk.title')}
                options={[
                  { value: 'stock', label: t('stk.onHand') },
                  { value: 'ledger', label: t('stk.ledger') },
                ]}
              />
            </PanelHead>

            {view === 'stock' ? (
              rows.length === 0 ? (
                <Empty icon="box" title={t('c.noResults')} hint={t('c.noResultsHint')} />
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <th>{t('c.items')}</th>
                      <th>{t('stk.tree')}</th>
                      <th>{t('stk.lot')}</th>
                      <th className="num">{t('stk.onHand')}</th>
                      <th className="num">{t('stk.reserved')}</th>
                      <th className="num">{t('stk.avail')}</th>
                      <th className="num">{t('stk.reorder')}</th>
                      <th>{t('c.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(s => {
                      const rp = (REORDER[s.wh] ?? {})[s.item]
                      const avail = s.qty - s.reserved
                      const low = rp !== undefined && available(stock, s.wh, s.item) < rp
                      return (
                        <tr key={`${s.wh}-${s.item}-${s.lot}`}>
                          <td>
                            <span className="cell-strong">{M(s.item).code}</span>
                            <span className="cell-sub">{itemName(s.item)}</span>
                          </td>
                          <td>{whName(s.wh)}</td>
                          <td>{s.lot} · {s.exp}</td>
                          <td className="num">{num(s.qty)}</td>
                          <td className="num">{num(s.reserved)}</td>
                          <td className="num cell-strong">{num(avail)}</td>
                          <td className="num">{rp !== undefined ? num(rp) : '—'}</td>
                          <td>
                            {low ? <Badge tone="danger">{t('stk.below')}</Badge>
                                 : <Badge tone="green">{t('stk.normal')}</Badge>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </TableWrap>
              )
            ) : ledger.length === 0 ? (
              <Empty icon="clock" title={t('stk.ledgerEmpty')} hint={t('mon.emptyJobs')} />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <th>{t('c.date')}</th>
                    <th>{t('stk.tree')}</th>
                    <th>{t('c.items')}</th>
                    <th>Lot</th>
                    <th>{t('rcv.discrepancyType')}</th>
                    <th className="num">{t('c.qty')}</th>
                    <th>{t('ref.masterCode')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.slice().reverse().map(l => (
                    <tr key={l.id}>
                      <td>{l.t}</td>
                      <td>{whName(l.wh)}</td>
                      <td className="cell-strong">{M(l.item).code}</td>
                      <td>{l.lot}</td>
                      <td>{l.type}</td>
                      <td className="num" style={{ color: l.delta < 0 ? 'var(--danger)' : 'var(--ok)', fontWeight: 700 }}>
                        {l.delta > 0 ? '+' : ''}{num(l.delta)}
                      </td>
                      <td>{l.ref}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Card>
        </div>

        <div className="detail-side">
          <Card>
            <PanelHead title={t('stk.watch')} />
            <div className="panel-body">
              <ul className="watch-list">
                <li>
                  <i className="watch-bar danger" />
                  <div style={{ minWidth: 0 }}>
                    <b>{t('stk.below')}</b>
                    <small>{lowStock.length ? lowStock.slice(0, 3).join(' · ') : t('stk.normal')}</small>
                  </div>
                  <strong className="num">{lowStock.length}</strong>
                </li>
                <li>
                  <i className="watch-bar info" />
                  <div style={{ minWidth: 0 }}>
                    <b>{t('rep.inTransit')}</b>
                    <small>
                      {transitDocs.length
                        ? transitDocs.map(d => `${d.no} (${num(d.transit)})`).join(' · ')
                        : t('rcv.empty')}
                    </small>
                  </div>
                  <strong className="num">{num(transitDocs.reduce((a, d) => a + d.transit, 0))}</strong>
                </li>
                <li>
                  <i className="watch-bar teal" />
                  <div style={{ minWidth: 0 }}>
                    <b>{t('stk.reserved')}</b>
                    <small>{t('stk.reservedNote')}</small>
                  </div>
                  <strong className="num">{num(totalReserved)}</strong>
                </li>
              </ul>
            </div>
          </Card>

          <Card>
            <PanelHead title={t('stk.tree')} sub={`${warehouses.length}`} />
            <div className="panel-body">
              <ul className="wh-list">
                {warehouses.map(w => (
                  <li key={w}>
                    <div style={{ minWidth: 0 }}>
                      <b>{whName(w)}</b>
                      <small>{w} · {stockRows(stock, w).length} {t('c.items')}</small>
                    </div>
                    <Chip accent>MAIN</Chip>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 'var(--s-3)' }}><Note>{t('stk.scopeNote')}</Note></div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useStore, visibleDocs } from '@/app/store'
import { ROLES, WAREHOUSES, REORDER } from '@/data/seed'
import {
  M, num, money, stockRows, available, uomOf, daysToExpiry, isDrug,
} from '@/lib/domain'
import { itemLook, orgLook } from '@/lib/look'
import { useT } from '@/hooks/useT'
import {
  Card, PanelHead, TableWrap, Badge, Empty, Note, Chip, Segmented,
} from '@/components/ui'
import './stock.css'
import { HeroBar, HeroSearch, HeroSelect, HeroCta } from '@/components/layout/HeroBar'
import { downloadCsv, csvName } from '@/lib/csv'
import { useMenuToggle } from '@/components/layout/AppShell'

/* The date the sample data is written against; expiry is measured from it. */
const TODAY = new Date(2026, 7, 27)

export function StockView() {
  const { t, orgName, whName, itemName, uomName } = useT()
  const role = useStore(s => s.role)
  const onMenu = useMenuToggle()
  const stock = useStore(s => s.stock)
  const maps = useStore(s => s.mappings)
  const ledger = useStore(s => s.ledger)
  const docs = useStore(s => s.docs)
  const adjust = useStore(s => s.adjustStock)
  const expiryAlert = useStore(s => s.cfg.expiryAlert)
  const toast = useStore(s => s.toast)

  const r = ROLES[role]
  const canAdjust = r.can.includes('stock.adjust')

  const [q, setQ] = useState('')
  const [wh, setWh] = useState('')
  const [view, setView] = useState<'stock' | 'ledger' | 'expiry'>('stock')

  const scopedWh = useMemo(
    () => Object.keys(WAREHOUSES).filter(w => r.scope !== 'OWN_ORG' || WAREHOUSES[w].org === r.org),
    [r])
  const facilities = useMemo(() => [...new Set(scopedWh.map(w => WAREHOUSES[w].org))], [scopedWh])

  /* The screen has two levels: every facility at a glance, then one facility's
     items. A role that can only see its own facility starts inside it — there
     would be nothing to choose between. */
  const [picked, setPicked] = useState('')
  const facility = facilities.length === 1 ? facilities[0] : picked
  const whsOf = useMemo(
    () => (org: string) => scopedWh.filter(w => WAREHOUSES[w].org === org),
    [scopedWh])
  const facilityWhs = useMemo(
    () => (facility ? whsOf(facility) : scopedWh), [facility, whsOf, scopedWh])
  const activeWhs = useMemo(
    () => facilityWhs.filter(w => !wh || w === wh), [facilityWhs, wh])
  useEffect(() => { if (wh && !facilityWhs.includes(wh)) setWh('') }, [facilityWhs, wh])
  useEffect(() => { setQ('') }, [facility])

  /* ---------------- per-facility totals ---------------- */
  const statsOf = useMemo(() => (whs: string[]) => {
    const items = new Set<string>()
    let value = 0
    for (const w of whs) {
      for (const s of stockRows(stock, w)) {
        items.add(s.item)
        value += s.qty * M(s.item).price
      }
    }
    const list = [...items]
    return {
      value,
      items: list.length,
      drugs: list.filter(isDrug).length,
      supplies: list.filter(x => !isDrug(x)).length,
    }
  }, [stock])

  const cards = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return facilities
      .filter(o => !needle ||
        orgName(o).toLowerCase().includes(needle) || o.toLowerCase().includes(needle))
      .map(o => ({ org: o, ...statsOf(whsOf(o)) }))
      .sort((a, b) => b.value - a.value)
  }, [facilities, q, orgName, statsOf, whsOf])

  const totals = useMemo(() => statsOf(activeWhs), [statsOf, activeWhs])

  /* ---------------- one row per item, lots summed ---------------- */
  const itemRows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const acc = new Map<string, { qty: number; reserved: number }>()
    for (const w of activeWhs) {
      for (const s of stockRows(stock, w)) {
        const cur = acc.get(s.item) ?? { qty: 0, reserved: 0 }
        acc.set(s.item, { qty: cur.qty + s.qty, reserved: cur.reserved + s.reserved })
      }
    }
    return [...acc]
      .map(([item, v]) => ({ item, ...v, value: v.qty * M(item).price }))
      .filter(x => !needle ||
        M(x.item).code.toLowerCase().includes(needle) ||
        itemName(x.item).toLowerCase().includes(needle))
      .sort((a, b) => itemName(a.item).localeCompare(itemName(b.item), 'th'))
  }, [activeWhs, stock, q, itemName])

  /* ---------------- lots inside the alert window ---------------- */
  const expiryRows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return activeWhs
      .flatMap(w => stockRows(stock, w))
      .map(s => ({ ...s, left: daysToExpiry(s.exp, TODAY) }))
      .filter(s => s.left <= expiryAlert)
      .filter(s => !needle ||
        M(s.item).code.toLowerCase().includes(needle) ||
        itemName(s.item).toLowerCase().includes(needle) ||
        s.lot.toLowerCase().includes(needle))
      .sort((a, b) => a.left - b.left)
  }, [activeWhs, stock, q, itemName, expiryAlert])

  const ledgerRows = useMemo(
    () => ledger.filter(l => activeWhs.includes(l.wh)).slice().reverse(),
    [ledger, activeWhs])

  /* ---------------- watch list ---------------- */
  const lowStock = useMemo(() => {
    const out: string[] = []
    for (const w of activeWhs) {
      for (const [item, rp] of Object.entries(REORDER[w] ?? {})) {
        const qty = available(stock, w, item)
        if (qty < rp) out.push(`${M(item).code} · ${num(qty)}/${num(rp)}`)
      }
    }
    return out
  }, [activeWhs, stock])
  const hasReorder = activeWhs.some(w => Object.keys(REORDER[w] ?? {}).length > 0)

  const transitDocs = visibleDocs(docs, role)
    .filter(d => d.transit > 0 && (!facility || d.org === facility))

  /* Exports whichever table is on screen, with the filters applied. */
  const exportCsv = () => {
    const scope = facility ? orgName(facility) : t('stk.overview')
    let ok = false
    if (!facility) {
      if (!cards.length) { toast(t('c.exportEmpty'), 'warn'); return }
      ok = downloadCsv(csvName('stock-facilities'),
        [t('req.facility'), t('ref.masterCode'), t('stk.stockValue'), t('c.items'), t('stk.drugs'), t('stk.supplies')],
        cards.map(c => [orgName(c.org), c.org, Math.round(c.value), c.items, c.drugs, c.supplies]))
    } else if (view === 'stock') {
      if (!itemRows.length) { toast(t('c.exportEmpty'), 'warn'); return }
      ok = downloadCsv(csvName('stock'),
        [t('req.facility'), t('ref.masterCode'), t('c.items'), t('stk.packUom'),
         t('stk.qtyPack'), t('stk.qtyTotal'), t('stk.reserved'), t('stk.unitCost'), t('stk.totalValue')],
        itemRows.map(x => {
          const u = uomOf(maps, facility, x.item)
          return [scope, M(x.item).code, itemName(x.item), `${u.uom} [${u.factor} ${uomName(x.item)}]`,
                  x.qty / u.factor, x.qty, x.reserved, M(x.item).price, Math.round(x.value * 100) / 100]
        }))
    } else if (view === 'expiry') {
      if (!expiryRows.length) { toast(t('c.exportEmpty'), 'warn'); return }
      ok = downloadCsv(csvName('stock-expiry'),
        [t('req.facility'), t('stk.tree'), t('ref.masterCode'), t('c.items'), t('stk.lot'), t('stk.exp'), t('stk.daysLeft'), t('stk.onHand')],
        expiryRows.map(s => [scope, whName(s.wh), M(s.item).code, itemName(s.item), s.lot, s.exp, s.left, s.qty]))
    } else {
      if (!ledgerRows.length) { toast(t('c.exportEmpty'), 'warn'); return }
      ok = downloadCsv(csvName('ledger'),
        [t('c.date'), t('stk.tree'), t('c.items'), t('stk.lot'), t('c.qty'), t('req.no')],
        ledgerRows.map(e => [e.t, whName(e.wh), M(e.item).code, e.lot, e.delta, e.ref]))
    }
    toast(t(ok ? 'c.exported' : 'c.exportFailed'), ok ? 'ok' : 'danger')
  }

  const tabs = (
    <Segmented<'stock' | 'ledger' | 'expiry'>
      value={view}
      onChange={setView}
      ariaLabel={t('stk.title')}
      options={[
        { value: 'stock', label: t('stk.onHand') },
        { value: 'ledger', label: t('stk.ledger') },
        { value: 'expiry', label: t('stk.expiring') },
      ]}
    />
  )

  return (
    <>
      <HeroBar
        onMenu={onMenu}
        identity={false}
        art={false}
        title={t('stk.title')}
        sub={t('stk.subtitle')}
        controls={
          <HeroSearch value={q} onChange={setQ}
                      placeholder={facility ? t('stk.searchPh') : t('stk.searchFacility')} />
        }
        filterCount={(picked ? 1 : 0) + (wh ? 1 : 0)}
        filters={<>
          {facilities.length > 1 && (
            <HeroSelect value={picked} onChange={setPicked} ariaLabel={t('req.facility')}>
              <option value="">{t('stk.overview')}</option>
              {facilities.map(o => <option key={o} value={o}>{orgName(o)}</option>)}
            </HeroSelect>
          )}
          {/* A facility with one store has nothing to narrow. */}
          {facility && whsOf(facility).length > 1 && (
            <HeroSelect value={wh} onChange={setWh} ariaLabel={t('stk.allWh')}>
              <option value="">{t('stk.allWh')}</option>
              {whsOf(facility).map(w => <option key={w} value={w}>{whName(w)}</option>)}
            </HeroSelect>
          )}
        </>}
        actions={<>
          <HeroCta variant="ghost" icon="download" onClick={exportCsv}>{t('c.export')}</HeroCta>
          {canAdjust && (
            <HeroCta icon="plus" onClick={() => {
              const target = stock.find(s => activeWhs.includes(s.wh)) ?? stock[0]
              if (target) adjust(target.wh, target.item, target.lot, 10)
            }}>{t('stk.adjust')}</HeroCta>
          )}
        </>}
      />

      {/* Items on the left, the watch list and facility rail on the right. */}
      <div className="stk-grid">
        <div className="stk-main">
          <Card className="fill-view">
            <PanelHead
              title={facility ? t('stk.title') : t('stk.overview')}
              sub={facility
                ? `${itemRows.length} ${t('c.items')} · ${orgName(facility)}`
                : `${cards.length} ${t('req.facility')}`}
            >
              {tabs}
            </PanelHead>

            {/* ---- level 1: a card per facility, opening into it ---- */}
            {!facility ? (
              cards.length === 0 ? (
                <Empty icon="box" title={t('c.noResults')} hint={t('c.noResultsHint')} />
              ) : (
                <div className="panel-body">
                  <div className="stk-cards">
                    {cards.map((c, i) => (
                      <button key={c.org} type="button" className="stk-card"
                              style={{ '--i': i } as React.CSSProperties}
                              onClick={() => setPicked(c.org)}>
                        <span className="stk-card-head">
                          <span className={`item-ico ${orgLook(c.org).tone}`} aria-hidden="true">
                            <i className={`fi fi-rr-${orgLook(c.org).icon}`} />
                          </span>
                          <span className="stk-card-id">
                            <b>{orgName(c.org)}</b>
                            <small>{c.org}</small>
                          </span>
                        </span>
                        <span className="stk-card-label">{t('stk.stockValue')}</span>
                        <strong className="num">{money(c.value)}</strong>
                        <span className="stk-card-foot">
                          {c.items} {t('c.items')} · {t('stk.drugs')} {c.drugs} · {t('stk.supplies')} {c.supplies}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : view === 'stock' ? (
              itemRows.length === 0 ? (
                <Empty icon="box" title={t('c.noResults')} hint={t('c.noResultsHint')} />
              ) : (<>
                <TableWrap className="stk-table">
                  <thead>
                    <tr>
                      <th>{t('c.items')}</th>
                      <th>{t('stk.packUom')}</th>
                      <th className="num">{t('stk.qtyPack')}</th>
                      <th className="num">{t('stk.qtyTotal')}</th>
                      <th className="num">{t('stk.unitCost')}</th>
                      <th className="num">{t('stk.totalValue')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemRows.map(x => {
                      const u = uomOf(maps, facility, x.item)
                      const base = uomName(x.item)
                      const rp = activeWhs.reduce((a, w) => a + ((REORDER[w] ?? {})[x.item] ?? 0), 0)
                      const low = rp > 0 && x.qty - x.reserved < rp
                      return (
                        <tr key={x.item}>
                          <td>
                            {/* The category reads as a mark first, a word second. */}
                            <div className="item-cell">
                              <span className={`item-ico ${itemLook(x.item).tone}`} aria-hidden="true">
                                <i className={`fi fi-rr-${itemLook(x.item).icon}`} />
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <span className="cell-strong">{itemName(x.item)}</span>
                                <span className="cell-sub">
                                  {isDrug(x.item) ? t('stk.drugs') : t('stk.typeSupply')} · {M(x.item).code}
                                  {low && <> <Chip warn>{t('stk.below')}</Chip></>}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            {u.factor > 1
                              ? <>{u.uom} <span className="cell-sub-inline">[{num(u.factor)} {base}]</span></>
                              : u.uom}
                          </td>
                          <td className="num">{num(x.qty / u.factor)} <span className="stk-uom">{u.uom}</span></td>
                          <td className="num">
                            <span className="cell-strong">{num(x.qty)} <span className="stk-uom">{base}</span></span>
                            {x.reserved > 0 && (
                              <span className="cell-sub">{t('stk.reserved')} {num(x.reserved)}</span>
                            )}
                          </td>
                          <td className="num">{M(x.item).price.toFixed(2)}</td>
                          <td className="num cell-strong">{money(x.value)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </TableWrap>
                <div className="panel-body"><Note>{t('stk.sumNote')}</Note></div>
              </>)
            ) : view === 'expiry' ? (
              expiryRows.length === 0 ? (
                <Empty icon="clock" title={t('stk.noExpiring')} hint={t('stk.expiryNote')} />
              ) : (<>
                <TableWrap>
                  <thead>
                    <tr>
                      <th>{t('c.items')}</th>
                      <th>{t('stk.tree')}</th>
                      <th>{t('stk.lot')}</th>
                      <th className="num">{t('stk.daysLeft')}</th>
                      <th className="num">{t('stk.onHand')}</th>
                      <th>{t('c.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiryRows.map(s => (
                      <tr key={`${s.wh}-${s.item}-${s.lot}`}>
                        <td>
                          <div className="item-cell">
                            <span className={`item-ico ${itemLook(s.item).tone}`} aria-hidden="true">
                              <i className={`fi fi-rr-${itemLook(s.item).icon}`} />
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <span className="cell-strong">{itemName(s.item)}</span>
                              <span className="cell-sub">
                                {isDrug(s.item) ? t('stk.drugs') : t('stk.typeSupply')} · {M(s.item).code}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>{whName(s.wh)}</td>
                        <td>
                          <span className="cell-strong">{s.lot}</span>
                          <span className="cell-sub">{s.exp}</span>
                        </td>
                        <td className="num">{s.left < 0 ? '—' : num(s.left)}</td>
                        <td className="num">{num(s.qty)} <span className="stk-uom">{uomName(s.item)}</span></td>
                        <td>
                          {s.left < 0
                            ? <Badge tone="danger">{t('stk.expired')}</Badge>
                            : <Badge tone="amber">{t('stk.nearExpiry')}</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
                <div className="panel-body"><Note>{t('stk.expiryNote')}</Note></div>
              </>)
            ) : ledgerRows.length === 0 ? (
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
                  {ledgerRows.map(l => (
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

        <div className="stk-side">
          <Card>
            <PanelHead title={t('stk.watch')}
                       sub={facility ? orgName(facility) : t('stk.overview')} />
            <div className="panel-body">
              <ul className="watch-list">
                <li>
                  <i className="watch-bar info" />
                  <div style={{ minWidth: 0 }}>
                    <b>{t('stk.stockValue')}</b>
                    <small>
                      {totals.items} {t('c.items')} · {t('stk.drugs')} {totals.drugs} · {t('stk.supplies')} {totals.supplies}
                    </small>
                  </div>
                  <strong className="num">{money(totals.value)}</strong>
                </li>
                <li>
                  <i className="watch-bar danger" />
                  <div style={{ minWidth: 0 }}>
                    <b>{t('stk.below')}</b>
                    <small>{hasReorder
                      ? (lowStock.length
                          ? lowStock.slice(0, 2).join(' · ') + (lowStock.length > 2 ? ` +${lowStock.length - 2}` : '')
                          : t('stk.normal'))
                      : t('stk.noReorder')}</small>
                  </div>
                  <strong className="num">{hasReorder ? lowStock.length : '—'}</strong>
                </li>
                <li>
                  <i className="watch-bar amber" />
                  <div style={{ minWidth: 0 }}>
                    <b>{t('stk.expiring')}</b>
                    <small>{t('rep.alertWindow')} {expiryAlert} {t('rep.days')}</small>
                  </div>
                  <strong className="num">{expiryRows.length}</strong>
                </li>
                <li>
                  <i className="watch-bar teal" />
                  <div style={{ minWidth: 0 }}>
                    <b>{t('rep.inTransit')}</b>
                    <small>
                      {transitDocs.length
                        ? transitDocs.slice(0, 2).map(d => `${d.no} (${num(d.transit)})`).join(' · ')
                          + (transitDocs.length > 2 ? ` +${transitDocs.length - 2}` : '')
                        : t('rcv.empty')}
                    </small>
                  </div>
                  <strong className="num">{num(transitDocs.reduce((a, d) => a + d.transit, 0))}</strong>
                </li>
              </ul>
            </div>
          </Card>

          <Card>
            <PanelHead title={t('req.facility')} sub={`${facilities.length}`} />
            <div className="panel-body">
              {/* The rail is also the way in and out: a facility opens here, and
                  the one being viewed is marked. */}
              <ul className="wh-list">
                {facilities.map(o => (
                  <li key={o}>
                    <button type="button" className={`wh-pick${o === facility ? ' is-current' : ''}`}
                            aria-current={o === facility ? 'true' : undefined}
                            onClick={() => setPicked(o === picked ? '' : o)}>
                      <span className={`item-ico ${orgLook(o).tone}`} aria-hidden="true">
                        <i className={`fi fi-rr-${orgLook(o).icon}`} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <b>{orgName(o)}</b>
                        <small>{o}</small>
                      </div>
                      {o === facility && <Chip accent>{t('stk.viewing')}</Chip>}
                    </button>
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

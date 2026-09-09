import { Fragment, useEffect, useMemo, useState } from 'react'
import { useStore } from '@/app/store'
import { pendingItemMaps, pendingWhMaps, pendingSupply } from '@/app/selectors'
import { ORGS, WAREHOUSES } from '@/data/seed'
import { num, mappedUoms } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import {
  Card, PanelHead, Button, Input, TableWrap, Empty, Chip, Segmented, Icon, Pagination,
} from '@/components/ui'
import { HeroBar, HeroSelect } from '@/components/layout/HeroBar'
import { useMenuToggle } from '@/components/layout/AppShell'
import './mapping.css'

export function MapApprovalView() {
  const { t, orgName, whName, itemName } = useT()
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
  /* Three queues that used to sit stacked down the page, now one tab each. */
  const [tab, setTab] = useState<'items' | 'supply' | 'wh'>('items')
  /* The units live in a panel under the row, so the queue itself stays one
     scannable line per proposal — the same shape as the facility's screen. */
  const [open, setOpen] = useState<Set<number>>(new Set())
  const toggleOpen = (i: number) =>
    setOpen(prev => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i); else n.add(i)
      return n
    })
  const switchTab = (v: 'items' | 'supply' | 'wh') => { setTab(v); setPicked(new Set()) }

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

  const toggle = (i: number) =>
    setPicked(prev => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i); else n.add(i)
      return n
    })

  const facilities = new Set(items.map(x => x.m.org)).size

  /* The queue is long, so it is read a page at a time. Selection and the open
     panels are keyed by the mapping's own index, so both survive paging. */
  const PER_PAGE = 12
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / PER_PAGE))
  const safePage = Math.min(page, pageCount)
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [items, safePage],
  )
  useEffect(() => { setPage(1) }, [fOrg, tab])
  /* "Select all" means the page in front of you, not the whole queue. */
  const allPicked = pageItems.length > 0 && pageItems.every(x => picked.has(x.i))

  return (
    <>
      <HeroBar
        onMenu={onMenu}
        identity={false}
        art={false}
        title={t('mapa.title')}
        sub={`${t('mapa.subtitle')} · ${total} ${t('c.items')}${facilities ? ` · ${facilities} ${t('req.facility')}` : ''}`}
        /* The three queues switch from the hero, the way the other screens
           switch their views — each one carrying what is waiting in it. */
        controls={
          <Segmented<'items' | 'supply' | 'wh'>
            value={tab}
            onChange={switchTab}
            ariaLabel={t('mapa.title')}
            options={[
              { value: 'items',  label: `${t('mapa.tabItems')} (${items.length})` },
              { value: 'supply', label: `${t('mapa.tabSupply')} (${sups.length})` },
              { value: 'wh',     label: `${t('mapa.tabWh')} (${whs.length})` },
            ]}
          />
        }
        filterCount={fOrg ? 1 : 0}
        filters={orgs.length > 1 ? (
          <HeroSelect value={fOrg} onChange={setFOrg} ariaLabel={t('req.filterOrg')}>
            <option value="">{t('req.filterOrg')}</option>
            {orgs.map(o => <option key={o} value={o}>{orgName(o)}</option>)}
          </HeroSelect>
        ) : undefined}
      />

      {total === 0 ? (
        <Card><Empty icon="check" title={t('mapa.empty')} /></Card>
      ) : (
        /* The queue is long; the page holds still and the rows scroll inside
           the card, so the hero and the tab bar stay put. */
        <Card className="fill-view">
          <PanelHead
            title={tab === 'items' ? t('mapa.itemSection')
                 : tab === 'supply' ? t('mapa.supplySection') : t('mapa.whSection')}
            sub={`${tab === 'items' ? items.length : tab === 'supply' ? sups.length : whs.length} ${t('c.items')}`}
          />

          {tab === 'items' && (items.length > 0 ? (
          <TableWrap className="mapa-items">
            <thead>
              <tr>
                <th style={{ width: 34 }} aria-label={t('mat.expand')} />
                <th style={{ width: 34 }}>
                  <input type="checkbox" checked={allPicked} aria-label={t('c.all')}
                         onChange={e => setPicked(e.target.checked ? new Set(pageItems.map(x => x.i)) : new Set())} />
                </th>
                <th>{t('req.facility')}</th>
                <th>{t('mat.ourItem')}</th>
                <th>{t('mat.master')}</th>
                <th>{t('mat.units')}</th>
                <th>{t('mapa.proposedAt')}</th>
                <th className="cell-action" aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map(({ m, i }) => {
                const units = mappedUoms(m)
                /* Worth surfacing on the row itself: the two sides count a
                   unit differently, which is what a rejection usually is. */
                const differs = units.some(u => u.uom !== u.hospUom || u.factor !== u.hospFactor)
                const isOpen = open.has(i)
                return (
                  <Fragment key={`${m.org}-${m.local}`}>
                    {/* One scannable line per proposal, the way the facility's
                        own mapping screen reads; the detail waits underneath. */}
                    {/* No row tint for a mismatch: the chip says it, and a
                        painted row over a long queue only shouts. */}
                    <tr className="map-row-click"
                        onClick={e => {
                          const el = e.target as HTMLElement
                          if (!el.closest('button, input, a, label, .combo')) toggleOpen(i)
                        }}>
                      <td>
                        <button type="button" className={`map-toggle${isOpen ? ' is-open' : ''}`}
                                aria-expanded={isOpen}
                                aria-label={isOpen ? t('mat.collapse') : t('mat.expand')}
                                onClick={() => toggleOpen(i)}>
                          <Icon name="chevD" size={16} />
                        </button>
                      </td>
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
                      <td>
                        <div className="map-summary">
                          {units.map((u, k) => (
                            <span className="map-chip" key={k}>
                              {u.uom || '—'} <b className="num">{num(u.factor)}</b>
                            </span>
                          ))}
                          {differs && <Chip warn>{t('mat.differs')}</Chip>}
                        </div>
                      </td>
                      {/* The class goes on a span: .cell-sub is display:block,
                          which on a <td> drops it out of the row's height. */}
                      <td><span className="cell-sub">{m.proposedAt ?? '—'}</span></td>
                      <td className="cell-action">
                        <div className="row-actions">
                          <Button size="sm" variant="primary"
                                  onClick={() => { approve(i); setPicked(p => { const n = new Set(p); n.delete(i); return n }) }}>
                            {t('mapa.approve')}
                          </Button>
                          {/* Rejecting needs a reason, which lives in the panel
                              — so open it rather than leaving a bare warning. */}
                          <Button size="sm" variant="danger"
                                  onClick={() => {
                                    if (!(m.pendingReason ?? '').trim() && !isOpen) toggleOpen(i)
                                    reject(i)
                                  }}>{t('mapa.reject')}</Button>
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="map-detail-row">
                        <td colSpan={8}>
                          <div className="map-detail">
                            {/* The proposal as the facility sent it: both sides
                                on one grid, so a unit always sits level with
                                its pair opposite. */}
                            <div className="map-sides map-sides--read">
                              <div className="map-box-head">{t('mat.sidePcu')}</div>
                              <div className="map-box-head">{t('mat.sideHosp')}</div>
                              <div className="map-box-cols">
                                <em />
                                <em>{t('req.localUnit')}</em>
                                <em>{t('mat.qty')}</em>
                              </div>
                              <div className="map-box-cols">
                                <em />
                                <em>{t('req.localUnit')}</em>
                                <em>{t('mat.qty')}</em>
                              </div>
                              {units.map((u, k) => (
                                <Fragment key={k}>
                                  <div className="map-box-cell">
                                    <em className="map-unit-no">
                                      {k === 0 ? t('mat.mainUom') : `${t('mat.unitCount')} ${k + 1}`}
                                    </em>
                                    <span className="cell-strong">{u.uom || '—'}</span>
                                    <b className="num">{num(u.factor)}</b>
                                  </div>
                                  <div className="map-box-cell">
                                    <em className="map-unit-no">
                                      {k === 0 ? t('mat.mainUom') : `${t('mat.unitCount')} ${k + 1}`}
                                    </em>
                                    <span className="cell-strong">{u.hospUom || '—'}</span>
                                    <b className="num">{num(u.hospFactor)}</b>
                                  </div>
                                </Fragment>
                              ))}
                            </div>

                            <div className="map-detail-master">
                              <span className="map-detail-key">{t('c.reason')}</span>
                              <Input value={m.pendingReason ?? ''}
                                     placeholder={t('mapa.rejectReasonPh')}
                                     aria-label={`${t('c.reason')} ${m.local}`}
                                     onChange={e => patch(i, { pendingReason: e.target.value })} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </TableWrap>
          ) : <Empty icon="check" title={t('mapa.emptyTab')} />)}
          {tab === 'items' && <Pagination page={safePage} pageCount={pageCount} onPage={setPage} />}

          {tab === 'supply' && (sups.length > 0 ? (
          <TableWrap>
            <thead>
              <tr>
                <th>{t('req.facility')}</th>
                <th>{t('set.localWh')}</th>
                <th>{t('set.subWh')}</th>
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
                    {/* The whole route, because that is what is being approved:
                        which store receives, which sub-store picks, and which
                        main store above it the goods leave from. */}
                    <td>{x.localWh ? whName(x.localWh) : <span className="cell-sub">—</span>}</td>
                    <td>{x.subWh ? whName(x.subWh) : <span className="cell-sub">—</span>}</td>
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
          ) : <Empty icon="check" title={t('mapa.emptyTab')} />)}

          {tab === 'wh' && (whs.length > 0 ? (
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
          ) : <Empty icon="check" title={t('mapa.emptyTab')} />)}
        </Card>
      )}

      {tab === 'items' && picked.size > 0 && (
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

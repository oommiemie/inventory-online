import { Fragment, useMemo, useState } from 'react'
import { useStore } from '@/app/store'
import { ROLES, MASTER } from '@/data/seed'
import { num, uomChoices, mappingReady, mappedUoms } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import { Card, PanelHead, Button, TableWrap, Empty, Chip, LinkButton, Combo, Icon, QtyStepper } from '@/components/ui'
import { MapBadge } from '@/components/StateBadge'
import type { MapState, Mapping, MappedUom } from '@/types'
import './mapping.css'
import { HeroBar, HeroSearch, HeroSelect, HeroCta } from '@/components/layout/HeroBar'
import { useMenuToggle } from '@/components/layout/AppShell'

const EDITABLE: MapState[] = ['UNMAPPED', 'DRAFT', 'REJECTED']

export function MatchingView() {
  const { t, orgName, itemName } = useT()
  const role = useStore(s => s.role)
  const onMenu = useMenuToggle()
  const maps = useStore(s => s.mappings)
  const lastSync = useStore(s => s.lastSync)
  const patch = useStore(s => s.patchMapping)
  const propose = useStore(s => s.proposeMapping)
  const proposeMany = useStore(s => s.proposeMappings)
  const pull = useStore(s => s.pullLocalItems)
  const autoMap = useStore(s => s.autoMapItems)

  const r = ROLES[role]
  const canPropose = r.can.includes('map.propose')

  const [q, setQ] = useState('')
  const [fState, setFState] = useState('')
  const [picked, setPicked] = useState<Set<number>>(new Set())
  /* Units are edited in a panel under the row, so the list itself stays a
     short scannable line per item. */
  const [open, setOpen] = useState<Set<number>>(new Set())
  const toggleOpen = (i: number) =>
    setOpen(prev => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i); else n.add(i)
      return n
    })

  /* The screen belongs to the facility signed in: it lists that facility's own
     items against the hospital master, so there is nothing to switch between. */
  const org = r.org
  const all = useMemo(() => maps.map((m, i) => ({ m, i })).filter(x => x.m.org === org), [maps, org])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter(({ m }) =>
      (!fState || m.state === fState) &&
      (!needle ||
        m.local.toLowerCase().includes(needle) ||
        m.localName.toLowerCase().includes(needle) ||
        (m.item && (m.item.toLowerCase().includes(needle) || itemName(m.item).toLowerCase().includes(needle)))))
  }, [all, q, fState, itemName])

  const count = (s: MapState) => all.filter(x => x.m.state === s).length
  const pickable = rows.filter(x => canPropose && EDITABLE.includes(x.m.state))
  const pickedRows = [...picked].map(i => maps[i]).filter(m => m && m.org === org)
  const pickedReady = pickedRows.filter(mappingReady)
  const allPicked = pickable.length > 0 && pickable.every(x => picked.has(x.i))

  /* Index 0 is the mapping's own unit; the rest live in extraUoms, so an edit
     is routed to whichever of the two holds that row. */
  const setUom = (i: number, m: Mapping, k: number, patchUom: Partial<MappedUom>) => {
    if (k === 0) {
      patch(i, { ...(patchUom.uom !== undefined && { localUom: patchUom.uom }),
                 ...(patchUom.factor !== undefined && { factor: patchUom.factor }),
                 ...(patchUom.hospUom !== undefined && { hospUom: patchUom.hospUom }),
                 ...(patchUom.hospFactor !== undefined && { hospFactor: patchUom.hospFactor }) })
      return
    }
    const extra = [...(m.extraUoms ?? [])]
    extra[k - 1] = { ...extra[k - 1], ...patchUom }
    patch(i, { extraUoms: extra })
  }
  /* One renderer per side, so the pair of columns stays in step and the extras
     cell can reuse exactly what the primary row uses. */
  const unitCell = (i: number, m: Mapping, k: number, side: 'pcu' | 'hosp', editable: boolean) => {
    if (!m.item) return <span className="cell-sub">{t('mat.selectMaster')}</span>
    const units = mappedUoms(m)
    const u = units[k]
    const value = side === 'pcu' ? u.uom : u.hospUom
    if (!editable) return <span className="cell-strong">{value || '—'}</span>
    const taken = units.filter((_, x) => x !== k).map(o => (side === 'pcu' ? o.uom : o.hospUom))
    return (
      <Combo value={value} className="sel-uom"
             ariaLabel={`${t('req.localUnit')} ${m.local} ${k + 1}`}
             onChange={v => setUom(i, m, k, side === 'pcu' ? { uom: v } : { hospUom: v })}>
        <option value="">{t('mat.pickUom')}</option>
        {/* A unit already claimed by another row would give one item two
            conflicting conversions on the same side. */}
        {uomChoices(m.item)
          .filter(x => x === value || !taken.includes(x))
          .map(x => <option key={x} value={x}>{x}</option>)}
      </Combo>
    )
  }

  const qtyCell = (i: number, m: Mapping, k: number, side: 'pcu' | 'hosp', editable: boolean) => {
    if (!m.item) return '—'
    const u = mappedUoms(m)[k]
    const value = side === 'pcu' ? u.factor : u.hospFactor
    if (!editable) return <b className="num">{num(value)}</b>
    return (
      <QtyStepper value={value}
                  ariaLabel={`${side === 'pcu' ? t('mat.qtyPcu') : t('mat.qtyHosp')} ${m.local}`}
                  onChange={(v: number) => setUom(i, m, k, side === 'pcu' ? { factor: v } : { hospFactor: v })} />
    )
  }

  const addUom = (i: number, m: Mapping) =>
    patch(i, { extraUoms: [...(m.extraUoms ?? []), { uom: '', factor: 1, hospUom: '', hospFactor: 1 }] })
  const removeUom = (i: number, m: Mapping, k: number) =>
    patch(i, { extraUoms: (m.extraUoms ?? []).filter((_, x) => x !== k - 1) })

  const toggle = (i: number) =>
    setPicked(prev => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i); else n.add(i)
      return n
    })

  return (
    <>
      <HeroBar
        onMenu={onMenu}
        identity={false}
        art={false}
        title={t('mat.title')}
        sub={`${orgName(org)} · ${t('mat.subtitle')}`}
        controls={<HeroSearch value={q} onChange={setQ} placeholder={t('c.search')} />}
        filterCount={fState ? 1 : 0}
        filters={<>
          <HeroSelect value={fState} onChange={setFState} ariaLabel={t('c.status')}>
            <option value="">{t('c.all')} ({all.length})</option>
            {(['UNMAPPED', 'DRAFT', 'REJECTED', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE'] as MapState[])
              .filter(s => count(s))
              .map(s => <option key={s} value={s}>{t(`map.${s}`)} ({count(s)})</option>)}
          </HeroSelect>
        </>}
        actions={canPropose ? <>
          {/* Auto Mapping fills in the obvious matches; whatever it finds is
              selected so the next click is the one that asks for approval. */}
          <HeroCta variant="ghost" icon="wand"
                   onClick={() => {
                     const hit = autoMap(org)
                     if (hit.length) { setPicked(new Set(hit)); setOpen(new Set(hit)) }
                   }}>{t('mat.auto')}</HeroCta>
          <HeroCta icon="refresh" onClick={() => pull(org)}>{t('mat.pull')}</HeroCta>
        </> : undefined}
      />

      <Card className="fill-view">
        <PanelHead
          title={t('mat.title')}
          sub={`${orgName(org)} · ${t('c.showing')} ${rows.length} ${t('c.of')} ${all.length} · ${t('ref.lastSync')}: ${lastSync.local[org] || t('ref.never')}`}
        >
          <div className="stage-row stage-row--head">
            <Chip warn={count('UNMAPPED') > 0}>1 ({count('UNMAPPED')})</Chip>
            <Chip warn={count('DRAFT') + count('REJECTED') > 0}>2 ({count('DRAFT') + count('REJECTED')})</Chip>
            <Chip warn={count('PENDING_APPROVAL') > 0}>3 ({count('PENDING_APPROVAL')})</Chip>
            <Chip>4 · {t('mat.stage4')} ({count('ACTIVE')})</Chip>
          </div>
        </PanelHead>
        {rows.length === 0 ? (
          <Empty icon="link" title={t('c.noResults')} hint={t('c.noResultsHint')} />
        ) : (
          <TableWrap className="map-table">
            <thead>
              <tr>
                <th style={{ width: 34 }} aria-label={t('mat.expand')} />
                {canPropose && <th style={{ width: 34 }}>
                  <input type="checkbox" checked={allPicked} aria-label={t('c.all')}
                         onChange={e => setPicked(e.target.checked ? new Set(pickable.map(x => x.i)) : new Set())} />
                </th>}
                <th>{t('mat.ourItem')}</th>
                <th>{t('mat.master')}</th>
                <th>{t('mat.units')}</th>
                <th>{t('c.status')}</th>
                <th className="cell-action" aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, i }) => {
                const editable = canPropose && EDITABLE.includes(m.state)
                const ready = mappingReady(m)
                const units = mappedUoms(m)
                const isOpen = open.has(i)
                /* Worth surfacing: the hospital counts a unit differently. */
                const differs = Boolean(m.item) &&
                  units.some(u => u.uom !== u.hospUom || u.factor !== u.hospFactor)
                return (
                  <Fragment key={`${m.org}-${m.local}`}>
                    {/* The whole row opens the panel; the chevron stays as the
                        control a keyboard and a screen reader use. Clicks that
                        start on something interactive are left to it. */}
                    <tr className={`map-row-click${m.state === 'UNMAPPED' ? ' row-attention' : ''}`}
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
                      {canPropose && (
                        <td>
                          {editable && (
                            <input type="checkbox" checked={picked.has(i)}
                                   aria-label={`${t('c.selected')} ${m.local}`}
                                   onChange={() => toggle(i)} />
                          )}
                        </td>
                      )}
                      <td>
                        <span className="cell-strong">{m.local}</span>
                        <span className="cell-sub">{m.localName}{m.src === 'API' ? ' · API' : ''}</span>
                      </td>
                      <td>
                        {m.item ? (<>
                          <span className="cell-strong">{m.item}</span>
                          <span className="cell-sub">{itemName(m.item)}</span>
                        </>) : <span className="cell-sub">{t('mat.selectMaster')}</span>}
                      </td>
                      <td>
                        {m.item ? (
                          <div className="map-summary">
                            {units.map((u, k) => (
                              <span className="map-chip" key={k}>
                                {u.uom || '—'} <b className="num">{num(u.factor)}</b>
                              </span>
                            ))}
                            {differs && <Chip warn>{t('mat.differs')}</Chip>}
                          </div>
                        ) : <span className="cell-sub">—</span>}
                      </td>
                      <td>
                        <MapBadge state={m.state} />
                        {m.reason && <span className="cell-sub" style={{ color: 'var(--danger)' }}>{m.reason}</span>}
                      </td>
                      <td className="cell-action">
                        {editable && (ready
                          ? <LinkButton onClick={() => propose(i)}>{t('mat.propose')} ›</LinkButton>
                          : <LinkButton onClick={() => { if (!isOpen) toggleOpen(i) }}>{t('mat.incomplete')}</LinkButton>)}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="map-detail-row">
                        <td colSpan={canPropose ? 7 : 6}>
                          <div className="map-detail">
                            {editable && (
                              <div className="map-detail-master">
                                <span className="map-detail-key">{t('mat.master')}</span>
                                <Combo value={m.item} className="sel-master"
                                       ariaLabel={`${t('mat.master')} ${m.local}`}
                                       onChange={v => patch(i, { item: v })}>
                                  <option value="">{t('mat.pickMaster')}</option>
                                  {MASTER.map(x => (
                                    <option key={x.code} value={x.code}>{x.code} · {itemName(x.code)}</option>
                                  ))}
                                </Combo>
                              </div>
                            )}

                            {m.item ? (
                              /* Two boxes, one per organisation, drawn as
                                 backgrounds on a shared grid so rows in the
                                 left box stay level with their pair on the
                                 right. */
                              <div className="map-sides">
                                <div className="map-box-head">{t('mat.sidePcu')}</div>
                                <div className="map-box-head">{t('mat.sideHosp')}</div>
                                <div />
                                {/* Column labels once per box, sitting over the
                                    fields they name. */}
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
                                <div />
                                {units.map((_u, k) => (
                                  <Fragment key={k}>
                                    <div className="map-box-cell">
                                      <em className="map-unit-no">
                                        {k === 0 ? t('mat.mainUom') : `${k + 1}`}
                                      </em>
                                      {unitCell(i, m, k, 'pcu', editable)}
                                      {qtyCell(i, m, k, 'pcu', editable)}
                                    </div>
                                    <div className="map-box-cell">
                                      <em className="map-unit-no">
                                        {k === 0 ? t('mat.mainUom') : `${k + 1}`}
                                      </em>
                                      {unitCell(i, m, k, 'hosp', editable)}
                                      {qtyCell(i, m, k, 'hosp', editable)}
                                    </div>
                                    <div className="map-drop-cell">
                                      {editable && k > 0 && (
                                        <button type="button" className="map-uom-drop"
                                                aria-label={t('mat.removeUom')}
                                                onClick={() => removeUom(i, m, k)}>
                                          <Icon name="close" size={14} />
                                        </button>
                                      )}
                                    </div>
                                  </Fragment>
                                ))}
                              </div>
                            ) : <p className="cell-sub">{t('mat.selectMaster')}</p>}

                            {editable && m.item && (
                              <LinkButton className="map-uom-add" onClick={() => addUom(i, m)}>
                                + {t('mat.addUom')}
                              </LinkButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      {canPropose && picked.size > 0 && (
        <div className="actionbar">
          <span>
            {t('c.selected')} <b className="num">{pickedRows.length}</b>
            {' · '}{t('mat.propose')} <b className="num" style={{ color: 'var(--ok)' }}>{pickedReady.length}</b>
            {pickedRows.length > pickedReady.length && <>
              {' · '}<b className="num" style={{ color: 'var(--danger)' }}>{pickedRows.length - pickedReady.length}</b>{' '}
              {t('mat.incomplete')}
            </>}
          </span>
          <div className="spacer" />
          <Button onClick={() => setPicked(new Set())} disabled={picked.size === 0}>{t('c.clear')}</Button>
          <Button variant="primary" icon="arrowR" disabled={pickedReady.length === 0}
                  onClick={() => { proposeMany([...picked]); setPicked(new Set()) }}>
            {t('mat.proposeSelected')} ({pickedReady.length})
          </Button>
        </div>
      )}
    </>
  )
}

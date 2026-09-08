import { useMemo, useState } from 'react'
import { useStore } from '@/app/store'
import { ROLES, MASTER } from '@/data/seed'
import { num, uomChoices, mappingReady, mappedUoms } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import { Card, PanelHead, Button, TableWrap, Empty, Chip, LinkButton, NumberInput, Combo, Icon } from '@/components/ui'
import { MapBadge } from '@/components/StateBadge'
import type { MapState, Mapping, MappedUom } from '@/types'
import './mapping.css'
import { HeroBar, HeroSearch, HeroSelect, HeroCta } from '@/components/layout/HeroBar'
import { useMenuToggle } from '@/components/layout/AppShell'

const EDITABLE: MapState[] = ['UNMAPPED', 'DRAFT', 'REJECTED']

export function MatchingView() {
  const { t, orgName, itemName, uomName } = useT()
  const role = useStore(s => s.role)
  const onMenu = useMenuToggle()
  const maps = useStore(s => s.mappings)
  const lastSync = useStore(s => s.lastSync)
  const patch = useStore(s => s.patchMapping)
  const propose = useStore(s => s.proposeMapping)
  const proposeMany = useStore(s => s.proposeMappings)
  const pull = useStore(s => s.pullLocalItems)

  const r = ROLES[role]
  const canPropose = r.can.includes('map.propose')

  const [q, setQ] = useState('')
  const [fState, setFState] = useState('')
  const [picked, setPicked] = useState<Set<number>>(new Set())

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
                 ...(patchUom.factor !== undefined && { factor: patchUom.factor }) })
      return
    }
    const extra = [...(m.extraUoms ?? [])]
    extra[k - 1] = { ...extra[k - 1], ...patchUom }
    patch(i, { extraUoms: extra })
  }
  const addUom = (i: number, m: Mapping) =>
    patch(i, { extraUoms: [...(m.extraUoms ?? []), { uom: '', factor: 1 }] })
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
        actions={canPropose
          ? <HeroCta icon="refresh" onClick={() => pull(org)}>{t('mat.pull')}</HeroCta>
          : undefined}
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
          <TableWrap>
            <thead>
              <tr>
                {canPropose && (
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={allPicked} aria-label={t('c.all')}
                           onChange={e => setPicked(e.target.checked ? new Set(pickable.map(x => x.i)) : new Set())} />
                  </th>
                )}
                <th>{t('mat.ourItem')}</th>
                <th>{t('mat.master')}</th>
                <th>{t('mat.units')}</th>
                <th>{t('mat.conversion')}</th>
                <th>{t('c.status')}</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ m, i }) => {
                const editable = canPropose && EDITABLE.includes(m.state)
                const ready = mappingReady(m)
                const units = mappedUoms(m)
                return (
                  <tr key={`${m.org}-${m.local}`} className={m.state === 'UNMAPPED' ? 'row-attention' : ''}>
                    {canPropose && (
                      <td>{editable && (
                        <input type="checkbox" checked={picked.has(i)}
                               aria-label={`${t('c.selected')} ${m.local}`}
                               onChange={() => toggle(i)} />
                      )}</td>
                    )}
                    <td>
                      <span className="cell-strong">{m.local}</span>
                      <span className="cell-sub">{m.localName}{m.src === 'API' ? ' · API' : ''}</span>
                    </td>
                    <td>
                      {editable ? (
                        <Combo value={m.item} className="sel-master"
                               ariaLabel={`${t('mat.master')} ${m.local}`}
                               onChange={v => patch(i, { item: v })}>
                          <option value="">{t('mat.pickMaster')}</option>
                          {MASTER.map(x => (
                            <option key={x.code} value={x.code}>{x.code} · {itemName(x.code)}</option>
                          ))}
                        </Combo>
                      ) : m.item ? (<>
                        <span className="cell-strong">{m.item}</span>
                        <span className="cell-sub">{itemName(m.item)}</span>
                      </>) : '—'}
                    </td>
                    <td>
                      {!m.item ? <span className="cell-sub">{t('mat.selectMaster')}</span> : (
                        <div className="map-uoms">
                          {units.map((u, k) => (
                            <div className="map-uom" key={k}>
                              {editable ? (
                                <Combo value={u.uom} className="sel-uom"
                                       ariaLabel={`${t('req.localUnit')} ${m.local} ${k + 1}`}
                                       onChange={v => setUom(i, m, k, { uom: v })}>
                                  <option value="">{t('mat.pickUom')}</option>
                                  {/* A unit already claimed by another row here would
                                      make two conflicting conversions for one item. */}
                                  {uomChoices(m.item)
                                    .filter(x => x === u.uom || !units.some(other => other.uom === x))
                                    .map(x => <option key={x} value={x}>{x}</option>)}
                                </Combo>
                              ) : <span className="cell-strong">{u.uom}</span>}

                              {editable ? (
                                <NumberInput className="map-uom-qty" value={u.factor}
                                             aria-label={`${t('mat.factor')} ${m.local} ${u.uom}`}
                                             onChange={e => {
                                               const v = Number(String(e.target.value).replace(/[^\d]/g, '')) || 0
                                               setUom(i, m, k, { factor: v })
                                             }} />
                              ) : <b className="num">{num(u.factor)}</b>}
                              <span className="map-uom-base">{uomName(m.item)}</span>

                              {editable && k > 0 && (
                                <button type="button" className="map-uom-drop"
                                        aria-label={t('mat.removeUom')}
                                        onClick={() => removeUom(i, m, k)}>
                                  <Icon name="close" size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          {editable && (
                            <LinkButton className="map-uom-add" onClick={() => addUom(i, m)}>
                              + {t('mat.addUom')}
                            </LinkButton>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {ready ? (
                        <div className="map-formulas">
                          {units.map((u, k) => (
                            <Chip accent key={k}>1 {u.uom} = {num(u.factor)} {uomName(m.item)}</Chip>
                          ))}
                        </div>
                      ) : <span className="cell-sub">{t('mat.incomplete')}</span>}
                    </td>
                    <td>
                      <MapBadge state={m.state} />
                      {m.reason && <span className="cell-sub" style={{ color: 'var(--danger)' }}>{m.reason}</span>}
                    </td>
                    <td>
                      {/* Only an actionable control here — status already reads in its own column. */}
                      {editable && ready
                        ? <LinkButton onClick={() => propose(i)}>{t('mat.propose')} ›</LinkButton>
                        : null}
                    </td>
                  </tr>
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

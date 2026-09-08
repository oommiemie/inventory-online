import { useMemo, useState } from 'react'
import { useStore } from '@/app/store'
import { ROLES, MASTER } from '@/data/seed'
import { num, uomChoices, mappingReady, mappedUoms } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import { Card, PanelHead, Button, Empty, Chip, LinkButton, Combo, Icon, QtyStepper } from '@/components/ui'
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
          /* One card per item rather than one very wide row: an item carries a
             master, two sides and any number of units, which a table can only
             show by running off the screen. */
          <div className="panel-body map-list">
            {canPropose && pickable.length > 0 && (
              <label className="map-all">
                <input type="checkbox" checked={allPicked} aria-label={t('c.all')}
                       onChange={e => setPicked(e.target.checked ? new Set(pickable.map(x => x.i)) : new Set())} />
                <span>{t('c.all')} ({pickable.length})</span>
              </label>
            )}

            {rows.map(({ m, i }) => {
              const editable = canPropose && EDITABLE.includes(m.state)
              const ready = mappingReady(m)
              const units = mappedUoms(m)
              return (
                <article className={`map-card${m.state === 'UNMAPPED' ? ' is-attention' : ''}`}
                         key={`${m.org}-${m.local}`}>
                  {/* The pairing is the point of the screen, so it leads: the
                      facility's item on the left, the master it maps to on the
                      right, with the status of that pairing beside them. */}
                  <header className="map-pair">
                    {canPropose && (
                      <input type="checkbox" checked={picked.has(i)} disabled={!editable}
                             aria-label={`${t('c.selected')} ${m.local}`}
                             onChange={() => toggle(i)} />
                    )}

                    <div className="map-side map-side--ours">
                      <span className="map-side-label">{t('mat.ourItem')}</span>
                      <b>{m.local}</b>
                      <span className="map-side-name">
                        {m.localName}
                        {m.src === 'API' && <em className="map-tag">API</em>}
                      </span>
                    </div>

                    <span className="map-arrow" aria-hidden="true"><Icon name="arrowR" size={16} /></span>

                    <div className="map-side map-side--master">
                      <span className="map-side-label">{t('mat.master')}</span>
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
                        <b>{m.item}</b>
                        <span className="map-side-name">{itemName(m.item)}</span>
                      </>) : <span className="map-side-empty">{t('mat.selectMaster')}</span>}
                    </div>

                    <div className="map-pair-end">
                      <MapBadge state={m.state} />
                      {editable && ready && (
                        <LinkButton onClick={() => propose(i)}>{t('mat.propose')} ›</LinkButton>
                      )}
                    </div>
                  </header>

                  {m.reason && <p className="map-card-reason">{m.reason}</p>}

                  {m.item && (
                    <div className="map-units">
                      <div className="map-units-head">
                        <span className="map-units-title">{t('mat.units')}</span>
                        <span className="map-side-head">{t('mat.sidePcu')}</span>
                        <span className="map-side-head">{t('mat.sideHosp')}</span>
                        <span />
                      </div>
                      {units.map((_u, k) => (
                        <div className="map-unit" key={k}>
                          <span className="map-unit-tag">
                            {k === 0 ? t('mat.mainUom') : `${t('mat.extraUoms')} ${k}`}
                          </span>
                          <span className="map-unit-side" data-side={t('mat.sidePcu')}>
                            {unitCell(i, m, k, 'pcu', editable)}
                            {qtyCell(i, m, k, 'pcu', editable)}
                            <em className="map-unit-base">{uomName(m.item)}</em>
                          </span>
                          <span className="map-unit-side" data-side={t('mat.sideHosp')}>
                            {unitCell(i, m, k, 'hosp', editable)}
                            {qtyCell(i, m, k, 'hosp', editable)}
                            <em className="map-unit-base">{uomName(m.item)}</em>
                          </span>
                          {editable && k > 0 ? (
                            <button type="button" className="map-uom-drop"
                                    aria-label={t('mat.removeUom')}
                                    onClick={() => removeUom(i, m, k)}>
                              <Icon name="close" size={14} />
                            </button>
                          ) : <span />}
                        </div>
                      ))}
                      {editable && (
                        <LinkButton className="map-uom-add" onClick={() => addUom(i, m)}>
                          + {t('mat.addUom')}
                        </LinkButton>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
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

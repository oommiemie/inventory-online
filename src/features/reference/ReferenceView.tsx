import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/app/store'
import { pcuOrgs } from '@/app/selectors'
import { ROLES, MASTER } from '@/data/seed'
import { num, uomChoices, mapOf } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import {
  Card, PanelHead, TableWrap, Segmented, Chip, Note, Empty, Pagination,
} from '@/components/ui'
import { HeroBar, HeroSearch, HeroCta } from '@/components/layout/HeroBar'
import { useMenuToggle } from '@/components/layout/AppShell'
import { MapBadge } from '@/components/StateBadge'
import './reference.css'

const REJECTED_ROWS = [
  { row: 184, code: 'PCM500', reasonTh: 'รหัสซ้ำกับข้อมูลที่ส่งมา', reasonEn: 'Duplicate code in the incoming data set' },
  { row: 512, code: 'NSS09',  reasonTh: 'ไม่ระบุหน่วยฐาน',          reasonEn: 'Base UOM missing' },
  { row: 903, code: 'GLV-S',  reasonTh: 'ตัวคูณต้องเป็นจำนวนเต็มบวก', reasonEn: 'Factor must be a positive whole number' },
]

export function ReferenceView() {
  const { t, lang, orgName, itemName, catName, uomName } = useT()
  const role = useStore(s => s.role)
  const onMenu = useMenuToggle()
  const maps = useStore(s => s.mappings)
  const lastSync = useStore(s => s.lastSync)
  const pullMaster = useStore(s => s.pullMaster)

  const [tab, setTab] = useState<'master' | 'uom'>('master')
  const [q, setQ] = useState('')

  const canEdit = ROLES[role].can.includes('master.edit')
  const facilities = pcuOrgs()

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return MASTER.filter(m =>
      !needle ||
      m.code.toLowerCase().includes(needle) ||
      m.name.toLowerCase().includes(needle) ||
      m.th.toLowerCase().includes(needle))
  }, [q])

  /* The catalogue is long enough to page rather than scroll forever. */
  const PER_PAGE = 10
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const safePage = Math.min(page, pageCount)
  const rows = useMemo(
    () => list.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [list, safePage],
  )
  useEffect(() => { setPage(1) }, [q, tab])

  return (
    <>
      <HeroBar
        onMenu={onMenu}
        identity={false}
        art={false}
        title={t('ref.title')}
        sub={t('ref.subtitle')}
        controls={<>
          <HeroSearch value={q} onChange={setQ} placeholder={t('c.search')} />
          <Segmented<'master' | 'uom'>
            value={tab}
            onChange={setTab}
            ariaLabel={t('ref.title')}
            options={[
              { value: 'master', label: `${t('ref.tabMaster')} (${MASTER.length})` },
              { value: 'uom',    label: t('ref.tabUom') },
            ]}
          />
        </>}
        actions={canEdit
          ? <HeroCta icon="refresh" onClick={pullMaster}>{t('ref.pullMaster')}</HeroCta>
          : undefined}
      />

      {/* Catalogue and its ingest report share a row, 2:1, the way the
          integration screen pairs its two logs. */}
      {/* The ingest report belongs to the master catalogue, so on the other
          tab there is no second column and the table takes the full width. */}
      <div className={`ref-split${tab === 'master' ? '' : ' ref-split--single'}`}>
      <Card className="fill-view">
        <PanelHead
          title={tab === 'master' ? t('ref.tabMaster') : t('ref.tabUom')}
          sub={`${list.length} ${t('c.items')} · ${t('ref.lastSync')} ${lastSync.master}`}
        />

        {list.length === 0 ? (
          <Empty icon="doc" title={t('c.noResults')} hint={t('c.noResultsHint')} />
        ) : tab === 'master' ? (
          <TableWrap>
            <thead>
              <tr>
                <th>{t('ref.masterCode')}</th>
                <th>{t('ref.thaiName')}</th>
                <th>{t('ref.category')}</th>
                <th>{t('ref.baseUom')}</th>
                <th>{t('ref.allowedUoms')}</th>
                <th className="num">{t('ref.pricePerBase')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(m => (
                <tr key={m.code}>
                  {/* Code first, the generic name under it: one column fewer to
                      wrap now that the catalogue shares the row with its
                      ingest report. */}
                  <td>
                    <span className="cell-strong">{m.code}</span>
                    <span className="cell-sub">{m.name}</span>
                  </td>
                  <td>{m.th}</td>
                  <td>{catName(m.code)}</td>
                  <td className="cell-strong">{uomName(m.code)}</td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      {uomChoices(m.code).map(u => <Chip key={u}>{u}</Chip>)}
                    </div>
                  </td>
                  <td className="num">{t('c.baht')} {m.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <>
            <div style={{ padding: 'var(--s-3) var(--s-4)' }}><Note>{t('ref.uomNote')}</Note></div>
            <TableWrap>
              <thead>
                <tr>
                  <th>{t('ref.masterCode')}</th>
                  <th>{t('ref.baseUom')}</th>
                  {facilities.map(o => <th key={o}>{orgName(o)}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(mi => (
                  <tr key={mi.code}>
                    <td>
                      <span className="cell-strong">{mi.code}</span>
                      <span className="cell-sub">{itemName(mi.code)}</span>
                    </td>
                    <td>{uomName(mi.code)}</td>
                    {facilities.map(o => {
                      const m = mapOf(maps, o, mi.code)
                      if (m?.state === 'ACTIVE') {
                        return (
                          <td key={o}>
                            <Chip accent>1 {m.localUom} = {num(m.factor)} {uomName(mi.code)}</Chip>
                          </td>
                        )
                      }
                      return (
                        <td key={o}>
                          <MapBadge state={m?.state ?? 'UNMAPPED'} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </>
        )}
        <Pagination page={safePage} pageCount={pageCount} onPage={setPage} />
      </Card>

      {tab === 'master' && (
        <Card className="fill-view">
          <PanelHead title={t('ref.ingestResult')} sub={`GET /hosxp/item-master · ${lastSync.master}`}>
            <Chip accent>{t('ref.accepted')} {MASTER.length}</Chip>
            <Chip warn>{t('ref.rejected')} {REJECTED_ROWS.length}</Chip>
          </PanelHead>
          <TableWrap>
            <colgroup>
              <col style={{ width: 110 }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th>{t('ref.masterCode')}</th>
                <th>{t('ref.rejectedRows')}</th>
              </tr>
            </thead>
            <tbody>
              {REJECTED_ROWS.map(x => (
                <tr key={x.row}>
                  <td>
                    <span className="cell-strong">{x.code}</span>
                    <span className="cell-sub">{t('ref.row')} {x.row}</span>
                  </td>
                  <td>
                    <span className="reject-reason">
                      <i className="fi fi-rr-triangle-warning" aria-hidden="true" />
                      {lang === 'EN' ? x.reasonEn : x.reasonTh}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      )}
      </div>
    </>
  )
}

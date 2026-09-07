import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore, visibleDocs } from '@/app/store'
import { pcuOrgs } from '@/app/selectors'
import { ROLES, ORGS } from '@/data/seed'
import { useT } from '@/hooks/useT'
import { Card, PanelHead, Empty, Button, Pagination } from '@/components/ui'
import { HeroBar, HeroSearch, HeroSelect, HeroCta } from '@/components/layout/HeroBar'
import { useMenuToggle } from '@/components/layout/AppShell'
import { DocTable } from '@/components/DocParts'
import { DraftEditor } from './DraftEditor'
import { DocDetail } from './DocDetail'
import { downloadCsv, csvName } from '@/lib/csv'
import { M } from '@/lib/domain'
import type { DocState } from '@/types'

const ALL_STATES: DocState[] = [
  'DRAFT', 'REQUESTED', 'APPROVED', 'PARTIALLY_ISSUED', 'ISSUED',
  'PARTIALLY_RECEIVED', 'RECEIVED', 'DISCREPANCY', 'COMPLETED',
  'RETURNED', 'REJECTED', 'CANCELLED',
]

export function RequisitionsView() {
  const { no } = useParams()
  const { t, orgName } = useT()
  const nav = useNavigate()

  const role = useStore(s => s.role)
  const docs = useStore(s => s.docs)
  const createDraft = useStore(s => s.createDraft)
  const toast = useStore(s => s.toast)
  const [page, setPage] = useState(1)
  const onMenu = useMenuToggle()

  const [q, setQ] = useState('')
  const [fState, setFState] = useState('')
  const [fOrg, setFOrg] = useState('')

  const r = ROLES[role]
  const mine = visibleDocs(docs, role)
  const doc = no ? docs.find(d => d.no === no) : undefined

  /* Hooks must run on every render, so the list is derived before any early
     return for the detail routes (Rules of Hooks). */
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return mine.filter(d =>
      (!fState || d.state === fState) &&
      (!fOrg || d.org === fOrg) &&
      (!needle || d.no.toLowerCase().includes(needle) || orgName(d.org).toLowerCase().includes(needle)))
  }, [mine, q, fState, fOrg, orgName])

  const PER_PAGE = 12
  const pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE))
  // Filters can shrink the list under the current page; clamp instead of
  // showing an empty page.
  const safePage = Math.min(page, pageCount)
  const pageRows = useMemo(
    () => list.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [list, safePage],
  )
  useEffect(() => { setPage(1) }, [q, fState, fOrg])

  /* ---- Detail routes ---- */
  if (no) {
    if (!doc) {
      return (
        <Card><Empty icon="doc" title={t('c.noResults')} hint={no}
          action={<Button onClick={() => nav('/requisitions')}>{t('c.back')}</Button>} /></Card>
      )
    }
    if (!mine.some(d => d.no === no)) {
      return (
        <Card><Empty icon="warn" title={t('acl.denied')} hint={t('acl.deniedHint')}
          action={<Button onClick={() => nav('/requisitions')}>{t('c.back')}</Button>} /></Card>
      )
    }
    const editable = ['DRAFT', 'RETURNED'].includes(doc.state) && r.can.includes('req.create')
    return editable ? <DraftEditor doc={doc} /> : <DocDetail doc={doc} />
  }

  /* ---- List route ---- */
  const onNew = () => {
    const org = ORGS[r.org].type === 'PCU' ? r.org : 'PCU01'
    const created = createDraft(org)
    if (created) nav(`/requisitions/${created}`)
  }

  const filtered = Boolean(q || fState || fOrg)

  /* Exports what the filters currently show, not the whole table. */
  const exportCsv = () => {
    if (!list.length) { toast(t('c.exportEmpty'), 'warn'); return }
    const ok = downloadCsv(csvName('requisitions'),
      [t('req.no'), t('req.facility'), t('c.status'), t('c.items'), t('c.value'), t('req.created')],
      list.map(d => [
        d.no, orgName(d.org), t(`st.${d.state}` as never), d.lines.length,
        Math.round(d.lines.reduce((a, l) => a + M(l.item).price * l.approved, 0)),
        d.created,
      ]))
    toast(t(ok ? 'c.exported' : 'c.exportFailed'), ok ? 'ok' : 'danger')
  }


  return (
    <>
      <HeroBar
        onMenu={onMenu}
        identity={false}
        art={false}
        title={t('req.title')}
        sub={t('req.subtitle')}
        controls={<HeroSearch value={q} onChange={setQ} placeholder={t('req.searchPh')} />}
        filterCount={(fState ? 1 : 0) + (fOrg ? 1 : 0)}
        filters={<>
          <HeroSelect value={fState} onChange={setFState} ariaLabel={t('req.filterState')}>
            <option value="">{t('req.filterState')}</option>
            {ALL_STATES.map(x => <option key={x} value={x}>{t(`st.${x}`)}</option>)}
          </HeroSelect>
          {r.scope !== 'OWN_ORG' && (
            <HeroSelect value={fOrg} onChange={setFOrg} ariaLabel={t('req.filterOrg')}>
              <option value="">{t('req.filterOrg')}</option>
              {pcuOrgs().map(o => <option key={o} value={o}>{orgName(o)}</option>)}
            </HeroSelect>
          )}
        </>}
        actions={<>
          <HeroCta variant="ghost" icon="download" onClick={exportCsv}>{t('c.export')}</HeroCta>
          {r.can.includes('req.create') && <HeroCta icon="plus" onClick={onNew}>{t('req.new')}</HeroCta>}
        </>}
      />

      <Card className="fill-view">
        <PanelHead title={t('c.items')} sub={`${t('c.showing')} ${pageRows.length} ${t('c.of')} ${list.length}`} />
        <DocTable
          docs={pageRows}
          emptyTitle={filtered ? t('c.noResults') : t('req.empty')}
          emptyHint={filtered ? t('c.noResultsHint') : undefined}
        />
        <Pagination page={safePage} pageCount={pageCount} onPage={setPage} />
      </Card>
    </>
  )
}

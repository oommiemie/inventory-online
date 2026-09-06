import { useMemo } from 'react'
import { useStore, visibleDocs } from '@/app/store'
import { ROLES, ORGS, WAREHOUSES, MASTER } from '@/data/seed'
import { NAV, ROUTE_OF } from '@/app/nav'
import { M, num, stockRows } from '@/lib/domain'
import { useT } from '@/hooks/useT'
import { viewForDoc } from '@/app/selectors'
import type { I18nKey } from '@/i18n'

export type HitKind = 'page' | 'doc' | 'item' | 'facility' | 'warehouse'

export interface Hit {
  id: string
  kind: HitKind
  icon: string
  title: string
  sub?: string
  to: string
  score: number
  haystack: string
}

/** Prefix > substring > fuzzy subsequence. Returns -1 for no match. */
function score(hay: string, q: string): number {
  const h = hay.toLowerCase(), n = q.toLowerCase()
  const idx = h.indexOf(n)
  if (idx === 0) return 1000 - Math.min(h.length, 400)
  if (idx > 0)   return 700 - Math.min(idx, 300)
  let i = 0
  for (const c of n) {
    i = h.indexOf(c, i)
    if (i === -1) return -1
    i++
  }
  return 200
}

/**
 * A flat, role-scoped index of everything reachable in the app: pages,
 * requisitions, master items, facilities and warehouses.
 */
export function useSearchIndex(query: string): Hit[] {
  const { t, orgName, whName, itemName } = useT()
  const role = useStore(s => s.role)
  const docs = useStore(s => s.docs)
  const stock = useStore(s => s.stock)

  const all = useMemo<Hit[]>(() => {
    const r = ROLES[role]
    const out: Hit[] = []
    const push = (h: Omit<Hit, 'score'>) => out.push({ ...h, score: 0 })

    for (const group of NAV) {
      for (const item of group.items) {
        if (!r.menu.includes(item.id)) continue
        const label = t(item.labelKey as I18nKey)
        push({
          id: `page:${item.id}`, kind: 'page', icon: item.icon,
          title: label, sub: t(group.labelKey as I18nKey),
          to: ROUTE_OF[item.id],
          haystack: `${label} ${item.id}`,
        })
      }
    }

    for (const d of visibleDocs(docs, role)) {
      push({
        id: `doc:${d.no}`, kind: 'doc', icon: 'document',
        title: d.no,
        sub: `${orgName(d.org)} · ${t(`st.${d.state}` as I18nKey)} · ${d.lines.length} ${t('c.items')}`,
        to: `${ROUTE_OF[viewForDoc(d)]}/${d.no}`,
        haystack: `${d.no} ${orgName(d.org)} ${d.state} ${t(`st.${d.state}` as I18nKey)} ${d.extRef}`,
      })
    }

    const whInScope = Object.keys(WAREHOUSES)
      .filter(w => r.scope !== 'OWN_ORG' || WAREHOUSES[w].org === r.org)

    for (const m of MASTER) {
      const total = whInScope.reduce(
        (a, w) => a + stockRows(stock, w, m.code).reduce((x, s) => x + s.qty, 0), 0)
      push({
        id: `item:${m.code}`, kind: 'item', icon: 'boxes',
        title: `${m.code} · ${itemName(m.code)}`,
        sub: `${t('stk.onHand')} ${num(total)} ${M(m.code).uom}`,
        to: ROUTE_OF.stock,
        haystack: `${m.code} ${m.name} ${m.th} ${m.cat}`,
      })
    }

    for (const id of Object.keys(ORGS)) {
      if (r.scope === 'OWN_ORG' && id !== r.org) continue
      push({
        id: `org:${id}`, kind: 'facility', icon: 'assessment',
        title: orgName(id), sub: id, to: ROUTE_OF.requisitions,
        haystack: `${orgName(id)} ${ORGS[id].name} ${ORGS[id].nameEn} ${id}`,
      })
    }

    for (const w of whInScope) {
      push({
        id: `wh:${w}`, kind: 'warehouse', icon: 'boxes',
        title: whName(w), sub: `${w} · ${orgName(WAREHOUSES[w].org)}`,
        to: ROUTE_OF.stock,
        haystack: `${whName(w)} ${w} ${WAREHOUSES[w].ext}`,
      })
    }

    return out
  }, [role, docs, stock, t, orgName, whName, itemName])

  return useMemo(() => {
    const q = query.trim()
    if (!q) return all.filter(h => h.kind === 'page').slice(0, 8)
    return all
      .map(h => ({ ...h, score: score(h.haystack, q) }))
      .filter(h => h.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 24)
  }, [all, query])
}

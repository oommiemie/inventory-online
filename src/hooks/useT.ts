import { useCallback } from 'react'
import { useStore } from '@/app/store'
import { translate, type I18nKey } from '@/i18n'
import { ORGS, WAREHOUSES } from '@/data/seed'
import { M } from '@/lib/domain'

/** Translation + locale-aware name helpers, bound to the active language. */
export function useT() {
  const lang = useStore(s => s.lang)

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  )

  const orgName = useCallback(
    (id: string) => {
      const o = ORGS[id]
      if (!o) return id
      return lang === 'EN' ? o.nameEn : o.name
    }, [lang])

  const orgSub = useCallback(
    (id: string) => {
      const o = ORGS[id]
      if (!o) return ''
      return lang === 'EN' ? o.subEn : o.sub
    }, [lang])

  const whName = useCallback(
    (id: string) => {
      const w = WAREHOUSES[id]
      if (!w) return id
      return lang === 'EN' ? w.nameEn : w.name
    }, [lang])

  const itemName = useCallback(
    (code: string) => {
      const m = M(code)
      return lang === 'EN' ? m.name : m.th
    }, [lang])

  const uomName = useCallback(
    (code: string) => {
      const m = M(code)
      return lang === 'EN' ? m.uomEn : m.uom
    }, [lang])

  const catName = useCallback(
    (code: string) => {
      const m = M(code)
      return lang === 'EN' ? m.catEn : m.cat
    }, [lang])

  return { t, lang, orgName, orgSub, whName, itemName, uomName, catName }
}

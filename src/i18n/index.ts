import { TH, EN, type I18nKey } from './dict'
import type { Lang } from '@/types'

export type { I18nKey }

const TABLES: Record<Lang, Record<I18nKey, string>> = { TH, EN }

/** Translate a key; `vars` substitutes {name} placeholders. */
export function translate(lang: Lang, key: I18nKey, vars?: Record<string, string | number>): string {
  /* A payload saved by an older build can name a language this one does not
     have; falling back beats taking the whole screen down over a label. */
  let s: string = (TABLES[lang] ?? TABLES.TH)[key] ?? TABLES.TH[key] ?? String(key)
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

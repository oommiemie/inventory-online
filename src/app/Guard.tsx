import type { ReactNode } from 'react'
import type { ViewId } from '@/types'
import { useStore } from '@/app/store'
import { ROLES } from '@/data/seed'
import { useT } from '@/hooks/useT'
import { Card, Empty } from '@/components/ui'

/** Renders the view only if the active role's menu includes it (mirrors a 403). */
export function Guard({ view, children }: { view: ViewId; children: ReactNode }) {
  const { t, lang } = useT()
  const role = useStore(s => s.role)
  const r = ROLES[role]

  if (!r.menu.includes(view)) {
    return (
      <Card>
        <Empty
          icon="warn"
          title={t('acl.denied')}
          hint={`${lang === 'EN' ? r.label : r.labelTh} · ${t(`scope.${r.scope}`)} — ${t('acl.deniedHint')}`}
        />
      </Card>
    )
  }
  return <div className="view">{children}</div>
}

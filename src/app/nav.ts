import type { ViewId } from '@/types'
import type { I18nKey } from '@/i18n'

/** Flaticon UIcons name — rendered solid (fi-sr-*) when active, regular
 *  (fi-rr-*) otherwise. */
export interface NavItem { id: ViewId; icon: string; labelKey: I18nKey }
export interface NavGroup { labelKey: I18nKey; items: NavItem[] }

export const NAV: NavGroup[] = [
  {
    labelKey: 'nav.group.work',
    items: [
      { id: 'dashboard',    icon: 'objects-column', labelKey: 'nav.dashboard' },
      { id: 'requisitions', icon: 'document',       labelKey: 'nav.requisitions' },
      { id: 'review',       icon: 'assessment',       labelKey: 'nav.review' },
      { id: 'issue',        icon: 'quick-box',        labelKey: 'nav.issue' },
      { id: 'receive',      icon: 'box-check',      labelKey: 'nav.receive' },
    ],
  },
  {
    labelKey: 'nav.group.stock',
    items: [{ id: 'stock', icon: 'boxes', labelKey: 'nav.stock' }],
  },
  {
    labelKey: 'nav.group.data',
    items: [
      { id: 'matching',   icon: 'big-data-analytics', labelKey: 'nav.matching' },
      { id: 'mapapprove', icon: 'folder-check',      labelKey: 'nav.mapapprove' },
      { id: 'reference',  icon: 'info-guide',        labelKey: 'nav.reference' },
      { id: 'monitor',    icon: 'pulse',             labelKey: 'nav.monitor' },
      { id: 'reports',    icon: 'analytics',         labelKey: 'nav.reports' },
      { id: 'settings',   icon: 'settings',         labelKey: 'nav.settings' },
    ],
  },
]

export const ROUTE_OF: Record<ViewId, string> = {
  dashboard: '/', requisitions: '/requisitions', review: '/review',
  issue: '/issue', receive: '/receive', stock: '/stock',
  matching: '/matching', mapapprove: '/mapping-approval', reference: '/reference',
  monitor: '/monitor', reports: '/reports', settings: '/settings',
}

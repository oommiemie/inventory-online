import type { DocState, SyncState, MapState } from '@/types'
import { STATE_TONE, SYNC_TONE } from '@/lib/domain'
import { Badge, type Tone } from '@/components/ui'
import { useT } from '@/hooks/useT'

export function StateBadge({ state, showCode = true }: { state: DocState; showCode?: boolean }) {
  const { t } = useT()
  return (
    <Badge tone={STATE_TONE[state]}>
      {showCode ? `${state} · ${t(`st.${state}`)}` : t(`st.${state}`)}
    </Badge>
  )
}

export function SyncBadge({ state }: { state: SyncState }) {
  const { t } = useT()
  return <Badge tone={SYNC_TONE[state]} pulse={state === 'SENDING'}>{t(`sync.${state}`)}</Badge>
}

const MAP_TONE: Record<MapState, Tone> = {
  ACTIVE: 'green', PENDING_APPROVAL: 'amber', DRAFT: 'gray',
  REJECTED: 'danger', INACTIVE: 'gray', UNMAPPED: 'danger',
}

export function MapBadge({ state }: { state: MapState }) {
  const { t } = useT()
  return <Badge tone={MAP_TONE[state]}>{t(`map.${state}`)}</Badge>
}

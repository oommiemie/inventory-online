import { useStore } from '@/app/store'
import { useT } from '@/hooks/useT'
import { Card, PanelHead, Switch, Input } from '@/components/ui'

type Key = keyof ReturnType<typeof useStore.getState>['profile']['notif']

/** Settings › Notifications: channels first, then the events that fire them. */
export function NotificationPanel() {
  const { t } = useT()
  const notif = useStore(s => s.profile.notif)
  const setProfile = useStore(s => s.setProfile)
  const cfg = useStore(s => s.cfg)
  const setCfg = useStore(s => s.setCfg)
  const set = (k: Key) => (v: boolean) => setProfile({ notif: { ...notif, [k]: v } })

  const CHANNELS: [Key, 'acct.notifInApp' | 'acct.notifEmail', 'acct.notifInAppDesc' | 'acct.notifEmailDesc'][] = [
    ['inApp', 'acct.notifInApp', 'acct.notifInAppDesc'],
    ['email', 'acct.notifEmail', 'acct.notifEmailDesc'],
  ]
  const EVENTS = [
    ['approvals',  'acct.notifApprovals', 'acct.notifApprovalsDesc'],
    ['syncFailed', 'acct.notifSync',      'acct.notifSyncDesc'],
    ['lowStock',   'acct.notifLowStock',  'acct.notifLowStockDesc'],
    ['expiry',     'acct.notifExpiry',    'acct.notifExpiryDesc'],
  ] as const

  const Row = ({ k, title, desc }: { k: Key; title: Parameters<typeof t>[0]; desc: Parameters<typeof t>[0] }) => (
    <div className="set-row">
      <div className="set-row-main">
        <b>{t(title)}</b>
        <small>{t(desc)}</small>
      </div>
      <Switch checked={notif[k]} ariaLabel={t(title)} onChange={set(k)} />
    </div>
  )

  return (
    <>
      <Card>
        <PanelHead title={t('acct.channels')} sub={t('acct.channelsDesc')} />
        <div className="panel-body set-rows">
          {CHANNELS.map(([k, title, desc]) => <Row key={k} k={k} title={title} desc={desc} />)}
        </div>
      </Card>
      <Card>
        <PanelHead title={t('acct.events')} sub={t('acct.eventsDesc')} />
        <div className="panel-body set-rows">
          {EVENTS.map(([k, title, desc]) => <Row key={k} k={k} title={title} desc={desc} />)}
          {notif.expiry && (
            <div className="set-row set-row--sub">
              <div className="set-row-main">
                <b>{t('set.expiryAlert')}</b>
                <small>{t('set.expiryAlertDesc')}</small>
              </div>
              <Input value={cfg.expiryAlert} inputMode="numeric"
                     style={{ width: 96, textAlign: 'right' }}
                     aria-label={t('set.expiryAlert')}
                     onChange={e => setCfg('expiryAlert', Number(e.target.value.replace(/[^\d]/g, '')) || 0)} />
            </div>
          )}
        </div>
      </Card>
    </>
  )
}

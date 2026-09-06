import { useStore } from '@/app/store'
import { Icon } from '@/components/ui'

export function ToastRegion() {
  const toasts = useStore(s => s.toasts)
  const dismiss = useStore(s => s.dismissToast)

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toasts.map(t => (
        <div className={`toast ${t.tone}`} key={t.id}>
          <i className="toast-bar" aria-hidden="true" />
          <div style={{ minWidth: 0 }}>{t.msg}</div>
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

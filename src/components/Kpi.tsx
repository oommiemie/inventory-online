import type { ReactNode } from 'react'
import type { Tone } from '@/components/ui'
import { CountUp } from '@/components/CountUp'
import './kpi.css'

export interface KpiProps {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  tone?: Tone
  /** Flaticon UIcons name, rendered inside the tinted circle. */
  icon?: string
  /** 0–100. Draws the progress track when provided. */
  progress?: number
  onClick?: () => void
}

/**
 * KPI tile: tinted circular icon, oversized figure, caption, and an
 * optional progress track showing the value against its total.
 */
export function KpiCard(
  { label, value, hint, tone = 'info', icon, progress, onClick }: KpiProps,
) {
  const Tag = onClick ? 'button' : 'div'
  const pct = progress === undefined ? undefined : Math.max(0, Math.min(100, progress))

  return (
    <Tag className={`kpi kpi-${tone}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <span className="kpi-head">
        {icon && (
          <span className="kpi-ico" aria-hidden="true">
            <i className={`fi fi-sr-${icon}`} />
          </span>
        )}
        <span className="kpi-label">{label}</span>
      </span>

      <strong className="kpi-value num">
        {typeof value === 'number' ? <CountUp value={value} /> : value}
      </strong>

      {/* Both slots always render, so every tile shares one skeleton and the
          numbers, hints and bars line up across the row. */}
      <span className="kpi-hint">{hint ?? '\u00A0'}</span>
      <span className="kpi-track" role="presentation"
            style={pct === undefined ? { visibility: 'hidden' } : undefined}>
        <span className="kpi-fill" style={{ width: `${pct ?? 0}%` }} />
      </span>
    </Tag>
  )
}

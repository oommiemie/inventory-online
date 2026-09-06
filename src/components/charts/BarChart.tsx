import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import './charts.css'

export interface Series { key: string; label: string; color: string }
export interface BarDatum { label: string; values: Record<string, number> }

/**
 * Grouped bar chart drawn in real pixel units.
 *
 * The SVG viewBox tracks the measured container width 1:1 so text is never
 * scaled non-uniformly (which is what `preserveAspectRatio="none"` would do).
 * Values are also exposed via aria-label for screen readers.
 */
export function BarChart(
  { data, series, height = 220, format = (n: number) => String(n) }:
  { data: BarDatum[]; series: Series[]; height?: number; format?: (n: number) => string },
) {
  const id = useId()
  const host = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  const [tip, setTip] = useState<number | null>(null)

  useEffect(() => {
    if (!host.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)))
    ro.observe(host.current)
    return () => ro.disconnect()
  }, [])

  const rawMax = Math.max(1, ...data.flatMap(d => series.map(s => d.values[s.key] ?? 0)))
  /* Choose a tick count that yields whole-number labels, so small integer
     series (1, 2, 3…) never render duplicated axis values. */
  const ticks = rawMax <= 4 ? rawMax : 4
  const max = Math.ceil(rawMax / ticks) * ticks
  const padT = 22, padB = 34, padL = 54, padR = 10
  const plotH = height - padT - padB
  const plotW = Math.max(10, w - padL - padR)

  /* Remounting the svg on a data change replays the rise-in. */
  const sig = data.map(d => `${d.label}:${series.map(s => d.values[s.key] ?? 0).join(',')}`).join('|')
  const groupW = plotW / Math.max(1, data.length)
  const barW = Math.max(6, Math.min(26, (groupW - 14) / series.length))
  const gap = 5

  return (
    <figure className="chart" aria-labelledby={`${id}-cap`} ref={host}>
      <svg key={sig}
        width={w} height={height} viewBox={`0 0 ${w} ${height}`} role="img"
        aria-label={data
          .map(d => `${d.label}: ${series.map(s => `${s.label} ${format(d.values[s.key] ?? 0)}`).join(', ')}`)
          .join('; ')}
      >
        <defs>
          {/* Cylindrical depth per series: lit top edge, true colour through
             the body, a touch of shade at the base. */}
          {series.map((s, si) => (
            <linearGradient key={s.key} id={`${id}-g${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   style={{ stopColor: `color-mix(in srgb, ${s.color} 72%, #fff)` }} />
              <stop offset="45%"  style={{ stopColor: s.color }} />
              <stop offset="100%" style={{ stopColor: `color-mix(in srgb, ${s.color} 84%, #123)` }} />
            </linearGradient>
          ))}
          <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#12275C" floodOpacity="0.28" />
          </filter>
        </defs>

        {/* grid + y axis */}
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = (max / ticks) * i
          const y = padT + plotH - (v / max) * plotH
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} className="chart-grid" />
              <text x={padL - 8} y={y} className="chart-tick" textAnchor="end" dominantBaseline="middle">
                {format(Math.round(v))}
              </text>
            </g>
          )
        })}

        {/* bars */}
        {data.map((d, gi) => {
          const gx = padL + gi * groupW
          const inner = series.length * barW + (series.length - 1) * gap
          const start = gx + (groupW - inner) / 2
          return (
            <g key={d.label}
               opacity={tip === null || tip === gi ? 1 : 0.35}
               style={{ transition: 'opacity 120ms ease' }}>
              {series.map((s, si) => {
                const v = d.values[s.key] ?? 0
                const h = v > 0 ? Math.max(3, (v / max) * plotH) : 0
                const x = start + si * (barW + gap)
                const y = padT + plotH - h
                return (
                  <g key={s.key} className="chart-bar"
                     style={{ '--i': gi * series.length + si } as CSSProperties}>
                    <rect x={x} y={y} width={barW} height={h} rx={4}
                          fill={`url(#${id}-g${si})`} filter={`url(#${id}-shadow)`}>
                      <title>{`${d.label} · ${s.label}: ${format(v)}`}</title>
                    </rect>
                    {/* Specular sheen along the lit edge. */}
                    {h > 8 && (
                      <rect x={x + 1.5} y={y + 2} width={Math.max(2, barW * 0.3)}
                            height={Math.max(2, h - 5)} rx={2.5}
                            fill="#fff" opacity="0.28" pointerEvents="none" />
                    )}
                    {h > 0 && (
                      <text x={x + barW / 2} y={y - 5} className="chart-val" textAnchor="middle">
                        {format(v)}
                      </text>
                    )}
                  </g>
                )
              })}
              <text x={gx + groupW / 2} y={height - 12} className="chart-label" textAnchor="middle">
                {d.label}
              </text>
              {/* Invisible hover zone covering the whole group column. */}
              <rect x={gx} y={padT} width={groupW} height={plotH + padB - 6}
                    fill="transparent"
                    onMouseEnter={() => setTip(gi)} onMouseLeave={() => setTip(null)} />
            </g>
          )
        })}

        <line x1={padL} x2={w - padR} y1={padT + plotH} y2={padT + plotH} className="chart-axis" />
      </svg>

      {tip !== null && data[tip] && (
        <div className="chart-tip"
             style={{
               left: padL + tip * groupW + groupW / 2,
               top: padT - 6,
             }}>
          <b>{data[tip].label}</b>
          {series.map(s => (
            <span key={s.key}>
              <i style={{ background: s.color }} />
              {s.label}
              <em className="num">{format(data[tip].values[s.key] ?? 0)}</em>
            </span>
          ))}
        </div>
      )}

      <figcaption id={`${id}-cap`} className="chart-legend">
        {series.map(s => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}
      </figcaption>
    </figure>
  )
}

import {
  type ButtonHTMLAttributes, type InputHTMLAttributes,
  type TextareaHTMLAttributes, type ReactNode, useEffect, useId,
} from 'react'
import { Icon, type IconName } from './Icon'
import { useT } from '@/hooks/useT'
import './ui.css'

export { Icon }
export type { IconName }
export { Combo } from './Combo'
export { DatePicker } from './DatePicker'

/* ---------------- Button ---------------- */
type Variant = 'default' | 'primary' | 'teal' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: IconName
  iconRight?: IconName
  block?: boolean
}

export function Button({
  variant = 'default', size = 'md', icon, iconRight, block, children, className = '', ...rest
}: BtnProps) {
  const cls = [
    'btn',
    variant !== 'default' && `btn-${variant}`,
    size !== 'md' && `btn-${size}`,
    !children && 'btn-icon',
    block && 'btn-block',
    className,
  ].filter(Boolean).join(' ')
  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </button>
  )
}

export function LinkButton(
  { children, danger, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean },
) {
  return <button className={`linkbtn ${danger ? 'danger' : ''} ${className}`} {...rest}>{children}</button>
}

/* ---------------- Surfaces ---------------- */
export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`glass card ${className}`} {...rest}>{children}</div>
}

export function PanelHead(
  { title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode },
) {
  return (
    <div className="panel-head">
      <div style={{ minWidth: 0 }}>
        <h2>{title}</h2>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="spacer" />
      {children}
    </div>
  )
}

/* ---------------- Badge / Chip ---------------- */
export type Tone = 'gray' | 'info' | 'green' | 'amber' | 'danger' | 'teal' | 'violet'
  | 'indigo' | 'cyan' | 'rose' | 'slate' | 'ok-done'

export function Badge(
  { tone = 'gray', children, dot = true, pulse, className = '' }:
  { tone?: Tone; children: ReactNode; dot?: boolean; pulse?: boolean; className?: string },
) {
  return (
    <span className={`badge badge-${tone} ${dot ? '' : 'no-dot'} ${pulse ? 'badge-sending' : ''} ${className}`}>
      {children}
    </span>
  )
}

export function Chip(
  { children, accent, warn, className = '' }:
  { children: ReactNode; accent?: boolean; warn?: boolean; className?: string },
) {
  return <span className={`chip ${accent ? 'chip-accent' : ''} ${warn ? 'chip-warn' : ''} ${className}`}>{children}</span>
}

/* ---------------- Form controls ---------------- */
interface FieldProps { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }

export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  return (
    <div className={`field ${className}`}>
      {label && <label>{label}</label>}
      {children}
      {error ? <span className="err">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  )
}

export const Input = ({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) =>
  <input className={`input ${className}`} {...rest} />

export const NumberInput = ({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) =>
  <input inputMode="numeric" className={`input input-num ${className}`} {...rest} />

export const Textarea = ({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) =>
  <textarea className={`textarea ${className}`} {...rest} />

export function SearchInput(
  { value, onChange, placeholder, ...rest }:
  { value: string; onChange: (v: string) => void; placeholder?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>,
) {
  return (
    <div className="search-wrap">
      <Icon name="search" />
      <input className="input" type="search" value={value} placeholder={placeholder}
             onChange={e => onChange(e.target.value)} {...rest} />
    </div>
  )
}

/* ---------------- Empty state ---------------- */
export function Empty(
  { icon = 'inbox', title, hint, action }:
  { icon?: IconName; title: ReactNode; hint?: ReactNode; action?: ReactNode },
) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={24} /></div>
      <b>{title}</b>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  )
}

/* ---------------- Page head ---------------- */
export function PageHead(
  { title, lede, actions }: { title: ReactNode; lede?: ReactNode; actions?: ReactNode },
) {
  return (
    <header className="page-head">
      <div style={{ minWidth: 0 }}>
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  )
}

/* ---------------- Note ---------------- */
export function Note(
  { tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger' | 'ok'; children: ReactNode },
) {
  const icon: IconName = tone === 'warn' || tone === 'danger' ? 'warn' : tone === 'ok' ? 'check' : 'info'
  return (
    <div className={`note ${tone !== 'info' ? `note-${tone}` : ''}`}>
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  )
}

/* ---------------- Key/value ---------------- */
export const KV = ({ k, children }: { k: ReactNode; children: ReactNode }) => (
  <div className="kv"><span>{k}</span><b>{children}</b></div>
)

/* ---------------- Segmented control ---------------- */
export function Segmented<T extends string>(
  { value, onChange, options, ariaLabel }:
  { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; ariaLabel?: string },
) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Tabs ---------------- */
export function Tabs<T extends string>(
  { value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] },
) {
  return (
    <div className="tabs" role="tablist">
      {options.map(o => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Stepper ---------------- */
export function Stepper(
  { steps, current, off }: { steps: string[]; current: number; off?: boolean },
) {
  return (
    <div className="glass card stepper">
      {steps.map((s, i) => {
        const state = off && i === current ? 'off' : i < current ? 'done' : i === current ? 'active' : ''
        return (
          <div key={s} className={`step ${state}`}>
            <div className="step-dot">{i < current ? <Icon name="check" size={14} /> : i + 1}</div>
            <div className="step-label">{s}</div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------------- Modal ---------------- */
export function Modal(
  { open, title, children, onClose, footer }:
  { open: boolean; title: ReactNode; children: ReactNode; onClose: () => void; footer?: ReactNode },
) {
  const id = useId()
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={id}
           onClick={e => e.stopPropagation()}>
        <h2 id={id}>{title}</h2>
        <div style={{ marginTop: 8 }}>{children}</div>
        {footer && <div className="modal-actions">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------------- Table shell ---------------- */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="table-wrap">
      <table className={`tbl${className ? ` ${className}` : ''}`}>{children}</table>
    </div>
  )
}

/**
 * Page navigator for long tables. Renders nothing for a single page, so a
 * caller can always mount it without checking the row count itself.
 */
export function Pagination(
  { page, pageCount, onPage }:
  { page: number; pageCount: number; onPage: (p: number) => void },
) {
  const { t } = useT()
  if (pageCount <= 1) return null

  // Window the numbers so a long list doesn't spill a hundred buttons.
  const span = 1
  const nums: (number | '…')[] = []
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || (i >= page - span && i <= page + span)) nums.push(i)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }

  return (
    <nav className="pager" aria-label={t('c.page')}>
      <button className="pager-btn" disabled={page === 1}
              onClick={() => onPage(page - 1)} aria-label={t('c.prevPage')}>
        <Icon name="chevL" size={16} />
      </button>
      {nums.map((n, i) => n === '…'
        ? <span key={`gap${i}`} className="pager-gap">…</span>
        : <button key={n} className={`pager-btn${n === page ? ' is-current' : ''}`}
                  aria-current={n === page ? 'page' : undefined}
                  onClick={() => onPage(n)}>{n}</button>)}
      <button className="pager-btn" disabled={page === pageCount}
              onClick={() => onPage(page + 1)} aria-label={t('c.nextPage')}>
        <Icon name="chevR" size={16} />
      </button>
    </nav>
  )
}

/** On/off switch, brand-filled when on. */
export function Switch(
  { checked, onChange, ariaLabel }:
  { checked: boolean; onChange: (v: boolean) => void; ariaLabel: string },
) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={ariaLabel}
            className={`switch${checked ? ' is-on' : ''}`}
            onClick={() => onChange(!checked)}>
      <i className="switch-knob" aria-hidden="true" />
    </button>
  )
}

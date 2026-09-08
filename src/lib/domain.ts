import type {
  DocState, Permission, StockRow, LotAlloc, Mapping, MasterItem, SyncState,
} from '@/types'
import { MASTER, UOM_CHOICES } from '@/data/seed'

/* ---------------- Item master helpers ---------------- */
const FALLBACK: MasterItem = {
  code: '?', name: '?', th: '?', uom: '-', uomEn: '-', cat: '-', catEn: '-', price: 0,
}
export const M = (code: string): MasterItem =>
  MASTER.find(m => m.code === code) ?? { ...FALLBACK, code, name: code, th: code }

export const uomChoices = (item: string): string[] => UOM_CHOICES[item] ?? [M(item).uom]

/* ---------------- UOM mapping ----------------
   A mapping pairs one facility-local code with one master item and records
   how many BASE units one local unit contains (factor).
   Quantities are stored in BASE units everywhere; local units are a display
   and entry convenience only.                                              */

export const mapOf = (maps: Mapping[], org: string, item: string): Mapping | undefined =>
  item
    ? maps.find(m => m.org === org && m.item === item && m.state === 'ACTIVE') ??
      maps.find(m => m.org === org && m.item === item)
    : undefined

export const mapIsActive = (maps: Mapping[], org: string, item: string): boolean =>
  mapOf(maps, org, item)?.state === 'ACTIVE'

export const uomOf = (maps: Mapping[], org: string, item: string): { uom: string; factor: number } => {
  const m = mapOf(maps, org, item)
  return m && m.state === 'ACTIVE'
    ? { uom: m.localUom || M(item).uom, factor: m.factor || 1 }
    : { uom: M(item).uom, factor: 1 }
}

export const toBase  = (maps: Mapping[], org: string, item: string, qty: number) =>
  qty * uomOf(maps, org, item).factor

export const toLocal = (maps: Mapping[], org: string, item: string, base: number) => {
  const f = uomOf(maps, org, item).factor
  return f ? base / f : base
}

/** Every unit a mapping carries: the primary one first, then any extras. */
export const mappedUoms = (m: Mapping) =>
  [{ uom: m.localUom, factor: m.factor }, ...(m.extraUoms ?? [])]

/** Complete only with a master and every unit named with a quantity >= 1. */
export const mappingReady = (m: Mapping): boolean =>
  Boolean(m.item) && mappedUoms(m).every(u => Boolean(u.uom) && u.factor >= 1)

/* ---------------- Stock ---------------- */
export const stockRows = (stock: StockRow[], wh: string, item?: string): StockRow[] =>
  stock.filter(s => s.wh === wh && (!item || s.item === item) && s.qty > 0)

export const onHand   = (stock: StockRow[], wh: string, item: string) =>
  stockRows(stock, wh, item).reduce((a, s) => a + s.qty, 0)

export const reserved = (stock: StockRow[], wh: string, item: string) =>
  stockRows(stock, wh, item).reduce((a, s) => a + s.reserved, 0)

export const available = (stock: StockRow[], wh: string, item: string) =>
  onHand(stock, wh, item) - reserved(stock, wh, item)

/** Sort key for a dd/mm/yy Buddhist-era expiry string. */
const expKey = (exp: string) => {
  const [d, m, y] = exp.split('/')
  return `${y ?? ''}${(m ?? '').padStart(2, '0')}${(d ?? '').padStart(2, '0')}`
}

/** First-Expire-First-Out allocation against unreserved quantity. */
export function fefo(stock: StockRow[], wh: string, item: string, qty: number):
  { lots: LotAlloc[]; short: number } {
  const rows = stockRows(stock, wh, item)
    .slice()
    .sort((a, b) => expKey(a.exp).localeCompare(expKey(b.exp)))
  const lots: LotAlloc[] = []
  let left = qty
  for (const r of rows) {
    if (left <= 0) break
    const take = Math.min(left, r.qty - r.reserved)
    if (take > 0) { lots.push({ lot: r.lot, exp: r.exp, qty: take }); left -= take }
  }
  return { lots, short: left }
}

/* ---------------- Document state machine ----------------
   Guards mirror the server: an action from a disallowed state is a 409,
   an action without permission is a 403.                                    */

export const ACTION_FROM: Record<string, DocState[]> = {
  submit:            ['DRAFT', 'RETURNED'],
  mark_reviewed:     ['REQUESTED'],
  approve:           ['REQUESTED'],
  reject:            ['REQUESTED'],
  return:            ['REQUESTED'],
  revise:            ['RETURNED'],
  cancel:            ['DRAFT', 'RETURNED', 'REQUESTED', 'APPROVED'],
  issue:             ['APPROVED', 'PARTIALLY_ISSUED'],
  hosxp_callback:    ['APPROVED', 'PARTIALLY_ISSUED'],
  close_short:       ['PARTIALLY_ISSUED'],
  receive:           ['ISSUED', 'PARTIALLY_RECEIVED'],
  raise_discrepancy: ['PARTIALLY_RECEIVED'],
  settle:            ['DISCREPANCY'],
}

export const ACTION_PERM: Record<string, Permission> = {
  submit: 'req.submit',
  mark_reviewed: 'req.review',
  approve: 'req.approve',
  reject: 'req.reject',
  return: 'req.return',
  revise: 'req.create',
  cancel: 'req.cancel',
  issue: 'req.issue',
  hosxp_callback: 'req.issue',
  close_short: 'req.close_short',
  receive: 'req.receive',
  raise_discrepancy: 'req.receive',
  settle: 'req.settle',
}

export const TERMINAL: DocState[] = ['COMPLETED', 'REJECTED', 'CANCELLED']
export const isTerminal = (s: DocState) => TERMINAL.includes(s)

/* Progress stepper: index of the current stage, or -1 for terminal-off-path */
export const STEP_OF: Record<DocState, number> = {
  DRAFT: 0, RETURNED: 0, CANCELLED: 0,
  REQUESTED: 1, REJECTED: 1,
  APPROVED: 2,
  PARTIALLY_ISSUED: 3, ISSUED: 3,
  PARTIALLY_RECEIVED: 4, RECEIVED: 4, DISCREPANCY: 4,
  COMPLETED: 5,
}

export const STATE_TONE: Record<DocState, import('@/components/ui').Tone> = {
  DRAFT:              'gray',    // not started
  REQUESTED:          'amber',   // waiting on someone
  RETURNED:           'violet',  // sent back for edits
  APPROVED:           'indigo',  // cleared, not yet moving
  PARTIALLY_ISSUED:   'cyan',    // goods partly on the move
  ISSUED:             'info',    // goods in transit
  PARTIALLY_RECEIVED: 'teal',    // partly arrived
  RECEIVED:           'green',   // arrived, not yet closed
  COMPLETED:          'ok-done', // finished
  DISCREPANCY:        'rose',    // needs reconciling
  REJECTED:           'danger',  // refused
  CANCELLED:          'slate',   // withdrawn
}


export const SYNC_TONE: Record<SyncState, 'gray'|'info'|'green'|'danger'|'amber'> = {
  NONE:'gray', QUEUED:'gray', SENDING:'info', SYNCED:'green',
  FAILED:'danger', MANUAL_OVERRIDE:'amber',
}

/* ---------------- Formatting ---------------- */
export const num = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

export const money = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/** Buddhist-era short stamp: dd/mm/yy hh:mm */
export const fmtStamp = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${(d.getFullYear() + 543) % 100} ` +
  `${pad(d.getHours())}:${pad(d.getMinutes())}`

export const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

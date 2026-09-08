import { applyAppearance, resolveTheme, DEFAULT_PREFS, type Prefs } from '@/lib/appearance'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AppConfig, ApiLogEntry, DocLine, DocState, Lang, LedgerEntry, Mapping,
  MapState, Notification, Permission, Requisition, RoleId, StockRow, SupplyLink,
  Profile, SyncJob, Theme, ViewId,
} from '@/types'
import {
  ROLES, ORGS, WAREHOUSES, MASTER, SEED_MAPPINGS, SEED_SUPPLY, SEED_STOCK,
  CONNECTOR_INBOX,
} from '@/data/seed'
import {
  M, fefo, mapIsActive, ACTION_FROM, ACTION_PERM, fmtStamp, uid, uomChoices, mappingReady,
} from '@/lib/domain'

/* ---------------- Toast plumbing ---------------- */
export interface Toast { id: string; msg: string; tone: 'info' | 'ok' | 'warn' | 'danger' }

/* ---------------- Simulated clock ----------------
   The prototype ships a fixed demo date so screenshots stay stable.         */
const START = new Date(2026, 7, 27, 10, 42, 0)

interface State {
  /* session */
  role: RoleId
  /** Prototype session flag; remembered in web storage. */
  signedIn: boolean
  lang: Lang
  theme: Theme
  prefs: Prefs
  profile: Profile
  sidebarCollapsed: boolean

  /* data */
  clock: number            // ms offset added to START
  seq: number
  jobSeq: number
  docs: Requisition[]
  mappings: Mapping[]
  supply: SupplyLink[]
  stock: StockRow[]
  ledger: LedgerEntry[]
  jobs: SyncJob[]
  apiLog: ApiLogEntry[]
  notifs: Notification[]
  cfg: AppConfig
  lastSync: { master: string; local: Record<string, string> }
  /** Warehouse rows are edited in place in `seed`; this is the saved diff. */
  whPatch: Record<string, { ext: string; mapState: MapState }>
  toasts: Toast[]

  /* ---- session actions ---- */
  setRole: (r: RoleId) => void
  signIn: (user: string, remember: boolean) => void
  signOut: () => void
  setLang: (l: Lang) => void
  setTheme: (t: Theme) => void
  setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void
  setProfile: (patch: Partial<Profile>) => void
  toggleSidebar: () => void

  /* ---- helpers ---- */
  stamp: () => string
  tick: (minutes: number) => string
  toast: (msg: string, tone?: Toast['tone']) => void
  dismissToast: (id: string) => void
  notify: (to: string, text: string) => void
  markNotifsRead: () => void

  /* ---- documents ---- */
  createDraft: (org: string) => string | null
  addLine: (no: string, item: string) => void
  removeLine: (no: string, idx: number) => void
  setLineQty: (no: string, idx: number, field: 'req' | 'approved' | 'received', baseQty: number) => void
  setNote: (no: string, note: string) => void
  act: (no: string, action: string, payload?: string) => void

  /* ---- mapping ---- */
  patchMapping: (idx: number, patch: Partial<Mapping>) => void
  proposeMapping: (idx: number) => void
  proposeMappings: (idxs: number[]) => void
  approveMapping: (idx: number) => void
  rejectMapping: (idx: number) => void
  approveMappings: (idxs: number[]) => void
  pullLocalItems: (org: string) => void
  pullMaster: () => void

  /* ---- supply / warehouse ---- */
  setSupplyWh: (org: string, wh: string) => void
  supplyAction: (org: string, action: 'propose' | 'approve' | 'reject' | 'change') => void
  whAction: (wh: string, action: 'propose' | 'approve') => void

  /* ---- stock ---- */
  adjustStock: (wh: string, item: string, lot: string, delta: number) => void

  /* ---- integration ---- */
  retryJob: (id: string) => void
  setCfg: <K extends keyof AppConfig>(k: K, v: AppConfig[K]) => void
  resetData: () => void
}

/* ---------------- Pure helpers over state ---------------- */
const nowOf = (offsetMs: number) => new Date(START.getTime() + offsetMs)

const lineOf = (item: string, req: number): DocLine =>
  ({ item, req, approved: req, issued: 0, received: 0, lots: [] })

const supplyOf = (supply: SupplyLink[], org: string) =>
  supply.find(x => x.org === org && x.state === 'ACTIVE') ?? supply.find(x => x.org === org)

const supplyWhOf = (supply: SupplyLink[], org: string) => {
  const x = supplyOf(supply, org)
  return x && x.state === 'ACTIVE' ? x.wh : ''
}

const supplyHospOf = (supply: SupplyLink[], org: string) => {
  const w = supplyWhOf(supply, org)
  return w ? WAREHOUSES[w].org : ''
}

/* ---------------- Store ---------------- */
export const useStore = create<State>()(persist((set, get) => {
  /* --- internal utilities that read/write via set/get --- */
  const stamp = () => fmtStamp(nowOf(get().clock))

  const tick = (minutes: number) => {
    set(s => ({ clock: s.clock + minutes * 60_000 }))
    return stamp()
  }

  const toast: State['toast'] = (msg, tone = 'info') => {
    const id = uid('t')
    set(s => ({ toasts: [...s.toasts, { id, msg, tone }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(x => x.id !== id) })), 4200)
  }

  const notify: State['notify'] = (to, text) =>
    set(s => ({ notifs: [{ id: uid('n'), t: stamp(), to, text }, ...s.notifs].slice(0, 40) }))

  const apiCall = (dir: ApiLogEntry['dir'], org: string, endpoint: string, code: number, key: string) =>
    set(s => ({
      apiLog: [{
        id: uid('a'), t: stamp(), dir, org, endpoint, code,
        ms: code >= 500 ? 30_000 : 180 + ((s.apiLog.length * 137) % 420),
        key,
      }, ...s.apiLog].slice(0, 80),
    }))

  const patchDoc = (no: string, fn: (d: Requisition) => Requisition) =>
    set(s => ({ docs: s.docs.map(d => (d.no === no ? fn(d) : d)) }))

  const logEvent = (d: Requisition, from: DocState | '', to: DocState | '', action: string, note = ''): Requisition => {
    const label = ROLES[get().role].label
    return { ...d, events: [...d.events, { t: tick(3), from, to, action, by: label, note }] }
  }

  /* --- reservation --- */
  const reserveFor = (d: Requisition) => {
    set(s => {
      const stock = s.stock.map(r => ({ ...r }))
      for (const l of d.lines) {
        const { lots } = fefo(stock, d.whFrom, l.item, l.approved)
        for (const a of lots) {
          const row = stock.find(r => r.wh === d.whFrom && r.item === l.item && r.lot === a.lot)
          if (row) row.reserved += a.qty
        }
      }
      return { stock }
    })
  }

  const unreserveFor = (d: Requisition) =>
    set(s => ({
      stock: s.stock.map(r =>
        r.wh === d.whFrom && d.lines.some(l => l.item === r.item) ? { ...r, reserved: 0 } : r),
    }))

  const moveStock = (wh: string, item: string, lot: string, exp: string, delta: number,
                     type: LedgerEntry['type'], ref: string) =>
    set(s => {
      const stock = s.stock.map(r => ({ ...r }))
      let row = stock.find(r => r.wh === wh && r.item === item && r.lot === lot)
      if (!row) { row = { wh, item, lot, exp, qty: 0, reserved: 0 }; stock.push(row) }
      row.qty += delta
      return {
        stock,
        ledger: [...s.ledger, { id: uid('l'), t: stamp(), wh, item, lot, delta, type, ref }],
      }
    })

  /* --- async sync job simulation --- */
  const startJob = (docNo: string, action: string, target: string, after: (d: Requisition) => void) => {
    const id = `TX-${get().jobSeq + 1}`
    set(s => ({
      jobSeq: s.jobSeq + 1,
      jobs: [{
        id, doc: docNo, action, target, status: 'QUEUED', attempt: 1, err: '',
        key: `${docNo.slice(-6)}:${action}:1`, t: stamp(),
      }, ...s.jobs],
    }))
    patchDoc(docNo, d => ({ ...d, sync: 'QUEUED' }))

    setTimeout(() => {
      set(s => ({ jobs: s.jobs.map(j => (j.id === id ? { ...j, status: 'SENDING' } : j)) }))
      patchDoc(docNo, d => ({ ...d, sync: 'SENDING' }))

      setTimeout(() => finishJob(id, after), 1200)
    }, 700)
  }

  const finishJob = (jobId: string, after: (d: Requisition) => void) => {
    const job = get().jobs.find(j => j.id === jobId)
    if (!job) return
    const doc = get().docs.find(d => d.no === job.doc)
    if (!doc) return

    const endpoint = job.target === 'HOSXP'
      ? 'POST /hosxp/transfer-out'
      : 'POST /pcu/transfer-in'
    const orgForLog = job.target === 'HOSXP' ? 'HOSP' : doc.org

    if (get().cfg.failNext) {
      set(s => ({
        cfg: { ...s.cfg, failNext: false },
        jobs: s.jobs.map(j => (j.id === jobId ? { ...j, status: 'FAILED', err: 'TIMEOUT_GATEWAY' } : j)),
      }))
      patchDoc(job.doc, d => ({ ...d, sync: 'FAILED' }))
      apiCall('OUTBOUND', orgForLog, endpoint, 504, job.key)
      toast(`${job.action} failed — retry from the Integration monitor`, 'danger')
      return
    }

    set(s => ({ jobs: s.jobs.map(j => (j.id === jobId ? { ...j, status: 'SYNCED', err: '' } : j)) }))
    patchDoc(job.doc, d => ({ ...d, sync: 'SYNCED' }))
    apiCall('OUTBOUND', orgForLog, endpoint, 200, job.key)

    const fresh = get().docs.find(d => d.no === job.doc)
    if (fresh) after(fresh)
  }

  const startDataJob = (label: string, target: string, org: string, after: () => void) => {
    const id = `TX-${get().jobSeq + 1}`
    const action = target === 'HOSXP' ? 'pull_item_master' : 'pull_local_items'
    const endpoint = target === 'HOSXP' ? 'GET /hosxp/item-master' : 'GET /pcu/local-items'
    const key = `${org}:${target === 'HOSXP' ? 'master' : 'items'}:1`

    set(s => ({
      jobSeq: s.jobSeq + 1,
      jobs: [{ id, doc: label, action, target, status: 'QUEUED', attempt: 1, err: '', key, t: stamp(), data: true }, ...s.jobs],
    }))

    setTimeout(() => {
      set(s => ({ jobs: s.jobs.map(j => (j.id === id ? { ...j, status: 'SENDING' } : j)) }))
      setTimeout(() => {
        if (get().cfg.failNext) {
          set(s => ({
            cfg: { ...s.cfg, failNext: false },
            jobs: s.jobs.map(j => (j.id === id ? { ...j, status: 'FAILED', err: 'CONN_REFUSED' } : j)),
          }))
          apiCall('INBOUND', org, endpoint, 504, key)
          toast('Connector unreachable — retry from the Integration monitor', 'danger')
          return
        }
        set(s => ({ jobs: s.jobs.map(j => (j.id === id ? { ...j, status: 'SYNCED' } : j)) }))
        apiCall('INBOUND', org, endpoint, 200, key)
        after()
      }, 1200)
    }, 700)
  }

  /* ---------------- initial data ---------------- */
  const seedDocs = (): Requisition[] => {
    const supply = SEED_SUPPLY
    const mk = (n: number, org: string, lines: DocLine[], note: string): Requisition => ({
      no: `REQ-BKN-2569-${String(n).padStart(6, '0')}`,
      org,
      to: supplyHospOf(supply, org) || ORGS[org].parent || 'HOSP',
      whFrom: supplyWhOf(supply, org) || 'WH-HOSP-01',
      whTo: ORGS[org].wh!,
      created: fmtStamp(START),
      state: 'DRAFT', review: 'PENDING_REVIEW', sync: 'NONE',
      issueMode: 'HOSXP', extRef: '', transit: 0, note, lines, events: [],
    })

    const d1 = mk(232, 'PCU01',
      [lineOf('PCM500', 500), lineOf('AMX500', 300), lineOf('ORS001', 200)],
      'รองรับคลินิกโรคเรื้อรังประจำเดือน')
    d1.state = 'REQUESTED'; d1.review = 'REVIEWED'; d1.sync = 'SYNCED'
    d1.events = [
      { t: '27/08/69 09:45', from: 'DRAFT', to: 'REQUESTED', action: 'submit', by: 'Inventory PCU', note: '' },
      { t: '27/08/69 10:12', from: 'REQUESTED', to: 'REQUESTED', action: 'mark_reviewed', by: 'Inventory Hospital', note: 'ตรวจการจับคู่ครบถ้วน' },
    ]

    const d2 = mk(233, 'PCU02', [lineOf('PCM500', 400), lineOf('ORS001', 150)], 'สต๊อกใกล้หมด')
    d2.state = 'REQUESTED'; d2.sync = 'SYNCED'
    d2.events = [{ t: '27/08/69 09:10', from: 'DRAFT', to: 'REQUESTED', action: 'submit', by: 'Inventory PCU', note: '' }]

    const d3 = mk(234, 'PCU01', [lineOf('NSS100', 60)], 'เติมสต๊อกสารน้ำ')
    d3.state = 'APPROVED'; d3.sync = 'SYNCED'; d3.lines[0].approved = 50
    d3.events = [
      { t: '26/08/69 14:20', from: 'DRAFT', to: 'REQUESTED', action: 'submit', by: 'Inventory PCU', note: '' },
      { t: '26/08/69 15:02', from: 'REQUESTED', to: 'APPROVED', action: 'approve', by: 'Inventory Hospital', note: 'ลดจำนวนตามสต๊อก' },
    ]

    const d4 = mk(235, 'PCU03', [lineOf('PCM500', 200)], '')

    /* ---- Historical volume ----
       A mid-size province runs a few hundred requisitions a year. These fill
       the register with realistic history so paging, filters and reports have
       something to work against. Deterministic (seeded LCG) so every reload,
       screenshot and test sees the same data. */
    let rnd = 20260827
    const rand = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]

    const ORG_IDS = ['PCU01', 'PCU02', 'PCU03', 'PCU04'] as const
    const ITEMS = ['PCM500', 'AMX500', 'ORS001', 'NSS100', 'GLVM'] as const
    const NOTES = [
      'เติมสต๊อกประจำเดือน', 'รองรับคลินิกโรคเรื้อรัง', 'สต๊อกใกล้หมด',
      'เตรียมออกหน่วยเชิงรุก', 'ทดแทนของหมดอายุ', 'รองรับผู้ป่วยเพิ่มขึ้น',
      'เบิกประจำสัปดาห์', 'สำรองช่วงวันหยุดยาว', '',
    ]
    const ACTORS: Record<string, string> = {
      submit: 'Inventory PCU', approve: 'Inventory Hospital',
      issue: 'Inventory Hospital', receive: 'Inventory PCU',
    }

    // Two-digit Buddhist-era stamp, matching fmtStamp's format.
    const stampOf = (daysAgo: number, h: number, mi: number) => {
      const d = new Date(START); d.setDate(d.getDate() - daysAgo); d.setHours(h, mi, 0, 0)
      return fmtStamp(d)
    }

    const history: Requisition[] = []
    // Walk backwards from the seeded documents so numbering stays sequential.
    for (let i = 0; i < 168; i++) {
      const n = 231 - i
      const daysAgo = 1 + Math.floor(Math.pow(i / 167, 1.7) * 240)
      const org = pick(ORG_IDS)
      const nLines = 1 + Math.floor(rand() * 4)
      const chosen = new Set<string>()
      while (chosen.size < nLines) chosen.add(pick(ITEMS))
      const lines = [...chosen].map(it => lineOf(it, (1 + Math.floor(rand() * 20)) * 10))

      const d = mk(n, org, lines, pick(NOTES))
      d.created = stampOf(daysAgo, 8 + Math.floor(rand() * 9), Math.floor(rand() * 60))

      // Older documents are further along; the newest are still in flight.
      const roll = rand()
      const state = daysAgo > 14
        ? (roll < 0.84 ? 'COMPLETED' : roll < 0.90 ? 'DISCREPANCY'
           : roll < 0.95 ? 'CANCELLED' : 'REJECTED')
        : daysAgo > 7
          ? (roll < 0.34 ? 'COMPLETED' : roll < 0.48 ? 'RECEIVED'
             : roll < 0.64 ? 'PARTIALLY_RECEIVED' : roll < 0.76 ? 'ISSUED'
             : roll < 0.84 ? 'APPROVED' : roll < 0.93 ? 'RETURNED' : 'REJECTED')
          : (roll < 0.18 ? 'PARTIALLY_ISSUED' : roll < 0.34 ? 'ISSUED'
             : roll < 0.58 ? 'APPROVED' : roll < 0.88 ? 'REQUESTED' : 'DRAFT')

      d.state = state as Requisition['state']
      d.review = state === 'DRAFT' ? 'PENDING_REVIEW' : 'REVIEWED'
      d.sync = state === 'DRAFT' ? 'NONE' : rand() < 0.04 ? 'FAILED' : 'SYNCED'

      // Quantities settle as a document advances through the workflow.
      const ISSUED_SET = ['ISSUED', 'PARTIALLY_ISSUED', 'RECEIVED', 'PARTIALLY_RECEIVED',
                          'COMPLETED', 'DISCREPANCY']
      // Lot codes per item, matching the opening-stock seed.
      const LOT_OF: Record<string, { lot: string; exp: string }[]> = {
        PCM500: [{ lot: 'A2410', exp: '31/10/70' }, { lot: 'B2501', exp: '31/01/71' }],
        AMX500: [{ lot: 'AM2504', exp: '30/04/70' }],
        ORS001: [{ lot: 'ORS2506', exp: '30/06/71' }],
        NSS100: [{ lot: 'NS2503', exp: '31/03/71' }],
        GLVM:   [{ lot: 'GL2412', exp: '31/12/70' }],
      }
      const RECEIVED_SET = ['RECEIVED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'DISCREPANCY']
      if (state !== 'DRAFT' && state !== 'REQUESTED') {
        for (const l of d.lines) {
          if (rand() < 0.25) l.approved = Math.max(10, Math.round(l.req * 0.8 / 10) * 10)
          if (ISSUED_SET.includes(state)) {
            l.issued = state === 'PARTIALLY_ISSUED' ? Math.round(l.approved * 0.6) : l.approved
            // FEFO would have split large draws across the two PCM500 lots.
            const lots = LOT_OF[l.item] ?? []
            if (lots.length > 1 && l.issued > 200) {
              const first = Math.round(l.issued * 0.7 / 10) * 10
              l.lots = [{ ...lots[0], qty: first }, { ...lots[1], qty: l.issued - first }]
            } else if (lots.length) {
              l.lots = [{ ...lots[0], qty: l.issued }]
            }
          }
          if (RECEIVED_SET.includes(state)) {
            l.received = state === 'PARTIALLY_RECEIVED' || state === 'DISCREPANCY'
              ? Math.round(l.issued * 0.75) : l.issued
          }
        }
      }
      if (state === 'ISSUED' || state === 'PARTIALLY_ISSUED')
        d.transit = d.lines.reduce((a, l) => a + l.issued - l.received, 0)
      if (state !== 'DRAFT') d.extRef = `REQ${n}:transfer_out:1`

      // Event trail matching the state the document reached.
      const trail: [string, string, string][] = [['DRAFT', 'REQUESTED', 'submit']]
      if (state !== 'REQUESTED' && state !== 'REJECTED' &&
          state !== 'RETURNED' && state !== 'CANCELLED')
        trail.push(['REQUESTED', 'APPROVED', 'approve'])
      if (ISSUED_SET.includes(state)) trail.push(['APPROVED', 'ISSUED', 'issue'])
      if (RECEIVED_SET.includes(state)) trail.push(['ISSUED', state, 'receive'])
      if (state === 'REJECTED') trail.push(['REQUESTED', 'REJECTED', 'reject'])
      if (state === 'RETURNED') trail.push(['REQUESTED', 'RETURNED', 'return'])
      if (state === 'CANCELLED') trail.push(['REQUESTED', 'CANCELLED', 'cancel'])

      d.events = state === 'DRAFT' ? [] : trail.map(([from, to, action], k) => ({
        t: stampOf(daysAgo - k * 0.4 < 0 ? 0 : Math.floor(daysAgo - k * 0.4), 9 + k, 15 * k % 60),
        from: from as Requisition['state'], to: to as Requisition['state'],
        action, by: ACTORS[action] ?? 'Inventory Hospital', note: '',
      }))

      history.push(d)
    }

    return [d1, d2, d3, d4, ...history]
  }

  const initialStock = (): StockRow[] => {
    const stock = SEED_STOCK.map(r => ({ ...r }))
    // Reserve against the pre-approved seed document (d3: NSS100 x50 from WH-HOSP-01)
    const { lots } = fefo(stock, 'WH-HOSP-01', 'NSS100', 50)
    for (const a of lots) {
      const row = stock.find(r => r.wh === 'WH-HOSP-01' && r.item === 'NSS100' && r.lot === a.lot)
      if (row) row.reserved += a.qty
    }
    return stock
  }

  /* Seed the integration monitor with a believable morning of traffic:
     completed transfers from the recent documents, one job stuck in the
     dead letter, and the API calls those exchanges would have produced. */
  const initialJobs = (): SyncJob[] => ([
    { id: 'JOB-000891', doc: 'REQ-BKN-2569-000227', action: 'transfer_in', target: 'PCU-CONN-02',
      status: 'SYNCED', attempt: 1, err: '', key: 'REQ227:transfer_in:1', t: '26/08/69 14:25' },
    { id: 'JOB-000890', doc: 'REQ-BKN-2569-000229', action: 'transfer_out', target: 'HOSXP',
      status: 'SYNCED', attempt: 1, err: '', key: 'REQ229:transfer_out:1', t: '26/08/69 16:24' },
    { id: 'JOB-000889', doc: 'REQ-BKN-2569-000223', action: 'transfer_in', target: 'PCU-CONN-01',
      status: 'SYNCED', attempt: 2, err: '', key: 'REQ223:transfer_in:2', t: '25/08/69 12:10' },
    { id: 'JOB-000888', doc: 'REQ-BKN-2569-000218', action: 'transfer_out', target: 'HOSXP',
      status: 'FAILED', attempt: 5, err: 'ETIMEDOUT: HOSxP ไม่ตอบภายใน 30 วิ',
      key: 'REQ218:transfer_out:5', t: '23/08/69 12:08' },
    { id: 'JOB-000887', doc: 'REQ-BKN-2569-000221', action: 'transfer_out', target: 'HOSXP',
      status: 'SYNCED', attempt: 1, err: '', key: 'REQ221:transfer_out:1', t: '24/08/69 09:48' },
    { id: 'JOB-000886', doc: 'REQ-BKN-2569-000211', action: 'transfer_in', target: 'PCU-CONN-04',
      status: 'SYNCED', attempt: 1, err: '', key: 'REQ211:transfer_in:1', t: '20/08/69 10:35' },
  ])

  const initialApiLog = (): ApiLogEntry[] => ([
    { id: uid('api'), t: '27/08/69 08:15', dir: 'OUTBOUND', org: 'HOSP',
      endpoint: 'GET /hosxp/item-master', code: 200, ms: 412, key: 'MASTER:pull:27' },
    { id: uid('api'), t: '27/08/69 08:20', dir: 'INBOUND', org: 'PCU01',
      endpoint: 'POST /connector/items', code: 200, ms: 188, key: 'PCU01:items:27' },
    { id: uid('api'), t: '26/08/69 16:24', dir: 'OUTBOUND', org: 'HOSP',
      endpoint: 'POST /hosxp/transfer-out', code: 200, ms: 264, key: 'REQ229:transfer_out:1' },
    { id: uid('api'), t: '26/08/69 14:25', dir: 'INBOUND', org: 'PCU02',
      endpoint: 'POST /connector/transfer-in', code: 200, ms: 145, key: 'REQ227:transfer_in:1' },
    { id: uid('api'), t: '25/08/69 12:09', dir: 'INBOUND', org: 'PCU01',
      endpoint: 'POST /connector/transfer-in', code: 409, ms: 96, key: 'REQ223:transfer_in:1' },
    { id: uid('api'), t: '25/08/69 12:10', dir: 'INBOUND', org: 'PCU01',
      endpoint: 'POST /connector/transfer-in', code: 200, ms: 152, key: 'REQ223:transfer_in:2' },
    { id: uid('api'), t: '23/08/69 12:08', dir: 'OUTBOUND', org: 'HOSP',
      endpoint: 'POST /hosxp/transfer-out', code: 500, ms: 30012, key: 'REQ218:transfer_out:5' },
    { id: uid('api'), t: '24/08/69 09:48', dir: 'OUTBOUND', org: 'HOSP',
      endpoint: 'POST /hosxp/transfer-out', code: 200, ms: 231, key: 'REQ221:transfer_out:1' },
    { id: uid('api'), t: '20/08/69 10:35', dir: 'INBOUND', org: 'PCU04',
      endpoint: 'POST /connector/transfer-in', code: 200, ms: 176, key: 'REQ211:transfer_in:1' },
  ])

  const initialNotifs = (): Notification[] => ([
    { id: uid('n'), t: fmtStamp(START), to: 'HOSP', text: 'Mapping ใหม่รออนุมัติจาก รพ.สต.โคกก่อง' },
    { id: uid('n'), t: fmtStamp(START), to: 'HOSP', text: 'ใบขอเบิกใหม่ REQ-BKN-2569-000233 จาก รพ.สต.หอคำ' },
    { id: uid('n'), t: fmtStamp(START), to: 'HOSP', text: 'ใบขอเบิกใหม่ REQ-BKN-2569-000232 จาก รพ.สต.โคกก่อง' },
  ])

  return {
    // BMS sees every menu and holds every permission, so the demo opens on the
    // fullest view of the system.
    role: 'BMS',
    signedIn: localStorage.getItem('io.session') === '1' || sessionStorage.getItem('io.session') === '1',
    lang: 'TH',
    theme: 'light',
    prefs: { ...DEFAULT_PREFS },
    profile: {
      name: 'อนงค์ สุริยาภรณ์', nameEn: 'Anong Suriyaporn',
      email: 'anong.s@bkn-pho.moph.go.th', phone: '08-1234-5678',
      avatar: '', twoFactor: false,
      notif: { inApp: true, email: false, approvals: true, syncFailed: true, lowStock: false, expiry: true },
    },
    sidebarCollapsed: false,

    clock: 0,
    seq: 235,
    jobSeq: 900,
    docs: seedDocs(),
    mappings: SEED_MAPPINGS.map(m => ({ ...m })),
    supply: SEED_SUPPLY.map(s => ({ ...s })),
    stock: initialStock(),
    ledger: [],
    jobs: initialJobs(),
    apiLog: initialApiLog(),
    notifs: initialNotifs(),
    cfg: { issueMode: 'HOSXP', forceReview: true, failNext: false, expiryAlert: 90 },
    whPatch: {},
    lastSync: {
      master: '27/08/69 08:15',
      local: { PCU01: '27/08/69 08:20', PCU02: '27/08/69 07:55', PCU03: '' },
    },
    toasts: [],

    setRole: r => set({ role: r }),
    signIn: (_user, remember) => {
      ;(remember ? localStorage : sessionStorage).setItem('io.session', '1')
      set({ signedIn: true })
    },
    signOut: () => {
      localStorage.removeItem('io.session'); sessionStorage.removeItem('io.session')
      set({ signedIn: false })
    },
    setLang: l => set({ lang: l }),
    setTheme: t => { document.documentElement.dataset.theme = t; set({ theme: t }) },
    setPref: (k, v) => {
      const prefs = { ...get().prefs, [k]: v }
      applyAppearance(prefs)
      set({ prefs, theme: resolveTheme(prefs.appearance) })
    },
    setProfile: patch => set(s => ({ profile: { ...s.profile, ...patch } })),
    toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    stamp, tick, toast, notify,
    dismissToast: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
    markNotifsRead: () => set(s => ({ notifs: s.notifs.map(n => ({ ...n, read: true })) })),

    /* ---------------- documents ---------------- */
    createDraft: org => {
      const wh = supplyWhOf(get().supply, org)
      if (!wh) {
        toast('This facility has no approved supply warehouse yet — set one in System settings', 'warn')
        return null
      }
      const no = `REQ-BKN-2569-${String(get().seq + 1).padStart(6, '0')}`
      const doc: Requisition = {
        no, org,
        to: supplyHospOf(get().supply, org) || ORGS[org].parent || 'HOSP',
        whFrom: wh, whTo: ORGS[org].wh!,
        created: stamp(), state: 'DRAFT', review: 'PENDING_REVIEW', sync: 'NONE',
        issueMode: get().cfg.issueMode, extRef: '', transit: 0, note: '',
        lines: [], events: [],
      }
      set(s => ({ seq: s.seq + 1, docs: [doc, ...s.docs] }))
      return no
    },

    addLine: (no, item) =>
      patchDoc(no, d => (d.lines.some(l => l.item === item) ? d : { ...d, lines: [...d.lines, lineOf(item, 0)] })),

    removeLine: (no, idx) =>
      patchDoc(no, d => ({ ...d, lines: d.lines.filter((_, i) => i !== idx) })),

    setLineQty: (no, idx, field, baseQty) =>
      patchDoc(no, d => ({
        ...d,
        lines: d.lines.map((l, i) => {
          if (i !== idx) return l
          const v = Math.max(0, Math.round(baseQty))
          return field === 'req' ? { ...l, req: v, approved: v } : { ...l, [field]: v }
        }),
      })),

    setNote: (no, note) => patchDoc(no, d => ({ ...d, note })),

    act: (no, action, payload) => {
      const s = get()
      const d = s.docs.find(x => x.no === no)
      if (!d) return

      const perm = ACTION_PERM[action] as Permission | undefined
      if (perm && !ROLES[s.role].can.includes(perm)) {
        toast(`${ROLES[s.role].label} has no permission for "${action}" (403)`, 'danger'); return
      }
      const from = ACTION_FROM[action]
      if (from && !from.includes(d.state)) {
        toast(`"${action}" is not allowed from ${d.state} — expected ${from.join(' or ')} (409)`, 'danger'); return
      }
      if (['QUEUED', 'SENDING'].includes(d.sync) && ['issue', 'hosxp_callback', 'receive'].includes(action)) {
        toast('A sync is already in flight — wait for it to finish', 'warn'); return
      }

      switch (action) {
        case 'submit': {
          const bad = d.lines.filter(l => !mapIsActive(s.mappings, d.org, l.item))
          if (!d.lines.length) { toast('Add at least one line before submitting', 'warn'); return }
          if (d.lines.some(l => l.req <= 0)) { toast('Every line needs a quantity greater than zero', 'warn'); return }
          if (bad.length) {
            toast(`Cannot submit — ${bad.length} line(s) are not ACTIVE: ${bad.map(l => M(l.item).code).join(', ')}`, 'danger'); return
          }
          patchDoc(no, doc => logEvent({ ...doc, state: 'REQUESTED', review: 'PENDING_REVIEW', sync: 'SYNCED' }, doc.state, 'REQUESTED', 'submit'))
          notify(d.to, `ใบขอเบิกใหม่ ${no}`)
          toast(`Submitted · ${no} → REQUESTED`, 'ok')
          break
        }
        case 'mark_reviewed':
          patchDoc(no, doc => logEvent({ ...doc, review: 'REVIEWED' }, 'REQUESTED', 'REQUESTED', 'mark_reviewed'))
          toast('Marked as reviewed', 'ok')
          break

        case 'approve': {
          if (s.cfg.forceReview && d.review !== 'REVIEWED') {
            toast('Approval blocked — this document must pass review first', 'warn'); return
          }
          if (d.lines.every(l => l.approved <= 0)) { toast('Approve at least one line', 'warn'); return }
          patchDoc(no, doc => logEvent({ ...doc, state: 'APPROVED', sync: 'SYNCED' }, 'REQUESTED', 'APPROVED', 'approve'))
          reserveFor(d)
          notify(d.org, `ใบขอเบิก ${no} ได้รับการอนุมัติ`)
          toast(`Approved · lots reserved for ${d.lines.reduce((a, l) => a + l.approved, 0)} units`, 'ok')
          break
        }
        case 'reject':
          patchDoc(no, doc => logEvent({ ...doc, state: 'REJECTED' }, 'REQUESTED', 'REJECTED', 'reject', payload || ''))
          notify(d.org, `ใบขอเบิก ${no} ไม่ได้รับอนุมัติ`)
          toast('Rejected — this is a terminal state', 'ok')
          break

        case 'return':
          patchDoc(no, doc => logEvent({ ...doc, state: 'RETURNED' }, 'REQUESTED', 'RETURNED', 'return', payload || ''))
          notify(d.org, `ใบขอเบิก ${no} ถูกส่งกลับให้แก้ไข`)
          toast('Returned for edit', 'ok')
          break

        case 'revise':
          patchDoc(no, doc => logEvent({ ...doc, state: 'DRAFT' }, 'RETURNED', 'DRAFT', 'revise'))
          toast('Back to draft — edit and submit again', 'ok')
          break

        case 'cancel':
          unreserveFor(d)
          patchDoc(no, doc => logEvent({ ...doc, state: 'CANCELLED' }, doc.state, 'CANCELLED', 'cancel'))
          toast('Document cancelled', 'ok')
          break

        case 'issue':
        case 'hosxp_callback': {
          const withLots = d.lines.map(l =>
            l.lots.length ? l : { ...l, lots: fefo(s.stock, d.whFrom, l.item, l.approved).lots })
          if (!withLots.some(l => l.lots.length)) { toast('Nothing to allocate — source stock is empty', 'warn'); return }
          patchDoc(no, doc => ({ ...doc, lines: withLots }))

          startJob(no, 'transfer_out', 'HOSXP', doc => {
            let transit = 0
            const lines = doc.lines.map(l => {
              const issued = l.lots.reduce((a, x) => a + x.qty, 0)
              transit += issued
              for (const x of l.lots) {
                moveStock(doc.whFrom, l.item, x.lot, x.exp, -x.qty, 'ISSUE', doc.no)
                set(st => ({
                  stock: st.stock.map(r =>
                    r.wh === doc.whFrom && r.item === l.item && r.lot === x.lot
                      ? { ...r, reserved: Math.max(0, r.reserved - x.qty) } : r),
                }))
              }
              return { ...l, issued }
            })
            const partial = lines.some(l => l.issued < l.approved)
            const nextState: DocState = partial ? 'PARTIALLY_ISSUED' : 'ISSUED'
            const extRef = `ISS-HOSXP-${920 + get().docs.filter(x => x.extRef).length + 1}`

            patchDoc(doc.no, cur => logEvent(
              { ...cur, lines, transit, extRef, state: nextState },
              cur.state, nextState, 'transfer_out', `เลขที่เอกสารจ่าย ${extRef}`))
            notify(doc.org, `จ่ายสินค้าแล้ว ${doc.no} · ${extRef}`)
            toast(`HOSxP accepted · ${extRef} · ${transit} units now in transit`, 'ok')
          })
          toast('transfer_out queued', 'info')
          break
        }

        case 'close_short':
          patchDoc(no, doc => logEvent({ ...doc, state: 'ISSUED' }, 'PARTIALLY_ISSUED', 'ISSUED', 'close_short', 'ปิดส่วนขาด'))
          toast('Shortfall closed → ISSUED', 'ok')
          break

        case 'receive': {
          if (d.lines.every(l => (l.received || 0) === 0)) { toast('Enter the received quantity first', 'warn'); return }
          startJob(no, 'transfer_in', 'PCU_CONNECTOR', doc => {
            let recv = 0
            for (const l of doc.lines) {
              let left = l.received || 0
              recv += left
              const src = l.lots.length ? l.lots : [{ lot: '-', exp: '-', qty: left }]
              for (const x of src) {
                const take = Math.min(left, x.qty)
                if (take > 0) { moveStock(doc.whTo, l.item, x.lot, x.exp, take, 'RECEIVE', doc.no); left -= take }
              }
            }
            const short = doc.lines.some(l => (l.received || 0) < l.issued)
            const transit = Math.max(0, doc.transit - recv)
            const nextState: DocState = short ? 'PARTIALLY_RECEIVED' : 'RECEIVED'

            patchDoc(doc.no, cur => logEvent({ ...cur, transit, state: nextState },
              cur.state, nextState, 'transfer_in', `รับจริง ${recv} หน่วย`))

            if (!short && transit === 0) {
              patchDoc(doc.no, cur => logEvent({ ...cur, state: 'COMPLETED' }, 'RECEIVED', 'COMPLETED', 'close', 'ปิด transit แล้ว'))
              notify(doc.to, `ปิดรายการเบิกจ่าย ${doc.no}`)
              notify(doc.org, `ปิดรายการเบิกจ่าย ${doc.no}`)
              toast('Receipt confirmed · transit cleared → COMPLETED', 'ok')
            } else {
              toast(`Short receipt · ${transit} units still in transit → ${nextState}`, 'warn')
            }
          })
          toast('transfer_in queued', 'info')
          break
        }

        case 'raise_discrepancy':
          patchDoc(no, doc => logEvent({ ...doc, state: 'DISCREPANCY' }, 'PARTIALLY_RECEIVED', 'DISCREPANCY', 'raise_discrepancy', payload || ''))
          notify('PROV', `พบส่วนต่างในเอกสาร ${no}`)
          toast('Discrepancy raised — a provincial admin will settle it', 'ok')
          break

        case 'settle':
          patchDoc(no, doc => logEvent({ ...doc, transit: 0, state: 'COMPLETED' }, 'DISCREPANCY', 'COMPLETED', 'settle', payload || 'ตัดสินยอดส่วนต่าง'))
          toast('Discrepancy settled → COMPLETED', 'ok')
          break

        default:
          toast(`Unknown action: ${action}`, 'danger')
      }
    },

    /* ---------------- mapping ---------------- */
    patchMapping: (idx, patch) =>
      set(s => ({
        mappings: s.mappings.map((m, i) => {
          if (i !== idx) return m
          const next = { ...m, ...patch }
          if (patch.item !== undefined) {
            if (next.state === 'UNMAPPED' && next.item) next.state = 'DRAFT'
            const choices = uomChoices(next.item)
            if (!next.localUom || !choices.includes(next.localUom)) {
              next.localUom = choices[0] ?? ''
              next.factor = 1
            }
          }
          return next
        }),
      })),

    proposeMapping: idx => {
      const s = get()
      const m = s.mappings[idx]
      if (!m) return
      if (!mappingReady(m)) { toast('Complete Master, unit and quantity first', 'warn'); return }
      if (s.mappings.some((x, i) => i !== idx && x.org === m.org && x.item === m.item && ['ACTIVE', 'PENDING_APPROVAL'].includes(x.state))) {
        toast('This Master is already mapped here (1 item : 1 Master)', 'danger'); return
      }
      set(st => ({
        mappings: st.mappings.map((x, i) =>
          i === idx ? { ...x, state: 'PENDING_APPROVAL' as const, proposedAt: stamp(), reason: undefined } : x),
      }))
      notify(supplyHospOf(s.supply, m.org) || ORGS[m.org].parent || 'HOSP', `Mapping ใหม่รออนุมัติ: ${m.local}`)
      toast(`Proposed ${m.local} — awaiting hospital approval`, 'ok')
    },

    proposeMappings: idxs => {
      const s = get()
      let ok = 0, skip = 0
      const next = s.mappings.map(m => ({ ...m }))
      for (const i of idxs) {
        const m = next[i]
        if (!m || !m.item || !m.localUom || !(m.factor >= 1)) { skip++; continue }
        if (next.some((x, j) => j !== i && x.org === m.org && x.item === m.item && ['ACTIVE', 'PENDING_APPROVAL'].includes(x.state))) { skip++; continue }
        m.state = 'PENDING_APPROVAL'; m.proposedAt = stamp(); m.reason = undefined; ok++
      }
      set({ mappings: next })
      if (ok) {
        const org = next[idxs[0]]?.org
        if (org) notify(supplyHospOf(s.supply, org) || ORGS[org].parent || 'HOSP', `เสนอ Mapping ${ok} รายการ`)
      }
      toast(ok ? `Proposed ${ok} item(s)${skip ? ` · skipped ${skip} incomplete` : ''}` : 'Nothing ready to propose', ok ? 'ok' : 'warn')
    },

    approveMapping: idx => {
      const m = get().mappings[idx]
      if (!m) return
      set(s => ({
        mappings: s.mappings.map((x, i) =>
          i === idx ? { ...x, state: 'ACTIVE' as const, reason: undefined, pendingReason: undefined } : x),
      }))
      notify(m.org, `Mapping ${m.local} ได้รับอนุมัติ`)
      toast(`Approved ${m.local} → ${m.item}`, 'ok')
    },

    rejectMapping: idx => {
      const m = get().mappings[idx]
      if (!m) return
      const reason = (m.pendingReason || '').trim()
      if (!reason) { toast('A reason is required to reject', 'warn'); return }
      set(s => ({
        mappings: s.mappings.map((x, i) =>
          i === idx ? { ...x, state: 'REJECTED' as const, reason, pendingReason: undefined } : x),
      }))
      notify(m.org, `Mapping ${m.local} ถูกปฏิเสธ: ${reason}`)
      toast(`Rejected ${m.local}`, 'ok')
    },

    approveMappings: idxs => {
      let ok = 0
      const next = get().mappings.map(m => ({ ...m }))
      for (const i of idxs) {
        const m = next[i]
        if (!m || m.state !== 'PENDING_APPROVAL') continue
        m.state = 'ACTIVE'; m.reason = undefined; ok++
        notify(m.org, `Mapping ${m.local} ได้รับอนุมัติ`)
      }
      set({ mappings: next })
      toast(ok ? `Approved ${ok} item(s)` : 'Nothing selected', ok ? 'ok' : 'warn')
    },

    pullLocalItems: org => {
      toast(`GET /pcu/local-items for ${ORGS[org].name} — queued`, 'info')
      startDataJob('LOCAL-ITEMS', 'PCU_CONNECTOR', org, () => {
        const inbox = CONNECTOR_INBOX[org] ?? []
        let added = 0
        const next = get().mappings.map(m => ({ ...m }))
        for (const [code, name] of inbox) {
          if (!next.some(m => m.org === org && m.local === code)) {
            next.push({ org, local: code, localName: name, item: '', localUom: '', factor: 1, state: 'UNMAPPED', src: 'API' })
            added++
          }
        }
        set(s => ({ mappings: next, lastSync: { ...s.lastSync, local: { ...s.lastSync.local, [org]: stamp() } } }))
        toast(added
          ? `Received ${added} item(s) from ${ORGS[org].name} — status Unmapped`
          : `Synced · no new items from ${ORGS[org].name}`, added ? 'ok' : 'info')
      })
    },

    pullMaster: () => {
      toast('GET /hosxp/item-master — queued', 'info')
      startDataJob('ITEM-MASTER', 'HOSXP', 'HOSP', () => {
        set(s => ({ lastSync: { ...s.lastSync, master: stamp() } }))
        toast(`Item Master received · ${MASTER.length} rows validated · 3 rows rejected`, 'ok')
      })
    },

    /* ---------------- supply / warehouse ---------------- */
    setSupplyWh: (org, wh) =>
      set(s => {
        const exists = s.supply.find(x => x.org === org)
        if (!wh) {
          return { supply: exists ? s.supply.map(x => (x.org === org ? { ...x, wh: '', state: 'DRAFT' as const } : x)) : s.supply }
        }
        return {
          supply: exists
            ? s.supply.map(x => (x.org === org ? { ...x, wh, state: 'DRAFT' as const } : x))
            : [...s.supply, { org, wh, state: 'DRAFT' as const }],
        }
      }),

    supplyAction: (org, action) => {
      const s = get()
      const sp = s.supply.find(x => x.org === org)
      if (!sp) { toast('Select a supply warehouse first', 'warn'); return }

      if (action === 'change') {
        set(st => ({ supply: st.supply.map(x => (x.org === org ? { ...x, state: 'DRAFT' as const } : x)) }))
        toast('Pick a new warehouse, then request approval', 'info'); return
      }
      if (action === 'propose') {
        if (!sp.wh) { toast('Select a supply warehouse first', 'warn'); return }
        set(st => ({ supply: st.supply.map(x => (x.org === org ? { ...x, state: 'PENDING_APPROVAL' as const } : x)) }))
        notify(WAREHOUSES[sp.wh].org, `${ORGS[org].name} ขอใช้ ${WAREHOUSES[sp.wh].name} เป็นคลังต้นทาง`)
        toast(`Request sent to ${ORGS[WAREHOUSES[sp.wh].org].name}`, 'ok'); return
      }
      if (action === 'approve') {
        set(st => ({
          supply: st.supply.map(x =>
            x.org === org ? { ...x, state: 'ACTIVE' as const } : x),
        }))
        notify(org, `อนุมัติให้เบิกจาก ${WAREHOUSES[sp.wh].name} แล้ว`)
        toast(`Approved · ${ORGS[org].name} → ${WAREHOUSES[sp.wh].name}`, 'ok'); return
      }
      set(st => ({ supply: st.supply.map(x => (x.org === org ? { ...x, state: 'REJECTED' as const } : x)) }))
      notify(org, 'คำขอใช้คลังต้นทางถูกปฏิเสธ')
      toast('Request rejected', 'ok')
    },

    whAction: (wh, action) => {
      if (action === 'propose') {
        const used = Object.values(WAREHOUSES).map(w => w.ext).filter(Boolean)
        const free = ['HOSXP-WH-103', 'HOSXP-WH-104', 'HOSXP-WH-105'].find(c => !used.includes(c))
        if (!free) { toast('No free code left — the mapping is strictly 1:1', 'danger'); return }
        WAREHOUSES[wh].ext = free
        WAREHOUSES[wh].mapState = 'PENDING_APPROVAL'
        notify('HOSP', `Warehouse mapping ใหม่รออนุมัติ: ${wh}`)
        toast(`Linked ${wh} → ${free} · awaiting approval`, 'ok')
      } else {
        WAREHOUSES[wh].mapState = 'ACTIVE'
        toast(`Warehouse mapping ${wh} is now ACTIVE`, 'ok')
      }
      set(s => ({ whPatch: { ...s.whPatch, [wh]: { ext: WAREHOUSES[wh].ext, mapState: WAREHOUSES[wh].mapState } } }))
      // Nudge a real value: writing clock back unchanged is a no-op to
      // Zustand, so subscribers never hear about the WAREHOUSES mutation.
      set(s => ({ clock: s.clock + 1 }))
    },

    /* ---------------- stock ---------------- */
    adjustStock: (wh, item, lot, delta) => {
      const row = get().stock.find(r => r.wh === wh && r.item === item && r.lot === lot)
      moveStock(wh, item, lot, row?.exp ?? '-', delta, 'ADJUST', `ADJ-${stamp()}`)
      toast(`Adjusted ${delta > 0 ? '+' : ''}${delta} · ${M(item).code} @ ${WAREHOUSES[wh].name}`, 'ok')
    },

    /* ---------------- integration ---------------- */
    retryJob: id => {
      const job = get().jobs.find(j => j.id === id)
      if (!job) return
      const attempt = job.attempt + 1
      set(s => ({
        jobs: s.jobs.map(j =>
          j.id === id ? { ...j, attempt, key: j.key.replace(/:\d+$/, `:${attempt}`), status: 'SENDING', err: '' } : j),
      }))

      if (job.data) {
        setTimeout(() => {
          set(s => ({ jobs: s.jobs.map(j => (j.id === id ? { ...j, status: 'SYNCED' } : j)) }))
          apiCall('INBOUND', 'HOSP',
            job.action === 'pull_item_master' ? 'GET /hosxp/item-master' : 'GET /pcu/local-items',
            200, job.key.replace(/:\d+$/, `:${attempt}`))
          toast(`Reference data synced (attempt ${attempt})`, 'ok')
        }, 1200)
        toast(`Retrying ${job.action} (attempt ${attempt})`, 'info')
        return
      }

      patchDoc(job.doc, d => ({ ...d, sync: 'SENDING' }))
      setTimeout(() => finishJob(id, doc => {
        toast(`${job.action} succeeded for ${doc.no}`, 'ok')
      }), 1200)
      toast(`Retrying ${job.action} (attempt ${attempt}) · same idempotency key`, 'info')
    },

    setCfg: (k, v) => {
      set(s => ({ cfg: { ...s.cfg, [k]: v } }))
      toast(`${String(k)} = ${String(v)}`, 'info')
    },

    resetData: () => {
      Object.assign(WAREHOUSES['WH-PCU-02'], { mapState: 'PENDING_APPROVAL', ext: 'HOSXP-WH-102' })
      Object.assign(WAREHOUSES['WH-PCU-03'], { mapState: 'DRAFT', ext: '' })
      set({
        whPatch: {},
        clock: 0, seq: 235, jobSeq: 900,
        docs: seedDocs(),
        mappings: SEED_MAPPINGS.map(m => ({ ...m })),
        supply: SEED_SUPPLY.map(s => ({ ...s })),
        stock: initialStock(),
        ledger: [], jobs: [], apiLog: [],
        notifs: initialNotifs(),
        cfg: { issueMode: 'HOSXP', forceReview: true, failNext: false, expiryAlert: 90 },
      })
      toast('Sample data reset', 'ok')
    },
  }
}, {
  /* Saved so a reload continues where the user left off. Bump `version` when
     the shape changes; an old payload is dropped rather than half-read. */
  name: 'io.state',
  version: 1,
  storage: createJSONStorage(() => localStorage),
  partialize: s => ({
    role: s.role, lang: s.lang, prefs: s.prefs, profile: s.profile,
    sidebarCollapsed: s.sidebarCollapsed,
    clock: s.clock, seq: s.seq, jobSeq: s.jobSeq,
    docs: s.docs, mappings: s.mappings, supply: s.supply, stock: s.stock,
    ledger: s.ledger, jobs: s.jobs, apiLog: s.apiLog, notifs: s.notifs,
    cfg: s.cfg, lastSync: s.lastSync, whPatch: s.whPatch,
  }) as unknown as State,
  onRehydrateStorage: () => (state, error) => {
    if (error || !state) return
    /* Appearance lives on <html>, and the warehouse diff on the seed object —
       neither is React state, so both are replayed by hand after a reload.
       A payload written by an older build can be missing either, so both are
       defaulted: a stale save must never blank the app. */
    const prefs = { ...DEFAULT_PREFS, ...(state.prefs ?? {}) }
    state.prefs = prefs
    applyAppearance(prefs)
    state.theme = resolveTheme(prefs.appearance)
    for (const [wh, patch] of Object.entries(state.whPatch ?? {})) {
      if (WAREHOUSES[wh]) Object.assign(WAREHOUSES[wh], patch)
    }
  },
}))

/* ---------------- Derived selectors ---------------- */
export const useRole = () => useStore(s => ROLES[s.role])
export const useCan = (p: Permission) => useStore(s => ROLES[s.role].can.includes(p))
export const useAllowed = (v: ViewId) => useStore(s => ROLES[s.role].menu.includes(v))

/** Documents visible under the active role's scope. */
export function visibleDocs(docs: Requisition[], roleId: RoleId): Requisition[] {
  const r = ROLES[roleId]
  if (r.scope === 'ALL' || r.scope === 'PROVINCE') return docs
  if (r.scope === 'OWN_ORG') return docs.filter(d => d.org === r.org)
  return docs.filter(d => d.to === r.org)
}

export const useVisibleDocs = () =>
  useStore(s => visibleDocs(s.docs, s.role))

export const supplyWhFor = (supply: SupplyLink[], org: string) => supplyWhOf(supply, org)
export const supplyHospFor = (supply: SupplyLink[], org: string) => supplyHospOf(supply, org)
export const supplyLinkFor = (supply: SupplyLink[], org: string) => supplyOf(supply, org)

/** PCU facilities whose mapping requests this role may approve. */
export function approvableOrgs(roleId: RoleId, supply: SupplyLink[]): string[] {
  const r = ROLES[roleId]
  return Object.keys(ORGS).filter(o =>
    ORGS[o].type === 'PCU' &&
    (r.scope === 'ALL' || r.scope === 'PROVINCE' ||
     supplyHospOf(supply, o) === r.org || ORGS[o].parent === r.org))
}

export const hospitalWarehouses = () =>
  Object.keys(WAREHOUSES).filter(w => ORGS[WAREHOUSES[w].org].type === 'HOSPITAL')

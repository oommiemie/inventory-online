/* ==========================================================================
   Inventory Online · Domain types
   ========================================================================== */

export type RoleId = 'INVENTORY_PCU' | 'INVENTORY_HOSPITAL' | 'PROVINCIAL_ADMIN' | 'BMS'
export type Scope = 'OWN_ORG' | 'CHILD_ORGS' | 'PROVINCE' | 'ALL'
export type OrgType = 'PROVINCE' | 'HOSPITAL' | 'PCU'

export type Permission =
  | 'req.create' | 'req.submit' | 'req.cancel' | 'req.review' | 'req.approve'
  | 'req.reject' | 'req.return' | 'req.close_short' | 'req.issue' | 'req.receive'
  | 'req.settle' | 'stock.adjust' | 'map.view' | 'map.approve' | 'map.propose'
  | 'master.edit' | 'monitor.view' | 'monitor.retry' | 'sync.override'
  | 'report.own' | 'report.child' | 'report.province'
  | 'settings.users' | 'settings.connector'

export type ViewId =
  | 'dashboard' | 'requisitions' | 'review' | 'issue' | 'receive'
  | 'stock' | 'matching' | 'mapapprove' | 'reference' | 'monitor'
  | 'reports' | 'settings'

export interface Role {
  id: RoleId
  label: string
  labelTh: string
  org: string
  scope: Scope
  menu: ViewId[]
  can: Permission[]
}

export interface Org {
  id: string
  name: string
  nameEn: string
  sub: string
  subEn: string
  type: OrgType
  parent: string | null
  wh?: string
}

export type MapState = 'ACTIVE' | 'PENDING_APPROVAL' | 'DRAFT' | 'REJECTED' | 'INACTIVE' | 'UNMAPPED'

/** A main store holds the organisation's stock; a sub-store hangs off one
 *  main store (`parent`) and is where the goods are actually picked from. */
export type WhKind = 'MAIN' | 'SUB'

export interface Warehouse {
  id: string
  name: string
  nameEn: string
  org: string
  ext: string
  mapState: MapState
  kind: WhKind
  /** Set on sub-stores: the main store this one belongs to. */
  parent?: string
}

export interface MasterItem {
  code: string
  name: string
  th: string
  uom: string
  uomEn: string
  cat: string
  catEn: string
  price: number
}

/** One requisition unit, named on both sides of the mapping. `factor` is how
 *  many base units that unit holds, recorded separately because the two
 *  organisations can count the same unit differently. */
export interface MappedUom {
  uom: string; factor: number
  hospUom: string; hospFactor: number
}

export interface Mapping {
  org: string
  local: string
  localName: string
  item: string
  /** The facility's primary requisition unit and its quantity in base units. */
  localUom: string
  factor: number
  /** The hospital's unit for the same line. */
  hospUom: string
  hospFactor: number
  /** Further units the item is ordered in, each named on both sides. */
  extraUoms?: MappedUom[]
  state: MapState
  reason?: string
  pendingReason?: string
  proposedAt?: string
  src?: 'API' | 'MANUAL'
}

/** The requisition route a facility uses, read left to right:
 *  facility -> localWh (its own main store) -> subWh (the hospital sub-store
 *  goods are picked from) -> wh (that sub-store's main store) -> its owner. */
export interface SupplyLink {
  org: string
  wh: string
  state: MapState
  /** The facility's own main store that receives the goods. */
  localWh?: string
  /** The hospital sub-store tied to `wh`. */
  subWh?: string
}

export interface StockRow {
  wh: string
  item: string
  lot: string
  exp: string
  qty: number
  reserved: number
}

export type LedgerType = 'ISSUE' | 'RECEIVE' | 'ADJUST' | 'OPENING'

export interface LedgerEntry {
  id: string
  t: string
  wh: string
  item: string
  lot: string
  delta: number
  type: LedgerType
  ref: string
}

export type DocState =
  | 'DRAFT' | 'REQUESTED' | 'APPROVED' | 'ISSUED' | 'RECEIVED' | 'COMPLETED'
  | 'RETURNED' | 'REJECTED' | 'CANCELLED'
  | 'PARTIALLY_ISSUED' | 'PARTIALLY_RECEIVED' | 'DISCREPANCY'

export type SyncState = 'NONE' | 'QUEUED' | 'SENDING' | 'SYNCED' | 'FAILED' | 'MANUAL_OVERRIDE'
export type ReviewState = 'PENDING_REVIEW' | 'REVIEWED'
export type IssueMode = 'PORTAL' | 'HOSXP'

export interface LotAlloc { lot: string; exp: string; qty: number }

export interface DocLine {
  item: string
  req: number        // requested, in BASE uom
  approved: number   // approved, in BASE uom
  issued: number
  received: number
  lots: LotAlloc[]
}

export interface DocEvent {
  t: string
  from: DocState | ''
  to: DocState | ''
  action: string
  by: string
  note?: string
}

export interface Requisition {
  no: string
  org: string
  to: string
  whFrom: string
  whTo: string
  created: string
  state: DocState
  review: ReviewState
  sync: SyncState
  issueMode: IssueMode
  extRef: string
  transit: number
  note: string
  lines: DocLine[]
  events: DocEvent[]
}

export type JobStatus = 'QUEUED' | 'SENDING' | 'SYNCED' | 'FAILED'

export interface SyncJob {
  id: string
  doc: string
  action: string
  target: string
  status: JobStatus
  attempt: number
  err: string
  key: string
  t: string
  data?: boolean
}

export interface ApiLogEntry {
  id: string
  t: string
  dir: 'INBOUND' | 'OUTBOUND'
  org: string
  endpoint: string
  code: number
  ms: number
  key: string
}

export interface Notification {
  id: string
  t: string
  to: string
  text: string
  read?: boolean
}

export interface AppConfig {
  issueMode: IssueMode
  forceReview: boolean
  failNext: boolean
  expiryAlert: number
}

export type Lang = 'TH' | 'EN'
export type Theme = 'light' | 'dark'

/* Signed-in user's own account details (prototype: kept in memory). */
export interface Profile {
  name: string
  nameEn: string
  email: string
  phone: string
  /** Data URL of an uploaded photo; empty = bundled artwork. */
  avatar: string
  twoFactor: boolean
  notif: {
    inApp: boolean; email: boolean            /* channels */
    approvals: boolean; syncFailed: boolean   /* events */
    lowStock: boolean; expiry: boolean
  }
}

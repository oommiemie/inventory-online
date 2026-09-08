import type {
  Org, Warehouse, MasterItem, Role, RoleId, Mapping, SupplyLink, StockRow,
} from '@/types'

/* ---------------- Roles & permission matrix ---------------- */
/* `menu` is the whole story on visibility: a screen appears for a role only if
   it is listed here. "ผูกกับ Master" is a sub-district task, so only the PCU
   role carries it — a new role gets it by adding 'matching' to its list. */
export const ROLES: Record<RoleId, Role> = {
  INVENTORY_PCU: {
    id: 'INVENTORY_PCU', label: 'Inventory PCU', labelTh: 'เจ้าหน้าที่คลัง รพ.สต.',
    org: 'PCU01', scope: 'OWN_ORG',
    menu: ['dashboard', 'requisitions', 'receive', 'stock', 'matching', 'reference', 'reports', 'settings'],
    can: ['req.create', 'req.submit', 'req.cancel', 'req.receive', 'stock.adjust',
          'map.propose', 'map.view', 'report.own'],
  },
  INVENTORY_HOSPITAL: {
    id: 'INVENTORY_HOSPITAL', label: 'Inventory Hospital', labelTh: 'เจ้าหน้าที่คลังโรงพยาบาล',
    org: 'HOSP', scope: 'CHILD_ORGS',
    menu: ['dashboard', 'requisitions', 'review', 'issue', 'stock', 'mapapprove', 'reference', 'monitor', 'reports', 'settings'],
    can: ['req.review', 'req.approve', 'req.reject', 'req.return', 'req.close_short',
          'req.issue', 'stock.adjust', 'map.view', 'map.approve', 'master.edit',
          'monitor.view', 'report.child'],
  },
  PROVINCIAL_ADMIN: {
    id: 'PROVINCIAL_ADMIN', label: 'Provincial Admin', labelTh: 'ผู้ดูแลระดับจังหวัด',
    org: 'PROV', scope: 'PROVINCE',
    menu: ['dashboard', 'requisitions', 'review', 'issue', 'receive', 'stock', 'mapapprove', 'reference', 'monitor', 'reports', 'settings'],
    can: ['req.review', 'req.approve', 'req.reject', 'req.return', 'req.close_short',
          'req.cancel', 'req.settle', 'req.issue', 'req.receive', 'stock.adjust',
          'map.view', 'map.approve', 'map.propose', 'master.edit', 'monitor.view',
          'monitor.retry', 'sync.override', 'report.own', 'report.child',
          'report.province', 'settings.users'],
  },
  BMS: {
    id: 'BMS', label: 'BMS Group', labelTh: 'ผู้ดูแลระบบส่วนกลาง',
    org: 'BMS', scope: 'ALL',
    menu: ['dashboard', 'requisitions', 'review', 'issue', 'receive', 'stock', 'mapapprove', 'reference', 'monitor', 'reports', 'settings'],
    can: ['req.create', 'req.submit', 'req.cancel', 'req.review', 'req.approve',
          'req.reject', 'req.return', 'req.close_short', 'req.issue', 'req.receive',
          'req.settle', 'stock.adjust', 'map.view', 'map.approve', 'map.propose',
          'master.edit', 'monitor.view', 'monitor.retry', 'sync.override',
          'report.own', 'report.child', 'report.province',
          'settings.users', 'settings.connector'],
  },
}

/* ---------------- Organisations ---------------- */
export const ORGS: Record<string, Org> = {
  PROV:  { id:'PROV',  name:'สำนักงานสาธารณสุขจังหวัดบึงกาฬ', nameEn:'Bueng Kan Provincial Health Office', sub:'ระดับจังหวัด', subEn:'Province level', type:'PROVINCE', parent:null },
  BMS:   { id:'BMS',   name:'BMS · ผู้ดูแลระบบ', nameEn:'BMS · System Administrator', sub:'เห็นทุกหน่วยงานและทุกเมนู', subEn:'Sees all organizations and menus', type:'PROVINCE', parent:null },
  HOSP:  { id:'HOSP',  name:'โรงพยาบาลบึงกาฬ', nameEn:'Bueng Kan Hospital', sub:'โรงพยาบาลแม่ข่าย', subEn:'Node hospital', type:'HOSPITAL', parent:'PROV', wh:'WH-HOSP-01' },
  HOSP2: { id:'HOSP2', name:'โรงพยาบาลเซกา', nameEn:'Seka Hospital', sub:'โรงพยาบาลแม่ข่าย', subEn:'Node hospital', type:'HOSPITAL', parent:'PROV', wh:'WH-HOSP-02' },
  PCU01: { id:'PCU01', name:'รพ.สต.โคกก่อง', nameEn:'Khok Kong HPH', sub:'หน่วยบริการลูกข่าย', subEn:'Sub-district health promoting hospital', type:'PCU', parent:'HOSP', wh:'WH-PCU-01' },
  PCU02: { id:'PCU02', name:'รพ.สต.หอคำ', nameEn:'Ho Kham HPH', sub:'หน่วยบริการลูกข่าย', subEn:'Sub-district health promoting hospital', type:'PCU', parent:'HOSP', wh:'WH-PCU-02' },
  PCU03: { id:'PCU03', name:'รพ.สต.วิศิษฐ์', nameEn:'Wisit HPH', sub:'หน่วยบริการลูกข่าย', subEn:'Sub-district health promoting hospital', type:'PCU', parent:'HOSP', wh:'WH-PCU-03' },
  PCU04: { id:'PCU04', name:'รพ.สต.ซ่อมกอก', nameEn:'Som Kok HPH', sub:'หน่วยบริการลูกข่าย', subEn:'Sub-district health promoting hospital', type:'PCU', parent:'HOSP2', wh:'WH-PCU-04' },
}

/* ---------------- Warehouses ---------------- */
export const WAREHOUSES: Record<string, Warehouse> = {
  'WH-HOSP-01':  { id:'WH-HOSP-01',  name:'คลังเวชภัณฑ์ รพ.บึงกาฬ', nameEn:'Bueng Kan Hospital Medical Supply Store', org:'HOSP',  ext:'HOSXP-WH-001', mapState:'ACTIVE' },
  'WH-HOSP-01B': { id:'WH-HOSP-01B', name:'คลังยา รพ.บึงกาฬ', nameEn:'Bueng Kan Hospital Drug Store', org:'HOSP', ext:'HOSXP-WH-002', mapState:'ACTIVE' },
  'WH-HOSP-02':  { id:'WH-HOSP-02',  name:'คลังเวชภัณฑ์ รพ.เซกา', nameEn:'Seka Hospital Medical Supply Store', org:'HOSP2', ext:'SEKA-WH-001', mapState:'ACTIVE' },
  'WH-PCU-01':   { id:'WH-PCU-01',   name:'คลังใหญ่ รพ.สต.โคกก่อง', nameEn:'Khok Kong HPH Main Store', org:'PCU01', ext:'HOSXP-WH-101', mapState:'ACTIVE' },
  'WH-PCU-02':   { id:'WH-PCU-02',   name:'คลังใหญ่ รพ.สต.หอคำ', nameEn:'Ho Kham HPH Main Store', org:'PCU02', ext:'HOSXP-WH-102', mapState:'PENDING_APPROVAL' },
  'WH-PCU-03':   { id:'WH-PCU-03',   name:'คลังใหญ่ รพ.สต.วิศิษฐ์', nameEn:'Wisit HPH Main Store', org:'PCU03', ext:'', mapState:'DRAFT' },
  'WH-PCU-04':   { id:'WH-PCU-04',   name:'คลังใหญ่ รพ.สต.ซ่อมกอก', nameEn:'Som Kok HPH Main Store', org:'PCU04', ext:'HOSXP-WH-401', mapState:'ACTIVE' },
}

/* ---------------- Item master ---------------- */
export const MASTER: MasterItem[] = [
  { code:'PCM500', name:'Paracetamol 500 mg tablet',  th:'พาราเซตามอล 500 มก.', uom:'เม็ด',    uomEn:'tablet',  cat:'ยาสามัญ',        catEn:'General drug',    price:0.35 },
  { code:'AMX500', name:'Amoxicillin 500 mg capsule', th:'อะม็อกซิซิลลิน 500 มก.', uom:'แคปซูล', uomEn:'capsule', cat:'ยาปฏิชีวนะ',     catEn:'Antibiotic',      price:1.20 },
  { code:'ORS001', name:'Oral rehydration salts',     th:'ผงเกลือแร่',           uom:'ซอง',    uomEn:'sachet',  cat:'เวชภัณฑ์',        catEn:'Medical supply',  price:2.50 },
  { code:'NSS100', name:'Normal saline 100 ml',       th:'น้ำเกลือ 100 มล.',      uom:'ขวด',    uomEn:'bottle',  cat:'สารน้ำ',          catEn:'IV fluid',        price:14.00 },
  { code:'GLVM',   name:'Examination glove (M)',      th:'ถุงมือตรวจโรค ไซส์ M',  uom:'กล่อง',  uomEn:'box',     cat:'วัสดุการแพทย์',   catEn:'Medical material',price:120.00 },
]

/** Units a facility may requisition each master item in. */
export const UOM_CHOICES: Record<string, string[]> = {
  PCM500: ['เม็ด', 'แผง', 'กล่อง', 'กระปุก'],
  AMX500: ['แคปซูล', 'แผง', 'กระปุก'],
  ORS001: ['ซอง', 'กล่อง'],
  NSS100: ['ขวด', 'ลัง'],
  GLVM:   ['กล่อง', 'ลัง'],
}

/* ---------------- Item mappings (local code -> master) ---------------- */
/* Units are named on both sides: what the facility orders in, and what the
   hospital issues in. `factor` is that unit's size in base units. */
export const SEED_MAPPINGS: Mapping[] = [
  { org:'PCU01', local:'P001', localName:'พาราเซตามอล 500 มก.', item:'PCM500',
    localUom:'กระปุก', factor:200, hospUom:'กระปุก', hospFactor:200, state:'ACTIVE',
    extraUoms:[
      { uom:'เม็ด',   factor:1,    hospUom:'เม็ด',   hospFactor:1 },
      { uom:'กล่อง',  factor:1000, hospUom:'กล่อง',  hospFactor:1000 },
    ] },
  { org:'PCU01', local:'A011', localName:'อะม็อกซี่ 500',        item:'AMX500',
    localUom:'แผง',   factor:10,  hospUom:'แผง',   hospFactor:10,  state:'ACTIVE' },
  { org:'PCU01', local:'N020', localName:'น้ำเกลือเล็ก',          item:'NSS100',
    localUom:'ขวด',   factor:1,   hospUom:'ขวด',   hospFactor:1,   state:'ACTIVE' },
  { org:'PCU01', local:'O055', localName:'ผงเกลือแร่',            item:'ORS001',
    localUom:'กล่อง', factor:50,  hospUom:'กล่อง', hospFactor:50,  state:'PENDING_APPROVAL' },
  { org:'PCU01', local:'G100', localName:'ถุงมือตรวจ M',          item:'GLVM',
    localUom:'ลัง',   factor:12,  hospUom:'ลัง',   hospFactor:12,  state:'DRAFT' },
  { org:'PCU02', local:'PA01', localName:'พารา 500',              item:'PCM500',
    localUom:'กล่อง', factor:500, hospUom:'กล่อง', hospFactor:500, state:'ACTIVE' },
  { org:'PCU02', local:'OR02', localName:'ORS',                   item:'ORS001',
    localUom:'ซอง',   factor:1,   hospUom:'ซอง',   hospFactor:1,   state:'REJECTED', reason:'รหัสซ้ำกับ OR01' },
  { org:'PCU01', local:'S082', localName:'ชุดทำแผลกลาง',          item:'',
    localUom:'', factor:1, hospUom:'', hospFactor:1, state:'UNMAPPED' },
  { org:'PCU01', local:'V204', localName:'วิตามินบีรวม',           item:'',
    localUom:'', factor:1, hospUom:'', hospFactor:1, state:'UNMAPPED' },
  { org:'PCU01', local:'S090', localName:'ชุดทำแผลเล็ก',          item:'',
    localUom:'', factor:1, hospUom:'', hospFactor:1, state:'UNMAPPED', src:'API' },
  { org:'PCU01', local:'B012', localName:'เบตาดีน 15 มล.',        item:'',
    localUom:'', factor:1, hospUom:'', hospFactor:1, state:'UNMAPPED', src:'API' },
  { org:'PCU02', local:'NS10', localName:'น้ำเกลือ 100',           item:'',
    localUom:'', factor:1, hospUom:'', hospFactor:1, state:'UNMAPPED' },
]

/** Items waiting at each connector, revealed by "pull local items". */
export const CONNECTOR_INBOX: Record<string, [string, string][]> = {
  PCU01: [['S090', 'ชุดทำแผลเล็ก'], ['B012', 'เบตาดีน 15 มล.']],
  PCU02: [['GL05', 'ถุงมือตรวจ M']],
  PCU03: [['PA10', 'พารา 500'], ['OR11', 'ผงเกลือแร่'], ['NS12', 'น้ำเกลือ 100']],
}

/* ---------------- Supply links (PCU -> hospital warehouse) ---------------- */
export const SEED_SUPPLY: SupplyLink[] = [
  { org:'PCU01', wh:'WH-HOSP-01',  state:'ACTIVE' },
  { org:'PCU02', wh:'WH-HOSP-01',  state:'ACTIVE' },
  { org:'PCU03', wh:'WH-HOSP-01B', state:'PENDING_APPROVAL' },
  { org:'PCU04', wh:'WH-HOSP-02',  state:'ACTIVE' },
]

/* ---------------- Opening stock ---------------- */
const s = (wh:string, item:string, lot:string, exp:string, qty:number): StockRow =>
  ({ wh, item, lot, exp, qty, reserved: 0 })

export const SEED_STOCK: StockRow[] = [
  s('WH-HOSP-01','PCM500','A2410','31/10/70',12480),
  s('WH-HOSP-01','PCM500','B2501','31/01/71',3600),
  s('WH-HOSP-01','AMX500','AM2504','30/04/70',3420),
  s('WH-HOSP-01','ORS001','ORS2506','30/06/71',1850),
  s('WH-HOSP-01','NSS100','NS2503','31/03/71',940),
  s('WH-HOSP-01','GLVM','GL2412','31/12/70',260),
  s('WH-PCU-01','PCM500','A2410','31/10/70',240),
  s('WH-PCU-01','AMX500','AM2504','30/04/70',96),
  s('WH-PCU-01','ORS001','ORS2506','30/06/71',44),
  s('WH-PCU-02','PCM500','A2410','31/10/70',180),
  s('WH-HOSP-01B','PCM500','C2502','28/02/71',5200),
  s('WH-HOSP-01B','AMX500','AM2601','31/01/71',2100),
  s('WH-HOSP-02','PCM500','S2411','30/11/70',7800),
  s('WH-HOSP-02','ORS001','SO2505','31/05/71',1200),
  s('WH-PCU-04','PCM500','S2411','30/11/70',150),
  /* Older lots kept for the expiry report: one already past date, the rest
     inside the 30 / 60 / 90-day alert bands. */
  s('WH-HOSP-01','PCM500','A2312','31/07/69',320),
  s('WH-PCU-01','PCM500','A2312','31/07/69',20),
  s('WH-HOSP-01','AMX500','AM2508','15/09/69',180),
  s('WH-HOSP-02','PCM500','S2309','20/09/69',240),
  s('WH-HOSP-01B','PCM500','C2310','20/10/69',600),
  s('WH-HOSP-01','ORS001','ORS2411','15/11/69',150),
]

/* ---------------- Reorder points ---------------- */
export const REORDER: Record<string, Record<string, number>> = {
  'WH-HOSP-01':  { PCM500:4000, AMX500:1500, ORS001:800, NSS100:500, GLVM:150 },
  'WH-HOSP-01B': { PCM500:2000, AMX500:800 },
  'WH-HOSP-02':  { PCM500:3000, ORS001:600 },
  'WH-PCU-01':   { PCM500:300, AMX500:150, ORS001:80, NSS100:40, GLVM:20 },
  'WH-PCU-02':   { PCM500:250 },
  'WH-PCU-03':   {},
  'WH-PCU-04':   { PCM500:200 },
}

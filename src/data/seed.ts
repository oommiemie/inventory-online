import type {
  Org, Warehouse, MasterItem, MappedUom, Role, RoleId, Mapping, SupplyLink, StockRow,
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
  PCU06: { id:'PCU06', name:'รพ.สต.นาสวรรค์', nameEn:'Na Sawan HPH', sub:'หน่วยบริการลูกข่าย', subEn:'Sub-district health promoting hospital', type:'PCU', parent:'HOSP', wh:'WH-PCU-06' },
  PCU07: { id:'PCU07', name:'รพ.สต.ชัยพร', nameEn:'Chaiyaphon HPH', sub:'หน่วยบริการลูกข่าย', subEn:'Sub-district health promoting hospital', type:'PCU', parent:'HOSP', wh:'WH-PCU-07' },
  PCU05: { id:'PCU05', name:'รพ.สต.ห้วยก้านเหลือง', nameEn:'Huai Kan Lueang HPH', sub:'หน่วยบริการลูกข่าย', subEn:'Sub-district health promoting hospital', type:'PCU', parent:'HOSP', wh:'WH-PCU-05' },
  PCU04: { id:'PCU04', name:'รพ.สต.ซ่อมกอก', nameEn:'Som Kok HPH', sub:'หน่วยบริการลูกข่าย', subEn:'Sub-district health promoting hospital', type:'PCU', parent:'HOSP2', wh:'WH-PCU-04' },
}

/* ---------------- Warehouses ---------------- */
export const WAREHOUSES: Record<string, Warehouse> = {
  /* Hospital main stores — what a facility asks to draw from. */
  'WH-HOSP-01':  { id:'WH-HOSP-01',  name:'คลังเวชภัณฑ์ รพ.บึงกาฬ', nameEn:'Bueng Kan Hospital Medical Supply Store', org:'HOSP',  ext:'HOSXP-WH-001', mapState:'ACTIVE', kind:'MAIN' },
  'WH-HOSP-01B': { id:'WH-HOSP-01B', name:'คลังยา รพ.บึงกาฬ', nameEn:'Bueng Kan Hospital Drug Store', org:'HOSP', ext:'HOSXP-WH-002', mapState:'ACTIVE', kind:'MAIN' },
  'WH-HOSP-02':  { id:'WH-HOSP-02',  name:'คลังเวชภัณฑ์ รพ.เซกา', nameEn:'Seka Hospital Medical Supply Store', org:'HOSP2', ext:'SEKA-WH-001', mapState:'ACTIVE', kind:'MAIN' },
  /* Hospital sub-stores — each one belongs to a main store above. */
  'WH-HOSP-01-1': { id:'WH-HOSP-01-1', name:'คลังย่อยเวชภัณฑ์ผู้ป่วยนอก รพ.บึงกาฬ', nameEn:'Bueng Kan Hospital OPD Supply Sub-store', org:'HOSP', ext:'HOSXP-WH-011', mapState:'ACTIVE', kind:'SUB', parent:'WH-HOSP-01' },
  'WH-HOSP-01-2': { id:'WH-HOSP-01-2', name:'คลังย่อยเวชภัณฑ์เครือข่าย รพ.บึงกาฬ', nameEn:'Bueng Kan Hospital Network Supply Sub-store', org:'HOSP', ext:'HOSXP-WH-012', mapState:'ACTIVE', kind:'SUB', parent:'WH-HOSP-01' },
  'WH-HOSP-01B-1': { id:'WH-HOSP-01B-1', name:'คลังย่อยห้องจ่ายยา รพ.บึงกาฬ', nameEn:'Bueng Kan Hospital Dispensary Sub-store', org:'HOSP', ext:'HOSXP-WH-021', mapState:'ACTIVE', kind:'SUB', parent:'WH-HOSP-01B' },
  'WH-HOSP-02-1': { id:'WH-HOSP-02-1', name:'คลังย่อยเวชภัณฑ์เครือข่าย รพ.เซกา', nameEn:'Seka Hospital Network Supply Sub-store', org:'HOSP2', ext:'SEKA-WH-011', mapState:'ACTIVE', kind:'SUB', parent:'WH-HOSP-02' },
  /* Facility main stores — where the goods land after a requisition. */
  'WH-PCU-01':   { id:'WH-PCU-01',   name:'คลังใหญ่ รพ.สต.โคกก่อง', nameEn:'Khok Kong HPH Main Store', org:'PCU01', ext:'HOSXP-WH-101', mapState:'ACTIVE', kind:'MAIN' },
  'WH-PCU-01B':  { id:'WH-PCU-01B',  name:'คลังใหญ่เวชภัณฑ์ รพ.สต.โคกก่อง', nameEn:'Khok Kong HPH Supply Main Store', org:'PCU01', ext:'HOSXP-WH-111', mapState:'ACTIVE', kind:'MAIN' },
  'WH-PCU-02':   { id:'WH-PCU-02',   name:'คลังใหญ่ รพ.สต.หอคำ', nameEn:'Ho Kham HPH Main Store', org:'PCU02', ext:'HOSXP-WH-102', mapState:'PENDING_APPROVAL', kind:'MAIN' },
  'WH-PCU-03':   { id:'WH-PCU-03',   name:'คลังใหญ่ รพ.สต.วิศิษฐ์', nameEn:'Wisit HPH Main Store', org:'PCU03', ext:'', mapState:'DRAFT', kind:'MAIN' },
  'WH-PCU-06':   { id:'WH-PCU-06',   name:'คลังใหญ่ รพ.สต.นาสวรรค์', nameEn:'Na Sawan HPH Main Store', org:'PCU06', ext:'HOSXP-WH-106', mapState:'PENDING_APPROVAL', kind:'MAIN' },
  'WH-PCU-07':   { id:'WH-PCU-07',   name:'คลังใหญ่ รพ.สต.ชัยพร', nameEn:'Chaiyaphon HPH Main Store', org:'PCU07', ext:'', mapState:'DRAFT', kind:'MAIN' },
  'WH-PCU-05':   { id:'WH-PCU-05',   name:'คลังใหญ่ รพ.สต.ห้วยก้านเหลือง', nameEn:'Huai Kan Lueang HPH Main Store', org:'PCU05', ext:'HOSXP-WH-105', mapState:'PENDING_APPROVAL', kind:'MAIN' },
  'WH-PCU-04':   { id:'WH-PCU-04',   name:'คลังใหญ่ รพ.สต.ซ่อมกอก', nameEn:'Som Kok HPH Main Store', org:'PCU04', ext:'HOSXP-WH-401', mapState:'ACTIVE', kind:'MAIN' },
}

/* ---------------- Item master ---------------- */
export const MASTER: MasterItem[] = [
  { code:'PCM500', name:'Paracetamol 500 mg tablet',  th:'พาราเซตามอล 500 มก.', uom:'เม็ด',    uomEn:'tablet',  cat:'ยาสามัญ',        catEn:'General drug',    price:0.35 },
  { code:'AMX500', name:'Amoxicillin 500 mg capsule', th:'อะม็อกซิซิลลิน 500 มก.', uom:'แคปซูล', uomEn:'capsule', cat:'ยาปฏิชีวนะ',     catEn:'Antibiotic',      price:1.20 },
  { code:'ORS001', name:'Oral rehydration salts',     th:'ผงเกลือแร่',           uom:'ซอง',    uomEn:'sachet',  cat:'เวชภัณฑ์',        catEn:'Medical supply',  price:2.50 },
  { code:'NSS100', name:'Normal saline 100 ml',       th:'น้ำเกลือ 100 มล.',      uom:'ขวด',    uomEn:'bottle',  cat:'สารน้ำ',          catEn:'IV fluid',        price:14.00 },
  { code:'GLVM',   name:'Examination glove (M)',      th:'ถุงมือตรวจโรค ไซส์ M',  uom:'กล่อง',  uomEn:'box',     cat:'วัสดุการแพทย์',   catEn:'Medical material',price:120.00 },
  { code:'BTD15',  name:'Povidone-iodine 15 ml',      th:'เบตาดีน 15 มล.',        uom:'ขวด',    uomEn:'bottle',  cat:'เวชภัณฑ์',        catEn:'Medical supply',  price:18.00 },
  { code:'VITB1',  name:'Vitamin B complex tablet',   th:'วิตามินบีรวม',           uom:'เม็ด',    uomEn:'tablet',  cat:'ยาสามัญ',        catEn:'General drug',    price:0.40 },
  { code:'WDS01',  name:'Wound dressing set (small)', th:'ชุดทำแผลเล็ก',           uom:'ชุด',    uomEn:'set',     cat:'เวชภัณฑ์',        catEn:'Medical supply',  price:22.00 },
  { code:'CPM4',   name:'Chlorpheniramine 4 mg tablet', th:'คลอร์เฟนิรามีน 4 มก.', uom:'เม็ด',   uomEn:'tablet',  cat:'ยาสามัญ',        catEn:'General drug',    price:0.15 },
  { code:'IBU400', name:'Ibuprofen 400 mg tablet',    th:'ไอบูโพรเฟน 400 มก.',    uom:'เม็ด',    uomEn:'tablet',  cat:'ยาสามัญ',        catEn:'General drug',    price:0.50 },
  { code:'OMP20',  name:'Omeprazole 20 mg capsule',   th:'โอเมพราโซล 20 มก.',     uom:'แคปซูล', uomEn:'capsule', cat:'ยาสามัญ',        catEn:'General drug',    price:1.10 },
  { code:'MTF500', name:'Metformin 500 mg tablet',    th:'เมทฟอร์มิน 500 มก.',    uom:'เม็ด',    uomEn:'tablet',  cat:'ยาโรคเรื้อรัง',   catEn:'Chronic-care drug', price:0.45 },
  { code:'SIM20',  name:'Simvastatin 20 mg tablet',   th:'ซิมวาสแตติน 20 มก.',    uom:'เม็ด',    uomEn:'tablet',  cat:'ยาโรคเรื้อรัง',   catEn:'Chronic-care drug', price:0.60 },
  { code:'AML5',   name:'Amlodipine 5 mg tablet',     th:'แอมโลดิพีน 5 มก.',      uom:'เม็ด',    uomEn:'tablet',  cat:'ยาโรคเรื้อรัง',   catEn:'Chronic-care drug', price:0.35 },
  { code:'SYR5',   name:'Disposable syringe 5 ml',    th:'กระบอกฉีดยา 5 มล.',     uom:'อัน',    uomEn:'piece',   cat:'วัสดุการแพทย์',   catEn:'Medical material',price:2.20 },
  { code:'NDL23',  name:'Needle no.23',               th:'เข็มฉีดยา เบอร์ 23',     uom:'อัน',    uomEn:'piece',   cat:'วัสดุการแพทย์',   catEn:'Medical material',price:0.80 },
  { code:'ALC450', name:'Alcohol 70% 450 ml',         th:'แอลกอฮอล์ 70% 450 มล.', uom:'ขวด',    uomEn:'bottle',  cat:'เวชภัณฑ์',        catEn:'Medical supply',  price:28.00 },
  { code:'GAU3',   name:'Gauze pad 3x3 inch',         th:'ผ้าก๊อซ 3x3 นิ้ว',       uom:'ห่อ',    uomEn:'pack',    cat:'เวชภัณฑ์',        catEn:'Medical supply',  price:12.00 },
  { code:'PLS01',  name:'Adhesive plaster',           th:'พลาสเตอร์ปิดแผล',       uom:'กล่อง',  uomEn:'box',     cat:'เวชภัณฑ์',        catEn:'Medical supply',  price:45.00 },
  { code:'MSK01',  name:'Surgical mask',              th:'หน้ากากอนามัย',          uom:'กล่อง',  uomEn:'box',     cat:'วัสดุการแพทย์',   catEn:'Medical material',price:60.00 },
]

/** Units a facility may requisition each master item in, and how many base
 *  units each one holds. The size is the standard pack, so choosing a unit can
 *  fill the quantity in — a facility that counts differently still overrides
 *  it, which is the whole point of mapping both sides. */
export const UOM_CHOICES: Record<string, Record<string, number>> = {
  PCM500: { 'เม็ด': 1, 'แผง': 10, 'กล่อง': 1000, 'กระปุก': 200 },
  AMX500: { 'แคปซูล': 1, 'แผง': 10, 'กระปุก': 500 },
  ORS001: { 'ซอง': 1, 'กล่อง': 50 },
  NSS100: { 'ขวด': 1, 'ลัง': 24 },
  GLVM:   { 'กล่อง': 1, 'ลัง': 12 },
  BTD15:  { 'ขวด': 1, 'กล่อง': 12 },
  VITB1:  { 'เม็ด': 1, 'แผง': 10, 'กระปุก': 1000 },
  WDS01:  { 'ชุด': 1, 'กล่อง': 20 },
  CPM4:   { 'เม็ด': 1, 'แผง': 10, 'กระปุก': 1000 },
  IBU400: { 'เม็ด': 1, 'แผง': 10, 'กล่อง': 500 },
  OMP20:  { 'แคปซูล': 1, 'แผง': 10, 'กระปุก': 500 },
  MTF500: { 'เม็ด': 1, 'แผง': 10, 'กระปุก': 1000 },
  SIM20:  { 'เม็ด': 1, 'แผง': 10, 'กระปุก': 1000 },
  AML5:   { 'เม็ด': 1, 'แผง': 10, 'กระปุก': 1000 },
  SYR5:   { 'อัน': 1, 'กล่อง': 100, 'ลัง': 1000 },
  NDL23:  { 'อัน': 1, 'กล่อง': 100, 'ลัง': 1000 },
  ALC450: { 'ขวด': 1, 'ลัง': 12 },
  GAU3:   { 'ห่อ': 1, 'กล่อง': 50, 'ลัง': 500 },
  PLS01:  { 'กล่อง': 1, 'ลัง': 24 },
  MSK01:  { 'กล่อง': 1, 'ลัง': 20 },
}


/* ---------------- The approval queue ----------------
   A hospital's real queue is long, so the sample one is too. Each proposal is
   a line: facility, its own code and name, the master, when it was sent, then
   the units. `u()` builds a unit both sides agree on; passing a third number
   makes the hospital count it differently — the case an approver is there to
   catch. Local names are deliberately sloppier than the master's, which is
   the whole reason mapping exists. */
const u = (uom: string, factor: number, hospFactor = factor): MappedUom =>
  ({ uom, factor, hospUom: uom, hospFactor })

const pend = (
  org: string, local: string, localName: string, item: string, at: string,
  units: MappedUom[],
): Mapping => ({
  org, local, localName, item, state: 'PENDING_APPROVAL', proposedAt: at,
  localUom: units[0].uom, factor: units[0].factor,
  hospUom: units[0].hospUom, hospFactor: units[0].hospFactor,
  ...(units.length > 1 && { extraUoms: units.slice(1) }),
})

const QUEUE: Mapping[] = [
  /* รพ.สต.โคกก่อง */
  pend('PCU01', 'C012', 'คลอร์เฟนิรามีน 4',   'CPM4',   '27/08/69 10:02', [u('แผง', 10), u('เม็ด', 1), u('กระปุก', 1000)]),
  pend('PCU01', 'I030', 'ไอบูโพรเฟน 400',     'IBU400', '27/08/69 10:05', [u('แผง', 10), u('กล่อง', 500)]),
  pend('PCU01', 'Y101', 'ไซริงค์ 5 ml',        'SYR5',   '27/08/69 10:08', [u('กล่อง', 100), u('อัน', 1)]),
  pend('PCU01', 'Z044', 'ก๊อซ 3x3',            'GAU3',   '27/08/69 10:11', [u('ห่อ', 1), u('กล่อง', 50, 100)]),

  /* รพ.สต.หอคำ */
  pend('PCU02', 'MT11', 'เมทฟอร์มิน 500',      'MTF500', '26/08/69 08:30', [u('แผง', 10), u('กระปุก', 1000)]),
  pend('PCU02', 'SM12', 'ซิมวา 20',            'SIM20',  '26/08/69 08:33', [u('แผง', 10)]),
  pend('PCU02', 'AM13', 'แอมโลดิพีน 5',        'AML5',   '26/08/69 08:36', [u('แผง', 10), u('เม็ด', 1)]),
  pend('PCU02', 'OM14', 'โอเมพราโซล 20',       'OMP20',  '26/08/69 08:40', [u('แผง', 10), u('กระปุก', 500, 1000)]),
  pend('PCU02', 'MK15', 'หน้ากากอนามัย',        'MSK01',  '26/08/69 08:44', [u('กล่อง', 1), u('ลัง', 20)]),
  pend('PCU02', 'AL16', 'แอลกอฮอล์ 450',       'ALC450', '26/08/69 08:47', [u('ขวด', 1), u('ลัง', 12)]),

  /* รพ.สต.วิศิษฐ์ */
  pend('PCU03', 'AX21', 'อะม็อกซี่ 500',        'AMX500', '25/08/69 13:05', [u('แผง', 10), u('แคปซูล', 1)]),
  pend('PCU03', 'NS22', 'น้ำเกลือเล็ก',         'NSS100', '25/08/69 13:08', [u('ขวด', 1), u('ลัง', 24)]),
  pend('PCU03', 'GV23', 'ถุงมือ M',            'GLVM',   '25/08/69 13:12', [u('กล่อง', 1), u('ลัง', 10, 12)]),
  pend('PCU03', 'CP24', 'คลอร์เฟนิรามีน',       'CPM4',   '25/08/69 13:15', [u('กระปุก', 1000)]),
  pend('PCU03', 'SY25', 'กระบอกฉีดยา 5',       'SYR5',   '25/08/69 13:18', [u('กล่อง', 100), u('ลัง', 1000)]),
  pend('PCU03', 'ND26', 'เข็ม เบอร์ 23',        'NDL23',  '25/08/69 13:21', [u('กล่อง', 100), u('อัน', 1)]),
  pend('PCU03', 'PL27', 'พลาสเตอร์',            'PLS01',  '25/08/69 13:24', [u('กล่อง', 1), u('ลัง', 24)]),

  /* รพ.สต.ห้วยก้านเหลือง */
  pend('PCU05', 'PA51', 'พารา 500',            'PCM500', '27/08/69 09:24', [u('กระปุก', 200), u('เม็ด', 1)]),
  pend('PCU05', 'OR52', 'ผงเกลือแร่',           'ORS001', '27/08/69 09:27', [u('ซอง', 1), u('กล่อง', 50)]),
  pend('PCU05', 'AX53', 'อะม็อกซี่',             'AMX500', '27/08/69 09:30', [u('แผง', 10), u('กระปุก', 500)]),
  pend('PCU05', 'GA54', 'ผ้าก๊อซ',              'GAU3',   '27/08/69 09:33', [u('ห่อ', 1)]),
  pend('PCU05', 'MK56', 'แมสก์',                'MSK01',  '27/08/69 09:36', [u('กล่อง', 1), u('ลัง', 20, 24)]),

  /* รพ.สต.นาสวรรค์ */
  pend('PCU06', 'PA61', 'พาราเซตามอล',          'PCM500', '24/08/69 15:02', [u('กล่อง', 1000), u('แผง', 10), u('เม็ด', 1)]),
  pend('PCU06', 'AX62', 'อะม็อกซิซิลลิน 500',   'AMX500', '24/08/69 15:06', [u('แผง', 10)]),
  pend('PCU06', 'OR63', 'เกลือแร่',              'ORS001', '24/08/69 15:09', [u('กล่อง', 50)]),
  pend('PCU06', 'NS64', 'น้ำเกลือ 100',          'NSS100', '24/08/69 15:12', [u('ขวด', 1), u('ลัง', 24, 20)]),
  pend('PCU06', 'GV65', 'ถุงมือตรวจโรค M',       'GLVM',   '24/08/69 15:15', [u('กล่อง', 1), u('ลัง', 12)]),
  pend('PCU06', 'CP66', 'คลอเฟน 4 มก.',         'CPM4',   '24/08/69 15:18', [u('แผง', 10), u('กระปุก', 1000)]),
  pend('PCU06', 'IB67', 'ไอบู 400',             'IBU400', '24/08/69 15:21', [u('แผง', 10), u('กล่อง', 500)]),
  pend('PCU06', 'AL68', 'แอลกอฮอล์เช็ดแผล',      'ALC450', '24/08/69 15:24', [u('ขวด', 1), u('ลัง', 12)]),

  /* รพ.สต.ชัยพร */
  pend('PCU07', 'PA71', 'พารา 500 มก.',         'PCM500', '27/08/69 11:40', [u('กระปุก', 200), u('กล่อง', 1000)]),
  pend('PCU07', 'MT72', 'เมทฟอร์มิน',            'MTF500', '27/08/69 11:43', [u('แผง', 10), u('กระปุก', 1000, 500)]),
  pend('PCU07', 'AM73', 'แอมโลดิพีน',            'AML5',   '27/08/69 11:46', [u('แผง', 10)]),
  pend('PCU07', 'SM74', 'ซิมวาสแตติน 20',        'SIM20',  '27/08/69 11:49', [u('แผง', 10), u('กระปุก', 1000)]),
  pend('PCU07', 'OM75', 'โอเมพราโซล',            'OMP20',  '27/08/69 11:52', [u('แคปซูล', 1), u('แผง', 10)]),
  pend('PCU07', 'SY76', 'ไซริงค์',               'SYR5',   '27/08/69 11:55', [u('กล่อง', 100), u('ลัง', 1000)]),
  pend('PCU07', 'ND77', 'เข็มฉีดยา 23',          'NDL23',  '27/08/69 11:58', [u('กล่อง', 100), u('ลัง', 1000, 1200)]),
]

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
  /* Waiting for approval with two units, and with the two sides counting a
     box differently — the case the approver is there to catch. */
  { org:'PCU01', local:'O055', localName:'ผงเกลือแร่',            item:'ORS001',
    localUom:'กล่อง', factor:50,  hospUom:'กล่อง', hospFactor:100, state:'PENDING_APPROVAL',
    proposedAt:'26/08/69 14:12',
    extraUoms:[
      { uom:'ซอง', factor:1, hospUom:'ซอง', hospFactor:1 },
    ] },
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

  /* Waiting on the hospital. Deliberately varied: one unit or three, sides
     that agree and sides that do not — the approval screen has to read
     clearly in all of them. */
  { org:'PCU02', local:'AM03', localName:'อะม็อกซี่ 500',            item:'AMX500',
    localUom:'แผง',   factor:10,  hospUom:'แผง',   hospFactor:10,  state:'PENDING_APPROVAL',
    proposedAt:'26/08/69 09:05',
    extraUoms:[
      { uom:'แคปซูล', factor:1,   hospUom:'แคปซูล', hospFactor:1 },
      { uom:'กระปุก', factor:500, hospUom:'กระปุก', hospFactor:500 },
    ] },
  { org:'PCU02', local:'GLV1', localName:'ถุงมือตรวจ M',            item:'GLVM',
    localUom:'ลัง',   factor:10,  hospUom:'ลัง',   hospFactor:12,  state:'PENDING_APPROVAL',
    proposedAt:'26/08/69 15:48' },
  { org:'PCU02', local:'BT07', localName:'เบตาดีน 15 มล.',          item:'BTD15',
    localUom:'ขวด',   factor:1,   hospUom:'ขวด',   hospFactor:1,   state:'PENDING_APPROVAL',
    proposedAt:'27/08/69 08:41',
    extraUoms:[
      { uom:'กล่อง', factor:12, hospUom:'กล่อง', hospFactor:24 },
    ] },
  { org:'PCU03', local:'PC30', localName:'พารา 500',                item:'PCM500',
    localUom:'กระปุก', factor:200, hospUom:'กระปุก', hospFactor:200, state:'PENDING_APPROVAL',
    proposedAt:'25/08/69 11:20',
    extraUoms:[
      { uom:'เม็ด',  factor:1,    hospUom:'เม็ด',  hospFactor:1 },
      { uom:'กล่อง', factor:1000, hospUom:'กล่อง', hospFactor:1000 },
    ] },
  { org:'PCU03', local:'OR31', localName:'ผงเกลือแร่',              item:'ORS001',
    localUom:'ซอง',   factor:1,   hospUom:'ซอง',   hospFactor:1,   state:'PENDING_APPROVAL',
    proposedAt:'25/08/69 11:22' },
  { org:'PCU05', local:'WD01', localName:'ชุดทำแผลเล็ก',            item:'WDS01',
    localUom:'ชุด',   factor:1,   hospUom:'ชุด',   hospFactor:1,   state:'PENDING_APPROVAL',
    proposedAt:'27/08/69 09:16',
    extraUoms:[
      { uom:'กล่อง', factor:20, hospUom:'กล่อง', hospFactor:20 },
    ] },
  { org:'PCU05', local:'NS55', localName:'น้ำเกลือ 100 มล.',        item:'NSS100',
    localUom:'ขวด',   factor:1,   hospUom:'ขวด',   hospFactor:1,   state:'PENDING_APPROVAL',
    proposedAt:'27/08/69 09:18',
    extraUoms:[
      { uom:'ลัง', factor:24, hospUom:'ลัง', hospFactor:20 },
    ] },
  { org:'PCU05', local:'VT55', localName:'วิตามินบีรวม',             item:'VITB1',
    localUom:'แผง',   factor:10,  hospUom:'แผง',   hospFactor:10,  state:'PENDING_APPROVAL',
    proposedAt:'27/08/69 09:21',
    extraUoms:[
      { uom:'เม็ด', factor:1, hospUom:'เม็ด', hospFactor:1 },
    ] },

  ...QUEUE,
]


/** Items waiting at each connector, revealed by "pull local items". */
export const CONNECTOR_INBOX: Record<string, [string, string][]> = {
  PCU01: [['S090', 'ชุดทำแผลเล็ก'], ['B012', 'เบตาดีน 15 มล.']],
  PCU02: [['GL05', 'ถุงมือตรวจ M']],
  PCU03: [['PA10', 'พารา 500'], ['OR11', 'ผงเกลือแร่'], ['NS12', 'น้ำเกลือ 100']],
}

/* ---------------- Supply links (PCU -> hospital warehouse) ---------------- */
/* The route is stored whole: the facility store that receives, the hospital
   sub-store that picks, and the main store that owns both. */
export const SEED_SUPPLY: SupplyLink[] = [
  { org:'PCU01', wh:'WH-HOSP-01',  state:'ACTIVE', localWh:'WH-PCU-01', subWh:'WH-HOSP-01-2' },
  { org:'PCU02', wh:'WH-HOSP-01',  state:'ACTIVE', localWh:'WH-PCU-02', subWh:'WH-HOSP-01-2' },
  { org:'PCU03', wh:'WH-HOSP-01B', state:'PENDING_APPROVAL', localWh:'WH-PCU-03', subWh:'WH-HOSP-01B-1' },
  { org:'PCU04', wh:'WH-HOSP-02',  state:'ACTIVE', localWh:'WH-PCU-04', subWh:'WH-HOSP-02-1' },
  { org:'PCU05', wh:'WH-HOSP-01',  state:'PENDING_APPROVAL', localWh:'WH-PCU-05', subWh:'WH-HOSP-01-1' },
  { org:'PCU06', wh:'WH-HOSP-01',  state:'ACTIVE', localWh:'WH-PCU-06', subWh:'WH-HOSP-01-2' },
  { org:'PCU07', wh:'WH-HOSP-01B', state:'PENDING_APPROVAL', localWh:'WH-PCU-07', subWh:'WH-HOSP-01B-1' },
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

# Inventory Online · Web Portal

ระบบบริหารคลังเวชภัณฑ์แบบรวมศูนย์ เชื่อมคลังใหญ่ของ **โรงพยาบาลแม่ข่าย (HOSP)** กับคลังใหญ่ของ
**หน่วยบริการลูกข่าย (รพ.สต. / PCU)** ผ่าน Integration API กับ HOSxP — ตั้งแต่การผูกรายการครั้งแรก
จนถึงการปิดใบเบิกจ่ายและกระทบยอดสตอกสองฝั่ง

React 18 · TypeScript · Vite · Zustand · React Router

**เดโม:** https://oommiemie.github.io/inventory-online/ — เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านใดก็ได้ (ต้นแบบ ยังไม่ต่อระบบยืนยันตัวตนจริง)

---

## เริ่มใช้งาน

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # vitest (unit tests สำหรับ lib/)
```

CI รัน typecheck · lint · test ทุก push และทุก pull request ·
push เข้า `main` แล้ว deploy ขึ้น GitHub Pages อัตโนมัติ

---

## สถาปัตยกรรม

```
src/
├── app/            store (Zustand), router, guard, ErrorBoundary, nav, selectors
├── components/
│   ├── ui/         design-system primitives (Button, Card, Badge, Table…)
│   ├── charts/     SVG bar chart
│   ├── layout/     AppShell · Sidebar · HeroBar · ToastRegion
│   ├── DocParts    stepper / header / timeline / summary shared by workflows
│   ├── StateBadge  state · sync · mapping badges
│   ├── Kpi         KPI tile with count-up figure and progress track
│   ├── CountUp     figure that eases from its previous value to the new one
│   └── DotField    interactive dot grid behind the sign-in panel
├── data/seed.ts    orgs · warehouses · item master · roles · mappings · stock
├── features/       auth + 12 screens, one folder per domain area
├── hooks/          useT (i18n) · useMotion (count-up, entrance) · useRipple
├── i18n/           key-based TH / EN dictionaries
├── lib/
│   ├── domain.ts   state machine · FEFO · UOM conversion · formatting
│   ├── appearance  palettes · fonts · scale, applied as CSS variables
│   ├── csv.ts      client-side CSV export (UTF-8 BOM for Excel)
│   └── asset.ts    prefixes public/ paths with the deployment base
├── styles/         tokens.css (design tokens) · global.css
└── types/          domain model
```

**หลักการ:** `lib/domain.ts` เป็น pure function ทั้งหมด (ทดสอบได้โดยไม่ต้องมี React)
ส่วน `app/store.ts` ถือ state และ side-effect ทั้งหมด · component ไม่คำนวณ business logic เอง

---

## Design system

Token ทั้งหมดอยู่ใน `src/styles/tokens.css` — component ทุกตัวอ่านค่าจากที่นี่ที่เดียว
เปลี่ยนธีมทั้งระบบได้จากไฟล์เดียว

| กลุ่ม | ตัวอย่าง |
|---|---|
| สี | `--brand-500` ถึง `--brand-950`, `--ok` / `--warn` / `--danger` / `--info` / `--teal` |
| สีแบรนด์บนพื้น | `--brand-ink`, `--brand-ink-strong`, `--brand-line` — สลับเป็นเฉดอ่อนเองในโหมดมืด |
| พื้นผิว | `--surface`, `--surface-raised`, `--glass-border`, `--glass-blur` |
| เงา | `--sh-xs` … `--sh-lg`, `--sh-glass` |
| ระยะ | `--s-1` … `--s-12` (ฐาน 4px) |
| มุมโค้ง | `--r-xs` … `--r-full` |
| ตัวอักษร | `--fs-2xs` … `--fs-4xl`, `--lh-tight/snug/base` |
| จังหวะ | `--dur-fast/dur/dur-slow`, `--ease`, `--ease-out`, `--stagger` / `--stagger-row` |

**Liquid glass** — คลาส `.glass` ให้พื้นผิวโปร่งแสงพร้อม `backdrop-filter` และเส้นขอบ
specular ด้านบน (`::before`) แบบ Apple · รองรับ dark mode ครบทุก token

**Tone map** — คลาส `tone-*` (info · green · amber · danger · teal · violet · indigo ·
cyan · rose · slate · ok-done · gray) ประกาศไว้ที่เดียวใน `ui.css` และตั้งค่า `--tone` / `--tone-bg`
ให้ component อ่านต่อ · วงกลมไอคอนและ pill ที่ต้องมีสีตามสถานะจึงไม่ต้องเขียนตารางสีซ้ำ

**สถานะ selected / active / focus อ้างสีธีมเสมอ** — ขอบการ์ดที่เลือก แถบ tab ที่ active
checkbox ที่ติ๊ก และ `--focus-ring` คำนวณจาก `--brand-500` ด้วย `color-mix()`
จึงเปลี่ยนตามธีมที่ผู้ใช้เลือกโดยไม่ต้องแก้ component

---

## รูปลักษณ์ที่ผู้ใช้ปรับได้

ตั้งค่าที่ **ตั้งค่าระบบ → ธีมการแสดงผล** · ทุกค่าเขียนลง `document.documentElement`
เป็น CSS variable ผ่าน `lib/appearance.ts` มีผลทั้งระบบทันที

| ค่า | ตัวเลือก |
|---|---|
| โหมด | สว่าง · มืด · อัตโนมัติ (ตามระบบปฏิบัติการ) |
| ธีมสี | Sky Clean · Mint to be · Aqua Vibe · Midnight Mood · Lavender Soft · Berry Pop · Cream Latte · Sage Breeze |
| ตัวอักษร | Sarabun · Noto Sans Thai · IBM Plex Sans Thai · Prompt · Kanit · Bai Jamjuree |
| น้ำหนัก | ตัวอักษรหนาทั้งระบบ (เปิด/ปิด) |
| ขนาด | 5 ระดับ ปรับ `zoom` ของทั้งหน้า |

แต่ละธีมเขียนทับ ramp `--brand-50` ถึง `--brand-800` และ gradient ของ hero ·
component ทุกตัวอ่านค่าจาก token เดิม จึงไม่มีที่ไหนต้องแก้ตามธีม

---

## Motion

| จังหวะ | ที่ใช้ |
|---|---|
| ตัวเลขวิ่ง | KPI ทุกใบ · ช่องสรุปบนหน้าเอกสาร · ตัวเลขกลาง donut (`useCountUp`) |
| กราฟโหลด | แท่งงอกจากเส้นฐานทีละแท่ง · donut กวาดออกจาก 0 · แถบ progress ยืดจากซ้าย |
| การปรากฏ | การ์ด KPI คิวงาน รายการสต๊อกต่ำ และแถวตาราง ทยอยขึ้นทีละรายการ (`--i`) |
| ตอบสนอง | ripple ที่ปุ่ม · press scale · ป้ายตัวเลขบน sidebar เด้งเมื่อค่าเปลี่ยน |

ทั้งหมดเคารพ `prefers-reduced-motion` — CSS ลดเวลาลงเหลือเกือบศูนย์
และ `useCountUp` แสดงค่าปลายทางทันที

---

## การเข้าสู่ระบบ

หน้าล็อกอินอยู่นอก `AppShell` — เมื่อยังไม่ได้เข้าระบบ `App` จะ render `LoginView`
โดยคง hash เดิมไว้ ล็อกอินแล้วจึงเข้าหน้าที่ตั้งใจเปิด

- ฝั่งซ้าย: ชื่อระบบ พาดหัว ชิปโมดูล และภาพเวชภัณฑ์ในวงแหวนแสง บนพื้น `DotField`
  ที่จุดนูนตามเคอร์เซอร์ · สีทั้งหมดอิง gradient ของธีมที่เลือก
- ฝั่งขวา: ชื่อผู้ใช้ · รหัสผ่าน (แสดง/ซ่อนได้) · จดจำการเข้าสู่ระบบ · สลับภาษา
- Session เก็บที่ `localStorage` เมื่อเลือกจดจำ ไม่เช่นนั้นเก็บที่ `sessionStorage`
- ออกจากระบบได้จากการ์ดผู้ใช้ท้าย sidebar และ hero ของหน้าตั้งค่า

> ต้นแบบ: ยอมรับชื่อผู้ใช้และรหัสผ่านใดก็ได้ ยังไม่ต่อ identity provider จริง

---

## บทบาทและสิทธิ์ (RBAC)

| Role | ขอบเขต | สิทธิ์หลัก |
|---|---|---|
| **Inventory PCU** | หน่วยงานตนเอง | สร้าง/ส่งใบขอเบิก · รับสินค้า · ปรับสต๊อก · เสนอ mapping |
| **Inventory Hospital** | หน่วยงานลูกข่าย | ตรวจสอบ/อนุมัติใบเบิก · จ่ายสินค้า · อนุมัติ mapping |
| **Provincial Admin** | ทั้งจังหวัด | ภาพรวมจังหวัด · ตัดสินส่วนต่าง · retry การซิงค์ · รายงาน |
| **BMS Group** | ทั้งระบบ | ทุกเมนู · จัดการผู้ใช้ · จัดการ Connector |

สิทธิ์บังคับ 2 ชั้น: `Guard` กันระดับหน้าจอ (เทียบ HTTP 403) และ `act()` ตรวจ permission
ก่อนทำรายการทุกครั้ง · ปุ่มที่ไม่มีสิทธิ์จะไม่ถูก render

---

## Workflow ของเอกสาร

```
DRAFT ──submit──▶ REQUESTED ──approve──▶ APPROVED ──issue──▶ ISSUED ──receive──▶ COMPLETED
  ▲                   │                      │                  │
  └──revise── RETURNED│              PARTIALLY_ISSUED   PARTIALLY_RECEIVED
                      │                      │                  │
                  REJECTED            (close_short)      DISCREPANCY ──settle──▶ COMPLETED
```

`ACTION_FROM` ใน `lib/domain.ts` กำหนดว่า action ใดทำได้จากสถานะใด —
ทำจากสถานะที่ไม่อนุญาตจะถูกปฏิเสธพร้อมข้อความแบบ HTTP 409

**กฎสำคัญ**
- ส่งใบขอเบิกไม่ได้ถ้ายังมีรายการที่ mapping ไม่เป็น `ACTIVE`
- อนุมัติไม่ได้ถ้ายังไม่ผ่าน review (เมื่อเปิด `forceReview`)
- อนุมัติแล้วระบบจอง Lot อัตโนมัติแบบ **FEFO** (First Expire First Out)
- จ่ายสินค้า → ตัดสต๊อกต้นทาง + ตั้งยอด **Stock In Transit**
- รับครบ → เคลียร์ transit → ปิดงานอัตโนมัติ · รับไม่ครบ → แจ้งส่วนต่างให้ Provincial Admin ตัดสิน

---

## หน่วยเบิกและการ Mapping

รายการทุกอย่างเก็บเป็น **base UOM** เสมอ · หน่วยเบิก (local UOM) เป็นเพียงหน่วยกรอกและแสดงผล

```
1 <local UOM> = factor × <base UOM>
```

Mapping ผูก **รายการของหน่วยบริการ 1 รายการ : Master 1 รายการ** และกำหนด factor
เฉพาะคู่ (หน่วยบริการ + รายการ) นั้น — หน่วยบริการต่างกันใช้หน่วยเบิกต่างกันได้

ขั้นตอน: API ส่งรายการเข้ามา (`UNMAPPED`) → เลือก Master + หน่วย (`DRAFT`) →
เสนอ (`PENDING_APPROVAL`) → โรงพยาบาลอนุมัติ (`ACTIVE`) → ใช้เบิกได้

---

## Integration

จำลอง connector สองฝั่งพร้อม lifecycle จริง: `QUEUED → SENDING → SYNCED | FAILED`

| Endpoint | ทิศทาง |
|---|---|
| `POST /hosxp/transfer-out` | ส่งคำสั่งจ่ายไป HOSxP |
| `POST /pcu/transfer-in` | ส่งการรับเข้าไป PCU connector |
| `GET /hosxp/item-master` | ดึงรายการกลาง |
| `GET /pcu/local-items` | ดึงรายการของหน่วยบริการ |

**Idempotency** — การ retry ใช้ key เดิม เปลี่ยนเฉพาะเลข attempt (`REQ232:transfer_out:2`)
เพื่อกันการตัดสต๊อกซ้ำ · ทดสอบได้จากปุ่ม "จำลองให้ซิงค์ครั้งถัดไปล้มเหลว" ในหน้า Integration Monitor

---

## ตั้งค่าระบบ

เมนูตั้งค่าแยกเป็นกลุ่ม แต่ละหัวข้อเปิดเป็นหน้าย่อยของตัวเอง (`/settings/:topic`)

| กลุ่ม | หัวข้อ |
|---|---|
| ทั่วไป | ค่าตั้งการทำงาน (โหมดการจ่าย · บังคับตรวจสอบ) · ธีมการแสดงผล |
| การแจ้งเตือน | ช่องทาง (ในระบบ · อีเมล) · เหตุการณ์ (รออนุมัติ · ซิงค์ล้มเหลว · ต่ำกว่าจุดสั่งซื้อ · ใกล้หมดอายุ พร้อมจำนวนวันเตือน) |
| คลังและการเชื่อมต่อ | คลังต้นทางที่ใช้เบิก · การผูกรหัสคลัง 1 ต่อ 1 · Connector |
| ผู้ใช้งาน | บัญชีผู้ใช้ (ข้อมูลส่วนตัว · รหัสผ่าน · อุปกรณ์) · ผู้ใช้และบทบาท |

บัญชีผู้ใช้แสดงเป็นโหมดอ่านก่อน กด **แก้ไข** จึงเปลี่ยนเป็นฟอร์ม · ชื่อและรูปที่บันทึก
สะท้อนทันทีที่ sidebar และ hero ของ dashboard

---

## รายงาน

| ส่วน | ข้อมูล |
|---|---|
| KPI | มูลค่าเบิกรวม · ปิดงานแล้ว · ระหว่างดำเนินการ · ของระหว่างทาง · อัตราการจ่ายครบ |
| สรุปรายหน่วยบริการ | จำนวนเอกสาร มูลค่า และงานที่ปิดแล้ว |
| แนวโน้มรายหน่วยบริการ | กราฟแท่งเทียบเอกสารทั้งหมดกับที่ปิดแล้ว |
| สินค้าใกล้หมดอายุ | ล็อตแยกตามช่วง หมดอายุแล้ว / ≤30 / 31–60 / 61–90 วัน พร้อมจำนวน มูลค่า และล็อตที่ใกล้หมดอายุที่สุด |
| เอกสารตามสถานะ | donut แยกตามสถานะ |
| รายการที่เบิกมากที่สุด | อันดับ 5 รายการแรก |

แท่งของสินค้าใกล้หมดอายุเทียบกันเฉพาะช่วงเตือน · ของที่เหลืออายุเกิน 90 วัน
แสดงเป็นบรรทัดบริบท เพราะปริมาณมากกว่าหลายสิบเท่าจนกลบช่วงที่ต้องรีบดู

---

## i18n

Dictionary แบบ key-based ใน `src/i18n/dict.ts` — `TH` เป็น source of truth และ
TypeScript บังคับให้ `EN` มีครบทุก key (`Record<I18nKey, string>`) จึงตกหล่นไม่ได้

ชื่อหน่วยงาน คลัง และเวชภัณฑ์ มีทั้งสองภาษาในข้อมูล เรียกผ่าน `orgName()` / `whName()` /
`itemName()` จาก `useT()`

---

## Accessibility

- ทุก interactive element เข้าถึงด้วยคีย์บอร์ดและมี focus ring ชัดเจน (`--focus-ring`)
- Modal ปิดด้วย Esc · มี `role="dialog"` และ `aria-modal`
- Toast อยู่ใน live region (`role="status" aria-live="polite"`)
- ตารางมี `<th>` กำกับครบ · ปุ่มไอคอนล้วนมี `aria-label`
- กราฟมี `aria-label` สรุปค่าและ `<title>` รายแท่ง
- รองรับ `prefers-reduced-motion`

---

## Responsive

| ช่วงจอ | พฤติกรรม |
|---|---|
| > 1180px | Sidebar เต็ม · ย่อ/ขยายได้ |
| 860–1180px | Sidebar ยุบเป็นไอคอนอัตโนมัติ |
| < 860px | Sidebar เป็น drawer + scrim · KPI และตารางปรับคอลัมน์ |

ตารางทุกตัวเลื่อนแนวนอนในกรอบตัวเอง — หน้าเว็บไม่เลื่อนแนวนอน

---

## ส่งต่อให้ทีมพัฒนา

### จุดต่อ backend อยู่ที่ไหน

`app/store.ts` เป็น **ที่เดียว** ที่มี side-effect ทั้งหมด · component ไม่คำนวณ business logic
และไม่เรียก data source เอง การต่อ API จริงจึงแก้ที่ action ในไฟล์นี้เท่านั้น

```
component  →  useStore(s => s.approve)   ← เปลี่ยนไส้ในเป็น fetch ที่นี่
                     ↓
              lib/domain.ts               ← pure function ใช้ซ้ำได้ทั้งสองฝั่ง
```

action ทุกตัวมีรูปแบบเดียวกัน: ตรวจสถานะด้วย `ACTION_FROM` → ตรวจสิทธิ์ด้วย `ACTION_PERM` →
เขียน state → บันทึก event ลงไทม์ไลน์ → ยิง sync job · เมื่อมี backend ให้เปลี่ยนขั้น "เขียน state"
เป็นเรียก API แล้วรับผลกลับมา set ส่วน guard สองชั้นยังใช้ต่อได้เพราะสะท้อนกติกาฝั่งเซิร์ฟเวอร์อยู่แล้ว

### อะไรที่ยังเป็นของจำลอง

| ส่วน | สถานะปัจจุบัน | สิ่งที่ต้องทำเมื่อต่อของจริง |
|---|---|---|
| ข้อมูลตั้งต้น | `data/seed.ts` | แทนด้วย API ที่คืนรูปแบบเดียวกับ `types/` |
| การเข้าสู่ระบบ | รับทุก user/password เก็บ flag ใน web storage | ต่อ identity provider แล้วเก็บ token |
| Connector HOSxP / PCU | จำลอง lifecycle ใน store พร้อม idempotency key | เรียก endpoint จริงตามตารางในหัวข้อ Integration |
| นาฬิกา | เวลาจำลองเริ่ม 27/08/2569 เดินด้วย `tick()` | ใช้เวลาจริงจากเซิร์ฟเวอร์ |
| บัญชีผู้ใช้ | แก้ชื่อ/รูปได้ รหัสผ่านเป็น UI เปล่า | ต่อ endpoint โปรไฟล์และเปลี่ยนรหัสผ่าน |

### การบันทึกข้อมูลในเครื่อง

state ถูกบันทึกลง `localStorage` คีย์ `io.state` ผ่าน `persist` ของ Zustand
รีเฟรชแล้วทำงานต่อจากเดิมได้ · เมื่อแก้รูปร่าง state ให้เพิ่ม `version` ในตัวเลือกของ `persist`
ข้อมูลเก่าจะถูกทิ้งแทนที่จะอ่านผิดรูป · ผู้ใช้ล้างข้อมูลเองได้จากหน้า error boundary

หน้าจอที่พังตอน render จะไม่ทำให้จอขาว แต่แสดงการ์ดพร้อมปุ่มโหลดใหม่และล้างข้อมูล

### เทสต์

`lib/domain.ts` เป็น pure function ทั้งหมดจึงเทสต์ได้โดยไม่ต้องมี React —
ครอบคลุมการแปลงหน่วย การจอง lot แบบ FEFO กติกา state machine และการจัดรูปแบบตัวเลข ·
`lib/csv.ts` มีเทสต์การใส่เครื่องหมายคำพูดและข้อความไทย

ยังเหลือ warning จาก `react-hooks/exhaustive-deps` 8 จุด ทั้งหมดเป็นค่าที่คำนวณใหม่ทุก render
(เช่น `now`, `r.scope`) การใส่เข้า dependency array จะทำให้ memo ไม่ทำงาน จึงตั้งใจเว้นไว้

---

## ข้อมูลตัวอย่าง

จังหวัดบึงกาฬ · โรงพยาบาลแม่ข่าย 2 แห่ง · รพ.สต. 4 แห่ง · เวชภัณฑ์ 5 รายการ ·
ใบขอเบิกตั้งต้น 4 ฉบับครอบคลุมหลายสถานะ · สต๊อกตั้งต้น 21 ล็อต

ล็อต 6 รายการตั้งวันหมดอายุให้กระจายครบทุกช่วงเตือน (หมดอายุแล้ว · ภายใน 30 วัน ·
31–60 · 61–90) เพื่อให้รายงานสินค้าใกล้หมดอายุมีรูปทรง — ล็อตเหล่านี้อยู่ที่คลังโรงพยาบาล
เป็นหลัก จึงไม่ไปกลบการเตือนสต๊อกต่ำของ รพ.สต. บน dashboard

ข้อมูลถูกบันทึกลงเครื่องผู้ใช้ รีเฟรชแล้วทำงานต่อจากเดิม · ล้างกลับเป็นข้อมูลตัวอย่างได้ด้วยการลบคีย์ `io.state` ใน localStorage

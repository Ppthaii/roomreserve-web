# 🛠️ IMPLEMENTATION PLAN — RoomReserve

> **ผู้วางแผน:** Claude (อ่านโค้ดจริง + เทียบข้อกำหนดอาจารย์) | **ผู้เขียนโค้ด:** Gemini
> **แหล่งข้อกำหนดอาจารย์:** [PROJECT_SPEC.md](./PROJECT_SPEC.md), [RUBRIC_CHECKLIST.md](./RUBRIC_CHECKLIST.md), [web_project_rules.md](../.agents/rules/web_project_rules.md)
> **วิธีใช้:** สั่ง Gemini ทีละ Task เช่น *"ทำ Task 1 ใน IMPLEMENTATION_PLAN.md"* → เสร็จแล้วติ๊ก `[x]` + รายงานผล Verify

---

## 📏 กฎสำหรับ Gemini

1. อ่าน [AGENTS.md](./AGENTS.md) ก่อนเริ่มทุกครั้ง
2. แผนนี้บอก **"ต้องได้ผลอะไร + ข้อห้าม + วิธีพิสูจน์"** — Gemini ออกแบบโค้ดเอง แต่ต้อง **อ่านไฟล์จริงก่อนแก้** และ **ยึด pattern เดิมของโปรเจกต์**
3. ใช้เฉพาะสิ่งที่อาจารย์สอน: Express Router, Middleware, `express-session`, EJS, `pg` (parameterized query `$1,$2`), `bcryptjs`, `multer` — **ห้ามเพิ่ม dependency ใหม่**
4. คอมเมนต์ภาษาไทยสั้นๆ ที่ middleware / ฟังก์ชันสำคัญ (ผู้ใช้ต้องใช้ตอบอาจารย์ช่วง Q&A)
5. การเปลี่ยนข้อมูลสำคัญ + การถูกปฏิเสธ ต้องเรียก `logAudit()` เสมอ (ดูตัวอย่างใน `adminController.js`)
6. ห้ามส่ง/แสดง/log `password_hash` หรือรหัสผ่านเด็ดขาด
7. แก้เฉพาะจุด ห้าม rewrite ทั้งไฟล์ ห้าม refactor นอกขอบเขต Task
8. ห้ามเคลมว่าผ่าน ถ้ายังไม่ได้รัน Verify จริง / เจอสิ่งที่ไม่ตรงแผน → **หยุดถามผู้ใช้**

---

## 📊 ผลตรวจโค้ดเทียบข้อกำหนดอาจารย์

| # | ข้อกำหนดอาจารย์ | สถานะในโค้ดตอนนี้ | Task |
|:-:|:--|:--|:-:|
| R1 | แยก `/app`, `/admin`, **`/api/admin`** ยิงตรงต้อง 403 (Spec 3.3, Demo 4) | ❌ ไม่มี `/api/admin` | 2 |
| R2 | แก้สิทธิ์แล้ว **มีผลทันที ไม่ต้อง restart** (Rubric 5, Demo 5, 7) | ⚠️ ติ๊ก ACL มีผลทันที แต่ **เปลี่ยน Role / ระงับบัญชี ไม่มีผลจน login ใหม่** (อ่านจาก session) | 1 |
| R3 | ตรวจสิทธิ์ที่ **Middleware ฝั่ง Server ทุก Route** (Rules 3.4) | ⚠️ `/app/rooms/create`, `/toggle` ไม่มี `requirePermission` (hardcode role ใน controller) | 3 |
| R4 | ตรวจ **MIME Type จริง** ไม่พึ่งนามสกุล (Spec 3.4, Rules 4.2, Demo 8) | ⚠️ เช็คแค่ `file.mimetype` ที่ browser ส่งมา (ปลอมได้) | 4 |
| R5 | Admin **เพิ่ม / แก้ไข / ลบ** Role และ Permission ผ่านเว็บ (Spec 3.2) | ⚠️ มีแค่ "เพิ่ม" | 5 |
| R6 | ห้ามลบ Role ที่มีผู้ใช้ / ห้ามทำให้ระบบ **ไม่เหลือ Admin** (Spec 3.2) | ⚠️ กันแค่เปลี่ยน Role แต่ **ระงับ Admin คนสุดท้ายได้** | 5 |
| R7 | หน้า Log กรองตาม **ช่วงเวลา / ผู้ใช้ / ประเภท** (Rubric 7) | ⚠️ ไม่มีกรองช่วงเวลา, `limit` ไม่ validate | 6 |
| R8 | ER Diagram ครบ PK/FK/Cardinality (Rubric 3) | ❌ ไม่มีไฟล์ | 7 |
| R9 | Access Matrix ตรงกับระบบจริง (Rubric 6) | ❌ ไม่มีไฟล์ | 7 |
| R10 | README ติดตั้ง + ตารางบัญชีทดสอบ 4 Roles (Deliverables) | ❌ ไม่มี | 7 |
| R11 | ระบบต้องรันสาธิตสดได้จริง ("ไม่มีในระบบจริง = ไม่ได้คะแนน") | ❌ เครื่องไม่มี Node.js, รหัส DB ใน `.env` ไม่ถูก | 0 |

**สิ่งที่ตรงข้อกำหนดแล้ว (ห้ามแตะ):** bcrypt + salt, session regenerate ตอน login, logout destroy session, Exclusion Constraint กันจองชน, ไฟล์ดาวน์โหลดผ่าน route ที่ตรวจสิทธิ์ (Anti-IDOR), ชื่อไฟล์ UUID, จำกัด 5MB, Audit Log ลง PostgreSQL, Centralized error handler

---

## ✅ Task Checklist

- [x] **Task 0** — Setup เครื่องให้รันได้ (R11) — เรียบร้อย (Node.js 24 LTS, PostgreSQL 18.6 รหัส 1111)
- [x] **Task 1** — ACL Guard อ่านสิทธิ์สดจาก DB (R2) — เรียบร้อย
- [x] **Task 2** — Route `/api/admin/...` (R1) — เรียบร้อย
- [x] **Task 3** — Rooms ใช้ Dynamic ACL (R3) — เรียบร้อย
- [x] **Task 4** — ตรวจชนิดไฟล์จริงจากเนื้อไฟล์ (R4) — เรียบร้อย
- [x] **Task 5** — แก้ไข/ลบ Role & Permission + กัน Admin หมด (R5, R6) — เรียบร้อย
- [x] **Task 6** — กรอง Log ตามช่วงเวลา (R7) — เรียบร้อย
- [x] **Task 7** — เอกสาร ER / Access Matrix / README (R8–R10) — เรียบร้อย
- [x] **Task 8** — Smoke test + ซ้อม Demo 9 ข้อ — ผ่านทั้ง 5/5 ข้อบนเซิร์ฟเวอร์จริง

---

## Task 0 — Setup เครื่อง (R11)

**เป้าหมาย:** `npm start` แล้วเปิด http://localhost:3000 login ได้

**แนวทาง:**
- ติดตั้ง Node.js LTS ผ่าน `winget` (ต้อง ≥ 20.6 เพราะ `package.json` ใช้ `--env-file`) → ให้ผู้ใช้เปิด terminal ใหม่
- PostgreSQL 18 รันอยู่แล้ว แต่รหัสใน `.env` login ไม่ผ่าน → **ให้ผู้ใช้แก้ `PGPASSWORD` เอง** (ห้ามขอรหัสมาพิมพ์ในแชท)
- ลำดับ: `npm install` → `database/setup_db.js` (สร้าง DB) → `npm run seed` → `npm start`

**ข้อควรระวัง:** `npm run seed` DROP ตารางทั้งหมด — ห้ามรันโดยไม่บอกผู้ใช้

**Verify:** login `admin / admin123` เข้าหน้า `/app` ได้

---

## Task 1 — ACL Guard อ่านสิทธิ์สดจาก DB (R2)

**ไฟล์:** `src/middlewares/auth.js`

**ปัญหา:** `requirePermission` ใช้ `req.session.roleId`, `requireAdmin` ใช้ `req.session.roleName` → เป็นค่าที่จำไว้ตอน login ถ้า Admin เปลี่ยน Role หรือระงับบัญชี ผู้ใช้คนนั้นยังใช้สิทธิ์เดิมได้จนกว่าจะ logout

**ต้องได้ผล:**
- `requirePermission(code)` ตรวจสิทธิ์โดยใช้ **`req.session.userId`** หา role ปัจจุบันจากตาราง `users` แล้วเช็คกับ `role_permissions` + `permissions` **ใน query เดียว** และต้องเช็ค `users.is_active = TRUE` ด้วย
- `requireAdmin` ดึง `role_name` ปัจจุบันจาก DB (ผ่าน `users` JOIN `roles`) แทน session และเช็ค `is_active` → ต้องเปลี่ยนเป็น async + ส่ง error ไป `next(err)`
- ทั้ง `requireAuth` และ `requireAdmin`: ถ้า URL ขึ้นต้นด้วย `/api/` → ตอบ **JSON** (401 ไม่ได้ login / 403 ไม่มีสิทธิ์) แทนการ redirect / render หน้า HTML
- การถูกปฏิเสธยังต้อง `logAudit` action `ACCESS_DENIED` เหมือนเดิม

**ห้าม:** แก้ view ที่ใช้ `session.roleName` แสดงเมนู (เป็นแค่ UI ไม่ใช่ security)

**ประเด็นตอบอาจารย์ (ใส่ในคอมเมนต์):** ทำไมไม่ cache สิทธิ์ไว้ใน session → เพราะต้องการให้แก้สิทธิ์แล้วมีผลทันทีโดยไม่ restart / ไม่ต้อง login ใหม่

**Verify:**
1. `node --check src/middlewares/auth.js`
2. เบราว์เซอร์ A login `somchai` / เบราว์เซอร์ B (incognito) login `admin` → เปลี่ยน role somchai เป็น approver → A กด refresh เห็นสิทธิ์ใหม่ทันที
3. B ระงับบัญชี somchai → A กดเมนูใดก็ได้ ถูกปฏิเสธทันที

---

## Task 2 — Route `/api/admin/...` (R1)

**ไฟล์ใหม่:** `src/routes/apiAdminRoutes.js` | **แก้:** `src/app.js` (mount ต่อจาก `/admin`)

**ต้องได้ผล:**
- Router ใช้ `router.use(requireAuth, requireAdmin)` แบบเดียวกับ `adminRoutes.js`
- Endpoint อ่านอย่างน้อย: รายชื่อผู้ใช้, roles, permissions, ตาราง ACL (role_id × permission_id), log ล่าสุด (จำกัดจำนวน)
- Endpoint เขียนอย่างน้อย 1 ตัว: toggle ACL โดย **reuse** `adminController.togglePermission` (ไม่เขียนซ้ำ)
- ทุก endpoint ตอบ JSON, query แบบ parameterized
- endpoint ผู้ใช้ต้อง **เลือกคอลัมน์ทีละตัว** ห้าม `SELECT *` จาก `users` (กัน `password_hash` หลุด)

**Verify:**
- ไม่ login: `curl.exe -i http://localhost:3000/api/admin/users` → **401 JSON**
- login `somchai` แล้วเปิด URL เดียวกัน → **403 JSON** + มี log `ACCESS_DENIED`
- login `admin` → **200** และในผลลัพธ์ไม่มีคำว่า `password_hash`

---

## Task 3 — Rooms ใช้ Dynamic ACL (R3)

**ไฟล์:** `database/seed.js`, `src/routes/appRoutes.js`, `src/controllers/roomController.js`

**ปัญหา:** route เพิ่มห้อง/เปิด-ปิดห้องเช็คสิทธิ์ด้วย `if roleName in ['admin','facility']` ใน controller → Admin ปรับในตาราง ACL แล้วไม่มีผล = ขัดกฎ Dynamic ACL

**ต้องได้ผล:**
- เพิ่ม permission ใหม่ `room.manage` ใน seed และให้ role `facility` (admin ได้ทุกสิทธิ์อยู่แล้ว)
- route `/rooms/create` และ `/rooms/:id/toggle` ใส่ `requirePermission('room.manage')`
- ลบการเช็ค role แบบ hardcode ออกจาก `createRoom` และ `toggleRoom`

**Verify:** `npm run seed` → `facility` เพิ่มห้องได้ → admin เอาติ๊ก `room.manage` ของ facility ออก → facility กดเพิ่มห้องอีกครั้ง ได้ **403 ทันที**

---

## Task 4 — ตรวจชนิดไฟล์จริงจากเนื้อไฟล์ (R4)

**ไฟล์ใหม่:** `src/middlewares/fileSignature.js` | **แก้:** `src/routes/appRoutes.js` | **ห้ามแก้:** `upload.js`

**ปัญหา:** `file.mimetype` มาจาก header ที่ browser ส่ง → เปลี่ยนชื่อ `virus.exe` เป็น `virus.pdf` ก็ผ่าน

**ต้องได้ผล:**
- middleware ที่ทำงาน **ต่อจาก** `upload.single(...)` ทั้ง 2 จุด (agenda + inspection)
- อ่าน bytes แรกของไฟล์ที่อัปโหลดแล้ว เทียบลายเซ็น (magic number):
  - PDF = `%PDF` (`25 50 44 46`)
  - JPEG = `FF D8 FF`
  - PNG = `89 50 4E 47 0D 0A 1A 0A`
- ไม่ตรงกับ MIME ที่อ้าง → **ลบไฟล์ทิ้งจากดิสก์**, `logAudit` action `FILE_REJECTED` status `DENIED`, ส่ง error status 400 ไป `next(err)` ให้ error handler กลางจัดการ
- ไม่มีไฟล์แนบ → ผ่านไปเลย
- ใช้แค่ `fs` ในตัว Node

**Verify:**
1. อัปโหลด PDF/JPG/PNG จริง → ผ่าน เปิดดูได้
2. เอาไฟล์ `.txt` หรือ `.exe` เปลี่ยนนามสกุลเป็น `.pdf` → **400**, ไม่มีไฟล์ค้างใน `uploads/`, มี log `FILE_REJECTED`
3. ไฟล์ > 5MB → ถูกปฏิเสธ (multer เดิม)

---

## Task 5 — แก้ไข/ลบ Role & Permission + กัน Admin หมด (R5, R6)

**ไฟล์:** `src/controllers/adminController.js`, `src/routes/adminRoutes.js`, `src/views/admin/acl.ejs`

**ต้องได้ผล:**

| ฟีเจอร์ | Route (POST, ใต้ `/admin`) | เงื่อนไขที่ server ต้องบังคับ |
|:--|:--|:--|
| แก้ไข Role | `/roles/:id/update` | แก้ได้แค่ชื่อแสดง + คำอธิบาย (ห้ามแก้ `role_name` เพราะโค้ดอ้างอิงอยู่) |
| ลบ Role | `/roles/:id/delete` | ❌ role `admin` / ❌ ถ้ายังมีผู้ใช้ผูกอยู่ → แจ้งจำนวนคน |
| แก้ไข Permission | `/permissions/:id/update` | แก้ได้แค่คำอธิบาย + หมวด (ห้ามแก้ code) |
| ลบ Permission | `/permissions/:id/delete` | ❌ ถ้าเป็น permission ที่ route ในโค้ดใช้อยู่ (ประกาศเป็นรายการ const พร้อมคอมเมนต์เหตุผล — ไล่หาจาก `requirePermission(...)` ใน `appRoutes.js` + `acl.manage`) |
| ระงับผู้ใช้ | `toggleUserStatus` เดิม | ❌ ห้ามระงับ **Admin ที่ active คนสุดท้าย** (ใช้ logic แบบเดียวกับใน `updateUserRole`) |

- ทุกฟังก์ชัน redirect กลับพร้อม `?success=` / `?error=` ตาม pattern เดิม
- ทุกฟังก์ชัน `logAudit` (`ROLE_UPDATE`, `ROLE_DELETE`, `PERMISSION_UPDATE`, `PERMISSION_DELETE`) — ตอนลบให้เก็บชื่อเดิมใน `details`
- **UI (`acl.ejs`):** อ่านโครงสร้างเดิมก่อน เพิ่มปุ่มแก้ไข/ลบ ที่หัวคอลัมน์ Role และแถว Permission โดยใช้ class CSS ที่มีอยู่ ลบต้องมี `confirm()` / ซ่อนปุ่มลบของสิ่งที่ลบไม่ได้ (แต่ server ต้องกันด้วย — อาจารย์ย้ำว่าซ่อนปุ่มไม่นับเป็นการป้องกัน)

**Verify:**
- สร้าง role ทดสอบ → แก้ชื่อ → ลบ ได้ทั้งหมด
- ลบ role `requester` → ถูกปฏิเสธ (มี somchai)
- ลบ permission `file.view` → ถูกปฏิเสธ
- ระงับ `admin` (คนเดียวในระบบ) → ถูกปฏิเสธ
- ทุกการกระทำขึ้นในหน้า Log

---

## Task 6 — กรอง Log ตามช่วงเวลา (R7)

**ไฟล์:** `adminController.js` (`getAuditLogs`, `exportAuditLogs`), `src/views/admin/logs.ejs`

**ต้องได้ผล:**
- รับ query `from` และ `to` (วันที่) → กรอง `created_at` (ให้ `to` ครอบคลุมทั้งวัน)
- ใช้ parameterized query ต่อจาก pattern `params.push(...)` เดิม
- `limit` ต้อง validate เป็นจำนวนเต็ม 1–500 (ตอนนี้ต่อ string ลง SQL ตรงๆ ถ้าส่งค่าแปลกจะ error)
- ฟอร์มใน `logs.ejs` เพิ่มช่อง `<input type="date">` 2 ช่อง และจำค่าที่กรองไว้
- export CSV ใช้ตัวกรองชุดเดียวกัน (ถ้า export เดิมรับ filter อยู่แล้ว)
- ตัวกรองเดิม (action / status / search ชื่อผู้ใช้) ต้องยังใช้ได้

**Verify:** กรองวันนี้ → เห็นเฉพาะ log วันนี้ / กรองวันที่ในอนาคต → ว่าง / ใส่ `?limit=abc` → ไม่ error

---

## Task 7 — เอกสารส่งอาจารย์ (R8–R10)

**ห้ามแตะโค้ด** เขียนเป็น Markdown ใน `docs/` และต่อท้าย `README.md`
**กฎเหล็ก:** ทุกชื่อตาราง/คอลัมน์/สิทธิ์ ต้องคัดจากไฟล์จริง ห้ามแต่งเพิ่ม

### 7.1 `docs/ER_DIAGRAM.md` (Rubric 3)
- แหล่งข้อมูล: `database/schema.sql` เท่านั้น (8 ตาราง)
- Mermaid `erDiagram` แสดงทุกคอลัมน์ + PK/FK
- Cardinality ที่ต้องมี: roles–users (1:N), roles–permissions (N:M ผ่าน role_permissions), users–room_bookings (1:N ในฐานะผู้จอง และ 0..N ในฐานะ approver / facility officer), rooms–room_bookings (1:N), room_bookings–booking_attachments (1:N), users–booking_attachments (1:N), users–audit_logs (0..1:N)
- ตาราง Constraint: Exclusion `no_overlapping_active_bookings`, CHECK ทั้ง 2 ตัว, พฤติกรรม `ON DELETE` ของแต่ละ FK
- ย่อหน้าสั้น "ตอบอาจารย์": ทำไมกันจองชนที่ DB แทนเช็คใน JS (Race Condition)

### 7.2 `docs/ACCESS_MATRIX.md` (Rubric 6)
- ตาราง 1: Role × Permission (✅/❌) จาก `rolePermMap` ใน `seed.js` (หลัง Task 3)
- ตาราง 2: Role × Resource × Action (Create / Read / Update / Delete / Approve) พร้อม **เงื่อนไขขอบเขต** เช่น "เฉพาะของตนเอง" — ต้องอ่าน `bookingController.js` / `fileController.js` ยืนยันก่อนเขียนทุกเงื่อนไข
- ตาราง 3: Route → Middleware chain → Permission (จาก `appRoutes.js`, `adminRoutes.js`, `apiAdminRoutes.js`)
- หมายเหตุ: ตารางนี้คือค่าเริ่มต้นจาก seed — Admin ปรับได้สดที่ `/admin/acl`

### 7.3 `README.md` (Deliverables) — เพิ่มท้ายไฟล์ ห้ามลบของเดิม
- ขั้นตอนติดตั้ง (ตาม Task 0) + ตัวแปรที่ต้องตั้งใน `.env` (อ้าง `.env.example`)
- ตารางบัญชีทดสอบ 4 Roles (คัดจาก `usersList` ใน `seed.js`)
- ลิงก์ไปเอกสาร ER / Access Matrix

**Verify:** preview Markdown → Mermaid render ได้ / สุ่มเทียบ 5 คอลัมน์กับ `schema.sql` ต้องตรง

---

## Task 8 — Smoke Test + ซ้อม Demo

**ไฟล์ใหม่:** `test/smoke.js` | **แก้:** `package.json` เพิ่ม script `test`

**ต้องได้ผล:** script ใช้ `fetch` ในตัว Node (ไม่เพิ่ม dependency) login ผ่าน `POST /login` เก็บ cookie session แล้วเช็ค:
1. ไม่ login → `/api/admin/users` = 401
2. `somchai` → `/api/admin/users` = 403
3. `somchai` → `/admin/acl` = 403
4. `admin` → `/api/admin/users` = 200 และไม่มี `password_hash`
5. รหัสผิด → ถูก redirect กลับหน้า login พร้อม error

พิมพ์ ✅/❌ ทีละข้อ, exit code 1 ถ้ามีข้อพลาด

**Verify:** `npm start` (terminal 1) + `npm test` (terminal 2) → ผ่าน 5/5

**จากนั้น:** ไล่ [RUBRIC_CHECKLIST.md](./RUBRIC_CHECKLIST.md) หมวด 2 ทั้ง 9 ข้อด้วยมือ ติ๊กข้อที่ผ่าน ข้อที่ไม่ผ่าน **รายงานผู้ใช้ ห้ามแก้นอกแผน**

---

## 🔁 หลังจบทุก Task
สลับกลับมาหา Claude แล้วสั่ง: *"ตรวจ git diff ตาม IMPLEMENTATION_PLAN.md"*

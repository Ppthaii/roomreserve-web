# ✂️ REFACTOR TODO — ลดความยาวโค้ด (Zero Logic Loss)

> **ผู้วางแผน:** Polaris (ตรวจโครงสร้างไฟล์จริง 2026-10-26) | **ผู้เขียนโค้ด:** Model อื่น
> **วิธีใช้:** สั่งทีละ Task เช่น *"ทำ R1 ใน REFACTOR_TODO.md"* → เสร็จแล้วติ๊ก `[x]` + รายงานผล Verify
> **เป้าหมาย:** ไฟล์สั้นลง อ่านง่าย ตอบอาจารย์ได้ง่าย — **ฟังก์ชันทุกอย่างต้องเหมือนเดิม 100%**

---

## 🛑 กฎเหล็ก (อ่านก่อนเริ่มทุก Task)

1. **ห้ามลบ / ตัด / เปลี่ยนพฤติกรรม ฟีเจอร์ใดๆ เด็ดขาด** — เป็นการ "ย้ายที่อยู่" ของโค้ดเท่านั้น (Cut → Paste)
2. **ห้ามเปลี่ยนชื่อ** `id`, `class`, ชื่อฟังก์ชัน JS, ชื่อตัวแปร, ชื่อ field ในฟอร์ม, URL ของ route
3. **ห้ามแตะ** `src/controllers/`, `src/routes/`, `src/middlewares/`, `src/config/`, `database/`, `src/public/theme.js`
4. **ห้ามเพิ่ม dependency ใหม่** ใช้แค่ `<%- include() %>` ของ EJS และ `express.static` ที่มีอยู่แล้ว ([app.js:26](./src/app.js))
5. JS ที่ย้ายออกไป **ต้องเป็น global เหมือนเดิม** (ห้ามใส่ `type="module"`, ห้ามห่อด้วย IIFE) เพราะ HTML ใช้ `onclick="..."` เรียกฟังก์ชันตรงๆ
6. คงลำดับการโหลดเดิม: `<script src>` ใหม่ต้องอยู่ **ตำแหน่งเดียวกับ `<script>` เดิม** / `<link>` CSS ใหม่ต้องอยู่ **หลัง** `style.css`
7. คอมเมนต์ภาษาไทยเดิมต้องย้ายไปด้วยครบ + ใส่คอมเมนต์หัวไฟล์ใหม่ 1 บรรทัดว่าไฟล์นี้คืออะไร
8. **ทำทีละ Task → Verify → Commit 1 ครั้งต่อ Task** ถ้า Verify ไม่ผ่าน ให้ `git checkout .` แล้วหยุดถามผู้ใช้ ห้ามเดาแก้ต่อ

---

## 📊 สถานะปัจจุบัน (วัดจริง)

| ไฟล์ | บรรทัด | ปัญหา |
|:--|:-:|:--|
| [dashboard.ejs](./src/views/dashboard.ejs) | **2,168** | CSS inline (L20–157) + JS inline (L1452–2100) + HTML 4 Roles + Modals ในไฟล์เดียว |
| [admin/acl.ejs](./src/views/admin/acl.ejs) | 394 | CSS inline (L20–63) + JS inline (L300–394) |
| [login.ejs](./src/views/login.ejs) | 167 | CSS inline (L20–96) |
| `<head>` L1–19 | ซ้ำ 6 ไฟล์ | dashboard, login, rooms, admin/acl, admin/logs, admin/users |
| `<nav class="navbar">` | ซ้ำ 4 ไฟล์ | admin/acl, admin/logs, admin/users, rooms (ต่างกันแค่ลิงก์ `active`) |

---

## ✅ Task Checklist

- [ ] **R0** — Baseline ก่อนเริ่ม (บังคับ)
- [ ] **R1** — แยก CSS inline ออกเป็นไฟล์ `.css`
- [ ] **R2** — แยก JS inline ของ `acl.ejs` → `public/acl.js`
- [ ] **R3** — แยก JS inline ของ `dashboard.ejs` → `public/dashboard.js` (⚠️ มีตัวแปร EJS ปน)
- [ ] **R4** — สร้าง partial `head.ejs` ใช้ร่วม 6 ไฟล์
- [ ] **R5** — สร้าง partial `navbar.ejs` ใช้ร่วม 4 ไฟล์
- [ ] **R6** — หั่น HTML ของ `dashboard.ejs` เป็น partials ตาม Subview (⚠️ ต้องส่งตัวแปรเอง)
- [ ] **R7** — Verify รวมทั้งระบบ + อัปเดต README

---

## R0 — Baseline ก่อนเริ่ม

- [ ] `git checkout -b refactor/split-views` (ทำบน branch แยก ไม่ทำบน `main`)
- [ ] รันเซิร์ฟเวอร์ `npm run dev` แล้วรัน `npm test` → ต้องผ่าน **6/6** และ `node test/verify_permissions_views.js` ต้องผ่าน
- [ ] ล็อกอินทีละ Role (`admin`, `manager`, `facility`, `somchai` — รหัสดู [README](./README.md)) เปิดหน้า `/app` แล้วรันใน Console:
  ```js
  [document.querySelectorAll('[id]').length, document.querySelectorAll('[onclick]').length, document.querySelectorAll('form').length]
  ```
  **จดตัวเลข 3 ค่าของแต่ละ Role ไว้** → หลัง Refactor ทุก Task ตัวเลขต้อง **เท่าเดิมเป๊ะ** (หลักฐานว่าไม่มีอะไรหาย)

---

## R1 — แยก CSS inline ออกเป็นไฟล์

| ต้นทาง | ปลายทาง | ใส่ `<link>` ที่ |
|:--|:--|:--|
| `dashboard.ejs` เนื้อใน `<style>` L21–156 | `src/public/dashboard.css` | แทนที่ `<style>…</style>` เดิม |
| `admin/acl.ejs` เนื้อใน `<style>` L21–62 | `src/public/acl.css` | แทนที่ `<style>…</style>` เดิม |
| `login.ejs` เนื้อใน `<style>` L21–95 | `src/public/login.css` | แทนที่ `<style>…</style>` เดิม |

- [ ] ก่อนย้าย grep หา `<%` ในบล็อก `<style>` — ถ้าเจอ **หยุดถามผู้ใช้** (ไฟล์ .css render EJS ไม่ได้)
- [ ] **ห้ามรวมเข้า `style.css`** (จะเปลี่ยนลำดับ cascade และ dark mode อาจเพี้ยน) ให้เป็นไฟล์แยก
- [ ] Verify: Light + Dark mode หน้าตาเหมือนเดิมทุก Role / หน้า Login / หน้า ACL

---

## R2 — แยก JS ของ `acl.ejs` → `src/public/acl.js`

- [ ] ย้ายเนื้อใน `<script>` L301–393 ไปไว้ใน `acl.js` (ตรวจแล้ว: **ไม่มีตัวแปร EJS ปน** ย้ายตรงได้เลย)
- [ ] แทนที่ด้วย `<script src="/acl.js"></script>` ที่ตำแหน่งเดิม (ท้าย body)
- [ ] Verify: ติ๊ก/ยกเลิกสิทธิ์ในตาราง ACL, เพิ่ม/แก้/ลบ Role & Permission, ปุ่ม Edit ทุกปุ่ม → ทำงานเหมือนเดิม, Console ไม่มี error

> `rooms.ejs` (script 4 บรรทัด) และ `login.ejs` (script 4 บรรทัด) **ไม่ต้องแยก** สั้นอยู่แล้ว

---

## R3 — แยก JS ของ `dashboard.ejs` → `src/public/dashboard.js`

**⚠️ จุดอันตราย:** ใน `<script>` (L1452–2100) มีค่าจาก Server ฝังด้วย EJS **7 จุด** ซึ่งไฟล์ `.js` ใน `public/` render ไม่ได้:

| บรรทัด | โค้ดเดิม |
|:-:|:--|
| 1454 | `const DAY_BOOKINGS = <%- JSON.stringify(dayBookings) %>;` |
| 1455 | `const ROOMS = <%- JSON.stringify(rooms) %>;` |
| 1810 | `if (formDate && formDate !== '<%= selectedDate %>') {` |
| 1876 | `const CAN_BOOK = <%= canBook ? 'true' : 'false' %>;` |
| 1877 | `const CAN_VIEW_OWN = <%= canViewOwnBookings ? 'true' : 'false' %>;` |
| 2009 | ``const slotStart = new Date(`${'<%= selectedDate %>'}T${hStartStr}:00`);`` |
| 2010 | ``const slotEnd = new Date(`${'<%= selectedDate %>'}T${hEndStr}:00`);`` |

**แนวทาง (Data Bridge):**
- [ ] เหลือ `<script>` สั้นๆ ไว้ใน `dashboard.ejs` ที่ตำแหน่งเดิม ประกาศค่าจาก Server ไว้ใน global ก่อน:
  - `DAY_BOOKINGS`, `ROOMS`, `CAN_BOOK`, `CAN_VIEW_OWN` (ประกาศด้วยรูปแบบเดิมทุกตัวอักษร)
  - เพิ่ม `const SELECTED_DATE = '<%= selectedDate %>';`
- [ ] ตามด้วย `<script src="/dashboard.js"></script>` ทันที
- [ ] ใน `dashboard.js` ลบเฉพาะบรรทัดประกาศที่ย้ายไปแล้ว และเปลี่ยน `'<%= selectedDate %>'` 3 จุด (L1810, 2009, 2010) เป็น `SELECTED_DATE`
- [ ] **ห้ามแก้บรรทัดอื่นใน JS** แม้แต่ format
- [ ] Verify: จองห้องปกติ, ปุ่มจองด่วน (+1, +2, ครึ่งวัน), เลือกช่วงเวลาใน Time Grid, เปลี่ยนวันที่, ตัวกรองคำขอของฉัน (Segmented Control), Modal ปฏิเสธ, Modal พรีวิวไฟล์, สลับ Subview ทุกแท็บ (Desktop + Mobile Bottom Nav) → เหมือนเดิม, Console ไม่มี error

---

## R4 — Partial `src/views/partials/head.ejs`

- [ ] เทียบ `<head>` L1–19 ของทั้ง 6 ไฟล์ก่อน (`git diff --no-index`) ส่วนที่ **เหมือนกันทุกไฟล์** เท่านั้นที่ย้ายเข้า partial
- [ ] ส่วนที่ต่างกัน (เช่น `<title>`, CSS เฉพาะหน้า) ให้คงไว้ในไฟล์เดิม หรือส่งเป็นพารามิเตอร์ `<%- include('partials/head', { pageCss: '/acl.css' }) %>`
- [ ] Verify: View Source ของทุกหน้า → meta PWA, manifest, apple-touch-icon, theme.js ครบ / Add to Home Screen บนมือถือยังเปิดเต็มจอ

---

## R5 — Partial `src/views/partials/navbar.ejs`

- [ ] เทียบ `<nav class="navbar">` ของ `admin/acl`, `admin/logs`, `admin/users`, `rooms` — ต่างกันที่ลิงก์ไหนมี `class="active"`
- [ ] ทำ partial รับพารามิเตอร์ `active` เช่น `<%- include('partials/navbar', { active: 'logs' }) %>` แล้วใส่ `class="active" style="..."` ให้ตรงกับของเดิมทุกตัวอักษร
- [ ] **ไม่รวม navbar ของ `dashboard.ejs`** (มีเงื่อนไข `isAdmin` + flash message ต่างจากหน้าอื่น)
- [ ] Verify: 4 หน้า → ลิงก์ครบ, ไฮไลต์หน้าปัจจุบันถูก, ปุ่ม Theme / Logout ใช้ได้

---

## R6 — หั่น HTML ของ `dashboard.ejs` เป็น Partials

**⚠️ จุดอันตรายที่สุด:** ตัวแปรที่ประกาศใน `<% %>` ของ `dashboard.ejs` (L266–300) **จะไม่ถูกส่งเข้า partial อัตโนมัติ** (EJS ส่งให้เฉพาะ locals จาก Controller) ถ้าไม่ส่งเอง → หน้าพัง `ReferenceError` หรือแย่กว่านั้นคือ **ปุ่มตามสิทธิ์หายเงียบๆ**

**แนวทาง:**
- [ ] คงบล็อกคำนวณ L266–300 ไว้ใน `dashboard.ejs` เหมือนเดิม แล้วต่อท้ายด้วย:
  ```ejs
  <% const v = { curDate, nextDate, nextDateStr, todayStr, isToday, formattedThaiDate,
                 activeRoomsCount, bookedRoomIds, fullyFreeRoomsCount,
                 perms, canApprove, canFacility, canBlockSchedule, isAdminUser,
                 isApproverRole, isFacilityRole, isAdminRole, canBook, canViewOwnBookings }; %>
  ```
- [ ] เรียกทุก partial ด้วย `<%- include('partials/dashboard/xxx', v) %>`
- [ ] **ตัดตรงเครื่องหมายคอมเมนต์ `<!-- ===== ... ===== -->` เดิม** และต้องตัดให้ `<% if (...) { %>` กับ `<% } %>` คู่กันอยู่ในไฟล์เดียวกัน (ห้ามเปิด if ไฟล์หนึ่ง ปิดอีกไฟล์)
- [ ] เงื่อนไข `<% if (canBook) { %>` ที่ครอบ Subview ให้ **คงไว้ใน `dashboard.ejs`** ครอบ include (อ่านง่าย เห็นสิทธิ์ชัดตอนตอบอาจารย์)

**รายการชิ้นส่วน** (บรรทัดโดยประมาณ — ยึดคอมเมนต์ในไฟล์จริงเป็นหลัก):

| # | ชิ้นส่วน | บรรทัดเดิม | ไฟล์ partial ใหม่ |
|:-:|:--|:-:|:--|
| 1 | Modal พรีวิวไฟล์ + Modal ปฏิเสธ | 162–~235 | `partials/dashboard/modals.ejs` |
| 2 | Toast + Desktop Sub-Nav | 302–365 | `partials/dashboard/subnav.ejs` |
| 3 | Subview 1: หน้าหลัก (การ์ดตึก + ห้องว่าง) | 366–614 | `partials/dashboard/home.ejs` |
| 4 | Subview 2: ฟอร์มจองห้อง + Time Grid | 615–822 | `partials/dashboard/booking.ejs` |
| 5 | Subview 3: คำขอของฉัน | 823–980 | `partials/dashboard/my_bookings.ejs` |
| 6 | Subview 4: โปรไฟล์ | 981–1058 | `partials/dashboard/profile.ejs` |
| 7 | Approver: คิวอนุมัติ + Rollback | 1059–1165 | `partials/dashboard/approvals.ejs` |
| 8 | Facility: งานส่งมอบห้อง | 1166–1243 | `partials/dashboard/facility_tasks.ejs` |
| 9 | Facility: ปิดซ่อมบำรุง | 1244–1351 | `partials/dashboard/maintenance.ejs` |
| 10 | Admin: Time Slots Matrix | 1352–1448 | `partials/dashboard/timeline.ejs` |
| 11 | Mobile Bottom Nav | 2102–2165 | `partials/dashboard/bottom_nav.ejs` |

- [ ] ทำทีละ 1–2 ชิ้น → รีเฟรช → เช็คตัวเลข R0 → ค่อยทำชิ้นถัดไป
- [ ] Verify หลังทุกชิ้น: ล็อกอินครบ 4 Role, ตัวเลข `[id, onclick, form]` ต้องเท่ากับ Baseline R0

---

## R7 — Verify รวม + เอกสาร

- [ ] `npm test` ผ่าน 6/6 + `node test/verify_permissions_views.js` ผ่าน
- [ ] ตัวเลข R0 ของทั้ง 4 Role เท่าเดิมทุกค่า
- [ ] เดิน [Live Demo 9 ข้อ](./RUBRIC_CHECKLIST.md) ครบ ไม่มีข้อไหนพัง
- [ ] ทดสอบบนมือถือ/iPad: Bottom Nav, PWA เต็มจอ, Dark mode
- [ ] `git diff --stat main` → ไม่มีไฟล์ใน `controllers/`, `routes/`, `middlewares/`, `database/` ถูกแก้
- [ ] อัปเดตโครงสร้างโฟลเดอร์ใน [README.md](./README.md) ให้มี `views/partials/` และไฟล์ `.js` / `.css` ใหม่
- [ ] ผู้ใช้ตรวจแล้ว → merge เข้า `main` และ push

---

## 🎯 ผลลัพธ์ที่คาดหวัง

| ไฟล์ | ก่อน | หลัง (ประมาณ) |
|:--|:-:|:-:|
| `dashboard.ejs` | 2,168 | ~250 (โครง + บล็อกคำนวณสิทธิ์ + include) |
| `admin/acl.ejs` | 394 | ~230 |
| `login.ejs` | 167 | ~90 |
| ไฟล์ใหญ่สุดใน `views/` | 2,168 | ~250 |

> **ไม่อยู่ในขอบเขต (ห้ามทำ):** แยก `adminController.js` (566 บรรทัด — ยาวแต่แบ่งเป็นฟังก์ชันชัดเจนแล้ว แตะแล้วเสี่ยง route พัง), จัด format `style.css`, เปลี่ยนสไตล์โค้ด, แก้บั๊กอื่นที่เจอระหว่างทาง (ให้จดไว้แล้วแจ้งผู้ใช้แทน)

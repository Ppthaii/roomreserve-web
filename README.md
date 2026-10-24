# 🌐 โครงงานวิชา Web Application (Management System)

โฟลเดอร์นี้จัดทำขึ้นสำหรับโปรเจกต์วิชาพัฒนาเว็บแอปพลิเคชัน สำหรับบริหารจัดการระบบงานโดยเฉพาะ (คะแนนเต็ม 30 คะแนน)

### 🎯 หัวข้อที่เลือก (Selected Project Topic):
* **ชื่อระบบ:** RoomReserve (SmartSpace) — ระบบบริหารจัดการจองห้องประชุมและทรัพยากรส่วนกลาง
* **บริบท:** การจองห้องประชุม สัมมนา และห้องแล็บ พร้อมอุปกรณ์โสตทัศนูปกรณ์ ป้องกันการจองชนกันด้วย Database Concurrency Lock
* **4 Roles ที่แน่นอน:**
  1. `Requester` (ผู้ขอใช้ห้อง/พนักงาน): ยื่นคำขอยื่นจองห้อง + แนบวาระการประชุม/ผังจัดโต๊ะ + ดูเฉพาะรายการตนเอง
  2. `Approver` (หัวหน้างาน/ผู้พิจารณา): ตรวจสอบความสมเหตุสมผลของการใช้ห้อง + อนุมัติ/ปฏิเสธคำขอ
  3. `Facility` (เจ้าหน้าที่สถานที่/โสตฯ): บล็อกวันปิดซ่อม/งานใหญ่ล่วงหน้า + ส่งมอบห้อง (Check-in) + ตรวจรับห้องพร้อมแนบรูปถ่าย (Check-out)
  4. `Admin` (ผู้ดูแลระบบ): คุมตาราง Dynamic ACL สดหน้าเว็บ + จัดการผู้ใช้ + ดู Audit Log (ไม่ลงมาทำงานธุรการ)
* **เป้าหมายสำคัญของผู้ใช้:** เน้นโค้ดที่อ่านเข้าใจง่าย เรียนรู้ทีละสเต็ป พร้อมเทคนิค Concurrency Guard ระดับ Enterprise ป้องกัน Race Condition และ Double-Booking

---

## 📁 สารบัญเอกสารและแนวทางการพัฒนา

* 📜 **[AGENTS.md](file:///e:/Agents-System/web-project/AGENTS.md):** ข้อบังคับและกฎเหล็กในการทำงานของ AI สำหรับโปรเจกต์นี้
* 🛡️ **[web_project_rules.md](file:///e:/Agents-System/.agents/rules/web_project_rules.md):** กฎการบังคับใช้ระดับ Workspace (Architecture, Security, ACL, Logging)
* 📋 **[PROJECT_SPEC.md](file:///e:/Agents-System/web-project/PROJECT_SPEC.md):** สเปกและข้อกำหนดของระบบแบบละเอียดถอดจากเอกสารโจทย์ทุกข้อ
* 🏆 **[RUBRIC_CHECKLIST.md](file:///e:/Agents-System/web-project/RUBRIC_CHECKLIST.md):** ตารางเกณฑ์คะแนน 30 คะแนน และเช็คลิสต์สาธิตสด 9 ข้อ

---

## 🚀 สรุปโครงสร้างระบบที่ต้องสร้าง (Target Architecture)

```text
web-project/
├── AGENTS.md               # กฎข้อบังคับสำหรับ Agent ในโปรเจกต์นี้
├── PROJECT_SPEC.md         # เอกสารสเปกข้อกำหนดระบบฉบับเต็ม
├── RUBRIC_CHECKLIST.md     # เช็คลิสต์เกณฑ์ประเมินและ 9 ขั้นตอนสาธิตสด
├── README.md               # เอกสารหน้าแรกและคู่มือแนะนำ
├── .env.example            # ตัวอย่างการตั้งค่า Environment Variables
├── docs/                   # เอกสาร ER Diagram, Access Matrix, สไลด์
├── src/                    # Source Code ฝั่ง Server (Node.js & Express.js)
│   ├── config/             # การเชื่อมต่อ Database (PostgreSQL)
│   ├── middlewares/        # Auth, ACL Guard, Audit Logger, Upload Validator
│   ├── routes/             # แยกส่วน /app, /admin, /api/admin
│   ├── controllers/        # Business Logic ของระบบงาน
│   └── views/ or public/   # Frontend (HTML, CSS, JS สไตล์คลีน ใช้งานง่าย)
└── database/               # สคริปต์ SQL สร้างตาราง (Schema) และ Seed Data
```

---

## 🎯 กฎสำคัญที่ต้องรักษาเสมอ (Core Rules)
1. **Dynamic ACL:** Admin แก้สิทธิ์หรือเพิ่ม Role/Permission บนหน้าเว็บแล้วต้องมีผลทันที **โดยไม่ต้อง Restart Server**
2. **Server-side Security:** ตรวจสอบสิทธิ์และขนาด/ชนิดไฟล์ที่ Middleware ฝั่ง Server ทุก Route (ห้ามพึ่งพาแค่การซ่อนปุ่มบนหน้าเว็บ)
3. **Audit Log ใน PostgreSQL:** บันทึก Login, CRUD สำคัญ, การแก้สิทธิ์, การพยายามเข้าถึงที่ถูกปฏิเสธ (403) อย่างครบถ้วน และเรียกดูย้อนหลังได้
4. **โค้ดเข้าใจง่าย:** สะอาด มีระเบียบ พร้อมคอมเมนต์ภาษาไทยอธิบายจุดสำคัญ เพื่อให้อ่านเข้าใจและพร้อมตอบคำถามตอนพรีเซนต์

---

## 🛠️ ขั้นตอนการติดตั้งและรันระบบ (Setup & Running Guide)

### 1. ความต้องการของระบบ (Prerequisites)
- **Node.js:** เวอร์ชั่น `>= 20.6.0` (รองรับฟีเจอร์ Native `--env-file`)
- **PostgreSQL:** เวอร์ชั่น 15 ขึ้นไป (พร้อมเปิดใช้งาน Extension `btree_gist`)

### 2. การตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.example` ไปเป็น `.env` แล้วระบุข้อมูลการเชื่อมต่อฐานข้อมูล:
```bash
cp .env.example .env
```
ตรวจสอบและตั้งค่าใน `.env`:
```ini
PGHOST=localhost
PGPORT=5432
PGDATABASE=roomreserve_db
PGUSER=postgres
PGPASSWORD=รหัสผ่าน_PostgreSQL_ของคุณ
PORT=3000
SESSION_SECRET=roomreserve_super_secret_session_key_2026_x99!
ADMIN_ROLE_ID=1
```

### 3. ติดตั้ง Dependencies และสร้างฐานข้อมูล
```bash
# ติดตั้ง Library ที่จำเป็น (Express, EJS, pg, bcryptjs, multer, express-session)
npm install

# สร้างฐานข้อมูล roomreserve_db อัตโนมัติ (หากยังไม่มี)
node --env-file=.env database/setup_db.js

# รัน Schema และนำเข้าข้อมูลเริ่มต้น (Seed Roles, Permissions, Users, Rooms)
npm run seed
```

### 4. สตาร์ทเซิร์ฟเวอร์
```bash
npm start
```
เปิดเบราว์เซอร์ไปที่: **http://localhost:3000**

---

## 👥 ตารางบัญชีผู้ใช้ทดสอบ 4 Roles (Test Accounts)

| บทบาท (Role) | บัญชีผู้ใช้ (Username) | รหัสผ่าน (Password) | สิทธิ์และการทดสอบเด่น |
| :--- | :--- | :--- | :--- |
| **Admin** (ผู้ดูแลระบบ) | `admin` | `admin123` | เข้าถึงทุกหน้า, จัดการตาราง ACL สด, สร้าง Role/Perm, ดูและส่งออก Audit Logs |
| **Approver** (ผู้อนุมัติ) | `manager` | `approver123` | ตรวจดูวาระการประชุม และกดอนุมัติ/ปฏิเสธคำขอจองห้อง |
| **Facility** (เจ้าหน้าที่อาคาร) | `facility` | `facility123` | เพิ่มห้อง, สลับเปิด/ปิดห้อง, ส่งมอบห้อง (Check-in), ตรวจรับห้องพร้อมแนบรูปถ่าย |
| **Requester** (ผู้ขอใช้ห้อง) | `somchai` | `user123` | ดูตารางปฏิทินห้องว่าง, ยื่นจองห้องพร้อมแนบวาระ, ยกเลิกคำขอตนเอง |

---

## 📚 เอกสารประกอบโครงงานฉบับสมบูรณ์
* 📊 [แผนผังความสัมพันธ์ฐานข้อมูล (ER Diagram)](file:///e:/Agents-System/web-project/docs/ER_DIAGRAM.md)
* 🛡️ [ตารางกำหนดสิทธิ์และการควบคุมความปลอดภัย (Access Matrix)](file:///e:/Agents-System/web-project/docs/ACCESS_MATRIX.md)
* 🏆 [เช็คลิสต์การสาธิตสด 9 ข้อ (Rubric Checklist)](file:///e:/Agents-System/web-project/RUBRIC_CHECKLIST.md)
* 📋 [สเปกข้อกำหนดระบบฉบับเต็ม (Project Spec)](file:///e:/Agents-System/web-project/PROJECT_SPEC.md)

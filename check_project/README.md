# RoomReserve (SmartSpace)
### ระบบบริหารจัดการจองห้องประชุมและทรัพยากรส่วนกลางอัจฉริยะ
**วิชา:** พัฒนาเว็บแอปพลิเคชัน สำหรับบริหารจัดการระบบงาน (Web Application Development for Enterprise Management) — คะแนนเต็ม 30 คะแนน  
**เทคโนโลยี:** Node.js, Express.js, PostgreSQL (GIST Engine), EJS, Dynamic ACL, Bcrypt, Multer

---

## 1. ข้อกำหนดของระบบ (Prerequisites)
1. **Node.js:** เวอร์ชั่น 18+ หรือ 20+
2. **PostgreSQL:** เวอร์ชั่น 15+ หรือใหม่กว่า (พร้อม Extension `btree_gist`)

---

## 2. ขั้นตอนการติดตั้งและรันระบบ (Setup Instructions)

### ขั้นตอนที่ 1: ติดตั้ง Dependencies
```bash
npm install
```

### ขั้นตอนที่ 2: ตั้งค่าฐานข้อมูล PostgreSQL
1. เปิด pgAdmin หรือ psql เพื่อสร้างฐานข้อมูล:
   ```sql
   CREATE DATABASE roomreserve_db;
   ```
2. รันสคริปต์สร้างตาราง (Database Schema):
   ```bash
   psql -U postgres -d roomreserve_db -f database/schema.sql
   ```
   *(หรือเปิดไฟล์ `database/schema.sql` ใน pgAdmin / DBeaver แล้วกด Execute)*
3. รันสคริปต์สร้างข้อมูลตั้งต้น (Seed Data - สร้าง Roles, 14 Permissions, Dynamic ACL Matrix, ผู้ใช้เริ่มต้น 4 Roles และห้องประชุม):
   ```bash
   npm run seed
   ```

### ขั้นตอนที่ 3: ตั้งค่าไฟล์ `.env`
ตรวจสอบไฟล์ `.env` ในโฟลเดอร์โปรเจกต์ (ปรับรหัสผ่านฐานข้อมูลให้ตรงกับเครื่องของท่าน):
```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=roomreserve_db
SESSION_SECRET=roomreserve_secret_2026_enterprise_production
SESSION_TIMEOUT_MS=1800000
MAX_FILE_SIZE_BYTES=5242880
```

### ขั้นตอนที่ 4: รันเซิร์ฟเวอร์
```bash
npm start
```
หรือรันในโหมด Development:
```bash
npm run dev
```
เปิดเบราว์เซอร์เข้าใช้งานที่: **`http://localhost:3000`**

---

## 3. บัญชีผู้ใช้สำหรับการทดสอบ (Default Test Accounts)

| บทบาท (Role) | Username | Password | หน้าที่และสิทธิ์การใช้งาน |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | จัดการ Dynamic ACL Matrix สด, จัดการบัญชีผู้ใช้, ระงับบัญชี, และดู Security Audit Logs ทั้งหมด |
| **Approver** | `manager` | `approver123` | ตรวจสอบคำขอจองห้อง, พิจารณาอนุมัติ/ปฏิเสธ (ระบบ Auto-Reject คิวที่เวลาชนกันอัตโนมัติ) |
| **Facility Officer** | `facility` | `facility123` | บล็อกปิดห้องซ่อมบำรุงล่วงหน้า, ส่งมอบห้อง (Check-in), ตรวจรับห้องพร้อมแนบรูปถ่าย (Check-out) |
| **Requester** | `somchai` | `user123` | ยื่นจองห้องประชุม, แนบไฟล์วาระการประชุม PDF, ดูเฉพาะรายการตนเอง, ยกเลิกคำขอของตนเอง |

---

## 4. การทดสอบอัตโนมัติ 14 ชุดคำสอบ (14 Automated Test Cases)
ระบบมีชุดคำสั่งทดสอบความปลอดภัยครบถ้วน 14 ข้อ ครอบคลุม Authentication, Session Fixation, Dynamic ACL, Concurrency Guard, และ Magic Bytes File Verification:
```bash
npm test
```
*(ระหว่างที่เซิร์ฟเวอร์กำลังรัน ผลการทดสอบจะแสดงผลผ่าน 14/14 ข้อ 100% Pass)*

---

## 5. สไลด์นำเสนอโครงงาน 18 สไลด์ (Presentation Slides)
* **ไฟล์สไลด์นำเสนอฉบับ PDF (พร้อมส่งมอบ):** `docs/RoomReserve_Presentation_Slides.pdf` (สไลด์ 18 หน้าขนาด 16:9 สำหรับนำเสนอและเปิดบน iPad)
* **เปิดดูสไลด์แบบ Interactive ทางเว็บ:** [http://localhost:3000/slides](http://localhost:3000/slides)
* **ไฟล์เอกสารสไลด์:** `docs/presentation.html`
* **เอกสารเนื้อหาบทบรรยายสไลด์:** `docs/ROOMRESERVE_PRESENTATION_SLIDES.md`

---

## 6. ลำดับการสาธิตสด 9 ขั้นตอนต่อหน้าอาจารย์ (ตามเกณฑ์ประเมินข้อ 10 หน้า 6–7)
1. **กระบวนการหลักตั้งแต่เริ่มต้นจนเสร็จสิ้น:** Requester (somchai) ยื่นจองห้องประชุม ➔ แนบไฟล์วาระการประชุม PDF ➔ Approver (manager) อนุมัติ ➔ Facility (facility) กด Check-in ส่งมอบห้อง ➔ กด Check-out ตรวจสภาพห้องพร้อมแนบรูปถ่ายการตรวจสอบ ➔ สถานะเป็น COMPLETED
2. **เข้าสู่ระบบและแสดงความแตกต่างของสิทธิ์ทั้ง 4 Role:** ล็อกอิน 4 บทบาท (Admin, Approver, Facility, Requester) แสดงเมนูบน Navbar, สิทธิ์การเข้าถึง และปุ่มดำเนินการที่แตกต่างกันอย่างชัดเจนตาม Role
3. **Admin เข้าถึงทุกฟังก์ชันและจัดการผู้ใช้ บทบาท และสิทธิ์:** ล็อกอิน admin แสดงการเข้าถึงหน้าคอนโซลทั้งระบบ จัดการบัญชีผู้ใช้ ระงับบัญชี (Suspend) และจัดการตารางสิทธิ์ Dynamic ACL
4. **ผู้ที่ไม่มีสิทธิ์เข้าหน้า Admin หรือเรียก API โดยตรง แล้วถูกปฏิเสธ:** ใช้ Requester (somchai) พิมพ์ URL เข้า `/admin/acl`, `/admin/users` หรือใช้ DevTools ยิง `POST /api/admin/users` ระบบจะตอบกลับด้วย HTTP 403 Forbidden และไม่รั่วไหลข้อมูล Hash รหัสผ่าน
5. **เพิ่ม Role ใหม่ผ่านเว็บและกำหนดให้บัญชีทดสอบ:** ในหน้า Admin เพิ่ม Role ใหม่ (เช่น `auditor`) และกำหนด Role นั้นให้กับผู้ใช้ทดสอบ
6. **เพิ่มรายการ Permission ผ่านเว็บ เชื่อมกับฟังก์ชันที่รองรับ และกำหนดให้ Role:** เพิ่ม Permission ใหม่ หรือติ๊กเปิดสิทธิ์ในตาราง Dynamic ACL ให้กับ Role นั้น (เช่น เปิดสิทธิ์ `log.read` ให้ Requester)
7. **ยกเลิก Permission แล้วแสดงว่าบัญชีเดิมถูกปฏิเสธ ทั้งหน้าเว็บและ API โดยไม่เริ่ม Server ใหม่:** ยกเลิกสิทธิ์ `booking.create` หรือ `log.read` ของ Requester สดๆ สลับแท็บบัญชีทดสอบ เมนูจะหายไปทันที และเมื่อกดเรียก API จะถูกปฏิเสธ HTTP 403 ทันทีโดยไม่ต้อง Restart Server (Zero Downtime)
8. **อัปโหลดไฟล์หรือภาพ เปิดดูหรือดาวน์โหลด และแสดงการปฏิเสธไฟล์ที่ไม่ผ่านเงื่อนไขหรือการเข้าถึงที่ไม่มีสิทธิ์:** 
   - อัปโหลดไฟล์ PDF วาระประชุม / รูปถ่ายตรวจห้องที่ถูกต้อง สามารถเปิดดูได้
   - ทดสอบอัปโหลดไฟล์เกิน 5MB หรือไฟล์สคริปต์/ไวรัสที่เปลี่ยนนามสกุลเป็น `.pdf` ระบบตรวจสอบ Magic Bytes และปฏิเสธทันที
   - ใช้บัญชีอื่นแอบเข้าถึงลิงก์ไฟล์ของผู้อื่น ระบบบล็อก IDOR ทันที
9. **เรียกดูและกรอง Log ของการเพิ่ม Role การเปลี่ยนสิทธิ์ การอัปโหลด และการเข้าถึงที่ถูกปฏิเสธ:** เปิดหน้า Audit Logs แสดงประวัติที่เพิ่งทำไปทั้งหมด กรองตามวันที่, ผู้ใช้, และประเภทเหตุการณ์ แสดงว่าบันทึกครบถ้วนใน PostgreSQL

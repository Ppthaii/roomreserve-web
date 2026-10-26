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
| **Facility Officer** | `facility` | `staff123` | บล็อกปิดห้องซ่อมบำรุงล่วงหน้า, ส่งมอบห้อง (Check-in), ตรวจรับห้องพร้อมแนบรูปถ่าย (Check-out) |
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
* **เปิดดูสไลด์แบบ Interactive ทางเว็บ:** [http://localhost:3000/slides](http://localhost:3000/slides)
* **ไฟล์เอกสารสไลด์:** `docs/presentation.html` (กด `Ctrl + P` เพื่อพิมพ์หรือบันทึกเป็น PDF ขนาด 16:9 สำหรับนำเสนอได้ทันที)
* **เอกสารเนื้อหาบทบรรยายสไลด์:** `docs/ROOMRESERVE_PRESENTATION_SLIDES.md`

---

## 6. ลำดับการสาธิตสด 9 ขั้นตอนต่อหน้าอาจารย์ (Live Demo Guide)
1. **รัน npm test:** แสดงผลการทดสอบอัตโนมัติผ่านฉลุย 14/14 ข้อ
2. **สาธิต Brute Force Protection:** กรอกรหัสผิด 8 ครั้ง แสดงการดีดออกและระงับชั่วคราว 10 นาที
3. **สาธิต Requester (somchai):** ล็อกอิน ยื่นจองห้องประชุมผ่าน Mini Calendar Strip พร้อมแนบเอกสาร PDF วาระประชุม
4. **สาธิตการจองชน (Pending):** เปิดอีกแท็บยื่นจองห้องเดียวกัน เวลาชนกัน แสดงว่าระบบอนุญาตให้ยื่นเป็น Pending ได้
5. **สาธิต Approver (manager):** กดยืนยันอนุมัติคำขอที่ 1 ➔ คำขอที่ 2 จะถูกปฏิเสธอัตโนมัติทันทีด้วยเหตุผล *"มีผู้จองห้องก่อนแล้ว"*
6. **สาธิต Facility (facility):** กด Check-in เริ่มใช้งานห้อง ➔ กด Check-out ตรวจรับห้องพร้อมแนบรูปถ่าย
7. **สาธิต Dynamic ACL (admin):** เปิดหน้า `/admin/acl` ปลดสิทธิ์ `booking.create` ของ Requester สดๆ หน้าเว็บ
8. **สาธิต Zero Downtime Effect:** สลับกลับแท็บ Requester ปุ่มจองหายทันที และยิง API โดนบล็อก HTTP 403 (ไม่ต้องรีสตาร์ตเซิร์ฟเวอร์)
9. **สาธิต Audit Logs & Magic Bytes:** แสดงประวัติ Audit Logs และทดสอบอัปโหลดไฟล์ไวรัส/สคริปต์ปลอมเป็น `.pdf` ระบบจะตรวจจับ Magic Bytes และดีดออก 400 ทันที

# RoomReserve (SmartSpace) — โครงสร้างและเนื้อหาสไลด์นำเสนอโครงงาน (18 Slides)
> **วิชา:** พัฒนาเว็บแอปพลิเคชัน สำหรับบริหารจัดการระบบงาน (คะแนนเต็ม 30 คะแนน)  
> **เทคโนโลยี:** Node.js, Express.js, PostgreSQL (GIST Extension), EJS, Dynamic ACL, Bcrypt, Multer  

---

## Slide 1: หน้าปกโครงงาน (Title & Team Cover)
* **ชื่อระบบ:** RoomReserve (SmartSpace)
* **คำโปรย:** ระบบบริหารจัดการจองห้องประชุมและทรัพยากรส่วนกลางอัจฉริยะ พร้อมระบบความปลอดภัย Dynamic ACL และ Concurrency Double-Booking Guard ระดับ Database Engine
* **วิชา:** พัฒนาเว็บแอปพลิเคชัน สำหรับบริหารจัดการระบบงาน (Web Application Development for Enterprise Management)
* **ผู้จัดทำ:** นักศึกษาผู้พัฒนาโครงงาน RoomReserve
* **เทคโนโลยีหลัก:** Node.js • Express.js • PostgreSQL 16 • EJS Template Engine • Vanilla CSS Design System

---

## Slide 2: ที่มาและความสำคัญของปัญหา (Problem Statement & Motivation)
* **ปัญหาในระบบจองห้องประชุมแบบเดิม:**
  1. **การชนกันของเวลา (Double-Booking & Race Condition):** การจองผ่านกระดาษ หรือเว็บทั่วไปที่ตรวจสอบเวลาด้วย `SELECT` แล้วค่อย `INSERT` ทำให้เกิดช่องว่างเสี้ยววินาทีที่ทำให้เกิดการจองซ้ำซ้อน
  2. **ความเสี่ยงด้านสิทธิ์การใช้งาน (Broken Access Control):** การจำกัดสิทธิ์เฉพาะฝั่งหน้าบ้าน (Frontend-only validation) ผู้ใช้สามารถใช้ Postman หรือ DevTools ยิง API เพื่อแอบดูข้อมูลหรืออนุมัติเองได้
  3. **การสูญหายของหลักฐาน (Lack of Audit Trail):** ไม่สามารถตรวจสอบย้อนหลังได้ว่าใครเป็นผู้อนุมัติ ใครยกเลิก หรือมีการพยายามแฮกระบบหรือไม่
  4. **ความไม่ยืดหยุ่นของระบบสิทธิ์ (Hard-coded Permissions):** หากต้องการปรับเปลี่ยนหน้าที่ของตำแหน่ง ต้องแก้โค้ดและรีสตาร์ตเซิร์ฟเวอร์ ส่งผลกระทบต่อผู้ใช้งานทั้งหมด

---

## Slide 3: ภาพรวมระบบและวัตถุประสงค์ (System Overview & Objectives)
* **วัตถุประสงค์หลักของระบบ RoomReserve:**
  1. **ความปลอดภัยระดับสูงสุด (Enterprise-grade Security):** แยก Logical Route ชัดเจน, ตรวจสอบสิทธิ์ที่ Middleware ฝั่ง Server ทุกเส้นทาง, ป้องกัน IDOR และ Session Fixation
  2. **ป้องกันการจองชนกันอย่างแท้จริง (Zero Double-Booking):** ใช้ PostgreSQL Exclusion Constraint (`btree_gist`) ผสาน Pessimistic Row Lock (`FOR UPDATE`) ในระดับ Database Engine
  3. **บริหารจัดการสิทธิ์แบบเรียลไทม์ (Dynamic ACL Matrix):** ปรับเปลี่ยนสิทธิ์ตามบทบาทได้ทันทีผ่าน Admin Console โดยไม่ต้อง Restart Server และมีระบบ Live Version Sync
  4. **ระบบตรวจสอบและบันทึกเหตุการณ์ครบวงจร (Audit Accountability):** บันทึกทุกความเคลื่อนไหว (Login, CRUD, Approve, Check-in, Security Rejection) ลงในฐานข้อมูล พร้อมดูย้อนหลังได้ทันที

---

## Slide 4: 4 บทบาทและวงจรสถานะงาน (4 Roles & State Machine Workflow)
* **4 บทบาทที่แบ่งแยกหน้าที่ตามหลัก Separation of Duties:**
  1. 👤 **Requester (ผู้ขอใช้ห้อง):** ยื่นคำขอจองห้อง, ระบุจำนวนผู้เข้าร่วม, แนบวาระการประชุม (PDF/JPG), ตรวจสอบสถานะและยกเลิกคำขอของตนเอง
  2. 👔 **Approver (หัวหน้างาน/ผู้อนุมัติ):** ตรวจสอบคำขอ, พิจารณาอนุมัติหรือปฏิเสธพร้อมระบุเหตุผล (มีระบบปฏิเสธคำขอที่เวลาชนกันอัตโนมัติ)
  3. 🛠️ **Facility Officer (เจ้าหน้าที่อาคาร/โสตฯ):** บล็อกปิดซ่อมบำรุงห้องล่วงหน้า, ส่งมอบห้องและอุปกรณ์ (Check-in), ตรวจสอบสภาพห้องหลังเสร็จสิ้นพร้อมแนบรูปถ่าย (Check-out)
  4. 👑 **Admin (ผู้ดูแลระบบ):** คุมตาราง Dynamic ACL Matrix สด, จัดการบัญชีผู้ใช้, ระงับบัญชี (Suspend), ตรวจสอบ Audit Log ส่วนกลาง (ไม่ลงไปทำงานธุรการ)

* **วงจรสถานะการจอง (State Machine Lifecycle):**
```text
[ยื่นจองห้อง] ──> PENDING_APPROVAL ──(หัวหน้าอนุมัติ)──> APPROVED ──(เจ้าหน้าที่ส่งมอบ)──> IN_USE
                       │                                     │                             │
                       ├──(หัวหน้าปฏิเสธ)                     └──(ยกเลิกก่อนเวลา)           └──(ตรวจรับห้องเสร็จ)
                       ▼                                     ▼                             ▼
                    REJECTED                             CANCELLED                     COMPLETED
                       ▲
                       └── [เมื่อรายการเวลาชนกันได้รับอนุมัติ ──> รายการอื่นจะถูก Auto-Reject ทันที]

[เจ้าหน้าที่ปิดซ่อม] ───────────────────────────> BLOCKED
```

---

## Slide 5: ขอบเขตของระบบ (System Scope & Boundaries)
* **In-Scope (สิ่งที่มีในระบบอย่างสมบูรณ์):**
  * ระบบยืนยันตัวตน (Authentication) ด้วย Bcrypt Hash (Cost 12) + Persistent PostgreSQL Session
  * ระบบป้องกัน Brute Force Login Lockout (8 ครั้งใน 10 นาที)
  * Dynamic Role-Based Access Control (RBAC) 14 Permissions พร้อมตาราง Matrix UI
  * Concurrency Double-Booking Guard ระดับ Database Engine
  * ระบบ Auto Collision Resolution เมื่อมีการอนุมัติคำขอ
  * ตรวจสอบลายเซ็นไฟล์จริง (Magic Bytes Verification) ป้องกันการปลอมแปลงนามสกุลไฟล์
  * Protected File Storage พร้อม Anti-IDOR Stream Route
  * บันทึกประวัติความปลอดภัยและการทำงาน (Security Audit Logging)
* **Out-of-Scope (ขอบเขตที่แยกไว้สำหรับเฟสถัดไป):**
  * ระบบชำระเงินค่าเช่าห้อง (เนื่องจากเป็นระบบภายในองค์กร)
  * การเชื่อมต่อฮาร์ดแวร์ IoT Smart Door Lock แบบ On-site
  * การเชื่อมต่อระบบปฏิทินภายนอก (Google Calendar / Microsoft Outlook)

---

## Slide 6: สถาปัตยกรรมระบบและการแยก Route (Architecture & Route Separation)
* **โครงสร้างแบบ MVC (Model - View - Controller):**
  * **Model (Database):** PostgreSQL Pool พร้อม Transaction และ Query Parameterized
  * **View (Presentation):** EJS Template Engine พร้อม Vanilla CSS Design System และ Dark/Light Mode
  * **Controller & Middleware (Logic & Security):** แยกการจัดการตามบริบทงานชัดเจน
* **Logical Route Architecture (แยกเส้นทางตามที่อาจารย์กำหนด):**
  1. `/login` & `/logout`: การจัดการเซสชันและยืนยันตัวตน
  2. `/app`: ฝั่ง Web Application UI สำหรับการทำงานทั่วไป (Dashboard, Booking, Approval, Facility)
  3. `/admin`: ฝั่ง Web Admin Console สำหรับผู้ดูแลระบบ (ACL Matrix, User Management, Audit Logs)
  4. `/api`: RESTful JSON API สำหรับการดึงข้อมูลและ Live Sync
  5. `/api/admin`: Administrative JSON API สำหรับจัดการสิทธิ์และบัญชีผู้ใช้
  6. `/app/files/:id`: Protected File Streaming ป้องกัน Direct URL Access และ IDOR

---

## Slide 7: ลำดับ Middleware Pipeline (Request Lifecycle)
* **ลำดับการประมวลผล Request อย่างปลอดภัย (Security In-Depth):**
```text
Incoming Request
    │
    ▼
1. trust proxy (รองรับ Cloudflare / Reverse Proxy)
    │
    ▼
2. express.urlencoded & express.json (Body Parsing & Type Sanitization)
    │
    ▼
3. express.static (ให้บริการไฟล์ CSS, Client JS, Assets ทั่วไป)
    │
    ▼
4. express-session via connect-pg-simple (อ่าน/เขียน Session จากตาราง user_sessions ใน DB)
    │
    ▼
5. Global Template Locals (ดึงสิทธิ์ล่าสุดของ User จาก DB แบบ Real-time บนทุก Request)
    │
    ▼
6. requireAuth (ตรวจว่าเข้าสู่ระบบแล้วหรือยัง ถ้ายังให้ดีดไป /login)
    │
    ▼
7. requirePermission (ตรวจสิทธิ์เฉพาะ Route ตามรหัส Permission เช่น booking.approve)
    │
    ▼
8. upload.single + verifyFileSignature (ตรวจสอบ Magic Bytes ของไฟล์ใน Memory/Disk)
    │
    ▼
9. Controller Execution (ทำงานร่วมกับ Transaction + Database Constraints)
    │
    ▼
10. Centralized Error Handler (ดักจับ Error และส่ง Response ที่ปลอดภัยโดยไม่หลุด Stack Trace)
```

---

## Slide 8: การยืนยันตัวตนและจัดการเซสชัน (Authentication & Session)
* **มาตรการความปลอดภัยด้าน Authentication:**
  1. **การเข้ารหัสผ่าน (Password Hashing):** ใช้ `bcryptjs` กำหนด Salt Rounds = 12 ป้องกัน Rainbow Table และ Brute Force Attacks
  2. **Session ใน PostgreSQL (`user_sessions`):** ไม่เก็บในหน่วยความจำชั่วคราว (In-memory) ทำให้เซสชันไม่หลุดเมื่อรีสตาร์ตเซิร์ฟเวอร์ และรองรับ Inactivity Expiration 30 นาที พร้อม Rolling Session
  3. **Session Regeneration on Login:** สร้าง Session ID ใหม่ทันทีที่ยืนยันตัวตนสำเร็จ ป้องกัน Session Fixation Attack
  4. **Brute Force Lockout:** ตรวจสอบประวัติจาก `audit_logs` หากล็อกอินผิดพลาดเกิน 8 ครั้งใน 10 นาที ระบบจะระงับการเข้าสู่ระบบชั่วคราว 10 นาทีทันที
  5. **Zero Credential Leakage:** ไม่ส่ง `password_hash` ออกไปใน API Response หรือ Audit Log ใดๆ ทั้งสิ้น

---

## Slide 9: โครงสร้างฐานข้อมูลและ ER Diagram (Database Schema)
* **ตารางฐานข้อมูลหลักทั้ง 8 ตาราง:**
  1. `roles`: บทบาทผู้ใช้ (Admin, Approver, Facility, Requester)
  2. `permissions`: สิทธิ์การใช้งานระบบ (14 Permissions ครอบคลุมทุกโมดูล)
  3. `role_permissions`: ตารางความสัมพันธ์สิทธิ์ (Dynamic ACL Matrix - Many-to-Many)
  4. `users`: ข้อมูลผู้ใช้งาน, แผนก, รหัสผ่านแฮช และสถานะบัญชี (`is_active`)
  5. `rooms`: ข้อมูลห้องประชุม, ความจุ, สถานที่, อุปกรณ์ และสถานะการเปิดใช้งาน
  6. `room_bookings`: บันทึกการจองห้อง, ช่วงเวลา, วัตถุประสงค์, ผู้เข้าร่วม, สถานะ และข้อมูลตรวจรับ
  7. `booking_attachments`: บันทึกไฟล์แนบ (วาระประชุม/รูปตรวจห้อง) พร้อม Storage UUID
  8. `audit_logs`: บันทึกเหตุการณ์ความปลอดภัยและการทำงานอย่างละเอียด
  9. `user_sessions`: จัดเก็บ Session Cookie ของผู้ใช้ผ่าน PostgreSQL Session Store
* **จุดเด่นทางวิศวกรรมฐานข้อมูล (Database Engine Constraint):**
```sql
CONSTRAINT no_overlapping_active_bookings EXCLUDE USING gist (
  room_id WITH =,
  tsrange(start_time, end_time) WITH &&
) WHERE (status IN ('APPROVED', 'IN_USE', 'BLOCKED'));
```
> *ป้องกันการจองชนกันในระดับ Engine ของ PostgreSQL แม้จะมีคำขอยื่นพร้อมกันในระดับ Millisecond ก็ไม่มีทางเกิด Double-Booking ได้*

---

## Slide 10: สถาปัตยกรรม Dynamic ACL & RBAC (Access Control)
* **หลักการทำงานของ Dynamic Role-Based Access Control:**
  * **Role:** เป็นกลุ่มของหน้าที่การทำงาน (Admin, Approver, Facility, Requester)
  * **Permission:** เป็นสิทธิ์เชิงฟังก์ชันที่ละเอียด (Granular) เช่น `booking.create`, `booking.approve`, `facility.checkin`, `acl.manage`
  * **Dynamic Binding:** สิทธิ์ถูกผูกผ่านตาราง `role_permissions` ในฐานข้อมูล ไม่มีการฮาร์ดโค้ด `if (role === 'admin')` ในโค้ด Controller
  * **Middleware Guard:** ใช้ฟังก์ชัน `requirePermission('permission_code')` ตรวจสอบสิทธิ์จริงจากฐานข้อมูลในทุกๆ Request

---

## Slide 11: การจัดการสิทธิ์ผ่านหน้าเว็บ (Dynamic ACL Matrix UI)
* **ฟีเจอร์เด่นของหน้า Admin Dynamic ACL (`/admin/acl`):**
  * **ตาราง Matrix สองมิติ:** แกนนอนคือ Permissions ทั้งหมด (จัดกลุ่มตามหมวดหมู่: การจอง, การอนุมัติ, หน้างาน, ห้อง, สิทธิ์, ผู้ใช้, บันทึก) และแกนตั้งคือ Roles
  * **เปิด/ปิดสิทธิ์ได้ทันที (Interactive Toggle):** คลิก Checkbox เพื่อเพิ่มหรือตัดสิทธิ์ ระบบจะยิง AJAX อัปเดตฐานข้อมูลทันที
  * **ไม่มีผลกระทบต่อระบบ (Zero Server Downtime):** ไม่ต้องรีสตาร์ตเซิร์ฟเวอร์
  * **Client Dynamic Live Sync:** มี Endpoint `/api/acl-version` ที่ตรวจสอบเวอร์ชันของสิทธิ์ เพื่อให้หน้าเว็บของผู้ใช้รับรู้การเปลี่ยนแปลงสิทธิ์ได้แบบ Real-time

---

## Slide 12: กฎความปลอดภัยของระบบสิทธิ์ (ACL Safety Guards)
* **กลไกป้องกันความผิดพลาดของผู้ดูแลระบบ (Fool-Proof Guards):**
  1. **ห้ามลบบทบาทที่มีผู้ใช้งานผูกอยู่ (Cannot Delete Role in Use):** หาก Role นั้นยังมีบัญชีผู้ใช้งานอยู่ ระบบจะปฏิเสธการลบทันทีพร้อมแจ้งเตือน
  2. **ห้ามริบสิทธิ์ `acl.manage` จาก Admin คนสุดท้าย (Cannot Remove Last Admin):** ป้องกันการล็อกตัวเองออกจากระบบ (Lockout Prevention Guard)
  3. **การลบแบบ Cascade และ Restrict ที่เหมาะสม:** ป้องกัน Orphan Records ในฐานข้อมูลด้วย Foreign Key Constraints

---

## Slide 13: ระบบอัปโหลดและจัดเก็บไฟล์ที่ปลอดภัย (Secure File Upload)
* **มาตรการความปลอดภัย 5 ชั้นของระบบไฟล์แนบ:**
  1. **Server-Side File Size Limit:** จำกัดขนาดไฟล์ไม่เกิน 5 MB ผ่าน Multer
  2. **Magic Bytes Verification:** ตรวจสอบ 4–8 ไบต์แรกของไฟล์บนดิสก์ (`Buffer.alloc(8)`) เช่น PDF ต้องขึ้นต้นด้วย `%PDF` (0x25 0x50 0x44 0x46) หากพบว่านามสกุลเป็น `.pdf` แต่เนื้อหาจริงเป็นไฟล์ปฏิบัติการ (.exe) หรือ Shell Script ระบบจะ **ลบไฟล์ทิ้งทันที** พร้อมบันทึก Security Audit Log
  3. **Storage Outside Web Public Directory:** บันทึกไฟล์ในโฟลเดอร์ `uploads/agendas` และ `uploads/inspections` นอก Web Root ป้องกัน Direct URL Execution
  4. **UUID Random Renaming:** เปลี่ยนชื่อไฟล์เป็น Random UUID ป้องกัน Path Traversal (`../../`) และชื่อไฟล์ชนกัน
  5. **Protected Streaming Route (`/app/files/:id`):** การเปิดดูหรือดาวน์โหลดไฟล์ต้องผ่านการตรวจสอบสิทธิ์ในระบบ ป้องกันช่องโหว่ IDOR (Insecure Direct Object References)

---

## Slide 14: ระบบบันทึกประวัติการทำงาน (Comprehensive Audit Logging)
* **สิ่งที่ระบบ Audit Log บันทึกอย่างละเอียด:**
  * วันที่และเวลา (`created_at`)
  * ผู้กระทำ (`user_id`, `username`, `role_name`)
  * การกระทำ (`action` เช่น `LOGIN_SUCCESS`, `LOGIN_FAILED`, `BOOKING_CREATE`, `BOOKING_APPROVE`, `FILE_REJECTED`)
  * แหล่งข้อมูล (`resource` และ `resource_id`)
  * สถานะผลลัพธ์ (`SUCCESS`, `FAILED`, `DENIED`)
  * รายละเอียดเพิ่มเติม (`details`)
  * ข้อมูลเครือข่าย (`ip_address`, `user_agent`)
* **คุณสมบัติความปลอดภัย:**
  * บันทึกแบบ Append-only ไม่มีการเปิดฟังก์ชันให้แก้ไขหรือลบ Log ผ่านหน้าเว็บ
  * มีระบบค้นหาและกรองข้อมูลย้อนหลังตามวันที่และการกระทำ

---

## Slide 15: การทดสอบอัตโนมัติ 14 ชุดคำสอบ (14 Automated Test Cases)
* **ผลการรันชุดทดสอบความปลอดภัย (`npm test`): ผ่าน 100% (14/14 Tests)**
  1. `[PASS]` Guest เข้าถึง API ผู้ดูแลระบบ `/api/admin/users` ต้องถูกปฏิเสธด้วย HTTP 401 Unauthorized
  2. `[PASS]` ป้อนรหัสผ่านไม่ถูกต้อง ต้องถูก Redirect กลับหน้า Login พร้อมข้อความแจ้งเตือน
  3. `[PASS]` Requester เข้าถึง API ผู้ดูแลระบบ `/api/admin/users` ต้องได้รับ HTTP 403 Forbidden
  4. `[PASS]` Requester เปิดหน้า Web Admin `/admin/acl` ต้องถูกบล็อกด้วย HTTP 403 Forbidden
  5. `[PASS]` Admin เข้าถึง `/api/admin/users` ได้รับ HTTP 200 และ Zero Credential Leakage (ไม่มี hash หลุด)
  6. `[PASS]` Admin เปิดหน้า Web Admin `/admin/acl` ได้รับ HTTP 200 พร้อมตาราง Dynamic ACL ครบถ้วน
  7. `[PASS]` บัญชีที่ถูกระงับการใช้งาน (`is_active = FALSE`) ต้องไม่สามารถล็อกอินเข้าสู่ระบบได้
  8. `[PASS]` การสร้าง Session ID ใหม่หลังเข้าสู่ระบบ (Session Regeneration ป้องกัน Fixation)
  9. `[PASS]` ระบบตรวจจับและระงับการพยายามเจาะรหัสผ่าน (Brute Force Lockout Guard)
  10. `[PASS]` Dynamic ACL Live Sync Endpoint (`/api/acl-version`) ตอบสนองถูกต้อง
  11. `[PASS]` ตรวจจับและปฏิเสธไฟล์ปลอมแปลงด้วย Server-side Magic Bytes (Fake PDF Rejection)
  12. `[PASS]` ยอมรับไฟล์ PDF แท้ที่มีโครงสร้าง `%PDF` ถูกต้อง
  13. `[PASS]` Concurrency Guard: PostgreSQL Exclusion Constraint ป้องกัน Double-Booking ชนกัน
  14. `[PASS]` Auto Collision Resolution: คิวที่จองเวลาชนกันจะถูกปฏิเสธอัตโนมัติเมื่ออีกคำขอได้รับอนุมัติ

---

## Slide 16: ข้อจำกัดของระบบและบทเรียนที่ได้รับ (Limitations & Lessons Learned)
* **ปัญหาทางเทคนิคและความท้าทายที่แก้ไขสำเร็จ:**
  * **Race Condition:** การแก้ปัญหาการจองชนกันด้วย PostgreSQL GIST Exclusion ร่วมกับ `SELECT ... FOR UPDATE`
  * **Session Persistence:** การใช้ `connect-pg-simple` เพื่อให้เซสชันของผู้ใช้ไม่สูญหายเมื่อเซิร์ฟเวอร์เกิดการรีโหลด
  * **Binary Header Inspection:** การอ่าน Magic Bytes โดยตรงจาก Buffer ของไฟล์ ช่วยให้ระบบปลอดภัยกว่าการเชื่อถือ MIME type จากเบราว์เซอร์เพียงอย่างเดียว
* **แนวทางการพัฒนาต่อในอนาคต (Future Enhancements):**
  * เชื่อมต่อระบบแจ้งเตือนผ่าน LINE Notify หรือ Email เมื่อคำขอได้รับการอนุมัติ
  * พัฒนาระบบ QR Code สำหรับสแกนหน้าห้องประชุมเพื่อ Check-in ทันที
  * พัฒนาโมบายล์แอปพลิเคชันหรือ PWA (Progressive Web App) เพื่อความสะดวกในการใช้งานบนสมาร์ตโฟน

---

## Slide 17: คู่มือสาธิตระบบสดต่อหน้าอาจารย์ (Live Demo Guide - 9 Steps to 30/30)
1. **Step 1 — รันชุดทดสอบอัตโนมัติ:** รัน `npm test` เพื่อแสดงผลผ่าน 14/14 ข้อต่อหน้าอาจารย์
2. **Step 2 — สาธิต Brute Force Protection:** พิมพ์รหัสผ่านผิดหลายครั้งเพื่อแสดงการบันทึก Audit Log และการล็อกอินเข้าไม่ได้
3. **Step 3 — สาธิตบทบาท Requester (somchai):** ล็อกอิน ยื่นจองห้องประชุม แนบไฟล์วาระการประชุม PDF และแสดงการเลือกวัน/เวลาผ่าน Mini Calendar Strip
4. **Step 4 — สาธิต Concurrency Collision (จองชนได้ในสถานะ Pending):** ล็อกอินอีกแท็บ ยื่นจองห้องเดียวกัน เวลาชนกัน แสดงว่าระบบอนุญาตให้ยื่นเป็น Pending ได้
5. **Step 5 — สาธิตบทบาท Approver (manager):** ล็อกอิน ตรวจสอบคำขอที่รออนุมัติ กดยืนยันอนุมัติคำขอที่ 1 แล้วแสดงว่าคำขอที่ 2 ถูกปฏิเสธอัตโนมัติพร้อมเหตุผล "มีผู้จองห้องก่อนแล้ว"
6. **Step 6 — สาธิตบทบาท Facility Officer (facility):** ล็อกอิน ตรวจสอบงานส่งมอบห้อง กด Check-in เพื่อเริ่มใช้งานห้อง (สถานะเป็น IN_USE) และกด Check-out ตรวจรับห้องพร้อมแนบรูปถ่าย
7. **Step 7 — สาธิตบทบาท Admin (admin):** ล็อกอิน เข้าหน้า Dynamic ACL Matrix สด ทำการปลดสิทธิ์ `booking.create` ของ Requester
8. **Step 8 — สาธิต Zero Downtime ACL Effect:** สลับกลับไปแท็บ Requester แสดงว่าปุ่มจองห้องหายไป และเมื่อพยายามยื่นจองจะถูกบล็อก HTTP 403 ทันทีโดยไม่ต้อง Restart Server
9. **Step 9 — สาธิต Audit Log & Magic Bytes:** แสดงหน้า Audit Log ที่บันทึกทุกขั้นตอนอย่างละเอียด และทดสอบอัปโหลดไฟล์ `.exe` ที่เปลี่ยนนามสกุลเป็น `.pdf` แสดงว่าระบบดีดออก 400 ทันที

---

## Slide 18: บทสรุปและช่องทางการตรวจงาน (Summary & Q&A)
* **สรุปจุดเด่นของ RoomReserve (SmartSpace):**
  * ครบถ้วนตามโจทย์ 30 คะแนนของอาจารย์ทุกประการ (4 Roles, Dynamic ACL, Database Concurrency, File Security, Audit Logs)
  * โครงสร้างโค้ดสะอาด เป็นระเบียบ มีการแบ่ง Layer MVC อย่างมืออาชีพ
  * พร้อมสำหรับการนำไปใช้งานจริงในระดับองค์กร
* **ลิงก์โครงงาน:**
  * GitHub Repository: `https://github.com/.../RoomReserve`
  * Live Web Application (Render): พร้อมใช้งานตลอด 24 ชั่วโมง
* **ช่วงถาม-ตอบ (Q&A):** ขอขอบพระคุณอาจารย์ผู้สอนเป็นอย่างสูงครับ/ค่ะ

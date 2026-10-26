# 🛡️ เอกสารตารางกำหนดสิทธิ์ (Access Matrix & Route Guard Specification)

> **วิชา:** พัฒนาเว็บแอปพลิเคชัน สำหรับบริหารจัดการระบบงาน (30 คะแนน)  
> **ระบบ:** RoomReserve (SmartSpace)  
> **กลไก:** Dynamic Access Control List (Real-time Evaluation จากตาราง `role_permissions`)

---

## 📋 1. ตารางสิทธิ์เริ่มต้นตามบทบาท (Default Role × Permission Matrix)

> 💡 **หมายเหตุ:** ตารางนี้คือค่าเริ่มต้นจากระบบ Seed Data โดย Admin สามารถเปิด/ปิดสิทธิ์เหล่านี้ได้สดๆ หน้าเว็บที่ `/admin/acl` ซึ่งมีผลทันทีในระดับ Middleware โดยไม่ต้องรีสตาร์ต Server

| หมวดหมู่ | รหัสสิทธิ์ (Permission Code) | ความหมาย | Requester | Approver | Facility | Admin |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Room** | `room.view_schedule` | ดูตารางปฏิทินและสถานะห้อง | ✅ | ✅ | ✅ | ✅ |
| **Room** | `room.manage` | เพิ่มห้องและเปิด/ปิดปรับปรุงห้อง | ❌ | ❌ | ✅ | ✅ |
| **Room** | `room.block_schedule` | บล็อกปิดปรับปรุงห้อง/กันคิวงานใหญ่ | ❌ | ❌ | ✅ | ✅ |
| **Booking** | `booking.create` | ยื่นคำขอจองห้องประชุมใหม่ | ✅ | ❌ | ❌ | ✅ |
| **Booking** | `booking.read_own` | ดูรายการคำขอของตนเอง | ✅ | ✅ | ✅ | ✅ |
| **Booking** | `booking.read_all` | ดูรายการคำขอของทุกคนในระบบ | ❌ | ✅ | ✅ | ✅ |
| **Booking** | `booking.cancel_own` | ยกเลิกคำขอจองของตนเอง | ✅ | ❌ | ❌ | ✅ |
| **Booking** | `booking.approve` | อนุมัติหรือปฏิเสธคำขอจองห้อง | ❌ | ✅ | ❌ | ✅ |
| **Facility** | `facility.checkin` | ตรวจส่งมอบห้องและเปิดระบบ (Check-in) | ❌ | ❌ | ✅ | ✅ |
| **Facility** | `facility.checkout` | ตรวจสภาพห้องและปิดงาน (Check-out) | ❌ | ❌ | ✅ | ✅ |
| **File** | `file.upload_agenda` | อัปโหลดวาระการประชุม/ผังจัดโต๊ะ | ✅ | ❌ | ❌ | ✅ |
| **File** | `file.upload_inspect` | อัปโหลดภาพถ่ายตรวจสภาพห้อง | ❌ | ❌ | ✅ | ✅ |
| **File** | `file.view` | ดาวน์โหลด/เปิดดูไฟล์แนบที่ได้รับอนุญาต | ✅ | ✅ | ✅ | ✅ |
| **Admin** | `acl.manage` | จัดการตาราง Dynamic ACL Real-time | ❌ | ❌ | ❌ | ✅ |
| **Admin** | `user.manage` | จัดการบัญชีผู้ใช้งาน (บทบาท/สถานะ) | ❌ | ❌ | ❌ | ✅ |
| **Admin** | `log.read` | ตรวจสอบบันทึกความปลอดภัย Audit Logs | ❌ | ❌ | ❌ | ✅ |

---

## 🎯 2. ตารางขอบเขตและเงื่อนไขสิทธิ์ (Role × Resource × Action Matrix)

| บทบาท (Role) | ทรัพยากร (Resource) | การกระทำ (Action) | ขอบเขตและเงื่อนไขพิเศษ (Scope & Constraints) |
| :--- | :--- | :--- | :--- |
| **Requester** | `room_bookings` | Create | ยื่นจองได้เฉพาะช่วงเวลาที่ห้องว่าง (ผ่าน Concurrency Guard) |
| | `room_bookings` | Read | **เฉพาะรายการของตนเองเท่านั้น** (`user_id = session.userId`) |
| | `room_bookings` | Cancel | **เฉพาะรายการของตนเอง** และต้องอยู่ในสถานะ `PENDING_APPROVAL` หรือ `APPROVED` ก่อนเริ่มใช้งาน |
| | `booking_attachments` | Read/Download | **เฉพาะไฟล์ของคำขอที่ตนเองเป็นเจ้าของ** (Anti-IDOR Guard) |
| **Approver** | `room_bookings` | Read | ดูรายการคำขอจองทั้งหมดในระบบ |
| | `room_bookings` | Approve/Reject | พิจารณาอนุมัติ/ปฏิเสธคำขอที่อยู่ในสถานะ `PENDING_APPROVAL` |
| | `room_bookings` | Revoke Approval | ยกเลิกผลการอนุมัติเพื่อดึงสถานะกลับเป็น `PENDING_APPROVAL` กรณีมีข้อผิดพลาด |
| | `booking_attachments` | Read/Download | เปิดดูเอกสารแนบวาระการประชุมของทุกคำขอเพื่อประกอบการพิจารณา |
| **Facility** | `rooms` | Create/Toggle | เพิ่มห้องประชุมใหม่ และเปิดใช้งาน/ปิดปรับปรุงห้อง |
| | `room_bookings` | Block | สร้างรายการจองประเภท `BLOCKED` เพื่อกันเวลาซ่อมบำรุง |
| | `room_bookings` | Check-in / Out | ส่งมอบห้อง และตรวจรับห้องพร้อมแนบรูปถ่ายการตรวจสอบสภาพ |
| | `booking_attachments` | Upload | แนบรูปถ่ายตรวจสอบสภาพห้อง (`INSPECTION`) ตอน Check-out |
| **Admin** | **All Resources** | Full Control | เข้าถึงได้ทุกฟังก์ชัน, คุมตาราง ACL สด, สลับบทบาทผู้ใช้, ดูและส่งออก Audit Logs |
| | `system_security` | Protection Guard | ห้ามระงับหรือลดบทบาท Admin คนสุดท้ายในระบบเด็ดขาด |

---

## 🛣️ 3. การแมปปิ้งเส้นทางและ Middleware Pipeline (Route Security Map)

### ก. กลุ่มเส้นทางผู้ใช้งานทั่วไป (`/app/...`)
| Method | Route Path | Middleware Pipeline | Permission Required |
| :---: | :--- | :--- | :--- |
| `GET` | `/app` | `requireAuth` $\rightarrow$ `requirePermission` | `room.view_schedule` |
| `GET` | `/app/rooms` | `requireAuth` $\rightarrow$ `requirePermission` | `room.view_schedule` |
| `POST` | `/app/rooms/create` | `requireAuth` $\rightarrow$ `requirePermission` | `room.manage` |
| `POST` | `/app/rooms/:id/toggle` | `requireAuth` $\rightarrow$ `requirePermission` | `room.manage` |
| `POST` | `/app/bookings` | `requireAuth` $\rightarrow$ `requirePermission` $\rightarrow$ `upload` $\rightarrow$ `verifyFileSignature` | `booking.create` |
| `POST` | `/app/bookings/:id/cancel` | `requireAuth` $\rightarrow$ `requirePermission` | `booking.cancel_own` |
| `POST` | `/app/bookings/:id/review` | `requireAuth` $\rightarrow$ `requirePermission` | `booking.approve` |
| `POST` | `/app/facility/block` | `requireAuth` $\rightarrow$ `requirePermission` | `room.block_schedule` |
| `POST` | `/app/facility/checkin/:id` | `requireAuth` $\rightarrow$ `requirePermission` | `facility.checkin` |
| `POST` | `/app/facility/checkout/:id`| `requireAuth` $\rightarrow$ `requirePermission` $\rightarrow$ `upload` $\rightarrow$ `verifyFileSignature` | `facility.checkout` |
| `GET` | `/app/files/:id` | `requireAuth` $\rightarrow$ `requirePermission` $\rightarrow$ Anti-IDOR Check | `file.view` |

### ข. กลุ่มเส้นทางผู้ดูแลระบบ (`/admin/...` และ `/api/admin/...`)
| Method | Route Path | Middleware Pipeline | การตอบสนองเมื่อไร้สิทธิ์ |
| :---: | :--- | :--- | :--- |
| `GET/POST`| `/admin/*` | `requireAuth` $\rightarrow$ `requireAdmin` (Live DB Check) | HTTP 403 HTML Error Page |
| `GET/POST`| `/api/admin/*` | `requireAuth` $\rightarrow$ `requireAdmin` (Live DB Check) | HTTP 401 / 403 JSON Response |

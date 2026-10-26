# 📊 แผนผังความสัมพันธ์ฐานข้อมูล (ER Diagram & Schema Specification)

> **วิชา:** พัฒนาเว็บแอปพลิเคชัน สำหรับบริหารจัดการระบบงาน (30 คะแนน)  
> **ระบบ:** RoomReserve (SmartSpace) — ระบบบริหารจัดการจองห้องประชุมและทรัพยากรส่วนกลาง  
> **ฐานข้อมูล:** PostgreSQL (พร้อม btree_gist extension)

---

## 📐 1. Entity Relationship Diagram (ER Diagram)

```mermaid
erDiagram
    roles ||--o{ users : "has"
    roles ||--o{ role_permissions : "contains"
    permissions ||--o{ role_permissions : "granted_to"
    
    users ||--o{ room_bookings : "requests (user_id)"
    users ||--o{ room_bookings : "approves (approver_id)"
    users ||--o{ room_bookings : "inspects (facility_officer_id)"
    users ||--o{ booking_attachments : "uploads"
    users ||--o{ audit_logs : "triggers (user_id)"
    
    rooms ||--o{ room_bookings : "reserved_for"
    room_bookings ||--o{ booking_attachments : "has_attachments"

    roles {
        int role_id PK
        string role_name UK "admin, approver, facility, requester"
        string display_name
        text description
        timestamp created_at
    }

    permissions {
        int permission_id PK
        string permission_code UK "เช่น booking.create, room.manage"
        text description
        string category "room, booking, facility, file, admin"
    }

    role_permissions {
        int role_id PK, FK
        int permission_id PK, FK
        timestamp granted_at
    }

    users {
        int user_id PK
        string username UK
        string password_hash "Bcrypt + Salt"
        string full_name
        string department
        int role_id FK
        boolean is_active "Default TRUE"
        timestamp created_at
    }

    rooms {
        int room_id PK
        string room_name UK
        int capacity
        string location
        text equipment_description
        boolean is_active "Default TRUE"
        timestamp created_at
    }

    room_bookings {
        int booking_id PK
        int room_id FK "ON DELETE RESTRICT"
        int user_id FK "ON DELETE RESTRICT"
        string title
        text purpose
        int attendees_count
        timestamp start_time
        timestamp end_time
        string status "PENDING_APPROVAL, APPROVED, REJECTED, IN_USE, COMPLETED, CANCELLED, BLOCKED"
        int approver_id FK "ON DELETE SET NULL"
        text approver_comment
        timestamp approved_at
        int facility_officer_id FK "ON DELETE SET NULL"
        text facility_comment
        timestamp checked_in_at
        timestamp checked_out_at
        timestamp created_at
    }

    booking_attachments {
        int attachment_id PK
        int booking_id FK "ON DELETE CASCADE"
        int uploaded_by FK
        string attachment_type "AGENDA, INSPECTION"
        string original_name
        string storage_name UK "UUID safe filename"
        string file_path
        string mime_type "application/pdf, image/jpeg, image/png"
        int file_size "Bytes (<= 5MB)"
        timestamp created_at
    }

    audit_logs {
        int log_id PK
        int user_id FK "ON DELETE SET NULL"
        string username
        string role_name
        string action "LOGIN_SUCCESS, ACCESS_DENIED, etc."
        string resource "AUTH, ACL, ROOM, BOOKING, FILE"
        string resource_id
        string status "SUCCESS, FAILED, DENIED"
        text details
        string ip_address
        text user_agent
        timestamp created_at
    }
```

---

## 🛡️ 2. กฎและเงื่อนไขความถูกต้อง (Integrity Constraints)

| ตาราง | Constraint Name | ประเภท | รายละเอียดและการบังคับใช้ |
| :--- | :--- | :--- | :--- |
| `room_bookings` | `no_overlapping_active_bookings` | **EXCLUDE USING gist** | ป้องกันการจองช่วงเวลาทับซ้อนกันในห้องเดียวกัน (`room_id WITH =`, `tsrange(start_time, end_time) WITH &&`) มีผลกับสถานะ `PENDING_APPROVAL`, `APPROVED`, `IN_USE`, `BLOCKED` |
| `room_bookings` | `check_time_validity` | **CHECK** | ตรวจสอบว่าเวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้นเสมอ (`end_time > start_time`) |
| `room_bookings` | `check_booking_status` | **CHECK** | จำกัดค่าสถานะให้อยู่ในชุดที่กำหนด: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `IN_USE`, `COMPLETED`, `CANCELLED`, `BLOCKED` |
| `role_permissions` | `PRIMARY KEY (role_id, permission_id)` | **COMPOSITE PK** | รับประกันว่า 1 Role จะมี Permission เดียวกันได้เพียง 1 แถว |
| `role_permissions` | `ON DELETE CASCADE` | **FK Rule** | เมื่อลบ Role หรือ Permission ระบบจะล้างความสัมพันธ์ในตารางสิทธิ์ออกอัตโนมัติ |
| `room_bookings` | `ON DELETE RESTRICT` | **FK Rule** | ห้ามลบข้อมูล Room หรือ User ตราบใดที่ยังมีประวัติการจองห้องอ้างอิงอยู่ |
| `audit_logs` | `ON DELETE SET NULL` | **FK Rule** | หาก User ถูกลบ ข้อมูลบันทึกความปลอดภัยยังคงอยู่ถาวร (เปลี่ยน `user_id` เป็น NULL) |

---

## 🎓 3. สาระสำคัญสำหรับตอบคำถามอาจารย์ (Q&A Defense)

### ถาม: ทำไมจึงต้องใช้ Exclusion Constraint (`btree_gist`) ในระดับ Database แทนที่จะเช็คเวลาว่างด้วย JavaScript ใน Server?
> **ตอบ:**  
> หากตรวจสอบด้วย JavaScript เพียงอย่างเดียว (`SELECT` ตรวจเวลาว่างก่อน แล้วค่อย `INSERT`):  
> เมื่อมีผู้ใช้ 2 คนกดจองห้องเดียวกัน เวลาเดียวกัน พร้อมกันในเสี้ยววินาที (Concurrent Requests) คำสั่ง `SELECT` ของทั้งสองคนจะเห็นว่าห้องว่างพร้อมกัน และทั้งคู่จะรันคำสั่ง `INSERT` สำเร็จทั้งคู่ ทำให้เกิด **Double-Booking (Race Condition)** ทันที  
>  
> การใช้ **PostgreSQL Exclusion Constraint (`EXCLUDE USING gist`)** จะใช้ Database Engine Lock ในระดับ Kernel/Index ตรวจสอบช่วงเวลา (`tsrange`) แบบ Atomic หากมีรายการใดส่งเข้ามาทับซ้อนแม้แต่ 1 มิลลิวินาที ฐานข้อมูลจะโยน Error Code `23P01` ออกมาทันที ทำให้ระบบมีความปลอดภัยระดับ **Enterprise Concurrency Guard 100%**

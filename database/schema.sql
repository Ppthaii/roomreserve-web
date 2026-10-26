-- ====================================================================
-- โครงสร้างฐานข้อมูล RoomReserve (SmartSpace)
-- วิชา: พัฒนาเว็บแอปพลิเคชัน สำหรับบริหารจัดการระบบงาน (30 คะแนน)
-- ====================================================================

-- 1. Extension สำหรับการคำนวณและ Exclusion Constraint (ป้องกัน Race Condition)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. ตารางบทบาทผู้ใช้ (Roles)
CREATE TABLE IF NOT EXISTS roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตารางสิทธิ์การใช้งาน (Permissions)
CREATE TABLE IF NOT EXISTS permissions (
  permission_id SERIAL PRIMARY KEY,
  permission_code VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general'
);

-- 4. ตารางความสัมพันธ์สิทธิ์ตามบทบาท (Role_Permissions - Dynamic ACL Matrix)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id)
);

-- 5. ตารางผู้ใช้งาน (Users)
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  role_id INT NOT NULL REFERENCES roles(role_id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ตารางห้องประชุมและทรัพยากร (Rooms)
CREATE TABLE IF NOT EXISTS rooms (
  room_id SERIAL PRIMARY KEY,
  room_name VARCHAR(100) UNIQUE NOT NULL,
  capacity INT NOT NULL,
  location VARCHAR(100) NOT NULL,
  equipment_description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. ตารางการจองห้อง (Room Bookings)
-- มี Exclusion Constraint ป้องกันช่วงเวลาทับซ้อน (Double-Booking / Race Condition Guard)
CREATE TABLE IF NOT EXISTS room_bookings (
  booking_id SERIAL PRIMARY KEY,
  room_id INT NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
  user_id INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  purpose TEXT,
  attendees_count INT DEFAULT 1,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
  
  -- ข้อมูลการพิจารณาอนุมัติ
  approver_id INT REFERENCES users(user_id),
  approver_comment TEXT,
  approved_at TIMESTAMP,
  
  -- ข้อมูลการส่งมอบและตรวจสภาพห้องหน้างาน
  facility_officer_id INT REFERENCES users(user_id),
  facility_comment TEXT,
  checked_in_at TIMESTAMP,
  checked_out_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- กฎข้อบังคับความถูกต้องของข้อมูล
  CONSTRAINT check_time_validity CHECK (end_time > start_time),
  CONSTRAINT check_booking_status CHECK (
    status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_USE', 'COMPLETED', 'CANCELLED', 'BLOCKED')
  ),
  
  -- ⚡ หัวใจการป้องกัน Concurrency & Double-Booking ระดับ Database Engine
  -- อนุญาตให้หลายคำขอยื่นจองชนกันได้ในสถานะ PENDING_APPROVAL แต่จะล็อกห้ามชนกันทันทีเมื่อได้รับอนุมัติ (APPROVED, IN_USE, BLOCKED)
  CONSTRAINT no_overlapping_active_bookings EXCLUDE USING gist (
    room_id WITH =,
    tsrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('APPROVED', 'IN_USE', 'BLOCKED'))
);

-- ปรับปรุง Exclusion Constraint สำหรับฐานข้อมูลที่สร้างไว้แล้ว (Migration)
ALTER TABLE room_bookings DROP CONSTRAINT IF EXISTS no_overlapping_active_bookings;
ALTER TABLE room_bookings ADD CONSTRAINT no_overlapping_active_bookings EXCLUDE USING gist (
  room_id WITH =,
  tsrange(start_time, end_time) WITH &&
) WHERE (status IN ('APPROVED', 'IN_USE', 'BLOCKED'));

-- 8. ตารางไฟล์แนบ (Booking Attachments - Protected Storage)
CREATE TABLE IF NOT EXISTS booking_attachments (
  attachment_id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES room_bookings(booking_id) ON DELETE CASCADE,
  uploaded_by INT NOT NULL REFERENCES users(user_id),
  attachment_type VARCHAR(30) NOT NULL, -- 'AGENDA' หรือ 'INSPECTION'
  original_name VARCHAR(255) NOT NULL,
  storage_name VARCHAR(255) NOT NULL UNIQUE,
  file_path VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. ตารางบันทึกประวัติความปลอดภัยและการทำงาน (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
  username VARCHAR(50),
  role_name VARCHAR(50),
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  resource_id VARCHAR(50),
  status VARCHAR(20) NOT NULL, -- 'SUCCESS', 'FAILED', 'DENIED'
  details TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index สำหรับค้นหา Log ย้อนหลังได้อย่างรวดเร็ว
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_room_bookings_room_time ON room_bookings(room_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_room_bookings_user_created ON room_bookings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_room_bookings_status_time ON room_bookings(status, start_time ASC);
CREATE INDEX IF NOT EXISTS idx_room_bookings_start_time ON room_bookings(start_time ASC);

-- ============================================================================
-- RoomReserve (SmartSpace) - SQL Seed Data (ข้อมูลตั้งต้นระบบ)
-- รองรับการรันผ่าน psql โดยตรง: \i database/seed.sql
-- ============================================================================

-- 1. บทบาทผู้ใช้งาน (Roles)
INSERT INTO roles (role_name, display_name, description) VALUES
  ('admin', 'ผู้ดูแลระบบ (Admin)', 'ควบคุมระบบ สิทธิ์ ACL และตรวจสอบ Audit Logs'),
  ('approver', 'ผู้อนุมัติ/หัวหน้างาน (Approver)', 'ตรวจสอบความสมเหตุสมผลของการใช้ห้องและอนุมัติคำขอ'),
  ('facility', 'เจ้าหน้าที่สถานที่ (Facility Officer)', 'บล็อกปิดซ่อมห้อง ส่งมอบห้อง ตรวจสอบความเรียบร้อยและปิดงาน'),
  ('requester', 'ผู้ขอใช้ห้อง (Requester)', 'ดูตารางห้องว่าง ยื่นจองห้อง และแนบเอกสารวาระการประชุม')
ON CONFLICT (role_name) DO NOTHING;

-- 2. รายการสิทธิ์ทั้งหมด (Permissions)
INSERT INTO permissions (permission_code, description, category) VALUES
  ('room.view_schedule', 'ดูตารางปฏิทินและสถานะห้อง', 'room'),
  ('room.manage', 'เพิ่มห้องและเปิด/ปิดการใช้งานห้อง', 'room'),
  ('room.block_schedule', 'บล็อกปิดปรับปรุงห้องหรือกันเวลากิจกรรมใหญ่', 'facility'),
  ('booking.create', 'สร้างคำขอจองห้องประชุม', 'booking'),
  ('booking.read_own', 'ดูรายการคำขอของตนเอง', 'booking'),
  ('booking.read_all', 'ดูรายการคำขอจองทั้งหมดในระบบ', 'booking'),
  ('booking.cancel_own', 'ยกเลิกคำขอจองของตนเอง', 'booking'),
  ('booking.approve', 'อนุมัติหรือปฏิเสธคำขอจองห้อง', 'booking'),
  ('facility.checkin', 'ส่งมอบห้องและเปิดระบบ (Check-in)', 'facility'),
  ('facility.checkout', 'ตรวจความเรียบร้อยและปิดการใช้งาน (Check-out)', 'facility'),
  ('file.upload_agenda', 'อัปโหลดเอกสารวาระการประชุมหรือผังจัดโต๊ะ', 'file'),
  ('file.upload_inspect', 'อัปโหลดภาพถ่ายตรวจสภาพห้องหลังใช้งาน', 'file'),
  ('file.view', 'ดาวน์โหลดและเปิดดูไฟล์แนบที่ได้รับอนุญาต', 'file'),
  ('acl.manage', 'จัดการตารางสิทธิ์ Dynamic ACL Real-time', 'admin'),
  ('user.manage', 'จัดการบัญชีผู้ใช้งาน', 'admin'),
  ('log.read', 'ตรวจสอบบันทึกความปลอดภัย Audit Logs', 'admin')
ON CONFLICT (permission_code) DO NOTHING;

-- 3. ตารางผูกสิทธิ์เริ่มต้น (Dynamic ACL Matrix: role_permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'approver' AND p.permission_code IN (
  'room.view_schedule', 'booking.read_own', 'booking.read_all', 'booking.approve', 'file.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'facility' AND p.permission_code IN (
  'room.view_schedule', 'room.manage', 'booking.read_own', 'booking.read_all',
  'room.block_schedule', 'facility.checkin', 'facility.checkout',
  'file.upload_inspect', 'file.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'requester' AND p.permission_code IN (
  'room.view_schedule', 'booking.create', 'booking.read_own',
  'booking.cancel_own', 'file.upload_agenda', 'file.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. บัญชีผู้ใช้เริ่มต้น 4 บทบาท (รหัสผ่าน Bcrypt Hash Cost 10 ตรงตามเกณฑ์ 4.1)
-- admin: admin123
-- manager: approver123
-- facility: facility123
-- somchai: user123
INSERT INTO users (username, password_hash, full_name, department, role_id)
SELECT 'admin', '$2b$10$ANtoFh4zbVC.4KXQoKjFDO3.sBi2uSyB58qe2qYhaxdmMx0QPFJGu', 'อาจารย์ ดร. สมเกียรติ (ผู้ดูแลระบบ)', 'ฝ่ายเทคโนโลยีสารสนเทศ', role_id
FROM roles WHERE role_name = 'admin'
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password_hash, full_name, department, role_id)
SELECT 'manager', '$2b$10$ANtoFh4zbVC.4KXQoKjFDOFUXZz1Iw3iLjBBOG/Ultr7VkqeY9N4O', 'คุณวิภาวรรณ นันทกาญจน์ (หัวหน้าฝ่าย)', 'ฝ่ายบริหารยุทธศาสตร์', role_id
FROM roles WHERE role_name = 'approver'
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password_hash, full_name, department, role_id)
SELECT 'facility', '$2b$10$ANtoFh4zbVC.4KXQoKjFDO1q.Zv0VvtMrvdyaG58nefTmTA02iLdG', 'ช่างเอกชัย พูนทรัพย์ (เจ้าหน้าที่อาคาร)', 'ฝ่ายอาคารสถานที่และโสตฯ', role_id
FROM roles WHERE role_name = 'facility'
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password_hash, full_name, department, role_id)
SELECT 'somchai', '$2b$10$ANtoFh4zbVC.4KXQoKjFDO3Eo.hJFVaX18iwUemFE1AMPyYjom2k2', 'นายสมชาย มั่นคง (เจ้าหน้าที่พัฒนาธุรกิจ)', 'ฝ่ายการตลาดและประชาสัมพันธ์', role_id
FROM roles WHERE role_name = 'requester'
ON CONFLICT (username) DO NOTHING;

-- 5. ข้อมูลห้องประชุมเริ่มต้น (6 ห้อง 3 อาคาร)
INSERT INTO rooms (room_name, capacity, location, equipment_description) VALUES
  ('ห้อง 101', 40, 'ตึก 1', 'โปรเจกเตอร์ 4K Laser, ไมค์ลอย 8 ตัว, ระบบ Zoom Rooms'),
  ('ห้อง 102', 15, 'ตึก 1', 'Smart TV 65 นิ้ว, ไวท์บอร์ดกระจก, แอร์'),
  ('ห้อง 201', 25, 'ตึก 2', 'โปรเจกเตอร์ 4K, จอภาพคู่, ไมค์ตั้งโต๊ะ'),
  ('ห้อง 202', 12, 'ตึก 2', 'Smart TV 55 นิ้ว, พอร์ต Type-C / HDMI, ไวท์บอร์ด'),
  ('ห้อง 301', 30, 'ตึก 3', 'เครื่อง Workstation, โปรเจกเตอร์คู่, อินเทอร์เน็ตความเร็วสูง'),
  ('ห้อง 302', 10, 'ตึก 3', 'ระบบ Video Conference ทางไกล, จอ 4K, แอร์')
ON CONFLICT (room_name) DO NOTHING;

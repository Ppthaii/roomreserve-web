-- ====================================================================
-- สคริปต์ล้างตารางทั้งหมดในฐานข้อมูล (Danger / Reset Only)
-- ใช้งานเฉพาะกรณีต้องการเริ่มต้นระบบใหม่ทั้งหมดจากศูนย์
-- ====================================================================

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS booking_attachments CASCADE;
DROP TABLE IF EXISTS room_bookings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

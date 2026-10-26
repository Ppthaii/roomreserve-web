const pool = require('../config/db');
const { logAudit } = require('../middlewares/auth');

// 1. เจ้าหน้าที่สถานที่กดบล็อกห้องล่วงหน้า (Block Schedule for Maintenance / Big Event)
async function blockSchedule(req, res, next) {
  const client = await pool.connect();
  try {
    const { room_id, reason, block_date, start_time_str, end_time_str } = req.body;
    
    const start_time = `${block_date} ${start_time_str}:00`;
    const end_time = `${block_date} ${end_time_str}:00`;

    if (new Date(end_time) <= new Date(start_time)) {
      return res.redirect(`/app?error=${encodeURIComponent('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น')}`);
    }

    await client.query('BEGIN');

    // ล็อกแถวห้อง
    await client.query('SELECT room_id FROM rooms WHERE room_id = $1 FOR UPDATE', [room_id]);

    // ตรวจสอบการทับซ้อน
    const overlapCheck = await client.query(`
      SELECT booking_id, title 
      FROM room_bookings
      WHERE room_id = $1 
        AND status IN ('PENDING_APPROVAL', 'APPROVED', 'IN_USE', 'BLOCKED')
        AND (start_time < $3 AND end_time > $2)
      LIMIT 1
    `, [room_id, start_time, end_time]);

    if (overlapCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.redirect(`/app?error=${encodeURIComponent(`ไม่สามารถบล็อกได้: มีรายการจอง "${overlapCheck.rows[0].title}" อยู่ในช่วงเวลานี้แล้ว`)}`);
    }

    // ทำการบันทึกสถานะ BLOCKED
    const insertRes = await client.query(`
      INSERT INTO room_bookings (
        room_id, user_id, title, purpose, attendees_count,
        start_time, end_time, status, facility_officer_id, facility_comment
      ) VALUES ($1, $2, $3, $4, 0, $5, $6, 'BLOCKED', $2, 'ดำเนินการโดยฝ่ายอาคารสถานที่')
      RETURNING booking_id
    `, [room_id, req.session.userId, `[บล็อก] ${reason}`, reason, start_time, end_time]);

    await client.query('COMMIT');

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'ROOM_BLOCK',
      resource: 'ROOM',
      resourceId: String(room_id),
      status: 'SUCCESS',
      details: `เจ้าหน้าที่บล็อกห้อง: ${reason} (${start_time} ถึง ${end_time})`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/app?success=${encodeURIComponent('บล็อกช่วงเวลาสำหรับงานซ่อมบำรุง/กิจกรรมเรียบร้อยแล้ว ปฏิทินถูกล็อกทันที')}`);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// 2. ส่งมอบห้อง / Check-in
async function checkinRoom(req, res, next) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.redirect(`/app?error=${encodeURIComponent('รหัสรายการไม่ถูกต้อง')}`);
    }
    const result = await pool.query(`
      UPDATE room_bookings
      SET status = 'IN_USE', facility_officer_id = $1, checked_in_at = NOW()
      WHERE booking_id = $2 AND status = 'APPROVED'
      RETURNING *
    `, [req.session.userId, bookingId]);

    if (result.rowCount === 0) {
      return res.redirect(`/app?error=${encodeURIComponent('ไม่สามารถ Check-in ได้ (รายการต้องผ่านการอนุมัติก่อน)')}`);
    }

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'FACILITY_CHECKIN',
      resource: 'BOOKING',
      resourceId: String(bookingId),
      status: 'SUCCESS',
      details: `เจ้าหน้าที่สถานที่ส่งมอบห้อง (Check-in) สำหรับ "${result.rows[0].title}"`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/app?success=${encodeURIComponent('ส่งมอบห้องและเปิดระบบอุปกรณ์เรียบร้อยแล้ว (สถานะ: กำลังใช้งาน)')}`);
  } catch (err) {
    next(err);
  }
}

// 3. ตรวจสอบห้องหลังใช้งานและปิดงาน / Check-out พร้อมแนบรูปถ่าย
async function checkoutRoom(req, res, next) {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.redirect(`/app?error=${encodeURIComponent('รหัสรายการไม่ถูกต้อง')}`);
    }
    const { comment } = req.body;

    const result = await pool.query(`
      UPDATE room_bookings
      SET status = 'COMPLETED', facility_comment = $1, checked_out_at = NOW()
      WHERE booking_id = $2 AND status = 'IN_USE'
      RETURNING *
    `, [comment || 'ตรวจรับสภาพห้องเรียบร้อย', bookingId]);

    if (result.rowCount === 0) {
      return res.redirect(`/app?error=${encodeURIComponent('ไม่สามารถ Check-out ได้ (รายการต้องอยู่ในสถานะกำลังใช้งาน)')}`);
    }

    // บันทึกรูปถ่ายการตรวจห้อง (ถ้ามีแนบ)
    if (req.file) {
      await pool.query(`
        INSERT INTO booking_attachments (
          booking_id, uploaded_by, attachment_type, original_name,
          storage_name, file_path, mime_type, file_size
        ) VALUES ($1, $2, 'INSPECTION', $3, $4, $5, $6, $7)
      `, [
        bookingId,
        req.session.userId,
        req.file.originalname,
        req.file.filename,
        req.file.path,
        req.file.mimetype,
        req.file.size
      ]);
    }

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'FACILITY_CHECKOUT',
      resource: 'BOOKING',
      resourceId: String(bookingId),
      status: 'SUCCESS',
      details: `ตรวจรับห้องและปิดงานเสร็จสมบูรณ์: ${comment || 'เรียบร้อย'}`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/app?success=${encodeURIComponent('ตรวจรับสภาพห้องและปิดงานสมบูรณ์แล้ว (สถานะ: เสร็จสิ้น)')}`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  blockSchedule,
  checkinRoom,
  checkoutRoom
};

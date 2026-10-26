const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { logAudit } = require('../middlewares/auth');

// 1. หน้าหลัก Dashboard & แสดงตารางปฏิทินห้องว่าง (High-Performance Concurrent Query)
async function getDashboard(req, res, next) {
  try {
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];

    // รันทุก Query แบบ Concurrent / Parallel ผ่าน Promise.all เพื่อลด Latency รวม
    const [
      roomsRes,
      bookingsRes,
      myBookingsRes,
      userPermsRes,
      pendingApprovalsRes,
      facilityTasksRes
    ] = await Promise.all([
      // ดึงรายชื่อห้องทั้งหมด พร้อมจำนวนครั้งที่เสร็จสิ้น
      pool.query(`
        SELECT r.*, 
          (SELECT COUNT(*) FROM room_bookings rb WHERE rb.room_id = r.room_id AND rb.status = 'COMPLETED') as total_completed_bookings
        FROM rooms r 
        ORDER BY r.room_name ASC
      `),

      // ดึงรายการจองและบล็อกของวันที่เลือก (ใช้ Range Query เพื่อให้ใช้ Index start_time ได้อย่างสมบูรณ์)
      pool.query(`
        SELECT rb.*, r.room_name, u.full_name as requester_name, u.department
        FROM room_bookings rb
        JOIN rooms r ON rb.room_id = r.room_id
        JOIN users u ON rb.user_id = u.user_id
        WHERE rb.start_time >= $1::date AND rb.start_time < ($1::date + interval '1 day')
        ORDER BY rb.start_time ASC
      `, [selectedDate]),

      // ดึงรายการคำขอของตนเอง (ใช้ Index user_id, created_at DESC)
      pool.query(`
        SELECT rb.*, r.room_name,
               ba.attachment_id, ba.original_name as file_name
        FROM room_bookings rb
        JOIN rooms r ON rb.room_id = r.room_id
        LEFT JOIN booking_attachments ba ON rb.booking_id = ba.booking_id
        WHERE rb.user_id = $1 AND rb.status != 'BLOCKED'
        ORDER BY rb.created_at DESC
        LIMIT 25
      `, [req.session.userId]),

      // ดึงสิทธิ์สดๆ (Dynamic ACL Permissions)
      pool.query(`
        SELECT p.permission_code
        FROM users u
        JOIN role_permissions rp ON rp.role_id = u.role_id
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE u.user_id = $1 AND u.is_active = TRUE
      `, [req.session.userId]),

      // ดึงรายการรออนุมัติ (ใช้ Index status, start_time)
      pool.query(`
        SELECT rb.*, r.room_name, u.full_name as requester_name, u.department,
               ba.attachment_id, ba.original_name as file_name
        FROM room_bookings rb
        JOIN rooms r ON rb.room_id = r.room_id
        JOIN users u ON rb.user_id = u.user_id
        LEFT JOIN booking_attachments ba ON rb.booking_id = ba.booking_id AND ba.attachment_type = 'AGENDA'
        WHERE rb.status = 'PENDING_APPROVAL'
        ORDER BY rb.start_time ASC
      `),

      // ดึงคิวงานหน้างาน
      pool.query(`
        SELECT rb.*, r.room_name, u.full_name as requester_name,
               ba.attachment_id, ba.original_name as file_name
        FROM room_bookings rb
        JOIN rooms r ON rb.room_id = r.room_id
        JOIN users u ON rb.user_id = u.user_id
        LEFT JOIN booking_attachments ba ON rb.booking_id = ba.booking_id
        WHERE rb.status IN ('APPROVED', 'IN_USE')
        ORDER BY rb.start_time ASC
      `)
    ]);

    const userPermissions = userPermsRes.rows.map(r => r.permission_code);

    res.render('dashboard', {
      title: 'RoomReserve - ระบบจองห้องประชุม',
      user: req.session,
      userPermissions,
      selectedDate,
      rooms: roomsRes.rows,
      dayBookings: bookingsRes.rows,
      myBookings: myBookingsRes.rows,
      pendingApprovals: pendingApprovalsRes.rows,
      facilityTasks: facilityTasksRes.rows,
      success: req.query.success || '',
      error: req.query.error || ''
    });
  } catch (err) {
    next(err);
  }
}

// 2. สร้างคำขอจองห้องใหม่ (พร้อม Transaction + Pessimistic Row Lock กัน Race Condition)
async function createBooking(req, res, next) {
  const client = await pool.connect();
  try {
    const { room_id, title, purpose, attendees_count, booking_date, start_time_str, end_time_str } = req.body;
    
    const start_time = `${booking_date} ${start_time_str}:00`;
    const end_time = `${booking_date} ${end_time_str}:00`;

    if (new Date(end_time) <= new Date(start_time)) {
      return res.redirect(`/app?error=${encodeURIComponent('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น')}`);
    }

    // ตรวจสอบว่าต้องจองเต็มชั่วโมงเท่านั้น (นาทีต้องเป็น :00)
    if (!/^\d{2}:00$/.test(start_time_str) || !/^\d{2}:00$/.test(end_time_str)) {
      return res.redirect(`/app?error=${encodeURIComponent('ต้องจองเป็นรายชั่วโมงเต็มเท่านั้น (เช่น 09:00, 10:00)')}`);
    }

    // เริ่มต้น Database Transaction
    await client.query('BEGIN');

    // ⚡ ขั้นที่ 1: ล็อกแถวห้องประชุมนั้นไว้ก่อน (Pessimistic Lock) เพื่อป้องกัน Request อื่นแทรกแซง
    const roomCheck = await client.query(`
      SELECT room_id, room_name, capacity 
      FROM rooms 
      WHERE room_id = $1 AND is_active = TRUE 
      FOR UPDATE
    `, [room_id]);

    if (roomCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.redirect(`/app?error=${encodeURIComponent('ไม่พบห้องประชุมที่ระบุ')}`);
    }

    const roomCapacity = roomCheck.rows[0].capacity;
    if (Number(attendees_count) > roomCapacity) {
      await client.query('ROLLBACK');
      return res.redirect(`/app?error=${encodeURIComponent(`จำนวนผู้เข้าร่วม (${attendees_count} คน) เกินความจุของห้อง ${roomCheck.rows[0].room_name} (รองรับได้สูงสุด ${roomCapacity} คนเท่านั้น)`)}`);
    }

    // ⚡ ขั้นที่ 2: ตรวจสอบว่าช่วงเวลานี้ชนกับรายการอื่นหรือไม่ (Time-Overlap Check)
    const overlapCheck = await client.query(`
      SELECT booking_id, title, status, start_time, end_time
      FROM room_bookings
      WHERE room_id = $1
        AND status IN ('PENDING_APPROVAL', 'APPROVED', 'IN_USE', 'BLOCKED')
        AND (start_time < $3 AND end_time > $2)
      LIMIT 1
    `, [room_id, start_time, end_time]);

    if (overlapCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      const conflict = overlapCheck.rows[0];
      const conflictMsg = conflict.status === 'BLOCKED' 
        ? `ห้องนี้ถูกเจ้าหน้าที่สถานที่บล็อกไว้: "${conflict.title}"`
        : `ช่วงเวลานี้ชนกับการจองอื่น: "${conflict.title}"`;
      return res.redirect(`/app?error=${encodeURIComponent(conflictMsg)}`);
    }

    // ขั้นที่ 3: บันทึกคำขอจองห้อง
    const extraEqList = Array.isArray(req.body.extra_equipments) 
      ? req.body.extra_equipments 
      : (req.body.extra_equipments ? [req.body.extra_equipments] : []);
    const extraEqText = extraEqList.length > 0 ? ` [ขออุปกรณ์เสริม: ${extraEqList.join(', ')}]` : '';
    const finalPurpose = ((purpose ? purpose.trim() : 'ไม่มีรายละเอียดเพิ่มเติม') + extraEqText);

    const insertRes = await client.query(`
      INSERT INTO room_bookings (
        room_id, user_id, title, purpose, attendees_count, start_time, end_time, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING_APPROVAL')
      RETURNING booking_id
    `, [room_id, req.session.userId, title, finalPurpose, Number(attendees_count || 1), start_time, end_time]);

    const newBookingId = insertRes.rows[0].booking_id;

    // ขั้นที่ 4: บันทึกไฟล์แนบ (ถ้ามีการอัปโหลดวาระการประชุมหรือผังจัดห้อง)
    if (req.file) {
      await client.query(`
        INSERT INTO booking_attachments (
          booking_id, uploaded_by, attachment_type, original_name,
          storage_name, file_path, mime_type, file_size
        ) VALUES ($1, $2, 'AGENDA', $3, $4, $5, $6, $7)
      `, [
        newBookingId,
        req.session.userId,
        req.file.originalname,
        req.file.filename,
        req.file.path,
        req.file.mimetype,
        req.file.size
      ]);
    }

    // Commit Transaction ยืนยันข้อมูลทั้งหมด
    await client.query('COMMIT');

    // บันทึก Audit Log
    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'BOOKING_CREATE',
      resource: 'BOOKING',
      resourceId: newBookingId,
      status: 'SUCCESS',
      details: `สร้างคำขอจองห้อง "${title}" (${roomCheck.rows[0].room_name})`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/app?success=${encodeURIComponent('ยื่นคำขอจองห้องเรียบร้อยแล้ว รอหัวหน้างานพิจารณาอนุมัติ')}`);
  } catch (err) {
    await client.query('ROLLBACK');
    // ดักจับ Exclusion Constraint Error (23P01) หากมี Race Condition ระดับ Millisecond
    if (err.code === '23P01') {
      return res.redirect(`/app?error=${encodeURIComponent('เกิดข้อผิดพลาด: ช่วงเวลานี้เพิ่งถูกจองไปในเสี้ยววินาทีที่ผ่านมา (Double-Booking Prevented)')}`);
    }
    next(err);
  } finally {
    client.release();
  }
}

// 3. ยกเลิกคำขอจองของตนเอง (Cancel Own)
async function cancelBooking(req, res, next) {
  try {
    const { id } = req.params;
    
    // ตรวจสอบความเป็นเจ้าของและสถานะ
    const check = await pool.query(
      'SELECT * FROM room_bookings WHERE booking_id = $1', [id]
    );
    if (check.rowCount === 0) {
      return res.redirect(`/app?error=${encodeURIComponent('ไม่พบรายการคำขอนี้')}`);
    }

    const booking = check.rows[0];
    if (booking.user_id !== req.session.userId && req.session.roleName !== 'admin') {
      return res.status(403).render('error', {
        title: '403 Forbidden',
        code: 403,
        message: 'คุณไม่มีสิทธิ์ยกเลิกคำขอของผู้อื่น'
      });
    }

    if (booking.status === 'IN_USE') {
      return res.redirect(`/app?error=${encodeURIComponent('ไม่สามารถยกเลิกได้ เนื่องจากเจ้าหน้าที่ได้ส่งมอบห้องเรียบร้อยแล้ว (สถานะ: กำลังใช้งาน)')}`);
    }

    if (booking.status !== 'PENDING_APPROVAL' && req.session.roleName !== 'admin') {
      return res.redirect(`/app?error=${encodeURIComponent('ไม่สามารถยกเลิกได้ เนื่องจากคำขอได้รับการอนุมัติแล้ว (สามารถยกเลิกได้เฉพาะคำขอที่รออนุมัติเท่านั้น)')}`);
    }

    await pool.query(
      'UPDATE room_bookings SET status = $1 WHERE booking_id = $2',
      ['CANCELLED', id]
    );

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'BOOKING_CANCEL',
      resource: 'BOOKING',
      resourceId: id,
      status: 'SUCCESS',
      details: `ผู้ใช้ยกเลิกการจอง "${booking.title}"`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/app?success=${encodeURIComponent('ยกเลิกคำขอจองห้องเรียบร้อยแล้ว')}`);
  } catch (err) {
    next(err);
  }
}

// 4. พิจารณาอนุมัติ / ปฏิเสธ (Approver Action)
async function reviewBooking(req, res, next) {
  try {
    const { id } = req.params;
    const { action, comment } = req.body; // action: 'APPROVE' or 'REJECT'

    const targetStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const result = await pool.query(`
      UPDATE room_bookings
      SET status = $1, approver_id = $2, approver_comment = $3, approved_at = NOW()
      WHERE booking_id = $4 AND status = 'PENDING_APPROVAL'
      RETURNING *
    `, [targetStatus, req.session.userId, comment || null, id]);

    if (result.rowCount === 0) {
      return res.redirect(`/app?error=${encodeURIComponent('คำขอนี้ถูกดำเนินการไปแล้วหรือไม่อยู่ในสถานะรออนุมัติ')}`);
    }

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: `BOOKING_${action}`,
      resource: 'BOOKING',
      resourceId: id,
      status: 'SUCCESS',
      details: `${action === 'APPROVE' ? 'อนุมัติ' : 'ปฏิเสธ'} คำขอ: ${comment || 'ไม่มีความเห็น'}`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    const msg = action === 'APPROVE' ? 'อนุมัติคำขอจองห้องเรียบร้อยแล้ว' : 'ปฏิเสธคำขอจองห้องเรียบร้อยแล้ว';
    res.redirect(`/app?success=${encodeURIComponent(msg)}`);
  } catch (err) {
    next(err);
  }
}

// 5. ยกเลิกการอนุมัติ (Safety Rollback: ดึงสถานะจาก APPROVED กลับมาเป็น PENDING_APPROVAL)
async function revokeApproval(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(`
      UPDATE room_bookings
      SET status = 'PENDING_APPROVAL', 
          approver_comment = COALESCE(approver_comment, '') || ' [ดึงกลับโดยหัวหน้า: ' || COALESCE($1, 'เปลี่ยนแปลงการตัดสินใจ') || ']'
      WHERE booking_id = $2 AND status = 'APPROVED'
      RETURNING *
    `, [reason || 'ยกเลิกการอนุมัติเพื่อพิจารณาใหม่', id]);

    if (result.rowCount === 0) {
      return res.redirect(`/app?error=${encodeURIComponent('ไม่สามารถดึงสถานะกลับได้ (รายการอาจเริ่มใช้งานแล้วหรือไม่อยู่ในสถานะ APPROVED)')}`);
    }

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'BOOKING_REVOKE_APPROVAL',
      resource: 'BOOKING',
      resourceId: id,
      status: 'SUCCESS',
      details: `หัวหน้างานดึงสถานะคำขอกลับเป็น PENDING_APPROVAL: ${reason || 'เปลี่ยนแปลงการตัดสินใจ'}`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/app?success=${encodeURIComponent('ดึงสถานะคำขอกลับมารอพิจารณา (PENDING_APPROVAL) เรียบร้อยแล้ว')}`);
  } catch (err) {
    next(err);
  }
}

// 6. ล้างประวัติคำขอเฉพาะรายการที่สิ้นสุดแล้ว (COMPLETED, CANCELLED, REJECTED) ของตนเอง
async function clearBookingHistory(req, res, next) {
  try {
    const result = await pool.query(`
      DELETE FROM room_bookings
      WHERE user_id = $1 AND status IN ('COMPLETED', 'CANCELLED', 'REJECTED')
    `, [req.session.userId]);

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'BOOKING_CLEAR_HISTORY',
      resource: 'BOOKING',
      resourceId: 'FINISHED_ONLY',
      status: 'SUCCESS',
      details: `ล้างประวัติคำขอที่สิ้นสุดแล้ว จำนวน ${result.rowCount} รายการ`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    if (result.rowCount === 0) {
      return res.redirect(`/app?error=${encodeURIComponent('ไม่มีรายการประวัติที่สิ้นสุดแล้ว (เสร็จสิ้น/ยกเลิก/ปฏิเสธ) ให้เคลียร์')}`);
    }

    res.redirect(`/app?success=${encodeURIComponent(`เคลียร์ประวัติที่สิ้นสุดแล้วเรียบร้อย (${result.rowCount} รายการ)`)}`);
  } catch (err) {
    next(err);
  }
}

// 7. ลบประวัติคำขอรายการเดียวเฉพาะที่สิ้นสุดแล้ว (COMPLETED, CANCELLED, REJECTED)
async function deleteBookingHistory(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      DELETE FROM room_bookings
      WHERE booking_id = $1 AND user_id = $2 AND status IN ('COMPLETED', 'CANCELLED', 'REJECTED')
    `, [id, req.session.userId]);

    if (result.rowCount > 0) {
      await logAudit({
        userId: req.session.userId,
        username: req.session.username,
        roleName: req.session.roleName,
        action: 'BOOKING_DELETE_HISTORY',
        resource: 'BOOKING',
        resourceId: id,
        status: 'SUCCESS',
        details: `ลบประวัติคำขอ ID ${id}`,
        ip: req.ip,
        ua: req.get('user-agent')
      });
      return res.redirect(`/app?success=${encodeURIComponent('ลบรายการประวัติเรียบร้อยแล้ว')}`);
    }

    res.redirect(`/app?error=${encodeURIComponent('ไม่สามารถลบได้ (ลบได้เฉพาะรายการที่สิ้นสุดแล้วเท่านั้น)')}`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  createBooking,
  cancelBooking,
  reviewBooking,
  revokeApproval,
  clearBookingHistory,
  deleteBookingHistory
};



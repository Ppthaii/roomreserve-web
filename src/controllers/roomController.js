const pool = require('../config/db');
const { logAudit } = require('../middlewares/auth');

// 1. แสดงรายการห้องประชุมทั้งหมดและหน้าจัดการ
async function getRoomsPage(req, res, next) {
  try {
    const roomsRes = await pool.query(`
      SELECT r.*, 
        (SELECT COUNT(*) FROM room_bookings rb WHERE rb.room_id = r.room_id AND rb.status = 'COMPLETED') as total_completed_bookings,
        (SELECT COUNT(*) FROM room_bookings rb WHERE rb.room_id = r.room_id AND rb.status IN ('PENDING_APPROVAL', 'APPROVED', 'IN_USE')) as active_bookings
      FROM rooms r 
      ORDER BY r.room_id ASC
    `);

    res.render('rooms', {
      title: 'จัดการห้องประชุมและทรัพยากร | RoomReserve',
      user: req.session,
      rooms: roomsRes.rows,
      success: req.query.success || '',
      error: req.query.error || ''
    });
  } catch (err) {
    next(err);
  }
}

// 2. เพิ่มห้องประชุมใหม่ (ควบคุมสิทธิ์ด้วย requirePermission('room.manage'))
async function createRoom(req, res, next) {
  try {
    const { room_name, capacity, location, equipment_description } = req.body;

    if (!room_name || !capacity || !location) {
      return res.redirect(`/app/rooms?error=${encodeURIComponent('กรุณากรอกข้อมูลห้องให้ครบถ้วน')}`);
    }

    const result = await pool.query(`
      INSERT INTO rooms (room_name, capacity, location, equipment_description, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING *
    `, [room_name.trim(), Number(capacity), location.trim(), equipment_description || null]);

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'ROOM_CREATE',
      resource: 'ROOM',
      resourceId: String(result.rows[0].room_id),
      status: 'SUCCESS',
      details: `เพิ่มห้องประชุมใหม่: "${room_name}" (ความจุ ${capacity} คน, ${location})`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/app/rooms?success=${encodeURIComponent(`เพิ่มห้องประชุม "${room_name}" สำเร็จและเปิดให้จองได้ทันที`)}`);
  } catch (err) {
    if (err.code === '23505') {
      return res.redirect(`/app/rooms?error=${encodeURIComponent('ชื่อห้องประชุมนี้มีอยู่ในระบบแล้ว')}`);
    }
    next(err);
  }
}

// 3. สลับสถานะเปิดใช้งาน / ปิดปรับปรุงห้อง (ควบคุมสิทธิ์ด้วย requirePermission('room.manage'))
async function toggleRoom(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE rooms 
      SET is_active = NOT is_active 
      WHERE room_id = $1 
      RETURNING *
    `, [id]);

    if (result.rowCount === 0) {
      return res.redirect(`/app/rooms?error=${encodeURIComponent('ไม่พบห้องประชุมที่ระบุ')}`);
    }

    const room = result.rows[0];

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'ROOM_TOGGLE_ACTIVE',
      resource: 'ROOM',
      resourceId: id,
      status: 'SUCCESS',
      details: `เปลี่ยนสถานะห้อง "${room.room_name}" เป็น ${room.is_active ? 'เปิดใช้งาน' : 'ปิดปรับปรุง'}`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/app/rooms?success=${encodeURIComponent(`อัปเดตสถานะห้อง "${room.room_name}" เป็น ${room.is_active ? 'เปิดใช้งาน' : 'ปิดปรับปรุง'} เรียบร้อยแล้ว`)}`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRoomsPage,
  createRoom,
  toggleRoom
};

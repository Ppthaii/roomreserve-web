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
    const { room_name, capacity, location, building, custom_building, floor_detail, equipment_description } = req.body;

    // รวม format สถานที่ตั้งจากตัวเลือกตึก + ชั้นอย่างเป็นมาตรฐาน
    let finalLocation = location ? location.trim() : '';
    if (building) {
      const bName = (building === 'CUSTOM' && custom_building) ? custom_building.trim() : building.trim();
      finalLocation = floor_detail && floor_detail.trim() ? `${bName} ${floor_detail.trim()}` : bName;
    }

    if (!room_name || !capacity || !finalLocation) {
      return res.redirect(`/app/rooms?error=${encodeURIComponent('กรุณากรอกข้อมูลห้องและระบุสถานที่ตั้ง/ตึกให้ครบถ้วน')}`);
    }

    const result = await pool.query(`
      INSERT INTO rooms (room_name, capacity, location, equipment_description, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING *
    `, [room_name.trim(), Number(capacity), finalLocation, equipment_description ? equipment_description.trim() : null]);

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'ROOM_CREATE',
      resource: 'ROOM',
      resourceId: String(result.rows[0].room_id),
      status: 'SUCCESS',
      details: `เพิ่มห้องประชุมใหม่: "${room_name}" (ความจุ ${capacity} คน, ${finalLocation})`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/app/rooms?success=${encodeURIComponent(`เพิ่มห้องประชุม "${room_name}" (${finalLocation}) สำเร็จและเปิดให้จองได้ทันที`)}`);
  } catch (err) {
    if (err.code === '23505') {
      return res.redirect(`/app/rooms?error=${encodeURIComponent('ชื่อห้องประชุมนี้มีอยู่ในระบบแล้ว')}`);
    }
    next(err);
  }
}

// 3. แก้ไขข้อมูลห้องประชุม (ควบคุมสิทธิ์ด้วย requirePermission('room.manage'))
async function updateRoom(req, res, next) {
  try {
    const { id } = req.params;
    const { room_name, capacity, location, building, custom_building, floor_detail, equipment_description } = req.body;

    let finalLocation = location ? location.trim() : '';
    if (building) {
      const bName = (building === 'CUSTOM' && custom_building) ? custom_building.trim() : building.trim();
      finalLocation = floor_detail && floor_detail.trim() ? `${bName} ${floor_detail.trim()}` : bName;
    }

    if (!room_name || !capacity || !finalLocation) {
      return res.redirect(`/app/rooms?error=${encodeURIComponent('กรุณากรอกข้อมูลห้องและระบุสถานที่ตั้ง/ตึกให้ครบถ้วน')}`);
    }

    const result = await pool.query(`
      UPDATE rooms 
      SET room_name = $1, capacity = $2, location = $3, equipment_description = $4
      WHERE room_id = $5
      RETURNING *
    `, [room_name.trim(), Number(capacity), finalLocation, equipment_description ? equipment_description.trim() : null, id]);

    if (result.rowCount === 0) {
      return res.redirect(`/app/rooms?error=${encodeURIComponent('ไม่พบห้องประชุมที่ต้องการแก้ไข')}`);
    }

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'ROOM_UPDATE',
      resource: 'ROOM',
      resourceId: String(id),
      status: 'SUCCESS',
      details: `แก้ไขข้อมูลห้องประชุม: "${room_name}" (ความจุ ${capacity} คน, ${finalLocation})`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/app/rooms?success=${encodeURIComponent(`แก้ไขข้อมูลห้อง "${room_name}" (${finalLocation}) เรียบร้อยแล้ว`)}`);
  } catch (err) {
    if (err.code === '23505') {
      return res.redirect(`/app/rooms?error=${encodeURIComponent('ชื่อห้องประชุมนี้มีอยู่ในระบบแล้ว')}`);
    }
    next(err);
  }
}

// 4. สลับสถานะเปิดใช้งาน / ปิดปรับปรุงห้อง (ควบคุมสิทธิ์ด้วย requirePermission('room.manage'))
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

// 5. ลบห้องประชุม (พร้อมลบประวัติการจองและไฟล์แนบที่ผูกอยู่แบบ Cascade ใน Transaction)
async function deleteRoom(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const targetRoomRes = await client.query('SELECT * FROM rooms WHERE room_id = $1', [id]);
    if (targetRoomRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.redirect(`/app/rooms?error=${encodeURIComponent('ไม่พบห้องประชุมที่ต้องการลบ')}`);
    }
    const deletedRoom = targetRoomRes.rows[0];

    // ลบไฟล์แนบและประวัติการจองที่ผูกอยู่กับห้องนี้ทั้งหมด
    await client.query(`
      DELETE FROM booking_attachments 
      WHERE booking_id IN (SELECT booking_id FROM room_bookings WHERE room_id = $1)
    `, [id]);

    const delBookings = await client.query('DELETE FROM room_bookings WHERE room_id = $1', [id]);

    // ลบห้อง
    await client.query('DELETE FROM rooms WHERE room_id = $1', [id]);

    await client.query('COMMIT');

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'ROOM_DELETE',
      resource: 'ROOM',
      resourceId: String(id),
      status: 'SUCCESS',
      details: `ลบห้องประชุม: "${deletedRoom.room_name}" (${deletedRoom.location}) พร้อมล้างประวัติการจองที่เกี่ยวข้อง ${delBookings.rowCount} รายการ`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/app/rooms?success=${encodeURIComponent(`ลบห้องประชุม "${deletedRoom.room_name}" ออกจากระบบเรียบร้อยแล้ว`)}`);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  getRoomsPage,
  createRoom,
  updateRoom,
  toggleRoom,
  deleteRoom
};

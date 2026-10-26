const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const { logAudit } = require('../middlewares/auth');

// ดูและดาวน์โหลดไฟล์แบบ Protected Storage (ป้องกัน IDOR)
async function getFile(req, res, next) {
  try {
    const { id } = req.params;
    const attachmentId = parseInt(id, 10);
    if (isNaN(attachmentId)) {
      return res.status(404).render('error', {
        title: '404 File Not Found',
        code: 404,
        message: 'ไม่พบไฟล์เอกสารที่ร้องขอ'
      });
    }

    // ดึงข้อมูลไฟล์จากตาราง booking_attachments
    const fileRes = await pool.query(`
      SELECT ba.*, rb.user_id as booking_owner_id
      FROM booking_attachments ba
      JOIN room_bookings rb ON ba.booking_id = rb.booking_id
      WHERE ba.attachment_id = $1
    `, [attachmentId]);

    if (fileRes.rowCount === 0) {
      return res.status(404).render('error', {
        title: '404 File Not Found',
        code: 404,
        message: 'ไม่พบไฟล์เอกสารที่ร้องขอ'
      });
    }

    const file = fileRes.rows[0];

    // ตรวจสอบ Ownership / Role Security Guard (Anti-IDOR)
    const isOwner = file.booking_owner_id === req.session.userId || file.uploaded_by === req.session.userId;
    const isAuthorizedRole = ['admin', 'approver', 'facility'].includes(req.session.roleName);

    if (!isOwner && !isAuthorizedRole) {
      // บันทึก Security Audit Log เหตุการณ์พยายามแอบเปิดไฟล์ผู้อื่น (IDOR Attempt)
      await logAudit({
        userId: req.session.userId,
        username: req.session.username,
        roleName: req.session.roleName,
        action: 'ACCESS_DENIED',
        resource: 'FILE_PROTECTED',
        resourceId: String(attachmentId),
        status: 'DENIED',
        details: `ผู้ใช้ ${req.session.username} พยายามเข้าถึงไฟล์เอกสารที่ไม่ได้รับอนุญาต (Anti-IDOR Guard)`,
        ip: req.ip,
        ua: req.get('user-agent')
      });

      return res.status(403).render('error', {
        title: '403 Forbidden - ละเมิดสิทธิ์การเข้าถึงไฟล์',
        code: 403,
        message: 'คุณไม่มีสิทธิ์เข้าถึงหรือดาวน์โหลดไฟล์เอกสารแนบฉบับนี้ (Protected File)'
      });
    }

    if (!fs.existsSync(file.file_path)) {
      return res.status(404).render('error', {
        title: '404 File Not Found',
        code: 404,
        message: 'ไฟล์ต้นฉบับบนเครื่องแม่ข่ายสูญหาย'
      });
    }

    // ส่งไฟล์เป็น Secure Stream พร้อม Content-Type
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_name)}"`);
    const fileStream = fs.createReadStream(file.file_path);
    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = { getFile };

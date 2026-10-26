const pool = require('../config/db');

// 1. ตรวจสอบการเข้าสู่ระบบ (Authentication Guard)
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (req.xhr || req.headers.accept?.includes('json') || req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({
        error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
        redirect: '/login?error=expired'
      });
    }
    return res.redirect('/login?error=expired');
  }
  next();
}

// 2. ตรวจสอบสิทธิ์เฉพาะ Admin สำหรับเส้นทาง /admin และ /api/admin (Admin Route Guard)
// ดึงข้อมูล Role ปัจจุบันสดๆ จากฐานข้อมูล เพื่อให้การเปลี่ยนแปลงมีผลทันที
async function requireAdmin(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      if (req.originalUrl.startsWith('/api/') || req.xhr || req.headers.accept?.includes('json')) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' });
      }
      return res.redirect('/login?error=unauthorized');
    }

    // ดึง Role สดจาก Database และเช็คว่าบัญชียังเปิดใช้งาน (is_active) หรือไม่
    const r = await pool.query(`
      SELECT ro.role_name 
      FROM users u
      JOIN roles ro ON ro.role_id = u.role_id
      WHERE u.user_id = $1 AND u.is_active = TRUE
    `, [req.session.userId]);

    const isAdmin = r.rows[0]?.role_name === 'admin';

    if (!isAdmin) {
      // บันทึก Security Audit Log การพยายามเข้าถึงโดยไม่มีสิทธิ์
      await logAudit({
        userId: req.session.userId,
        username: req.session.username,
        roleName: req.session.roleName,
        action: 'ACCESS_DENIED',
        resource: 'ADMIN_PANEL',
        resourceId: req.originalUrl,
        status: 'DENIED',
        details: 'ผู้ใช้ที่ไม่ใช่ Admin หรือถูกระงับบัญชี พยายามเข้าถึงเส้นทางผู้ดูแลระบบ',
        ip: req.ip,
        ua: req.get('user-agent')
      });

      if (req.originalUrl.startsWith('/api/') || req.xhr || req.headers.accept?.includes('json')) {
        return res.status(403).json({ error: 'Forbidden: สิทธิ์ไม่เพียงพอ (เฉพาะ Admin เท่านั้น)' });
      }

      return res.status(403).render('error', {
        title: '403 Forbidden - สิทธิ์ไม่เพียงพอ',
        code: 403,
        message: 'คุณไม่มีสิทธิ์เข้าถึงหน้าผู้ดูแลระบบ (Admin Only)'
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

// 3. Dynamic ACL Guard (เช็คสิทธิ์แบบ Real-time จากฐานข้อมูล)
// ข้อกำหนดอาจารย์: ติ๊กเปลี่ยนสิทธิ์หรือสลับ Role แล้วต้องมีผลทันที ห้าม Restart Server และไม่ต้อง Login ใหม่
function requirePermission(permissionCode) {
  return async (req, res, next) => {
    try {
      if (!req.session || !req.session.userId) {
        if (req.originalUrl.startsWith('/api/') || req.xhr || req.headers.accept?.includes('json')) {
          return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' });
        }
        return res.status(401).redirect('/login?error=unauthorized');
      }

      // ดึงสิทธิ์สดๆ ของผู้ใช้จากฐานข้อมูลแบบ Real-time โดยตรง (ไม่พึ่งพา Session เก่า)
      // เชื่อมโยง users -> role_permissions -> permissions และตรวจความพร้อมของบัญชี (is_active = TRUE)
      const result = await pool.query(`
        SELECT 1 
        FROM users u
        JOIN role_permissions rp ON rp.role_id = u.role_id
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE u.user_id = $1 AND u.is_active = TRUE AND p.permission_code = $2
      `, [req.session.userId, permissionCode]);

      if (result.rowCount === 0) {
        // บันทึก Security Audit Log
        await logAudit({
          userId: req.session.userId,
          username: req.session.username,
          roleName: req.session.roleName,
          action: 'ACCESS_DENIED',
          resource: 'PERMISSION',
          resourceId: permissionCode,
          status: 'DENIED',
          details: `บทบาทปัจจุบันของผู้ใช้ไม่มีสิทธิ์ "${permissionCode}" หรือบัญชีถูกระงับ`,
          ip: req.ip,
          ua: req.get('user-agent')
        });

        if (req.xhr || req.headers.accept?.includes('json') || req.originalUrl.startsWith('/api/')) {
          return res.status(403).json({ 
            error: `คุณไม่มีสิทธิ์ดำเนินการในส่วนนี้ (${permissionCode})` 
          });
        }
        return res.status(403).render('error', {
          title: '403 Forbidden',
          code: 403,
          message: `สิทธิ์ของคุณไม่ได้รับอนุญาตให้ทำรายการนี้ [Code: ${permissionCode}]`
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

// 4. ฟังก์ชันบันทึก Audit Log ลงตารางใน PostgreSQL
async function logAudit({ userId, username, roleName, action, resource, resourceId, status, details, ip, ua }) {
  try {
    await pool.query(`
      INSERT INTO audit_logs (
        user_id, username, role_name, action, resource,
        resource_id, status, details, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      userId || null,
      username || 'anonymous',
      roleName || 'guest',
      action,
      resource,
      String(resourceId || ''),
      status || 'SUCCESS',
      details || null,
      ip || '127.0.0.1',
      ua || null
    ]);
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  requirePermission,
  logAudit
};

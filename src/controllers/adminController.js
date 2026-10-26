const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { logAudit } = require('../middlewares/auth');

const CORE_PERMISSIONS = [
  'room.view_schedule', 'room.manage', 'room.block_schedule',
  'booking.create', 'booking.read_own', 'booking.read_all', 'booking.cancel_own', 'booking.approve',
  'facility.checkin', 'facility.checkout', 'file.upload_agenda', 'file.upload_inspect', 'file.view',
  'acl.manage', 'user.manage', 'log.read'
];

const CATEGORY_DEFINITIONS = {
  admin: {
    key: 'admin',
    name: 'การจัดการระบบและความปลอดภัย',
    enName: 'System Administration & Security',
    icon: '⚙️',
    color: '#4f46e5',
    badgeClass: 'cat-badge-admin',
    order: 1
  },
  room: {
    key: 'room',
    name: 'การจัดการห้องประชุมและทรัพยากร',
    enName: 'Room & Resource Management',
    icon: '🏢',
    color: '#0284c7',
    badgeClass: 'cat-badge-room',
    order: 2
  },
  booking: {
    key: 'booking',
    name: 'การจองห้องและการอนุมัติ',
    enName: 'Room Bookings & Approvals',
    icon: '📅',
    color: '#059669',
    badgeClass: 'cat-badge-booking',
    order: 3
  },
  facility: {
    key: 'facility',
    name: 'การดูแลสถานที่และปฏิบัติการ',
    enName: 'Facilities & Operations',
    icon: '🛠️',
    color: '#d97706',
    badgeClass: 'cat-badge-facility',
    order: 4
  },
  file: {
    key: 'file',
    name: 'เอกสารและไฟล์แนบ',
    enName: 'Files & Documents',
    icon: '📎',
    color: '#7c3aed',
    badgeClass: 'cat-badge-file',
    order: 5
  },
  general: {
    key: 'general',
    name: 'สิทธิ์ทั่วไป / สิทธิ์เพิ่มเติม',
    enName: 'General & Custom Permissions',
    icon: '📌',
    color: '#475569',
    badgeClass: 'cat-badge-general',
    order: 6
  }
};

async function getAclMatrix(req, res, next) {
  try {
    const rolesRes = await pool.query('SELECT * FROM roles ORDER BY role_id ASC');
    const permissionsRes = await pool.query('SELECT * FROM permissions ORDER BY category, permission_id ASC');

    const grantsRes = await pool.query('SELECT role_id, permission_id FROM role_permissions');

    const grantSet = new Set(
      grantsRes.rows.map(g => `${g.role_id}_${g.permission_id}`)
    );

    const groupsMap = new Map();
    for (const p of permissionsRes.rows) {
      const catKey = p.category || 'general';
      if (!groupsMap.has(catKey)) {
        const meta = CATEGORY_DEFINITIONS[catKey] || {
          key: catKey,
          name: `หมวดหมู่ ${catKey}`,
          enName: catKey,
          icon: '🏷️',
          color: '#64748b',
          badgeClass: 'cat-badge-general',
          order: 99
        };
        groupsMap.set(catKey, {
          categoryKey: catKey,
          meta,
          permissions: []
        });
      }
      groupsMap.get(catKey).permissions.push(p);
    }

    const groupedPermissions = Array.from(groupsMap.values()).sort((a, b) => {
      const orderA = a.meta.order || 99;
      const orderB = b.meta.order || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.categoryKey.localeCompare(b.categoryKey);
    });

    res.render('admin/acl', {
      title: 'จัดการตารางสิทธิ์ (Dynamic ACL Matrix)',
      user: req.session,
      roles: rolesRes.rows,
      permissions: permissionsRes.rows,
      groupedPermissions,
      categoryDefinitions: CATEGORY_DEFINITIONS,
      grantSet,
      corePermissions: CORE_PERMISSIONS,
      coreRoles: ['admin', 'requester', 'approver', 'facility'],
      success: req.query.success || '',
      error: req.query.error || ''
    });
  } catch (err) {
    next(err);
  }
}

async function updateAclMatrix(req, res, next) {
  const client = await pool.connect();
  try {
    const { grants } = req.body;
    const submittedGrants = Array.isArray(grants) ? grants : (grants ? [grants] : []);

    await client.query('BEGIN');

    const adminRoleIdRes = await client.query("SELECT role_id FROM roles WHERE role_name = 'admin'");
    const aclManagePermRes = await client.query("SELECT permission_id FROM permissions WHERE permission_code = 'acl.manage'");

    if (adminRoleIdRes.rowCount > 0 && aclManagePermRes.rowCount > 0) {
      const adminRoleId = adminRoleIdRes.rows[0].role_id;
      const aclPermId = aclManagePermRes.rows[0].permission_id;
      const adminCrucialGrant = `${adminRoleId}_${aclPermId}`;
      if (!submittedGrants.includes(adminCrucialGrant)) {
        submittedGrants.push(adminCrucialGrant);
      }
    }

    await client.query('DELETE FROM role_permissions');

    for (const g of submittedGrants) {
      const [rId, pId] = g.split('_').map(Number);
      if (rId && pId) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [rId, pId]
        );
      }
    }

    await client.query('COMMIT');
    global.ACL_VERSION = Date.now();

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'ACL_MATRIX_UPDATE',
      resource: 'ACL',
      resourceId: 'ALL',
      status: 'SUCCESS',
      details: `อัปเดตตารางสิทธิ์ ACL Matrix (${submittedGrants.length} grants) มีผลทันทีโดยไม่ต้อง Restart Server`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/admin/acl?success=${encodeURIComponent('บันทึกการเปลี่ยนแปลงสิทธิ์ ACL เรียบร้อยแล้ว (มีผลทันทีทุกคำขอถัดไป)')}`);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function togglePermission(req, res, next) {
  try {
    const { role_id, permission_id, granted } = req.body;
    const rId = parseInt(role_id, 10);
    const pId = parseInt(permission_id, 10);

    if (isNaN(rId) || isNaN(pId)) {
      return res.status(400).json({ error: 'รหัสบทบาทหรือรหัสสิทธิ์ไม่ถูกต้อง (Invalid Role ID or Permission ID)' });
    }

    const adminRoleIdRes = await pool.query("SELECT role_id FROM roles WHERE role_name = 'admin'");
    const aclManagePermRes = await pool.query("SELECT permission_id FROM permissions WHERE permission_code = 'acl.manage'");

    if (adminRoleIdRes.rowCount > 0 && aclManagePermRes.rowCount > 0) {
      if (rId === adminRoleIdRes.rows[0].role_id && pId === aclManagePermRes.rows[0].permission_id && !granted) {
        return res.status(400).json({ error: 'ไม่สามารถปลดสิทธิ์จัดการ ACL ของ Admin ได้ เพื่อป้องกันระบบล็อกตัวเอง' });
      }
    }

    if (granted) {
      await pool.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [rId, pId]
      );
    } else {
      await pool.query(
        'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [rId, pId]
      );
    }

    const info = await pool.query(`
      SELECT r.display_name as role_name, p.permission_code
      FROM roles r, permissions p
      WHERE r.role_id = $1 AND p.permission_id = $2
    `, [rId, pId]);

    const roleName = info.rows[0]?.role_name || rId;
    const permCode = info.rows[0]?.permission_code || pId;

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: granted ? 'ACL_GRANT' : 'ACL_REVOKE',
      resource: 'ACL',
      resourceId: `${rId}_${pId}`,
      status: 'SUCCESS',
      details: `${granted ? 'มอบสิทธิ์' : 'เพิกถอนสิทธิ์'} "${permCode}" ให้กับบทบาท "${roleName}" (Instant Real-time Toggle)`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    global.ACL_VERSION = Date.now();
    res.json({ success: true, granted, message: 'อัปเดตสิทธิ์สำเร็จทันที' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createRole(req, res, next) {
  try {
    const { role_name, display_name, description } = req.body;
    const cleanRoleName = String(role_name || '').trim().toLowerCase().replace(/\s+/g, '_');

    if (!cleanRoleName || !display_name) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('กรุณาระบุรหัสบทบาทและชื่อบทบาทให้ครบถ้วน')}`);
    }

    const result = await pool.query(`
      INSERT INTO roles (role_name, display_name, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [cleanRoleName, display_name.trim(), description || null]);

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'ROLE_CREATE',
      resource: 'ROLE',
      resourceId: String(result.rows[0].role_id),
      status: 'SUCCESS',
      details: `สร้างบทบาทใหม่ "${display_name}" (${cleanRoleName}) ผ่านหน้าเว็บ`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/admin/acl?success=${encodeURIComponent(`สร้างบทบาท "${display_name}" สำเร็จและเพิ่มเข้าสู่ตาราง ACL ทันที`)}`);
  } catch (err) {
    if (err.code === '23505') {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('รหัสบทบาทนี้มีอยู่ในระบบแล้ว')}`);
    }
    next(err);
  }
}

async function createPermission(req, res, next) {
  try {
    const { permission_code, description, category } = req.body;
    const cleanCode = String(permission_code || '').trim().toLowerCase();

    if (!cleanCode || !description) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('กรุณาระบุรหัสสิทธิ์และคำอธิบายให้ครบถ้วน')}`);
    }

    const result = await pool.query(`
      INSERT INTO permissions (permission_code, description, category)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [cleanCode, description.trim(), category || 'general']);

    const adminRole = await pool.query("SELECT role_id FROM roles WHERE role_name = 'admin'");
    if (adminRole.rowCount > 0) {
      await pool.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [adminRole.rows[0].role_id, result.rows[0].permission_id]
      );
    }

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'PERMISSION_CREATE',
      resource: 'PERMISSION',
      resourceId: String(result.rows[0].permission_id),
      status: 'SUCCESS',
      details: `สร้างรหัสสิทธิ์ใหม่ "${cleanCode}" ผ่านหน้าเว็บ`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/admin/acl?success=${encodeURIComponent(`สร้างสิทธิ์ "${cleanCode}" สำเร็จและพร้อมใช้งานในตาราง ACL ทันที`)}`);
  } catch (err) {
    if (err.code === '23505') {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('รหัสสิทธิ์นี้มีอยู่ในระบบแล้ว')}`);
    }
    next(err);
  }
}

async function updateRole(req, res, next) {
  try {
    const roleId = parseInt(req.params.id, 10);
    if (isNaN(roleId)) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('รหัสบทบาทไม่ถูกต้อง')}`);
    }
    const { display_name, description } = req.body;

    if (!display_name || !display_name.trim()) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('กรุณาระบุชื่อบทบาทที่ต้องการแก้ไข')}`);
    }

    const targetRole = await pool.query('SELECT * FROM roles WHERE role_id = $1', [roleId]);
    if (targetRole.rowCount === 0) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('ไม่พบบทบาทที่ระบุ')}`);
    }

    await pool.query(`
      UPDATE roles
      SET display_name = $1, description = $2
      WHERE role_id = $3
    `, [display_name.trim(), description ? description.trim() : null, roleId]);

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'ROLE_UPDATE',
      resource: 'ROLE',
      resourceId: String(roleId),
      status: 'SUCCESS',
      details: `แก้ไขชื่อบทบาท "${targetRole.rows[0].role_name}" เป็น "${display_name.trim()}"`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/admin/acl?success=${encodeURIComponent(`อัปเดตบทบาท "${display_name.trim()}" เรียบร้อยแล้ว`)}`);
  } catch (err) {
    next(err);
  }
}

async function deleteRole(req, res, next) {
  try {
    const roleId = parseInt(req.params.id, 10);
    if (isNaN(roleId)) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('รหัสบทบาทไม่ถูกต้อง')}`);
    }
    const targetRole = await pool.query('SELECT * FROM roles WHERE role_id = $1', [roleId]);
    if (targetRole.rowCount === 0) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('ไม่พบบทบาทที่ระบุ')}`);
    }

    const role = targetRole.rows[0];

    if (role.role_name === 'admin') {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('ไม่สามารถลบบทบาทผู้ดูแลระบบ (Admin) ได้')}`);
    }

    const usersCount = await pool.query('SELECT COUNT(*) FROM users WHERE role_id = $1', [roleId]);
    const count = Number(usersCount.rows[0].count);
    if (count > 0) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent(`ไม่สามารถลบบทบาท "${role.display_name}" ได้ เนื่องจากยังมีผู้ใช้งานผูกอยู่ ${count} คน`)}`);
    }

    await pool.query('DELETE FROM roles WHERE role_id = $1', [roleId]);

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'ROLE_DELETE',
      resource: 'ROLE',
      resourceId: String(roleId),
      status: 'SUCCESS',
      details: `ลบบทบาท "${role.display_name}" (${role.role_name}) ออกจากระบบ`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    global.ACL_VERSION = Date.now();
    res.redirect(`/admin/acl?success=${encodeURIComponent(`ลบบทบาท "${role.display_name}" สำเร็จ`)}`);
  } catch (err) {
    next(err);
  }
}

async function updatePermission(req, res, next) {
  try {
    const permId = parseInt(req.params.id, 10);
    if (isNaN(permId)) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('รหัสสิทธิ์ไม่ถูกต้อง')}`);
    }
    const { description, category } = req.body;

    if (!description || !description.trim()) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('กรุณาระบุคำอธิบายสิทธิ์')}`);
    }

    const targetPerm = await pool.query('SELECT * FROM permissions WHERE permission_id = $1', [permId]);
    if (targetPerm.rowCount === 0) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('ไม่พบสิทธิ์ที่ระบุ')}`);
    }

    const perm = targetPerm.rows[0];
    await pool.query(`
      UPDATE permissions
      SET description = $1, category = $2
      WHERE permission_id = $3
    `, [description.trim(), category ? category.trim() : perm.category, permId]);

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'PERMISSION_UPDATE',
      resource: 'PERMISSION',
      resourceId: String(permId),
      status: 'SUCCESS',
      details: `แก้ไขคำอธิบายสิทธิ์ "${perm.permission_code}"`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/admin/acl?success=${encodeURIComponent(`อัปเดตสิทธิ์ "${perm.permission_code}" เรียบร้อยแล้ว`)}`);
  } catch (err) {
    next(err);
  }
}

async function deletePermission(req, res, next) {
  try {
    const permId = parseInt(req.params.id, 10);
    if (isNaN(permId)) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('รหัสสิทธิ์ไม่ถูกต้อง')}`);
    }
    const targetPerm = await pool.query('SELECT * FROM permissions WHERE permission_id = $1', [permId]);
    if (targetPerm.rowCount === 0) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent('ไม่พบสิทธิ์ที่ระบุ')}`);
    }

    const perm = targetPerm.rows[0];

    if (CORE_PERMISSIONS.includes(perm.permission_code)) {
      return res.redirect(`/admin/acl?error=${encodeURIComponent(`ไม่สามารถลบสิทธิ์หลัก "${perm.permission_code}" ได้ เนื่องจากจำเป็นต่อการทำงานของระบบ`)}`);
    }

    await pool.query('DELETE FROM permissions WHERE permission_id = $1', [permId]);

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'PERMISSION_DELETE',
      resource: 'PERMISSION',
      resourceId: String(permId),
      status: 'SUCCESS',
      details: `ลบรหัสสิทธิ์ "${perm.permission_code}" (${perm.description}) ออกจากระบบ`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    global.ACL_VERSION = Date.now();
    res.redirect(`/admin/acl?success=${encodeURIComponent(`ลบสิทธิ์ "${perm.permission_code}" สำเร็จ`)}`);
  } catch (err) {
    next(err);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    let { action, status, search, from, to, limit = 50 } = req.query;

    if (from && (!/^\d{4}-\d{2}-\d{2}$/.test(from) || isNaN(Date.parse(from)))) {
      from = null;
    }
    if (to && (!/^\d{4}-\d{2}-\d{2}$/.test(to) || isNaN(Date.parse(to)))) {
      to = null;
    }

    if (from && to && from > to) {
      const temp = from;
      from = to;
      to = temp;
    }

    let queryStr = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (action) {
      params.push(action);
      queryStr += ` AND action = $${params.length}`;
    }
    if (status) {
      params.push(status);
      queryStr += ` AND status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      queryStr += ` AND (username ILIKE $${params.length} OR details ILIKE $${params.length} OR resource ILIKE $${params.length})`;
    }
    if (from) {
      params.push(`${from} 00:00:00`);
      queryStr += ` AND created_at >= $${params.length}`;
    }
    if (to) {
      params.push(`${to} 23:59:59.999`);
      queryStr += ` AND created_at <= $${params.length}`;
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);
    params.push(safeLimit);
    queryStr += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const logsRes = await pool.query(queryStr, params);

    const distinctActions = await pool.query('SELECT DISTINCT action FROM audit_logs ORDER BY action ASC');

    res.render('admin/logs', {
      title: 'บันทึกประวัติความปลอดภัย (Audit Logs)',
      user: req.session,
      logs: logsRes.rows,
      actions: distinctActions.rows.map(r => r.action),
      filterAction: action || '',
      filterStatus: status || '',
      search: search || '',
      filterFrom: from || '',
      filterTo: to || '',
      limit: safeLimit
    });
  } catch (err) {
    next(err);
  }
}

async function exportAuditLogs(req, res, next) {
  try {
    let { action, status, search, from, to } = req.query;

    if (from && (!/^\d{4}-\d{2}-\d{2}$/.test(from) || isNaN(Date.parse(from)))) {
      from = null;
    }
    if (to && (!/^\d{4}-\d{2}-\d{2}$/.test(to) || isNaN(Date.parse(to)))) {
      to = null;
    }

    if (from && to && from > to) {
      const temp = from;
      from = to;
      to = temp;
    }

    let queryStr = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (action) {
      params.push(action);
      queryStr += ` AND action = $${params.length}`;
    }
    if (status) {
      params.push(status);
      queryStr += ` AND status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      queryStr += ` AND (username ILIKE $${params.length} OR details ILIKE $${params.length} OR resource ILIKE $${params.length})`;
    }
    if (from) {
      params.push(`${from} 00:00:00`);
      queryStr += ` AND created_at >= $${params.length}`;
    }
    if (to) {
      params.push(`${to} 23:59:59.999`);
      queryStr += ` AND created_at <= $${params.length}`;
    }

    queryStr += ' ORDER BY created_at DESC';

    const logsRes = await pool.query(queryStr, params);

    let csv = '\uFEFFLog ID,Timestamp,Username,Role,Action,Resource,Resource ID,Status,Details,IP Address\n';

    logsRes.rows.forEach(r => {
      const timeStr = new Date(r.created_at).toLocaleString('th-TH', { calendar: 'gregory' });
      const cleanDetails = (r.details || '').replace(/"/g, '""');
      csv += `"${r.log_id}","${timeStr}","${r.username || ''}","${r.role_name || ''}","${r.action}","${r.resource}","${r.resource_id || ''}","${r.status}","${cleanDetails}","${r.ip_address || ''}"\n`;
    });

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${dateStr}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const usersRes = await pool.query(`
      SELECT u.*, r.display_name as role_display, r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      ORDER BY u.user_id ASC
    `);
    const rolesRes = await pool.query('SELECT * FROM roles ORDER BY role_id ASC');

    res.render('admin/users', {
      title: 'จัดการผู้ใช้งาน (User Management)',
      user: req.session,
      users: usersRes.rows,
      roles: rolesRes.rows,
      success: req.query.success || '',
      error: req.query.error || ''
    });
  } catch (err) {
    next(err);
  }
}

async function toggleUserStatus(req, res, next) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.redirect(`/admin/users?error=${encodeURIComponent('รหัสผู้ใช้งานไม่ถูกต้อง')}`);
    }

    if (userId === req.session.userId) {
      return res.redirect(`/admin/users?error=${encodeURIComponent('ไม่สามารถปิดการใช้งานบัญชีตนเองได้')}`);
    }

    const targetUserRes = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (targetUserRes.rowCount === 0) {
      return res.redirect(`/admin/users?error=${encodeURIComponent('ไม่พบผู้ใช้งานนี้')}`);
    }
    const targetUser = targetUserRes.rows[0];

    const adminRoleRes = await pool.query("SELECT role_id FROM roles WHERE role_name = 'admin'");
    const adminRoleId = adminRoleRes.rows[0]?.role_id;

    if (targetUser.role_id === adminRoleId && targetUser.is_active) {
      const activeAdminsCount = await pool.query(
        'SELECT COUNT(*) FROM users WHERE role_id = $1 AND is_active = TRUE', [adminRoleId]
      );
      if (Number(activeAdminsCount.rows[0].count) <= 1) {
        return res.redirect(`/admin/users?error=${encodeURIComponent('ไม่สามารถระงับการใช้งาน Admin คนสุดท้ายในระบบได้ เพื่อป้องกันระบบถูกล็อก')}`);
      }
    }

    const result = await pool.query(`
      UPDATE users
      SET is_active = NOT is_active
      WHERE user_id = $1
      RETURNING *
    `, [userId]);

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'USER_TOGGLE_STATUS',
      resource: 'USER',
      resourceId: String(userId),
      status: 'SUCCESS',
      details: `เปลี่ยนสถานะบัญชี ${result.rows[0].username} เป็น ${result.rows[0].is_active ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect('/admin/users?success=' + encodeURIComponent('อัปเดตสถานะผู้ใช้งานเรียบร้อยแล้ว'));
  } catch (err) {
    next(err);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const userId = parseInt(req.params.id, 10);
    const roleIdNum = parseInt(req.body.role_id, 10);

    if (isNaN(userId) || isNaN(roleIdNum)) {
      return res.redirect(`/admin/users?error=${encodeURIComponent('รหัสผู้ใช้หรือรหัสบทบาทไม่ถูกต้อง')}`);
    }

    const targetUser = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (targetUser.rowCount === 0) {
      return res.redirect(`/admin/users?error=${encodeURIComponent('ไม่พบผู้ใช้งานนี้')}`);
    }

    const adminRoleRes = await pool.query("SELECT role_id FROM roles WHERE role_name = 'admin'");
    const adminRoleId = adminRoleRes.rows[0]?.role_id;

    if (targetUser.rows[0].role_id === adminRoleId && roleIdNum !== adminRoleId) {
      const activeAdminsCount = await pool.query(
        'SELECT COUNT(*) FROM users WHERE role_id = $1 AND is_active = TRUE', [adminRoleId]
      );
      if (Number(activeAdminsCount.rows[0].count) <= 1) {
        return res.redirect(`/admin/users?error=${encodeURIComponent('ไม่สามารถเปลี่ยน Role ของ Admin คนสุดท้ายในระบบได้')}`);
      }
    }

    const updateRes = await pool.query(`
      UPDATE users
      SET role_id = $1
      WHERE user_id = $2
      RETURNING *
    `, [roleIdNum, userId]);

    const newRoleInfo = await pool.query('SELECT display_name FROM roles WHERE role_id = $1', [roleIdNum]);

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'USER_ROLE_CHANGE',
      resource: 'USER',
      resourceId: String(userId),
      status: 'SUCCESS',
      details: `เปลี่ยนบทบาทของ ${updateRes.rows[0].username} เป็น "${newRoleInfo.rows[0]?.display_name}"`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect('/admin/users?success=' + encodeURIComponent(`เปลี่ยนบทบาทของ ${updateRes.rows[0].username} เรียบร้อยแล้ว`));
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { username, password, full_name, department, role_id } = req.body;
    const cleanUsername = String(username || '').trim().toLowerCase();
    const roleIdNum = parseInt(role_id, 10);

    if (!cleanUsername || !password || !full_name || isNaN(roleIdNum)) {
      return res.redirect(`/admin/users?error=${encodeURIComponent('กรุณากรอกข้อมูล Username, Password, ชื่อ-นามสกุล และเลือกบทบาทให้ถูกต้อง')}`);
    }

    const existUser = await pool.query('SELECT user_id FROM users WHERE username = $1', [cleanUsername]);
    if (existUser.rowCount > 0) {
      return res.redirect(`/admin/users?error=${encodeURIComponent('ชื่อผู้ใช้งาน (Username) นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น')}`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insertRes = await pool.query(`
      INSERT INTO users (username, password_hash, full_name, department, role_id, is_active)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      RETURNING *
    `, [cleanUsername, passwordHash, full_name.trim(), department ? department.trim() : null, roleIdNum]);

    const newUser = insertRes.rows[0];

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'USER_CREATE',
      resource: 'USER',
      resourceId: String(newUser.user_id),
      status: 'SUCCESS',
      details: `สร้างผู้ใช้งานใหม่: "${newUser.username}" (${newUser.full_name})`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/admin/users?success=${encodeURIComponent(`สร้างผู้ใช้งาน "${newUser.username}" สำเร็จและพร้อมใช้งานทันที`)}`);
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  const client = await pool.connect();
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.redirect(`/admin/users?error=${encodeURIComponent('รหัสผู้ใช้งานไม่ถูกต้อง')}`);
    }

    if (userId === req.session.userId) {
      return res.redirect(`/admin/users?error=${encodeURIComponent('ไม่สามารถลบบัญชีที่กำลังล็อกอินใช้งานอยู่ได้')}`);
    }

    const targetUserRes = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (targetUserRes.rowCount === 0) {
      return res.redirect(`/admin/users?error=${encodeURIComponent('ไม่พบผู้ใช้งานนี้')}`);
    }
    const targetUser = targetUserRes.rows[0];

    const adminRoleRes = await pool.query("SELECT role_id FROM roles WHERE role_name = 'admin'");
    const adminRoleId = adminRoleRes.rows[0]?.role_id;

    if (targetUser.role_id === adminRoleId) {
      const activeAdminsCount = await pool.query(
        'SELECT COUNT(*) FROM users WHERE role_id = $1', [adminRoleId]
      );
      if (Number(activeAdminsCount.rows[0].count) <= 1) {
        return res.redirect(`/admin/users?error=${encodeURIComponent('ไม่สามารถลบ Admin คนสุดท้ายในระบบได้ เพื่อป้องกันระบบถูกล็อก')}`);
      }
    }

    await client.query('BEGIN');

    await client.query(`
      DELETE FROM booking_attachments
      WHERE booking_id IN (SELECT booking_id FROM room_bookings WHERE user_id = $1)
    `, [userId]);

    await client.query('UPDATE room_bookings SET approver_id = NULL WHERE approver_id = $1', [userId]);
    await client.query('UPDATE room_bookings SET facility_officer_id = NULL WHERE facility_officer_id = $1', [userId]);

    const delBookings = await client.query('DELETE FROM room_bookings WHERE user_id = $1', [userId]);

    await client.query('DELETE FROM booking_attachments WHERE uploaded_by = $1', [userId]);

    await client.query('DELETE FROM users WHERE user_id = $1', [userId]);

    await client.query('COMMIT');

    await logAudit({
      userId: req.session.userId,
      username: req.session.username,
      roleName: req.session.roleName,
      action: 'USER_DELETE',
      resource: 'USER',
      resourceId: String(userId),
      status: 'SUCCESS',
      details: `ลบผู้ใช้งาน "${targetUser.username}" (${targetUser.full_name}) พร้อมล้างรายการจองที่เกี่ยวข้อง ${delBookings.rowCount} รายการ`,
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect(`/admin/users?success=${encodeURIComponent(`ลบผู้ใช้งาน "${targetUser.username}" ออกจากระบบเรียบร้อยแล้ว`)}`);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  getAclMatrix,
  updateAclMatrix,
  togglePermission,
  createRole,
  updateRole,
  deleteRole,
  createPermission,
  updatePermission,
  deletePermission,
  getAuditLogs,
  exportAuditLogs,
  getUsers,
  toggleUserStatus,
  updateUserRole,
  createUser,
  deleteUser
};

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requirePermission } = require('../middlewares/auth');

// 1. หน้าแรกของ Admin (Redirect ไปหน้าที่ผู้ใช้มีสิทธิ์หน้าแรก หรือไป /app หากไม่มีสิทธิ์หน้าใดเลย)
router.get('/', requireAuth, async (req, res) => {
  const perms = res.locals.userPermissions || [];
  const isAdmin = req.session.roleName === 'admin';

  if (isAdmin || perms.includes('acl.manage')) return res.redirect('/admin/acl');
  if (isAdmin || perms.includes('user.manage')) return res.redirect('/admin/users');
  if (isAdmin || perms.includes('log.read')) return res.redirect('/admin/logs');
  return res.redirect('/app');
});

// 2. จัดการตารางสิทธิ์ Dynamic ACL Matrix (Role × Permission)
router.get('/acl', requireAuth, requirePermission('acl.manage'), adminController.getAclMatrix);
router.post('/acl', requireAuth, requirePermission('acl.manage'), adminController.updateAclMatrix);
router.post('/acl/toggle', requireAuth, requirePermission('acl.manage'), adminController.togglePermission);
router.post('/roles/create', requireAuth, requirePermission('acl.manage'), adminController.createRole);
router.post('/roles/:id/update', requireAuth, requirePermission('acl.manage'), adminController.updateRole);
router.post('/roles/:id/delete', requireAuth, requirePermission('acl.manage'), adminController.deleteRole);
router.post('/permissions/create', requireAuth, requirePermission('acl.manage'), adminController.createPermission);
router.post('/permissions/:id/update', requireAuth, requirePermission('acl.manage'), adminController.updatePermission);
router.post('/permissions/:id/delete', requireAuth, requirePermission('acl.manage'), adminController.deletePermission);

// 3. ตรวจสอบบันทึกประวัติความปลอดภัย (Audit Logs)
router.get('/logs', requireAuth, requirePermission('log.read'), adminController.getAuditLogs);
router.get('/logs/export', requireAuth, requirePermission('log.read'), adminController.exportAuditLogs);

// 4. จัดการบัญชีผู้ใช้งาน
router.get('/users', requireAuth, requirePermission('user.manage'), adminController.getUsers);
router.post('/users/:id/toggle', requireAuth, requirePermission('user.manage'), adminController.toggleUserStatus);
router.post('/users/:id/role', requireAuth, requirePermission('user.manage'), adminController.updateUserRole);

module.exports = router;

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');

// ทุก Route ในนี้ต้องผ่านการตรวจสอบ Admin เท่านั้น (หากไม่ใช่ Admin จะดีด 403 ทันที)
router.use(requireAuth, requireAdmin);

// 1. หน้าแรกของ Admin (Redirect ไปตาราง ACL)
router.get('/', (req, res) => res.redirect('/admin/acl'));

// 2. จัดการตารางสิทธิ์ Dynamic ACL Matrix (Role × Permission)
router.get('/acl', adminController.getAclMatrix);
router.post('/acl', adminController.updateAclMatrix);
router.post('/acl/toggle', adminController.togglePermission);
router.post('/roles/create', adminController.createRole);
router.post('/roles/:id/update', adminController.updateRole);
router.post('/roles/:id/delete', adminController.deleteRole);
router.post('/permissions/create', adminController.createPermission);
router.post('/permissions/:id/update', adminController.updatePermission);
router.post('/permissions/:id/delete', adminController.deletePermission);

// 3. ตรวจสอบบันทึกประวัติความปลอดภัย (Audit Logs)
router.get('/logs', adminController.getAuditLogs);
router.get('/logs/export', adminController.exportAuditLogs);

// 4. จัดการบัญชีผู้ใช้งาน
router.get('/users', adminController.getUsers);
router.post('/users/:id/toggle', adminController.toggleUserStatus);
router.post('/users/:id/role', adminController.updateUserRole);

module.exports = router;

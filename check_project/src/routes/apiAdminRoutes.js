const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const adminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');

router.use(requireAuth, requireAdmin);

router.get('/users', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT u.user_id, u.username, u.full_name, u.department, u.is_active, u.created_at,
             r.role_id, r.role_name, r.display_name as role_display
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      ORDER BY u.user_id ASC
    `);
    res.json({ success: true, users: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/roles', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT role_id, role_name, display_name, description, created_at
      FROM roles
      ORDER BY role_id ASC
    `);
    res.json({ success: true, roles: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/permissions', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT permission_id, permission_code, description, category
      FROM permissions
      ORDER BY category ASC, permission_id ASC
    `);
    res.json({ success: true, permissions: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/acl', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT role_id, permission_id, granted_at
      FROM role_permissions
      ORDER BY role_id ASC, permission_id ASC
    `);
    res.json({ success: true, acl: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/logs', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const result = await pool.query(`
      SELECT log_id, user_id, username, role_name, action, resource, resource_id,
             status, details, ip_address, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
    res.json({ success: true, logs: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/acl/toggle', adminController.togglePermission);

module.exports = router;

const fs = require('fs');
if (fs.existsSync('.env') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env');
}

const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./config/db');
const { logAudit } = require('./middlewares/auth');

const app = express();

// เชื่อถือ Reverse Proxy (Render / Cloudflare) ป้องกัน Cookie และ Session หลุด
app.set('trust proxy', 1);

// ตั้งค่า View Engine (EJS ตามที่อาจารย์สอน)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body Parser & Static files
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Dev Live Auto-Reload Ping Endpoint (ตรวจจับการรีสตาร์ตเพื่อสั่งเบราว์เซอร์รีเฟรชตัวเองทันที)
const SERVER_BOOT_TIME = Date.now();
app.get('/__dev_ping', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.json({ bootTime: SERVER_BOOT_TIME });
});

// Dynamic ACL Matrix Version Endpoint สำหรับ Live ACL Sync
app.get('/api/acl-version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.json({ version: global.ACL_VERSION || 1 });
});

// Session Health Check Endpoint สำหรับ Client Heartbeat
app.get('/api/session-status', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      authenticated: false,
      error: 'SESSION_EXPIRED',
      redirect: '/login'
    });
  }
  res.json({
    authenticated: true,
    userId: req.session.userId,
    username: req.session.username,
    maxAge: req.session.cookie?.maxAge || 0
  });
});

// Session Configuration (Persistent Session via PostgreSQL to survive dev reloads + Inactivity Expiration)
const pgSession = require('connect-pg-simple')(session);
const SESSION_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT_MS, 10) || (30 * 60 * 1000); // ค่าเริ่มต้น 30 นาที
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions',
    createTableIfMissing: false
  }),
  secret: process.env.SESSION_SECRET || 'roomreserve_secret_2026',
  resave: false,
  saveUninitialized: false,
  rolling: true, // รีเฟรชอายุ Session อัตโนมัติเมื่อผู้ใช้มีการใช้งานอย่างต่อเนื่อง
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TIMEOUT_MS
  }
}));

// Global Template Variables
app.use(async (req, res, next) => {
  try {
    let userPermissions = [];
    if (req.session.userId) {
      const permsRes = await pool.query(`
        SELECT p.permission_code
        FROM users u
        JOIN role_permissions rp ON rp.role_id = u.role_id
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE u.user_id = $1 AND u.is_active = TRUE
      `, [req.session.userId]);
      userPermissions = permsRes.rows.map(r => r.permission_code);
    }

    res.locals.currentUser = req.session.userId ? {
      id: req.session.userId,
      username: req.session.username,
      fullName: req.session.fullName,
      roleName: req.session.roleName,
      roleDisplay: req.session.roleDisplay,
      department: req.session.department
    } : null;
    res.locals.userPermissions = userPermissions;
    res.locals.isAdmin = req.session.roleName === 'admin';
    next();
  } catch (err) {
    next(err);
  }
});

// ================= Authentication Routes =================

// หน้า Login
app.get('/login', async (req, res) => {
  // หากมีคำขอ force หรือ logout ให้ล้างเซสชันและเปิดหน้า login ทันที
  if (req.query.force || req.query.logout) {
    return req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.render('login', {
        title: 'เข้าสู่ระบบ | RoomReserve',
        error: '',
        success: 'ออกจากระบบเรียบร้อยแล้ว กรุณาเข้าสู่ระบบใหม่'
      });
    });
  }

  // หากมีเซสชันค้างอยู่ ให้ตรวจสอบว่าบัญชีนี้ยังมีอยู่จริงในฐานข้อมูลและยังเปิดใช้งาน
  if (req.session.userId) {
    try {
      const uRes = await pool.query('SELECT user_id, is_active FROM users WHERE user_id = $1', [req.session.userId]);
      if (uRes.rowCount === 0 || !uRes.rows[0].is_active) {
        return req.session.destroy(() => {
          res.clearCookie('connect.sid');
          res.render('login', {
            title: 'เข้าสู่ระบบ | RoomReserve',
            error: 'บัญชีนี้ถูกระงับหรือไม่อยู่ในระบบแล้ว กรุณาเข้าสู่ระบบใหม่',
            success: ''
          });
        });
      }
      return res.redirect('/app');
    } catch (e) {
      // หากเกิดข้อผิดพลาดในการ query ให้แสดงหน้า login ตามปกติ
    }
  }

  let errorMsg = req.query.error || '';
  // ซ่อนการแจ้งเตือนเซสชันหมดอายุ/ไม่ได้รับอนุญาต ตอนเซิร์ฟเวอร์รีสตาร์ตจากการอัปเดตโค้ด
  if (errorMsg === 'unauthorized' || errorMsg === 'expired') {
    errorMsg = '';
  }
  res.render('login', {
    title: 'เข้าสู่ระบบ | RoomReserve',
    error: errorMsg,
    success: ''
  });
});

// ตรวจสอบการ Login
app.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const userRes = await pool.query(`
      SELECT u.*, r.role_name, r.display_name as role_display
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.username = $1
    `, [username]);

    const user = userRes.rows[0];

    // ตรวจสอบว่ามีผู้ใช้นี้หรือไม่ หรือบัญชีถูกระงับหรือไม่
    if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
      await logAudit({
        userId: user ? user.user_id : null,
        username: username,
        roleName: user ? user.role_name : null,
        action: 'LOGIN_FAILED',
        resource: 'AUTH',
        resourceId: username,
        status: 'FAILED',
        details: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
        ip: req.ip,
        ua: req.get('user-agent')
      });
      return res.redirect('/login?error=' + encodeURIComponent('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'));
    }

    if (!user.is_active) {
      return res.redirect('/login?error=' + encodeURIComponent('บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'));
    }

    // ทำ Session Regeneration เพื่อป้องกัน Session Fixation Attack (ตามที่อาจารย์สอน)
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user.user_id;
      req.session.username = user.username;
      req.session.fullName = user.full_name;
      req.session.roleId = user.role_id;
      req.session.roleName = user.role_name;
      req.session.roleDisplay = user.role_display;
      req.session.department = user.department;

      logAudit({
        userId: user.user_id,
        username: user.username,
        roleName: user.role_name,
        action: 'LOGIN_SUCCESS',
        resource: 'AUTH',
        resourceId: String(user.user_id),
        status: 'SUCCESS',
        details: `เข้าสู่ระบบสำเร็จในบทบาท ${user.role_display}`,
        ip: req.ip,
        ua: req.get('user-agent')
      });

      req.session.save(() => {
        res.redirect('/app');
      });
    });
  } catch (err) {
    next(err);
  }
});

// ออกจากระบบผ่าน GET (สะดวกสำหรับลิงก์และหน้า Error)
app.get('/logout', (req, res, next) => {
  const uId = req.session?.userId;
  const uName = req.session?.username;
  const rName = req.session?.roleName;

  req.session?.destroy(() => {
    res.clearCookie('connect.sid');
    if (uId) {
      logAudit({
        userId: uId,
        username: uName,
        roleName: rName,
        action: 'LOGOUT',
        resource: 'AUTH',
        resourceId: String(uId),
        status: 'SUCCESS',
        details: 'ออกจากระบบสำเร็จ',
        ip: req.ip,
        ua: req.get('user-agent')
      }).catch(() => {});
    }
    res.redirect('/login');
  });
});

// ออกจากระบบ (Logout POST)
app.post('/logout', (req, res, next) => {
  const uId = req.session.userId;
  const uName = req.session.username;
  const rName = req.session.roleName;

  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');

    logAudit({
      userId: uId,
      username: uName,
      roleName: rName,
      action: 'LOGOUT',
      resource: 'AUTH',
      resourceId: String(uId),
      status: 'SUCCESS',
      details: 'ออกจากระบบสำเร็จ',
      ip: req.ip,
      ua: req.get('user-agent')
    });

    res.redirect('/login');
  });
});

// หน้า Root redirect ไปที่ /app
app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/app');
  res.redirect('/login');
});

// Mount Routes (แยกกลุ่ม Route ชัดเจน: ผู้ใช้ทั่วไป, หน้าเว็บ Admin, และ REST API)
app.use('/app', require('./routes/appRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/api/admin', require('./routes/apiAdminRoutes'));

// 404 Handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 ไม่พบหน้านี้',
    code: 404,
    message: 'ไม่พบหน้าที่คุณร้องขอ (Page Not Found)'
  });
});

// Centralized Error Handler (ดักจับ PostgreSQL Error Codes ตามที่อาจารย์สอน)
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);

  const pgErrors = {
    '23505': 'ข้อมูลซ้ำซ้อนในระบบ (Unique Violation)',
    '23503': 'ข้อมูลเชื่อมโยงไม่ถูกต้อง หรือมีรายการอื่นอ้างอิงอยู่ (Foreign Key Constraint)',
    '23P01': 'ช่วงเวลานี้ถูกจองซ้อนกัน (Exclusion Constraint Violation - Race Condition Prevented)',
    '22P02': 'ชนิดของข้อมูลไม่ถูกต้อง (Invalid Data Type)'
  };

  const message = pgErrors[err.code] || err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';
  const statusCode = err.status || (pgErrors[err.code] ? 400 : 500);

  res.status(statusCode).render('error', {
    title: `Error ${statusCode}`,
    code: statusCode,
    message: message
  });
});

const PORT = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`RoomReserve Server รันสำเร็จแล้วที่: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;

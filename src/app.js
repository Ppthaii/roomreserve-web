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

app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/slides', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/slides.html'));
});

const SERVER_BOOT_TIME = Date.now();
app.get('/__dev_ping', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.json({ bootTime: SERVER_BOOT_TIME });
});

app.get('/api/acl-version', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.json({ version: global.ACL_VERSION || 1 });
});

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

const pgSession = require('connect-pg-simple')(session);
const SESSION_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT_MS, 10) || (30 * 60 * 1000);
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions',
    createTableIfMissing: false
  }),
  secret: process.env.SESSION_SECRET || 'roomreserve_secret_2026',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TIMEOUT_MS
  }
}));

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

app.get('/login', async (req, res) => {

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

    }
  }

  let errorMsg = req.query.error || '';

  if (errorMsg === 'unauthorized' || errorMsg === 'expired') {
    errorMsg = '';
  }
  res.render('login', {
    title: 'เข้าสู่ระบบ | RoomReserve',
    error: errorMsg,
    success: ''
  });
});

app.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const MAX_FAILED_ATTEMPTS = 8;
    const lockCheck = await pool.query(`
      SELECT COUNT(*) as failed_count
      FROM audit_logs
      WHERE action = 'LOGIN_FAILED'
        AND (username = $1 OR ip_address = $2)
        AND created_at > NOW() - INTERVAL '10 minutes'
    `, [username || '', req.ip || '']);

    if (parseInt(lockCheck.rows[0].failed_count, 10) >= MAX_FAILED_ATTEMPTS) {
      await logAudit({
        userId: null,
        username: username,
        roleName: null,
        action: 'LOGIN_LOCKED',
        resource: 'AUTH',
        resourceId: username,
        status: 'DENIED',
        details: `พยายามเข้าสู่ระบบผิดพลาดเกิน ${MAX_FAILED_ATTEMPTS} ครั้งในรอบ 10 นาที (IP/Username ถูกล็อกชั่วคราว)`,
        ip: req.ip,
        ua: req.get('user-agent')
      });
      return res.redirect('/login?error=' + encodeURIComponent('คุณเข้าสู่ระบบผิดพลาดเกินกำหนด กรุณารอ 10 นาทีก่อนลองใหม่อีกครั้งเพื่อความปลอดภัย'));
    }

    const userRes = await pool.query(`
      SELECT u.*, r.role_name, r.display_name as role_display
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.username = $1
    `, [username]);

    const user = userRes.rows[0];

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

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/app');
  res.redirect('/login');
});

app.use('/app', require('./routes/appRoutes'));
app.use('/admin', require('./routes/adminRoutes'));
app.use('/api/admin', require('./routes/apiAdminRoutes'));

app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 ไม่พบหน้านี้',
    code: 404,
    message: 'ไม่พบหน้าที่คุณร้องขอ (Page Not Found)'
  });
});

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

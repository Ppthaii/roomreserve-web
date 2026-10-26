const fs = require('fs');
if (fs.existsSync('.env') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env');
}
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      host: process.env.PGHOST || 'localhost',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'roomreserve_db'
    };

const pool = new Pool(poolConfig);

async function runSeed() {
  console.log('--- กำลังเตรียมฐานข้อมูล RoomReserve (Safe Idempotent Seed) ---');

  // 1. อ่านและรันไฟล์ schema.sql (แบบ CREATE IF NOT EXISTS ไม่ Drop ข้อมูลเดิม)
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);
  console.log('✅ 1. ตรวจสอบ/ติดตั้ง Schema และ Exclusion Constraint เรียบร้อย');

  // 2. ข้อมูลบทบาท (Roles) - Idempotent
  await pool.query(`
    INSERT INTO roles (role_name, display_name, description) VALUES
      ('admin', 'ผู้ดูแลระบบ (Admin)', 'ควบคุมระบบ สิทธิ์ ACL และตรวจสอบ Audit Logs'),
      ('approver', 'ผู้อนุมัติ/หัวหน้างาน (Approver)', 'ตรวจสอบความสมเหตุสมผลของการใช้ห้องและอนุมัติคำขอ'),
      ('facility', 'เจ้าหน้าที่สถานที่ (Facility Officer)', 'บล็อกปิดซ่อมห้อง ส่งมอบห้อง ตรวจสอบความเรียบร้อยและปิดงาน'),
      ('requester', 'ผู้ขอใช้ห้อง (Requester)', 'ดูตารางห้องว่าง ยื่นจองห้อง และแนบเอกสารวาระการประชุม')
    ON CONFLICT (role_name) DO NOTHING;
  `);
  const roleResults = await pool.query('SELECT role_id, role_name FROM roles');
  const roles = {};
  roleResults.rows.forEach(r => { roles[r.role_name] = r.role_id; });
  console.log('✅ 2. บันทึก Roles ทั้ง 4 บทบาทเรียบร้อย');

  // 3. ข้อมูลสิทธิ์ (Permissions) - Idempotent
  const permissionsList = [
    { code: 'room.view_schedule', desc: 'ดูตารางปฏิทินและสถานะห้อง', cat: 'room' },
    { code: 'room.manage', desc: 'เพิ่มห้องและเปิด/ปิดการใช้งานห้อง', cat: 'room' },
    { code: 'booking.create', desc: 'สร้างคำขอจองห้องประชุม', cat: 'booking' },
    { code: 'booking.read_own', desc: 'ดูรายการคำขอของตนเอง', cat: 'booking' },
    { code: 'booking.read_all', desc: 'ดูรายการคำขอจองทั้งหมดในระบบ', cat: 'booking' },
    { code: 'booking.cancel_own', desc: 'ยกเลิกคำขอจองของตนเอง', cat: 'booking' },
    { code: 'booking.approve', desc: 'อนุมัติหรือปฏิเสธคำขอจองห้อง', cat: 'booking' },
    { code: 'room.block_schedule', desc: 'บล็อกปิดปรับปรุงห้องหรือกันเวลากิจกรรมใหญ่', cat: 'facility' },
    { code: 'facility.checkin', desc: 'ส่งมอบห้องและเปิดระบบ (Check-in)', cat: 'facility' },
    { code: 'facility.checkout', desc: 'ตรวจความเรียบร้อยและปิดการใช้งาน (Check-out)', cat: 'facility' },
    { code: 'file.upload_agenda', desc: 'อัปโหลดเอกสารวาระการประชุมหรือผังจัดโต๊ะ', cat: 'file' },
    { code: 'file.upload_inspect', desc: 'อัปโหลดภาพถ่ายตรวจสภาพห้องหลังใช้งาน', cat: 'file' },
    { code: 'file.view', desc: 'ดาวน์โหลดและเปิดดูไฟล์แนบที่ได้รับอนุญาต', cat: 'file' },
    { code: 'acl.manage', desc: 'จัดการตารางสิทธิ์ Dynamic ACL Real-time', cat: 'admin' },
    { code: 'user.manage', desc: 'จัดการบัญชีผู้ใช้งาน', cat: 'admin' },
    { code: 'log.read', desc: 'ตรวจสอบบันทึกความปลอดภัย Audit Logs', cat: 'admin' }
  ];

  for (const p of permissionsList) {
    await pool.query(
      'INSERT INTO permissions (permission_code, description, category) VALUES ($1, $2, $3) ON CONFLICT (permission_code) DO NOTHING',
      [p.code, p.desc, p.cat]
    );
  }
  const permsRes = await pool.query('SELECT permission_id, permission_code FROM permissions');
  const permIds = {};
  permsRes.rows.forEach(p => { permIds[p.permission_code] = p.permission_id; });
  console.log(`✅ 3. บันทึก Permissions ทั้ง ${permissionsList.length} รายการเรียบร้อย`);

  // 4. ผูกสิทธิ์เริ่มต้น (Default Role Permissions Matrix) - Idempotent
  const rolePermMap = {
    requester: [
      'room.view_schedule', 'booking.create', 'booking.read_own',
      'booking.cancel_own', 'file.upload_agenda', 'file.view'
    ],
    approver: [
      'room.view_schedule', 'booking.read_own', 'booking.read_all',
      'booking.approve', 'file.view'
    ],
    facility: [
      'room.view_schedule', 'room.manage', 'booking.read_own', 'booking.read_all',
      'room.block_schedule', 'facility.checkin', 'facility.checkout',
      'file.upload_inspect', 'file.view'
    ],
    admin: Object.keys(permIds) // Admin ได้ทุกสิทธิ์
  };

  for (const [rName, pCodes] of Object.entries(rolePermMap)) {
    const rId = roles[rName];
    for (const pCode of pCodes) {
      if (permIds[pCode]) {
        await pool.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT (role_id, permission_id) DO NOTHING',
          [rId, permIds[pCode]]
        );
      }
    }
  }
  console.log('✅ 4. ผูกสิทธิ์เริ่มต้นใน Dynamic ACL Matrix เรียบร้อย');

  // 5. ข้อมูลผู้ใช้เริ่มต้น (Demo Users ทั้ง 4 บทบาท) - Idempotent
  const salt = await bcrypt.genSalt(10);
  const usersList = [
    { username: 'admin', name: 'อาจารย์ ดร. สมเกียรติ (ผู้ดูแลระบบ)', dept: 'ฝ่ายเทคโนโลยีสารสนเทศ', role: 'admin', pass: 'admin123' },
    { username: 'manager', name: 'คุณวิภาวรรณ นันทกาญจน์ (หัวหน้าฝ่าย)', dept: 'ฝ่ายบริหารยุทธศาสตร์', role: 'approver', pass: 'approver123' },
    { username: 'facility', name: 'ช่างเอกชัย พูนทรัพย์ (เจ้าหน้าที่อาคาร)', dept: 'ฝ่ายอาคารสถานที่และโสตฯ', role: 'facility', pass: 'facility123' },
    { username: 'somchai', name: 'นายสมชาย มั่นคง (เจ้าหน้าที่พัฒนาธุรกิจ)', dept: 'ฝ่ายการตลาดและประชาสัมพันธ์', role: 'requester', pass: 'user123' }
  ];

  for (const u of usersList) {
    const hash = await bcrypt.hash(u.pass, salt);
    await pool.query(`
      INSERT INTO users (username, password_hash, full_name, department, role_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO NOTHING
    `, [u.username, hash, u.name, u.dept, roles[u.role]]);
  }
  const usersRes = await pool.query('SELECT user_id, username FROM users');
  const userIds = {};
  usersRes.rows.forEach(u => { userIds[u.username] = u.user_id; });
  console.log('✅ 5. สร้างผู้ใช้ทดสอบ 4 Roles ครบถ้วน (รหัสผ่านพร้อมใช้งาน)');

  // 6. ข้อมูลห้องประชุมเริ่มต้น (6 ห้อง แบ่ง 3 ตึก ตึกละ 2 ห้อง: X01, X02) - Idempotent
  const roomsList = [
    { name: 'ห้อง 101', cap: 40, loc: 'ตึก 1', eq: 'โปรเจกเตอร์ 4K Laser, ไมค์ลอย 8 ตัว, ระบบ Zoom Rooms' },
    { name: 'ห้อง 102', cap: 15, loc: 'ตึก 1', eq: 'Smart TV 65 นิ้ว, ไวท์บอร์ดกระจก, แอร์' },
    { name: 'ห้อง 201', cap: 25, loc: 'ตึก 2', eq: 'โปรเจกเตอร์ 4K, จอภาพคู่, ไมค์ตั้งโต๊ะ' },
    { name: 'ห้อง 202', cap: 12, loc: 'ตึก 2', eq: 'Smart TV 55 นิ้ว, พอร์ต Type-C / HDMI, ไวท์บอร์ด' },
    { name: 'ห้อง 301', cap: 30, loc: 'ตึก 3', eq: 'เครื่อง Workstation, โปรเจกเตอร์คู่, อินเทอร์เน็ตความเร็วสูง' },
    { name: 'ห้อง 302', cap: 10, loc: 'ตึก 3', eq: 'ระบบ Video Conference ทางไกล, จอ 4K, แอร์' }
  ];

  for (const rm of roomsList) {
    await pool.query(`
      INSERT INTO rooms (room_name, capacity, location, equipment_description)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (room_name) DO NOTHING
    `, [rm.name, rm.cap, rm.loc, rm.eq]);
  }
  const roomsRes = await pool.query('SELECT room_id, room_name FROM rooms ORDER BY room_id ASC');
  const roomIds = roomsRes.rows.map(r => r.room_id);
  console.log(`✅ 6. สร้างห้องประชุมตัวอย่าง 6 ห้อง (3 ตึก ตึกละ 2 ห้อง: X01, X02) เรียบร้อย`);

  // 7. สร้างรายการจองและบล็อกตัวอย่าง (สร้างเฉพาะเมื่อไม่มีการจองใดๆ และเปิด flag SEED_MOCK_BOOKINGS=true)
  const existingBookings = await pool.query('SELECT COUNT(*) FROM room_bookings');
  if (parseInt(existingBookings.rows[0].count, 10) === 0 && process.env.SEED_MOCK_BOOKINGS === 'true') {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // 7.1 บล็อกห้องโดยเจ้าหน้าที่สถานที่ (บำรุงรักษาแอร์)
    await pool.query(`
      INSERT INTO room_bookings (
        room_id, user_id, title, purpose, attendees_count,
        start_time, end_time, status, facility_officer_id, facility_comment
      ) VALUES (
        $1, $2, 'ปิดตรวจเช็กระบบแอร์ประจำเดือน', 'บำรุงรักษาประจำรอบ 6 เดือน โดยช่างภายนอก', 0,
        $3, $4, 'BLOCKED', $2, 'ดำเนินการโดยฝ่ายอาคารสถานที่'
      )
    `, [
      roomIds[0],
      userIds['facility'],
      `${dateStr} 08:00:00`,
      `${dateStr} 10:30:00`
    ]);

    // 7.2 คำขออนุมัติแล้ว (Approved)
    await pool.query(`
      INSERT INTO room_bookings (
        room_id, user_id, title, purpose, attendees_count,
        start_time, end_time, status, approver_id, approver_comment, approved_at
      ) VALUES (
        $1, $2, 'ประชุมวางแผนโครงการดิจิทัล Q4', 'นำเสนอความก้าวหน้าโครงการและติดตาม KPI', 8,
        $3, $4, 'APPROVED', $5, 'อนุมัติให้ใช้ห้องตามความเหมาะสม', NOW()
      )
    `, [
      roomIds[1],
      userIds['somchai'],
      `${dateStr} 13:00:00`,
      `${dateStr} 15:00:00`,
      userIds['manager']
    ]);

    // 7.3 คำขอรออนุมัติ (Pending Approval)
    await pool.query(`
      INSERT INTO room_bookings (
        room_id, user_id, title, purpose, attendees_count,
        start_time, end_time, status
      ) VALUES (
        $1, $2, 'สัมมนาแลกเปลี่ยนทักษะ AI & Web App', 'กิจกรรมถ่ายทอดความรู้ภายในทีม', 25,
        $3, $4, 'PENDING_APPROVAL'
      )
    `, [
      roomIds[2],
      userIds['somchai'],
      `${dateStr} 15:30:00`,
      `${dateStr} 17:00:00`
    ]);
    console.log('✅ 7. สร้างการจองตัวอย่างสำหรับ Seed แรกเริ่มเรียบร้อย');
  } else {
    console.log('ℹ️ 7. ข้ามการสร้าง mock bookings เพื่อคงข้อมูลจริงของผู้ใช้งาน (Data Persistence Active)');
  }

  // 8. บันทึก Audit Log เริ่มต้น (ถ้ายังไม่มี Log ใดๆ)
  const existingLogs = await pool.query('SELECT COUNT(*) FROM audit_logs');
  if (parseInt(existingLogs.rows[0].count, 10) === 0) {
    await pool.query(`
      INSERT INTO audit_logs (user_id, username, role_name, action, resource, resource_id, status, details, ip_address)
      VALUES
        ($1, 'admin', 'admin', 'SYSTEM_INIT', 'DATABASE', 'SCHEMA', 'SUCCESS', 'ติดตั้งระบบและ Seed ข้อมูลเริ่มต้น', '127.0.0.1')
    `, [userIds['admin']]);
    console.log('✅ 8. บันทึก Audit Log เริ่มต้นเรียบร้อย');
  }

  console.log('\n======================================================');
  console.log('🎉 ฐานข้อมูล RoomReserve พร้อมใช้งานและ Persistent 100%!');
  console.log('บัญชีทดสอบทั้ง 4 Roles:');
  console.log('1. Admin:     username=admin     password=admin123');
  console.log('2. Approver:  username=manager   password=approver123');
  console.log('3. Facility:  username=facility  password=facility123');
  console.log('4. Requester: username=somchai   password=user123');
  console.log('======================================================\n');

  await pool.end();
}

runSeed().catch(err => {
  console.error('Seed Error:', err);
  process.exit(1);
});

const fs = require('fs');
if (fs.existsSync('.env') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env');
}
const assert = require('assert');
const http = require('http');

async function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ res, data }));
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function login(username, password) {
  const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const { res } = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);

  const cookies = res.headers['set-cookie'];
  if (!cookies) throw new Error('No cookie received on login');
  return cookies.map(c => c.split(';')[0]).join('; ');
}

async function runTests() {
  console.log('🧪 เริ่มต้นรัน Comprehensive Verification...');

  // 1. ตรวจสอบการ Login ของ Admin
  const adminCookie = await login('admin', 'admin123');
  console.log('✅ 1. Admin login สำเร็จ');

  // 2. ตรวจสอบหน้า /app ของ Admin
  const appRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/app',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });

  const appHtml = appRes.data;

  // 2.1 ตรวจสอบ Quick Action Card: Admin Console ต้องแสดง
  assert(appHtml.includes('ADMIN CONSOLE'), 'ADMIN CONSOLE card should be present for Admin');
  assert(appHtml.includes('ศูนย์จัดการและบริหารระบบส่วนกลาง'), 'Admin console title should be present');
  console.log('✅ 2.1 Admin Console Quick Action Card แสดงผลถูกต้อง');

  // 2.2 ตรวจสอบ Desktop Navbar มีลิงก์ตรงสำหรับ Admin
  assert(appHtml.includes('href="/admin/acl" class="desktop-nav-item"'), 'Navbar should have ACL link');
  assert(appHtml.includes('href="/admin/users" class="desktop-nav-item"'), 'Navbar should have Users link');
  assert(appHtml.includes('href="/admin/logs" class="desktop-nav-item"'), 'Navbar should have Logs link');
  console.log('✅ 2.2 Desktop Navbar มีลิงก์ตรงไปยังหน้า Admin ครบถ้วน');

  // 2.3 ตรวจสอบการรวม Card ปฏิทินจิ๋วกับฟอร์มจองห้อง และลบปุ่มด่วน
  assert(appHtml.includes('Unified Date & Time Booking Card'), 'Unified Date & Time card must be present');
  assert(!appHtml.includes('setQuickRange'), 'Quick time range buttons must be removed');
  assert(!appHtml.includes('setQuickDuration'), 'Quick time duration buttons must be removed');
  assert(!appHtml.includes('เช้า (09-12)'), 'Button "เช้า (09-12)" must be removed');
  assert(!appHtml.includes('+1ชม.'), 'Button "+1ชม." must be removed');
  console.log('✅ 2.3 ปฏิทินจิ๋วรวมอยู่ใน Card เดียวกันกับฟอร์มเวลา และปุ่มด่วนถูกเอาออกเรียบร้อย');

  // 2.4 ตรวจสอบฟอร์มแก้ไขข้อมูลส่วนตัวในหน้า Dashboard
  assert(appHtml.includes('action="/app/profile/update"'), 'Profile update form must be present');
  assert(appHtml.includes('name="full_name"'), 'full_name input must be present');
  assert(appHtml.includes('name="department"'), 'department input must be present');
  assert(appHtml.includes('name="current_password"'), 'current_password input must be present');
  assert(appHtml.includes('name="new_password"'), 'new_password input must be present');
  console.log('✅ 2.4 ฟอร์มแก้ไขข้อมูลส่วนตัว (Profile Settings) พร้อมใช้งาน');

  // 2.5 ตรวจสอบว่าใน Subviews ของ dashboard ไม่มีปุ่มกลับหน้าแรกซ้ำซ้อน
  assert(!appHtml.includes('&larr; กลับหน้าแรก'), 'Dashboard subview cards must not have redundant back buttons');
  console.log('✅ 2.5 หัวการ์ดทุก Subview ในหน้า Dashboard สะอาด ไม่มีปุ่มกลับหน้าแรกซ้ำซ้อน');

  // 3. ตรวจสอบหน้า /admin/acl
  const aclRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/acl',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });
  const aclHtml = aclRes.data;

  // 3.1 ตรวจสอบลิงก์กลับหน้าแรกบน Navbar
  assert(aclHtml.includes('href="/app" style="font-weight: 700; color: #1d4ed8;">&larr; กลับหน้าแรก</a>'), 'Back to home in navbar should be present');
  console.log('✅ 3.1 ลิงก์กลับหน้าแรกบน Navbar ใน /admin/acl แสดงผลถูกต้อง');

  // 3.2 ตรวจสอบการจัดตำแหน่ง Checkbox และเอาปุ่มส่วนเกินออก
  assert(!aclHtml.includes('Instant Auto-Save'), 'Instant Auto-Save badge should be removed');
  assert(!aclHtml.includes('วิธีสาธิตให้อาจารย์ดูสดใน 10 วินาที'), 'Demo guide card should be removed');
  assert(!aclHtml.includes('btn-edit-role'), 'Pencil edit role button should be removed');
  assert(!aclHtml.includes('btn-edit-perm'), 'Pencil edit permission button should be removed');
  assert(aclHtml.includes('min-width: 130px;'), 'Role column and checkbox td should have min-width: 130px');
  assert(aclHtml.includes('margin: 0 auto; display: block;'), 'Checkbox should be centered with margin auto');
  console.log('✅ 3.2 Checkbox ใน ACL ตารางตรงกับชื่อ Role กึ่งกลางพอดี ไม่มีไอคอนดินสอ/ถังขยะ และเอากล่องสาธิตออกแล้ว');

  // 4. ตรวจสอบหน้า /admin/users และ /admin/logs มีลิงก์กลับหน้าแรกบน Navbar
  const usersRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/users',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });
  assert(usersRes.data.includes('href="/app" style="font-weight: 700; color: #1d4ed8;">&larr; กลับหน้าแรก</a>'), 'Users page navbar must have back link');
  console.log('✅ 4.1 หน้า /admin/users มีลิงก์กลับหน้าแรกบน Navbar เรียบร้อย');

  const logsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/admin/logs',
    method: 'GET',
    headers: { 'Cookie': adminCookie }
  });
  assert(logsRes.data.includes('href="/app" style="font-weight: 700; color: #1d4ed8;">&larr; กลับหน้าแรก</a>'), 'Logs page navbar must have back link');
  console.log('✅ 4.2 หน้า /admin/logs มีลิงก์กลับหน้าแรกบน Navbar เรียบร้อย');

  // 5. ทดสอบ API POST /app/profile/update สำหรับผู้ใช้งานทั่วไป (somchai)
  const somchaiCookie = await login('somchai', 'user123');
  const updateBody = `full_name=${encodeURIComponent('นายสมชาย มั่นคง (ปรับปรุงใหม่)')}&department=${encodeURIComponent('ฝ่ายพัฒนาธุรกิจและนวัตกรรม')}`;
  const updateRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/app/profile/update',
    method: 'POST',
    headers: {
      'Cookie': somchaiCookie,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(updateBody)
    }
  }, updateBody);

  assert.strictEqual(updateRes.res.statusCode, 302, 'Profile update should redirect');
  assert(updateRes.res.headers['location'].includes('success'), 'Redirect should indicate success');
  console.log('✅ 5. ผู้ใช้งานทั่วไป (somchai) อัปเดตข้อมูลส่วนตัว (ชื่อ-นามสกุล, สังกัด) สำเร็จ');

  // 6. ตรวจสอบ render.yaml ไม่ seed ทับ
  const renderYaml = fs.readFileSync('render.yaml', 'utf8');
  assert(renderYaml.includes('startCommand: npm start'), 'render.yaml must use startCommand: npm start');
  console.log('✅ 6. render.yaml ตั้งค่า startCommand: npm start (ไม่ Reset ข้อมูลบน Render)');

  console.log('\n======================================================');
  console.log('🎉 ทุกเงื่อนไขและข้อกำหนดผ่านการตรวจสอบ 100% เรียบร้อย!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test Failure:', err);
  process.exit(1);
});

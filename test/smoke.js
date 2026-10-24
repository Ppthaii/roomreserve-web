/**
 * Automated Smoke Test & Security Verification Script for RoomReserve
 * ทดสอบความถูกต้องของ Authentication, Authorization, ACL และ API Logical Separation
 * รันด้วย: npm test (ระหว่างที่ server กำลังรัน)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function login(username, password) {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);

  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    redirect: 'manual'
  });

  const setCookie = res.headers.get('set-cookie');
  let cookie = '';
  if (setCookie) {
    const match = setCookie.match(/connect\.sid=[^;]+/);
    if (match) cookie = match[0];
  }

  return {
    status: res.status,
    location: res.headers.get('location'),
    cookie
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 เริ่มต้นรัน Smoke Test ตรวจสอบความปลอดภัย RoomReserve');
  console.log(`เป้าหมาย: ${BASE_URL}`);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, isPass, detail = '') {
    if (isPass) {
      console.log(`✅ [PASS] ${name} ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${detail}`);
      failed++;
    }
  }

  try {
    // 1. เคสไม่ล็อกอิน: ยิงตรงไปที่ /api/admin/users ต้องได้ 401 Unauthorized
    try {
      const res = await fetch(`${BASE_URL}/api/admin/users`, {
        headers: { 'Accept': 'application/json' }
      });
      report('1. Guest เข้า /api/admin/users ต้องถูกปฏิเสธ 401', res.status === 401, `(HTTP ${res.status})`);
    } catch (e) {
      report('1. Guest เข้า /api/admin/users', false, `(ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์: ${e.message})`);
    }

    // 2. เคสล็อกอินด้วยรหัสผ่านผิด: ต้อง Redirect กลับไปหน้า Login พร้อม query error
    const wrongLogin = await login('admin', 'wrong_password_999');
    report(
      '2. Login รหัสผิด ต้องดีดกลับพร้อม Error',
      wrongLogin.status === 302 && wrongLogin.location && wrongLogin.location.includes('error='),
      `(Status ${wrongLogin.status}, Location: ${wrongLogin.location})`
    );

    // 3. เคสผู้ใช้ทั่วไป (Requester: somchai): พยายามเข้า /api/admin/users ต้องถูกบล็อก 403 Forbidden
    const somchaiSession = await login('somchai', 'user123');
    if (!somchaiSession.cookie) {
      report('3. Login somchai สำเร็จเพื่อทดสอบ', false, 'ไม่ได้รับ session cookie');
    } else {
      const apiDenyRes = await fetch(`${BASE_URL}/api/admin/users`, {
        headers: {
          'Cookie': somchaiSession.cookie,
          'Accept': 'application/json'
        }
      });
      report('3. Requester (somchai) เข้า /api/admin/users ต้องได้ 403 JSON', apiDenyRes.status === 403, `(HTTP ${apiDenyRes.status})`);

      // 4. somchai พยายามเปิดหน้า HTML /admin/acl ต้องถูกบล็อก 403
      const htmlDenyRes = await fetch(`${BASE_URL}/admin/acl`, {
        headers: { 'Cookie': somchaiSession.cookie }
      });
      report('4. Requester (somchai) เปิดหน้า /admin/acl ต้องได้ 403 Forbidden', htmlDenyRes.status === 403, `(HTTP ${htmlDenyRes.status})`);
    }

    // 5. เคส Admin (admin): เข้าถึง /api/admin/users ได้ HTTP 200 และไม่มี password_hash รั่วไหล
    const adminSession = await login('admin', 'admin123');
    if (!adminSession.cookie) {
      report('5. Login admin สำเร็จเพื่อทดสอบ', false, 'ไม่ได้รับ session cookie');
    } else {
      const adminApiRes = await fetch(`${BASE_URL}/api/admin/users`, {
        headers: {
          'Cookie': adminSession.cookie,
          'Accept': 'application/json'
        }
      });
      const bodyText = await adminApiRes.text();
      const hasNoHash = !bodyText.includes('password_hash');
      const is200 = adminApiRes.status === 200;
      report(
        '5. Admin เข้า /api/admin/users สำเร็จ (200) และไม่มี password_hash หลุด',
        is200 && hasNoHash,
        `(HTTP ${adminApiRes.status}, Zero Credential Leak: ${hasNoHash})`
      );

      // 6. เคส Admin (admin): เปิดหน้า HTML /admin/acl ต้องได้ HTTP 200 และ Render หน้าตาราง Dynamic ACL สำเร็จ
      const adminAclRes = await fetch(`${BASE_URL}/admin/acl`, {
        headers: {
          'Cookie': adminSession.cookie
        }
      });
      const aclHtml = await adminAclRes.text();
      const isAclOk = adminAclRes.status === 200 && aclHtml.includes('Dynamic ACL Matrix') && aclHtml.includes('acl-checkbox');
      report(
        '6. Admin เข้าหน้า HTML /admin/acl สำเร็จ (200) และ Render ตารางครบถ้วน',
        isAclOk,
        `(HTTP ${adminAclRes.status}, Render Check: ${isAclOk})`
      );
    }
  } catch (err) {
    console.error('Critical Smoke Test Error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`สรุปผลการทดสอบ: ผ่าน ${passed} ข้อ, ล้มเหลว ${failed} ข้อ`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();

const pool = require('../src/config/db');

async function testDynamicNavbar() {
  console.log('🧪 Starting dynamic navbar and ACL verification...');

  // 1. Get role IDs for requester and admin
  const requesterRoleRes = await pool.query("SELECT role_id FROM roles WHERE role_name = 'requester'");
  const requesterRoleId = requesterRoleRes.rows[0].role_id;

  const logReadPermRes = await pool.query("SELECT permission_id FROM permissions WHERE permission_code = 'log.read'");
  const logReadPermId = logReadPermRes.rows[0].permission_id;

  console.log(`📌 Requester role ID: ${requesterRoleId}, log.read perm ID: ${logReadPermId}`);

  // 2. Login as requester (somchai)
  const loginRes = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=somchai&password=user123',
    redirect: 'manual'
  });

  const setCookie = loginRes.headers.get('set-cookie');
  let cookie = '';
  if (setCookie) {
    const match = setCookie.match(/connect\.sid=[^;]+/);
    if (match) cookie = match[0];
  }
  if (!cookie) {
    throw new Error('Failed to get session cookie for somchai');
  }
  console.log('✅ Logged in as somchai');

  // Verify before granting: somchai should NOT see "Audit Logs" on /app
  let appRes = await fetch('http://localhost:3000/app', {
    headers: { Cookie: cookie }
  });
  let appHtml = await appRes.text();
  if (appHtml.includes('<a href="/admin/logs"')) {
    throw new Error('somchai should NOT see /admin/logs in navbar before permission granted');
  }
  console.log('✅ somchai does not see /admin/logs initially');

  // Verify /admin/logs access blocked (403)
  let logsRes = await fetch('http://localhost:3000/admin/logs', {
    headers: { Cookie: cookie }
  });
  if (logsRes.status !== 403) {
    throw new Error(`Expected 403 for /admin/logs initially, got ${logsRes.status}`);
  }
  console.log('✅ /admin/logs returned 403 for somchai as expected');

  // 3. Temporarily grant log.read to requester role
  console.log('⚡ Granting log.read to requester role in DB...');
  await pool.query(
    'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [requesterRoleId, logReadPermId]
  );

  // 4. Verify somchai now sees "Audit Logs" on navbar without relogin
  appRes = await fetch('http://localhost:3000/app', {
    headers: { Cookie: cookie }
  });
  appHtml = await appRes.text();
  if (!appHtml.includes('<a href="/admin/logs"')) {
    throw new Error('somchai SHOULD see /admin/logs in navbar after log.read granted!');
  }
  console.log('✅ somchai now sees Audit Logs link on navbar dynamically!');

  // 5. Verify somchai can access /admin/logs (HTTP 200)
  logsRes = await fetch('http://localhost:3000/admin/logs', {
    headers: { Cookie: cookie }
  });
  if (logsRes.status !== 200) {
    throw new Error(`Expected 200 for /admin/logs after permission granted, got ${logsRes.status}`);
  }
  const logsHtml = await logsRes.text();
  if (!logsHtml.includes('บันทึกประวัติความปลอดภัยและการทำงาน')) {
    throw new Error('Expected Audit Logs page content');
  }
  console.log('✅ somchai can access /admin/logs with HTTP 200!');

  // Verify somchai STILL cannot access /admin/acl or /admin/users (403)
  const aclRes = await fetch('http://localhost:3000/admin/acl', {
    headers: { Cookie: cookie }
  });
  if (aclRes.status !== 403) {
    throw new Error(`Expected 403 for /admin/acl, got ${aclRes.status}`);
  }
  console.log('✅ somchai is still forbidden (403) from /admin/acl');

  // 6. Revoke log.read from requester role
  console.log('⚡ Revoking log.read from requester role in DB...');
  await pool.query(
    'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
    [requesterRoleId, logReadPermId]
  );

  // 7. Verify navbar and access reverted
  appRes = await fetch('http://localhost:3000/app', {
    headers: { Cookie: cookie }
  });
  appHtml = await appRes.text();
  if (appHtml.includes('<a href="/admin/logs"')) {
    throw new Error('somchai should NOT see /admin/logs after revoke');
  }
  logsRes = await fetch('http://localhost:3000/admin/logs', {
    headers: { Cookie: cookie }
  });
  if (logsRes.status !== 403) {
    throw new Error(`Expected 403 for /admin/logs after revoke, got ${logsRes.status}`);
  }
  console.log('✅ Permissions revoked successfully and immediate effect verified!');

  console.log('🎉 ALL DYNAMIC NAVBAR & ACL TESTS PASSED!');
  process.exit(0);
}

testDynamicNavbar().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

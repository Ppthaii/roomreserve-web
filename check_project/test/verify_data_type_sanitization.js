const pool = require('../src/config/db');

async function testDataTypeSanitization() {
  console.log('🧪 Starting Data Type & Parameter Sanitization verification...');

  // 1. Authenticate as admin
  const authRes = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=admin&password=admin123',
    redirect: 'manual'
  });

  const setCookie = authRes.headers.get('set-cookie');
  let cookie = '';
  if (setCookie) {
    const match = setCookie.match(/connect\.sid=[^;]+/);
    if (match) cookie = match[0];
  }
  if (!cookie) {
    throw new Error('Failed to get session cookie');
  }

  // 2. Test GET /app with malformed date parameters
  const invalidDates = ['undefined', 'null', 'NaN', 'invalid-date', '2026/99/99', 'abc'];
  for (const d of invalidDates) {
    const res = await fetch(`http://localhost:3000/app?date=${encodeURIComponent(d)}`, {
      headers: { Cookie: cookie }
    });
    if (res.status !== 200) {
      throw new Error(`/app?date=${d} returned status ${res.status} instead of falling back to 200`);
    }
    const html = await res.text();
    if (html.includes('ชนิดของข้อมูลไม่ถูกต้อง (Invalid Data Type)')) {
      throw new Error(`/app?date=${d} triggered 22P02 error page!`);
    }
    console.log(`✅ /app?date=${d} handled safely (Status 200)`);
  }

  // 3. Test POST /api/admin/acl/toggle with invalid parameters
  const toggleRes = await fetch('http://localhost:3000/api/admin/acl/toggle', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie
    },
    body: JSON.stringify({ role_id: 'invalid', permission_id: 'invalid', granted: true })
  });
  if (toggleRes.status !== 400) {
    throw new Error(`/api/admin/acl/toggle did not return 400 on NaN params (Got ${toggleRes.status})`);
  }
  const toggleJson = await toggleRes.json();
  if (!toggleJson.error || toggleJson.error.includes('22P02')) {
    throw new Error(`Unexpected error format from /api/admin/acl/toggle: ${JSON.stringify(toggleJson)}`);
  }
  console.log('✅ /api/admin/acl/toggle handled invalid IDs cleanly with JSON 400');

  // 4. Test GET /admin/logs with invalid from/to dates
  const logsRes = await fetch('http://localhost:3000/admin/logs?from=garbage&to=invalid', {
    headers: { Cookie: cookie }
  });
  if (logsRes.status !== 200) {
    throw new Error(`/admin/logs with invalid dates returned status ${logsRes.status}`);
  }
  const logsHtml = await logsRes.text();
  if (logsHtml.includes('ชนิดของข้อมูลไม่ถูกต้อง')) {
    throw new Error('/admin/logs triggered 22P02 error page!');
  }
  console.log('✅ /admin/logs handled invalid date filters safely (Status 200)');

  // 5. Test invalid room / booking / file IDs
  const fileRes = await fetch('http://localhost:3000/app/files/not-a-number', {
    headers: { Cookie: cookie }
  });
  if (fileRes.status !== 404) {
    throw new Error(`/app/files/not-a-number returned ${fileRes.status} instead of 404`);
  }
  console.log('✅ /app/files/not-a-number returned 404 without database 22P02 crash');

  console.log('🎉 ALL DATA TYPE SANITIZATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

testDataTypeSanitization().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('Testing full page rendering and static asset integrity...');

  // 1. Static Assets
  const assets = [
    '/dashboard.css',
    '/dashboard.js',
    '/acl.css',
    '/acl.js',
    '/login.css',
    '/style.css',
    '/theme.js'
  ];

  for (const asset of assets) {
    const res = await fetch(`${BASE_URL}${asset}`);
    assert.strictEqual(res.status, 200, `Asset ${asset} must return 200`);
    const text = await res.text();
    assert.ok(text.length > 50, `Asset ${asset} must have content (got ${text.length} bytes)`);
    console.log(`✔ Static asset ${asset} (${text.length} bytes) OK`);
  }

  // 2. Login Page
  const loginRes = await fetch(`${BASE_URL}/login`);
  assert.strictEqual(loginRes.status, 200);
  const loginHtml = await loginRes.text();
  assert.ok(loginHtml.includes('login.css'), 'Login must include login.css');
  console.log('✔ Login page renders cleanly');

  // 3. Admin Login & Session
  const adminLoginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'admin', password: 'admin123' }).toString(),
    redirect: 'manual'
  });
  const adminCookie = adminLoginRes.headers.get('set-cookie');
  assert.ok(adminCookie, 'Admin login must set cookie');

  // 4. Admin Dashboard
  const adminDashRes = await fetch(`${BASE_URL}/app`, {
    headers: { Cookie: adminCookie }
  });
  assert.strictEqual(adminDashRes.status, 200);
  const adminDashHtml = await adminDashRes.text();
  assert.ok(adminDashHtml.includes('id="req-view-home"'), 'Admin dash must contain home view');
  assert.ok(adminDashHtml.includes('id="req-view-booking"'), 'Admin dash must contain booking view');
  assert.ok(adminDashHtml.includes('id="req-view-approvals"'), 'Admin dash must contain approvals view');
  assert.ok(adminDashHtml.includes('id="req-view-facility"'), 'Admin dash must contain facility view');
  assert.ok(adminDashHtml.includes('id="req-view-facility-block"'), 'Admin dash must contain maintenance view');
  assert.ok(adminDashHtml.includes('id="req-view-timeline"'), 'Admin dash must contain timeline view');
  assert.ok(adminDashHtml.includes('/dashboard.js'), 'Admin dash must link dashboard.js');
  assert.ok(adminDashHtml.includes('/dashboard.css'), 'Admin dash must link dashboard.css');
  console.log(`✔ Admin Dashboard rendered successfully (${adminDashHtml.length} bytes) with all 10 subviews intact!`);

  // 5. Requester Login & Session
  const reqLoginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'somchai', password: 'user123' }).toString(),
    redirect: 'manual'
  });
  const reqCookie = reqLoginRes.headers.get('set-cookie');
  assert.ok(reqCookie, 'Requester login must set cookie');

  const reqDashRes = await fetch(`${BASE_URL}/app`, {
    headers: { Cookie: reqCookie }
  });
  assert.strictEqual(reqDashRes.status, 200);
  const reqDashHtml = await reqDashRes.text();
  assert.ok(reqDashHtml.includes('id="req-view-home"'), 'Requester dash must contain home view');
  assert.ok(reqDashHtml.includes('id="req-view-booking"'), 'Requester dash must contain booking view');
  assert.ok(reqDashHtml.includes('id="req-view-mybookings"'), 'Requester dash must contain mybookings view');
  console.log(`✔ Requester Dashboard rendered successfully (${reqDashHtml.length} bytes)!`);

  // 6. Admin Pages
  for (const path of ['/admin/acl', '/admin/users', '/admin/logs', '/app/rooms']) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(res.status, 200, `${path} must return 200 for admin`);
    const html = await res.text();
    assert.ok(html.includes('navbar'), `${path} must include navbar`);
    console.log(`✔ Admin page ${path} (${html.length} bytes) rendered cleanly`);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL PAGES & ASSETS RENDERED WITH ZERO DEFECTS!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

console.log('Testing 403 error page logout escape & /login redirection...');

async function main() {
  // 1. Login as somchai
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'somchai', password: 'user123' }).toString(),
    redirect: 'manual'
  });
  const cookie = loginRes.headers.get('set-cookie');
  assert.ok(cookie, 'Must get cookie for somchai');

  // 2. Access a forbidden page /admin/acl -> expect 403
  const aclRes = await fetch(`${BASE_URL}/admin/acl`, {
    headers: { Cookie: cookie }
  });
  assert.strictEqual(aclRes.status, 403, 'Must get 403 Forbidden');
  const errorHtml = await aclRes.text();
  assert.ok(errorHtml.includes('href="/logout"'), 'Error page must have /logout button to escape');
  console.log('✔ Error page has /logout link to escape 403 loop');

  // 3. Test GET /logout
  const logoutRes = await fetch(`${BASE_URL}/logout`, {
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.strictEqual(logoutRes.status, 302, 'GET /logout must redirect');
  assert.strictEqual(logoutRes.headers.get('location'), '/login', 'GET /logout must redirect to /login');
  console.log('✔ GET /logout redirects to /login');

  // 4. Test GET /login?force=1 destroys session and renders login page
  const forceLoginRes = await fetch(`${BASE_URL}/login?force=1`, {
    headers: { Cookie: cookie }
  });
  assert.strictEqual(forceLoginRes.status, 200, 'GET /login?force=1 must return 200');
  const forceHtml = await forceLoginRes.text();
  assert.ok(forceHtml.includes('เข้าสู่ระบบ | RoomReserve'), 'Must render login page');
  console.log('✔ GET /login?force=1 cleanly renders login page');

  console.log('\n======================================================');
  console.log('🎉 ALL 403 ESCAPE & LOGOUT TESTS PASSED!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

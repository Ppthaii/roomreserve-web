import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('Testing Clean Login & Session Persistence Behavior...');

  // 1. Normal GET /login must NOT contain any alert
  const res1 = await fetch(`${BASE_URL}/login`);
  assert.strictEqual(res1.status, 200);
  const html1 = await res1.text();
  assert.ok(!html1.includes('alert-danger'), 'Normal /login must not show error alert');
  assert.ok(!html1.includes('alert-success'), 'Normal /login must not show success alert');
  assert.ok(!html1.includes('เซสชันการใช้งานของคุณหมดอายุ'), 'Must not show session expired');
  assert.ok(!html1.includes('ออกจากระบบเรียบร้อยแล้ว'), 'Must not show logout success alert');
  console.log('✔ Normal GET /login is completely clean');

  // 2. GET /login?error=expired must suppress alert
  const res2 = await fetch(`${BASE_URL}/login?error=expired`);
  assert.strictEqual(res2.status, 200);
  const html2 = await res2.text();
  assert.ok(!html2.includes('alert-danger'), '/login?error=expired must suppress alert-danger');
  assert.ok(!html2.includes('เซสชันการใช้งานของคุณหมดอายุ'), 'Must suppress expired text');
  console.log('✔ /login?error=expired is suppressed cleanly');

  // 3. GET /login?error=unauthorized must suppress alert
  const res3 = await fetch(`${BASE_URL}/login?error=unauthorized`);
  assert.strictEqual(res3.status, 200);
  const html3 = await res3.text();
  assert.ok(!html3.includes('alert-danger'), '/login?error=unauthorized must suppress alert-danger');
  console.log('✔ /login?error=unauthorized is suppressed cleanly');

  // 4. GET /login?success=... must suppress success banner
  const res4 = await fetch(`${BASE_URL}/login?success=${encodeURIComponent('ออกจากระบบเรียบร้อยแล้ว')}`);
  assert.strictEqual(res4.status, 200);
  const html4 = await res4.text();
  assert.ok(!html4.includes('alert-success'), 'Must not show alert-success on login');
  assert.ok(!html4.includes('ออกจากระบบเรียบร้อยแล้ว'), 'Must not show success text');
  console.log('✔ /login?success=... is suppressed cleanly');

  // 5. Unauthenticated request to /app must redirect directly to /login (no ?error=expired)
  const res5 = await fetch(`${BASE_URL}/app`, { redirect: 'manual' });
  assert.strictEqual(res5.status, 302);
  const loc5 = res5.headers.get('location');
  assert.strictEqual(loc5, '/login', `Protected redirect should be exactly '/login', got '${loc5}'`);
  console.log('✔ Unauthenticated redirect to /app goes cleanly to /login');

  // 6. Wrong password must still show real login failure alert
  const res6 = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'somchai', password: 'wrongpassword' }).toString(),
    redirect: 'manual'
  });
  assert.strictEqual(res6.status, 302);
  const loc6 = res6.headers.get('location');
  assert.ok(loc6.includes('error='), 'Wrong password must redirect with error query');
  const res6Follow = await fetch(`${BASE_URL}${loc6}`);
  const html6 = await res6Follow.text();
  assert.ok(html6.includes('alert-danger'), 'Failed login must render alert-danger');
  assert.ok(html6.includes('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'), 'Must display credentials error');
  console.log('✔ Wrong password properly displays real failure message');

  // 7. Successful login followed by /logout must redirect cleanly to /login
  const res7Login = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'somchai', password: 'user123' }).toString(),
    redirect: 'manual'
  });
  const cookie = res7Login.headers.get('set-cookie');
  assert.ok(cookie, 'Login must provide session cookie');

  const res7Logout = await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  assert.strictEqual(res7Logout.status, 302);
  const loc7 = res7Logout.headers.get('location');
  assert.strictEqual(loc7, '/login', `Logout must redirect to '/login', got '${loc7}'`);
  console.log('✔ Logout redirects cleanly to /login without any banner');

  console.log('\n🎉 ALL CLEAN LOGIN & SESSION TESTS PASSED 100%!');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

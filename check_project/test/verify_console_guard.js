const pool = require('../src/config/db');

async function testConsoleGuard() {
  console.log('🧪 Starting Console Guard & Anti-Tamper verification...');

  // 1. Verify /console-guard.js is properly served
  const assetRes = await fetch('http://localhost:3000/console-guard.js');
  if (assetRes.status !== 200) {
    throw new Error(`Failed to load /console-guard.js (HTTP ${assetRes.status})`);
  }
  const assetCode = await assetRes.text();
  if (!assetCode.includes('⛔ หยุด! (STOP!)') || !assetCode.includes('F12') || !assetCode.includes('Ctrl+Shift+I')) {
    throw new Error('console-guard.js is missing expected security features');
  }
  if (assetCode.includes('contextmenu')) {
    throw new Error('console-guard.js should NOT block right-click contextmenu');
  }
  console.log('✅ /console-guard.js asset is served and contains inspect blocker without blocking right-click');

  // 2. Verify login page includes console-guard.js
  const loginRes = await fetch('http://localhost:3000/login');
  const loginHtml = await loginRes.text();
  if (!loginHtml.includes('/console-guard.js')) {
    throw new Error('Login page missing /console-guard.js');
  }
  console.log('✅ Login page includes /console-guard.js');

  // 3. Login as admin and verify authenticated pages
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

  const pages = ['/app', '/app/rooms', '/admin/acl', '/admin/logs', '/admin/users'];
  for (const page of pages) {
    const pageRes = await fetch(`http://localhost:3000${page}`, {
      headers: { Cookie: cookie }
    });
    if (pageRes.status !== 200) {
      throw new Error(`Page ${page} failed to load (HTTP ${pageRes.status})`);
    }
    const pageHtml = await pageRes.text();
    if (!pageHtml.includes('/console-guard.js')) {
      throw new Error(`Page ${page} missing /console-guard.js`);
    }
    console.log(`✅ Page ${page} includes /console-guard.js`);
  }

  console.log('🎉 ALL CONSOLE GUARD TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

testConsoleGuard().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

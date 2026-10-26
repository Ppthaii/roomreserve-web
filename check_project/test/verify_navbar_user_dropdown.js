const pool = require('../src/config/db');

async function testNavbarUserDropdown() {
  console.log('🧪 Starting Navbar User Dropdown & Logout verification...');

  // 1. Login as admin
  const loginRes = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=admin&password=admin123',
    redirect: 'manual'
  });

  const setCookie = loginRes.headers.get('set-cookie');
  let cookie = '';
  if (setCookie) {
    const match = setCookie.match(/connect\.sid=[^;]+/);
    if (match) cookie = match[0];
  }
  if (!cookie) {
    throw new Error('Failed to get session cookie');
  }
  console.log('✅ Logged in as admin');

  // 2. Test subpages with navbar.ejs
  const testPages = ['/app/rooms', '/admin/logs', '/admin/acl', '/admin/users'];
  for (const page of testPages) {
    const res = await fetch(`http://localhost:3000${page}`, {
      headers: { Cookie: cookie }
    });
    if (res.status !== 200) {
      throw new Error(`Failed to load ${page} (HTTP ${res.status})`);
    }
    const html = await res.text();
    if (!html.includes('id="navUserMenuDropdown"')) {
      throw new Error(`Page ${page} missing id="navUserMenuDropdown"`);
    }
    if (!html.includes('toggleNavUserMenu')) {
      throw new Error(`Page ${page} missing toggleNavUserMenu function`);
    }
    if (!html.includes('href="/app?view=profile"')) {
      throw new Error(`Page ${page} missing profile link in dropdown`);
    }
    if (!html.includes('🚪 ออกจากระบบ')) {
      throw new Error(`Page ${page} missing logout button in user dropdown`);
    }
    console.log(`✅ Page ${page} has interactive user badge dropdown with profile link and logout`);
  }

  // 3. Test Logout request
  const logoutRes = await fetch('http://localhost:3000/logout', {
    method: 'POST',
    headers: { Cookie: cookie },
    redirect: 'manual'
  });
  if (logoutRes.status !== 302 || !logoutRes.headers.get('location').includes('/login')) {
    throw new Error(`Logout failed (HTTP ${logoutRes.status}, location: ${logoutRes.headers.get('location')})`);
  }
  console.log('✅ POST /logout correctly redirects to /login');

  console.log('🎉 ALL NAVBAR USER DROPDOWN TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

testNavbarUserDropdown().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

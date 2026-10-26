import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Maintenance UI & Block Flow Redesign...');

const maintEjs = fs.readFileSync(path.join(__dirname, '../src/views/partials/dashboard/maintenance.ejs'), 'utf8');
const dashboardJs = fs.readFileSync(path.join(__dirname, '../src/public/dashboard.js'), 'utf8');

// 1. Verify UI Elements in maintenance.ejs
assert.ok(maintEjs.includes('btn-maint-building-1'), 'Must have building 1 button');
assert.ok(maintEjs.includes('btn-maint-building-2'), 'Must have building 2 button');
assert.ok(maintEjs.includes('btn-maint-building-3'), 'Must have building 3 button');
assert.ok(maintEjs.includes('maintVisualRoomsGrid'), 'Must have visual rooms grid');
assert.ok(maintEjs.includes('maintTimeRangeGrid'), 'Must have hourly time range grid');
assert.ok(maintEjs.includes('blockWholeDayMaint()'), 'Must have whole day block button');
assert.ok(maintEjs.includes('setMaintPresetReason'), 'Must have preset reason buttons');
assert.ok(maintEjs.includes('maintSubmitBtn'), 'Must have submit button');
console.log('✔ All Maintenance UI template elements present and correctly structured');

// 2. Verify Client JS Functions in dashboard.js
assert.ok(dashboardJs.includes('function selectMaintBuilding'), 'Must define selectMaintBuilding');
assert.ok(dashboardJs.includes('function selectMaintRoom'), 'Must define selectMaintRoom');
assert.ok(dashboardJs.includes('function onMaintTimeRangePillClick'), 'Must define onMaintTimeRangePillClick');
assert.ok(dashboardJs.includes('function renderMaintTimeRangePills'), 'Must define renderMaintTimeRangePills');
assert.ok(dashboardJs.includes('function checkMaintConflict'), 'Must define checkMaintConflict');
assert.ok(dashboardJs.includes('function blockWholeDayMaint'), 'Must define blockWholeDayMaint');
assert.ok(dashboardJs.includes('function setMaintPresetReason'), 'Must define setMaintPresetReason');
console.log('✔ All Maintenance JS controller functions implemented');

// 3. Test Live Flow against server
async function testLiveFlow() {
  const BASE_URL = 'http://localhost:3000';
  
  // Login as admin
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=admin&password=admin123',
    redirect: 'manual'
  });
  const cookie = loginRes.headers.get('set-cookie');
  assert.ok(cookie, 'Admin login must succeed');

  // Fetch Dashboard and check maintenance section HTML
  const dashRes = await fetch(`${BASE_URL}/app?view=facility-block`, {
    headers: { Cookie: cookie }
  });
  assert.strictEqual(dashRes.status, 200);
  const html = await dashRes.text();
  assert.ok(html.includes('id="maintTimeRangeGrid"'), 'HTML must include maintTimeRangeGrid');
  assert.ok(html.includes('maint-preset-btn'), 'HTML must include preset reason buttons');
  console.log('✔ Live dashboard renders redesigned maintenance subview cleanly');

  // Submit test block via POST /app/facility/block
  const blockDate = '2026-10-30';
  const blockRes = await fetch(`${BASE_URL}/app/facility/block`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookie
    },
    body: new URLSearchParams({
      room_id: '1',
      block_date: blockDate,
      start_time_str: '09:00',
      end_time_str: '11:00',
      reason: 'ทดสอบบล็อกปิดซ่อมประจำสัปดาห์ (Auto Test)'
    }).toString(),
    redirect: 'manual'
  });
  assert.strictEqual(blockRes.status, 302, 'Block submission must redirect (status 302)');
  console.log('✔ Submitted maintenance block successfully');

  // Cleanup test booking
  const { default: pool } = await import('../src/config/db.js').catch(async () => {
    const p = await import('../src/config/db.js');
    return p;
  });
  await pool.query("DELETE FROM room_bookings WHERE title LIKE '%Auto Test%'");
  console.log('✔ Cleaned up test booking record');
  await pool.end();
}

testLiveFlow().then(() => {
  console.log('\n======================================================');
  console.log('🎉 ALL MAINTENANCE UI & BLOCK FLOW TESTS PASSED!');
  console.log('======================================================');
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

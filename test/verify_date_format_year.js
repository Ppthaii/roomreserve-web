import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('Testing Date Format & Year Consistency (2026 vs 2569)...');

  // 1. Admin login
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'admin', password: 'admin123' }).toString(),
    redirect: 'manual'
  });
  const cookie = loginRes.headers.get('set-cookie');
  assert.ok(cookie, 'Admin login must succeed');

  // 2. Check /admin/logs table rendering
  const logsRes = await fetch(`${BASE_URL}/admin/logs`, {
    headers: { Cookie: cookie }
  });
  assert.strictEqual(logsRes.status, 200);
  const logsHtml = await logsRes.text();

  assert.ok(!logsHtml.includes('2569'), 'Logs page HTML must NOT contain Buddhist era year 2569');
  assert.ok(logsHtml.includes('/2026'), 'Logs page must display Christian era year 2026 (e.g. /2026)');
  console.log('✔ /admin/logs displays year 2026 cleanly without any 2569');

  // 3. Check CSV export
  const exportRes = await fetch(`${BASE_URL}/admin/logs/export`, {
    headers: { Cookie: cookie }
  });
  assert.strictEqual(exportRes.status, 200);
  const csvText = await exportRes.text();
  assert.ok(!csvText.includes('2569'), 'Exported CSV must NOT contain 2569');
  assert.ok(csvText.includes('/2026'), 'Exported CSV must contain /2026');
  console.log('✔ CSV export displays year 2026 consistently');

  // 4. Check Dashboard
  const dashRes = await fetch(`${BASE_URL}/app`, {
    headers: { Cookie: cookie }
  });
  assert.strictEqual(dashRes.status, 200);
  const dashHtml = await dashRes.text();
  assert.ok(!dashHtml.includes('2569'), 'Dashboard HTML must NOT contain 2569');
  console.log('✔ Dashboard displays year 2026 consistently');

  console.log('\n🎉 ALL DATE FORMAT & YEAR CONSISTENCY TESTS PASSED 100%!');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

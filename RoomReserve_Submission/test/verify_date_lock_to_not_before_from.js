const pool = require('../src/config/db');

async function testDateLock() {
  console.log('🧪 Starting Lock End Date (ถึง) verification...');

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
    throw new Error('Failed to get session cookie for admin');
  }
  console.log('✅ Logged in as admin');

  // 2. Fetch /admin/logs and verify client-side lock scripts
  const logsRes = await fetch('http://localhost:3000/admin/logs?from=2026-10-20&to=2026-10-26', {
    headers: { Cookie: cookie }
  });

  if (logsRes.status !== 200) {
    throw new Error(`Failed to load /admin/logs (HTTP ${logsRes.status})`);
  }

  const html = await logsRes.text();

  // Check for dynamic minDate binding on fpTo
  if (!html.includes("fpTo.set('minDate'") || !html.includes("fpFrom.set('maxDate'")) {
    throw new Error('Client-side dynamic minDate/maxDate sync missing from logs.ejs');
  }
  console.log('✅ Client-side minDate on "ถึง" and maxDate on "จาก" properly configured');

  // Check initial sync on page load
  if (!html.includes("fpTo.set('minDate', fpFrom.selectedDates[0])")) {
    throw new Error('Initial load synchronization for minDate missing');
  }
  console.log('✅ Initial load sync for minDate on "ถึง" is active');

  // Check form submit validation guard
  if (!html.includes('fromEl.value > toEl.value') && !html.includes('fromInput.value > toInput.value')) {
    throw new Error('Form submit validation guard missing');
  }
  console.log('✅ Form submission validation guard present');

  // 3. Test Backend Swap Guard with reversed dates (from=2026-10-26 to=2026-10-01)
  const reversedRes = await fetch('http://localhost:3000/admin/logs?from=2026-10-26&to=2026-10-01', {
    headers: { Cookie: cookie }
  });
  if (reversedRes.status !== 200) {
    throw new Error(`Reversed dates failed with HTTP ${reversedRes.status}`);
  }
  console.log('✅ Backend successfully handles reversed dates without crash (HTTP 200)');

  // 4. Test Backend Export with reversed dates
  const exportRes = await fetch('http://localhost:3000/admin/logs/export?from=2026-10-26&to=2026-10-01', {
    headers: { Cookie: cookie }
  });
  if (exportRes.status !== 200) {
    throw new Error(`Export with reversed dates failed with HTTP ${exportRes.status}`);
  }
  const csvText = await exportRes.text();
  if (!csvText.includes('Log ID,Timestamp')) {
    throw new Error('CSV Export header missing');
  }
  console.log('✅ Backend Export successfully handles reversed dates (HTTP 200 CSV)');

  console.log('🎉 ALL DATE LOCK TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

testDateLock().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

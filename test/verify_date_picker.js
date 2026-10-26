const pool = require('../src/config/db');

async function testDatePicker() {
  console.log('🧪 Starting Date Picker & Flatpickr verification...');

  // 1. Verify Flatpickr static assets are served
  const assets = [
    '/vendor/flatpickr/flatpickr.min.css',
    '/vendor/flatpickr/flatpickr.min.js',
    '/vendor/flatpickr/th.js'
  ];

  for (const asset of assets) {
    const res = await fetch(`http://localhost:3000${asset}`);
    if (res.status !== 200) {
      throw new Error(`Asset ${asset} failed to load (HTTP ${res.status})`);
    }
    console.log(`✅ Asset loaded successfully: ${asset} (HTTP ${res.status})`);
  }

  // 2. Login as admin
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

  // 3. Test GET /admin/logs with two-digit date range (2026-10-01 to 2026-10-26)
  const logsRes = await fetch('http://localhost:3000/admin/logs?from=2026-10-01&to=2026-10-26', {
    headers: { Cookie: cookie }
  });

  if (logsRes.status !== 200) {
    throw new Error(`Failed to load /admin/logs with date filter (HTTP ${logsRes.status})`);
  }

  const html = await logsRes.text();

  // Verify flatpickr scripts and inputs are present
  if (!html.includes('/vendor/flatpickr/flatpickr.min.js')) {
    throw new Error('flatpickr script tag missing from logs page');
  }
  if (!html.includes('id="logDateFrom"') || !html.includes('id="logDateTo"')) {
    throw new Error('Flatpickr date inputs missing from logs filter bar');
  }
  if (!html.includes('placeholder="วว/ดด/ปปปป"')) {
    throw new Error('Thai date placeholder (วว/ดด/ปปปป) missing');
  }
  if (!html.includes('value="2026-10-01"') || !html.includes('value="2026-10-26"')) {
    throw new Error('Date filter values not preserved in form');
  }

  console.log('✅ Flatpickr inputs and Thai placeholder present in HTML');
  console.log('✅ Preserves two-digit date filter values (2026-10-01 to 2026-10-26)');

  // 4. Test Single-digit date filter (2026-10-05)
  const singleDigitRes = await fetch('http://localhost:3000/admin/logs?from=2026-10-05&to=2026-10-05', {
    headers: { Cookie: cookie }
  });
  if (singleDigitRes.status !== 200) {
    throw new Error(`Single digit date filter failed (HTTP ${singleDigitRes.status})`);
  }
  const singleHtml = await singleDigitRes.text();
  if (!singleHtml.includes('value="2026-10-05"')) {
    throw new Error('Single digit date not preserved');
  }
  console.log('✅ Preserves single-digit date filter values (2026-10-05)');

  console.log('🎉 ALL DATE PICKER TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

testDatePicker().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

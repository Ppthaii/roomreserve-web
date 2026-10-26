const http = require('http');

async function testUser(username, password) {
  // Step 1: POST /login to get cookie
  const postData = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const cookie = await new Promise((resolve, reject) => {
    const req = http.request('http://localhost:3000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      const setCookie = res.headers['set-cookie'];
      if (!setCookie) return reject(new Error('No set-cookie returned. status: ' + res.statusCode + ' loc: ' + res.headers['location']));
      resolve(setCookie.map(c => c.split(';')[0]).join('; '));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  // Step 2: GET /app with cookie
  const html = await new Promise((resolve, reject) => {
    const req = http.request('http://localhost:3000/app', {
      method: 'GET',
      headers: {
        'Cookie': cookie
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.end();
  });

  return html;
}

async function run() {
  console.log('Testing permission-based view rendering...');
  
  // 1. Manager (Approver)
  const managerHtml = await testUser('manager', 'approver123');
  const managerHasBookingTab = managerHtml.includes('data-view="booking"');
  const managerHasBookingView = managerHtml.includes('id="req-view-booking"');
  const managerHasApprovalsTab = managerHtml.includes('data-view="approvals"');
  const managerHasFacilityTab = managerHtml.includes('data-view="facility"');
  const managerHasBlockTab = managerHtml.includes('data-view="facility-block"');
  console.log('Manager (Approver):');
  console.log(' - Has Booking Tab:', managerHasBookingTab, '(Expected: false)');
  console.log(' - Has Booking View (#req-view-booking):', managerHasBookingView, '(Expected: false)');
  console.log(' - Has Approvals Tab:', managerHasApprovalsTab, '(Expected: true)');
  console.log(' - Has Facility Handover Tab:', managerHasFacilityTab, '(Expected: false)');
  console.log(' - Has Facility Block Tab:', managerHasBlockTab, '(Expected: false)');
  if (managerHasBookingTab || managerHasBookingView || !managerHasApprovalsTab || managerHasFacilityTab || managerHasBlockTab) {
    throw new Error('Manager view permission test failed!');
  }

  // 2. Facility
  const facilityHtml = await testUser('facility', 'facility123');
  const facilityHasBookingTab = facilityHtml.includes('data-view="booking"');
  const facilityHasBookingView = facilityHtml.includes('id="req-view-booking"');
  const facilityHasFacilityTab = facilityHtml.includes('data-view="facility"');
  const facilityHasBlockTab = facilityHtml.includes('data-view="facility-block"');
  const facilityHasHandoverView = facilityHtml.includes('id="req-view-facility"');
  const facilityHasBlockView = facilityHtml.includes('id="req-view-facility-block"');
  console.log('Facility:');
  console.log(' - Has Booking Tab:', facilityHasBookingTab, '(Expected: false)');
  console.log(' - Has Booking View (#req-view-booking):', facilityHasBookingView, '(Expected: false)');
  console.log(' - Has Handover Tab (data-view="facility"):', facilityHasFacilityTab, '(Expected: true)');
  console.log(' - Has Block Tab (data-view="facility-block"):', facilityHasBlockTab, '(Expected: true)');
  console.log(' - Has Handover View (#req-view-facility):', facilityHasHandoverView, '(Expected: true)');
  console.log(' - Has Block View (#req-view-facility-block):', facilityHasBlockView, '(Expected: true)');
  if (facilityHasBookingTab || facilityHasBookingView || !facilityHasFacilityTab || !facilityHasBlockTab || !facilityHasHandoverView || !facilityHasBlockView) {
    throw new Error('Facility view permission test failed!');
  }

  // 3. Somchai (Requester)
  const somchaiHtml = await testUser('somchai', 'user123');
  const somchaiHasBookingTab = somchaiHtml.includes('data-view="booking"');
  const somchaiHasBookingView = somchaiHtml.includes('id="req-view-booking"');
  const somchaiHasApprovalsTab = somchaiHtml.includes('data-view="approvals"');
  console.log('Somchai (Requester):');
  console.log(' - Has Booking Tab:', somchaiHasBookingTab, '(Expected: true)');
  console.log(' - Has Booking View (#req-view-booking):', somchaiHasBookingView, '(Expected: true)');
  console.log(' - Has Approvals Tab:', somchaiHasApprovalsTab, '(Expected: false)');
  if (!somchaiHasBookingTab || !somchaiHasBookingView || somchaiHasApprovalsTab) {
    throw new Error('Somchai view permission test failed!');
  }

  // 4. Admin
  const adminHtml = await testUser('admin', 'admin123');
  const adminHasBookingTab = adminHtml.includes('data-view="booking"');
  const adminHasApprovalsTab = adminHtml.includes('data-view="approvals"');
  const adminHasFacilityTab = adminHtml.includes('data-view="facility"');
  console.log('Admin:');
  console.log(' - Has Booking Tab:', adminHasBookingTab, '(Expected: true)');
  console.log(' - Has Approvals Tab:', adminHasApprovalsTab, '(Expected: true)');
  console.log(' - Has Facility Tab:', adminHasFacilityTab, '(Expected: true)');
  if (!adminHasBookingTab || !adminHasApprovalsTab || !adminHasFacilityTab) {
    throw new Error('Admin view permission test failed!');
  }

  console.log('\nAll permission checks passed successfully!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

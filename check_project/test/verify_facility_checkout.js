const pool = require('../src/config/db');

async function testFacilityCheckout() {
  console.log('--- เริ่มการทดสอบ Facility Checkout Flow ---');
  // 1. Login as facility
  const params = new URLSearchParams({ username: 'facility', password: 'facility123' });
  const loginRes = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    redirect: 'manual'
  });
  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('Login failed: no set-cookie header');
  }
  const cookie = setCookie.match(/connect\.sid=[^;]+/)[0];

  // 2. Query or insert an IN_USE booking for testing
  const bRes = await pool.query(`
    INSERT INTO room_bookings (room_id, user_id, title, purpose, attendees_count, start_time, end_time, status)
    VALUES (1, 3, 'Test Checkout Room', 'Testing facility checkout fix', 2, NOW(), NOW() + interval '1 hour', 'IN_USE')
    RETURNING booking_id
  `);
  const testBookingId = bRes.rows[0].booking_id;
  console.log('สร้างรายการจองสถานะ IN_USE เพื่อทดสอบ booking_id:', testBookingId);

  // 3. Perform Checkout
  const checkoutParams = new URLSearchParams({ comment: 'เรียบร้อยดีทุกอย่าง' });
  const checkRes = await fetch(`http://localhost:3000/app/facility/checkout/${testBookingId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    },
    body: checkoutParams.toString(),
    redirect: 'manual'
  });

  console.log('Checkout response status:', checkRes.status);
  console.log('Checkout response location:', decodeURIComponent(checkRes.headers.get('location') || ''));

  // 4. Verify DB status is FINISHED
  const finalCheck = await pool.query('SELECT status, facility_comment FROM room_bookings WHERE booking_id = $1', [testBookingId]);
  console.log('DB booking status after checkout:', finalCheck.rows[0]);

  // Clean up test booking
  await pool.query('DELETE FROM room_bookings WHERE booking_id = $1', [testBookingId]);
  await pool.end();

  if (checkRes.status === 302 && finalCheck.rows[0].status === 'COMPLETED') {
    console.log('🎉 FACILITY CHECKOUT VERIFIED 100% WORKING WITHOUT ANY ERROR 500!');
  } else {
    console.error('❌ CHECKOUT FAILED');
    process.exit(1);
  }
}

testFacilityCheckout().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});

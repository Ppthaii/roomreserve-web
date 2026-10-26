import assert from 'node:assert';
import pg from 'pg';

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('Testing Delete Room with Bookings (Cascade Deletion)...');

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // 1. Create a test room with a booking directly in DB
    const roomRes = await pool.query(`
      INSERT INTO rooms (room_name, capacity, location, is_active)
      VALUES ($1, 20, 'ตึก 1 ชั้น 5', TRUE)
      RETURNING room_id
    `, ['ห้องทดสอบลบ ' + Date.now()]);
    const roomId = roomRes.rows[0].room_id;

    // Get any user id
    const userRes = await pool.query('SELECT user_id FROM users LIMIT 1');
    const userId = userRes.rows[0].user_id;

    // Insert a booking for this room
    await pool.query(`
      INSERT INTO room_bookings (room_id, user_id, title, purpose, start_time, end_time, status)
      VALUES ($1, $2, 'ประชุมทดสอบลบ', 'ทดสอบ cascade', '2026-10-27 10:00:00', '2026-10-27 11:00:00', 'APPROVED')
    `, [roomId, userId]);

    console.log(`✔ Created test room ID ${roomId} with an active booking`);

    // 2. Admin login
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: 'admin', password: 'admin123' }).toString(),
      redirect: 'manual'
    });
    const cookie = loginRes.headers.get('set-cookie');
    assert.ok(cookie, 'Admin login must succeed');

    // 3. Verify /app/rooms displays the delete button for this room
    const roomsPageRes = await fetch(`${BASE_URL}/app/rooms`, {
      headers: { Cookie: cookie }
    });
    assert.strictEqual(roomsPageRes.status, 200);
    const roomsHtml = await roomsPageRes.text();
    assert.ok(roomsHtml.includes(`/app/rooms/${roomId}/delete`), `Rooms page must contain delete form for room ${roomId}`);
    console.log('✔ Rooms page displays delete button even when room has bookings');

    // 4. Submit delete request
    const delRes = await fetch(`${BASE_URL}/app/rooms/${roomId}/delete`, {
      method: 'POST',
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    assert.strictEqual(delRes.status, 302, 'Delete room must redirect on success');

    // 5. Verify room and its booking are deleted from database
    const checkRoom = await pool.query('SELECT * FROM rooms WHERE room_id = $1', [roomId]);
    assert.strictEqual(checkRoom.rowCount, 0, 'Room must be deleted from DB');

    const checkBookings = await pool.query('SELECT * FROM room_bookings WHERE room_id = $1', [roomId]);
    assert.strictEqual(checkBookings.rowCount, 0, 'Bookings for this room must be cascaded');

    console.log('✔ Room and its bookings were cleanly deleted via transaction');
    console.log('\n🎉 ALL DELETE ROOM WITH BOOKINGS TESTS PASSED 100%!');
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

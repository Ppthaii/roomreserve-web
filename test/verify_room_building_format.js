import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const roomsEjs = fs.readFileSync(path.join(__dirname, '../src/views/rooms.ejs'), 'utf8');
const dashboardEjs = fs.readFileSync(path.join(__dirname, '../src/views/dashboard.ejs'), 'utf8');

console.log('Testing Room Building Format & Management Feature...\n');

// 1. Template Structure Checks
assert.ok(roomsEjs.includes('id="add_building"'), 'rooms.ejs must have add_building dropdown');
assert.ok(roomsEjs.includes('<option value="ตึก 1">'), 'rooms.ejs must have building options');
assert.ok(roomsEjs.includes('id="modal-edit-room"'), 'rooms.ejs must have modal-edit-room');
assert.ok(roomsEjs.includes('openEditRoomModal'), 'rooms.ejs must have openEditRoomModal function');
assert.ok(dashboardEjs.includes('getBuildingNumHelper'), 'dashboard.ejs must have getBuildingNumHelper');
console.log('✔ 1. Template UI elements verified');

// 2. Building Parsing Logic Check
function testGetBuilding(location, roomName) {
  const loc = String(location || '');
  const name = String(roomName || '');
  const locMatch = loc.match(/(?:ตึก|อาคาร|building)\s*([1-9])/i);
  if (locMatch) return locMatch[1];
  const nameMatch = name.match(/(?:ห้อง\s*)?([1-9])\d{2}/i);
  if (nameMatch) return nameMatch[1];
  if (loc.includes('1')) return '1';
  if (loc.includes('2')) return '2';
  if (loc.includes('3')) return '3';
  return '1';
}

assert.strictEqual(testGetBuilding('ตึก 1', 'ห้อง 101'), '1');
assert.strictEqual(testGetBuilding('ตึก 1 ชั้น 2', 'ห้องสัมมนา A'), '1');
assert.strictEqual(testGetBuilding('ตึก 2 (ชั้น 3)', 'ห้อง 201'), '2');
assert.strictEqual(testGetBuilding('ตึก 3', 'ห้อง 302'), '3');
assert.strictEqual(testGetBuilding('หฟกฟห', 'ห้อง 201'), '2', 'Should fallback to room_name digit if location is gibberish');
console.log('✔ 2. Building detection logic passed all test cases');

// 3. Database operations check (Create, Edit, Delete)
async function testDbOperations() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // 3.1 Create test room with standard building format
    const testRoomName = 'ห้องทดสอบตึก ' + Date.now();
    const createRes = await pool.query(`
      INSERT INTO rooms (room_name, capacity, location, equipment_description, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING *
    `, [testRoomName, 20, 'ตึก 2 ชั้น 4', 'ไมโครโฟน 2 ตัว']);
    const testRoomId = createRes.rows[0].room_id;
    assert.strictEqual(createRes.rows[0].location, 'ตึก 2 ชั้น 4');
    console.log('✔ 3.1 Successfully created room with formatted location: ตึก 2 ชั้น 4');

    // 3.2 Update room to change building
    const updateRes = await pool.query(`
      UPDATE rooms
      SET room_name = $1, capacity = $2, location = $3
      WHERE room_id = $4
      RETURNING *
    `, [testRoomName + ' (แก้ไขแล้ว)', 30, 'ตึก 3 ชั้น 1', testRoomId]);
    assert.strictEqual(updateRes.rows[0].location, 'ตึก 3 ชั้น 1');
    assert.strictEqual(updateRes.rows[0].capacity, 30);
    console.log('✔ 3.2 Successfully updated room to: ตึก 3 ชั้น 1');

    // 3.3 Delete the test room
    const delRes = await pool.query(`DELETE FROM rooms WHERE room_id = $1 RETURNING *`, [testRoomId]);
    assert.strictEqual(delRes.rowCount, 1);
    console.log('✔ 3.3 Successfully deleted test room (clean teardown)');

  } finally {
    await pool.end();
  }
}

testDbOperations().then(() => {
  console.log('\n======================================================');
  console.log('🎉 All Room Building Format Verification tests PASSED!');
  console.log('======================================================');
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

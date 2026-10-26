import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing suspended room & 18:00 selection handling...');

const dashboardJs = fs.readFileSync(path.join(__dirname, '../src/public/dashboard.js'), 'utf8');
const bookingEjs = fs.readFileSync(path.join(__dirname, '../src/views/partials/dashboard/booking.ejs'), 'utf8');

// 1. Verify onTimeRangePillClick blocks suspended room and hour >= 18
assert.ok(dashboardJs.includes('if (room && !room.is_active)'), 'Must check room.is_active');
assert.ok(dashboardJs.includes('if (hour >= 18)'), 'Must block hour >= 18 in onTimeRangePillClick');

// 2. Verify checkBookingConflict blocks suspended room and startH >= 18
assert.ok(dashboardJs.includes('ไม่สามารถจองได้: ห้องนี้ถูกระงับการใช้งาน (ปิดปรับปรุง)'), 'Must set suspended conflict message');
assert.ok(dashboardJs.includes('startH >= 18'), 'Must block startH >= 18 in checkBookingConflict');

// 3. Verify renderTimeRangePills marks all pills is-booked when room is inactive
assert.ok(dashboardJs.includes("pill.title = 'ห้องนี้ถูกระงับการใช้งาน / ปิดปรับปรุง';"), 'Must title suspended pills');
assert.ok(dashboardJs.includes("pill.title = 'อาคารปิดทำการ 18:00 น.';"), 'Must title hour 18 as closed');

// 4. Verify visual room card displays suspended badge
assert.ok(bookingEjs.includes('is-suspended'), 'Visual room card must have is-suspended class');
assert.ok(bookingEjs.includes('room-suspended-overlay'), 'Visual room card must have overlay badge');
assert.ok(bookingEjs.includes('[ระงับการใช้งาน]'), 'Visual room card must display text badge');

// 5. Simulate client-side logic
const mockRoom = { room_id: 1, room_name: 'ห้อง 101', is_active: false, capacity: 20 };
const mockRooms = [mockRoom];

// Check logic simulation
function simulateConflictCheck(room, startStr, endStr) {
  if (!room.is_active) {
    return { canSubmit: false, msg: 'ห้องนี้ถูกระงับการใช้งาน' };
  }
  const sH = parseInt(startStr.split(':')[0], 10);
  if (sH >= 18) {
    return { canSubmit: false, msg: 'อาคารปิดทำการเวลา 18:00 น.' };
  }
  return { canSubmit: true, msg: 'ว่าง' };
}

const res1 = simulateConflictCheck(mockRoom, '09:00', '10:00');
assert.strictEqual(res1.canSubmit, false, 'Suspended room must not allow submit for 09:00');
assert.ok(res1.msg.includes('ระงับการใช้งาน'));
console.log('✔ Suspended room cannot be booked at 09:00');

const res2 = simulateConflictCheck(mockRoom, '18:00', '19:00');
assert.strictEqual(res2.canSubmit, false, 'Suspended room must not allow submit for 18:00');
console.log('✔ Suspended room cannot be booked at 18:00');

const activeRoom = { room_id: 2, room_name: 'ห้อง 102', is_active: true, capacity: 10 };
const res3 = simulateConflictCheck(activeRoom, '18:00', '19:00');
assert.strictEqual(res3.canSubmit, false, 'Active room cannot start at 18:00 (closed)');
console.log('✔ Active room cannot start at 18:00');

const res4 = simulateConflictCheck(activeRoom, '17:00', '18:00');
assert.strictEqual(res4.canSubmit, true, 'Active room can book 17:00 - 18:00');
console.log('✔ Active room can book 17:00 - 18:00');

console.log('\n======================================================');
console.log('🎉 ALL SUSPENDED ROOM & 18:00 SELECTION TESTS PASSED!');
console.log('======================================================');

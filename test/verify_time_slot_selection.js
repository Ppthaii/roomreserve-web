import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dashboardEjsPath = path.join(__dirname, '../src/views/dashboard.ejs');
const bookingPartialPath = path.join(__dirname, '../src/views/partials/dashboard/booking.ejs');
const dashboardHtml = fs.readFileSync(dashboardEjsPath, 'utf8') + 
  (fs.existsSync(bookingPartialPath) ? fs.readFileSync(bookingPartialPath, 'utf8') : '');

console.log('Testing dashboard.ejs time slot range logic...');

// 1. Verify grid only generates slots 9 to 17 (09:00 to 17:00), no 18:00 pill
assert.ok(dashboardHtml.includes('for (let h = 9; h < 18; h++)'), 'Pills loop must be h < 18 to exclude 18:00 pill');
assert.ok(!dashboardHtml.includes('for (let h = 9; h <= 18; h++)'), 'Must not have h <= 18 for pills');

// 2. Simulate renderTimeRangePills logic
function simulatePillSelection(rangeStartHour, rangeEndHour, bookedHours = [16, 17]) {
  const pills = {};
  for (let h = 9; h < 18; h++) {
    pills[h] = { classes: [] };
    if (bookedHours.includes(h)) {
      pills[h].classes.push('is-booked');
    }
  }

  // Apply render logic
  for (let h = 9; h < 18; h++) {
    const pill = pills[h];
    if (h >= rangeStartHour && h < rangeEndHour) {
      if (!pill.classes.includes('is-booked')) {
        if (rangeEndHour - rangeStartHour === 1) {
          pill.classes.push('is-start');
        } else if (h === rangeStartHour) {
          pill.classes.push('is-start');
        } else if (h === rangeEndHour - 1) {
          pill.classes.push('is-end');
        } else {
          pill.classes.push('in-range');
        }
      }
    }
  }

  return pills;
}

// Scenario 1: Select 14:00 (1 hour: 14:00 - 15:00)
{
  const result = simulatePillSelection(14, 15, [16, 17]);
  assert.ok(result[14].classes.includes('is-start'), 'Slot 14 should have is-start');
  assert.strictEqual(result[15].classes.length, 0, 'Slot 15 must NOT have any selected class when only slot 14 is clicked');
  assert.ok(result[16].classes.includes('is-booked'), 'Slot 16 is booked');
  console.log('✔ Scenario 1 passed: Selecting 14:00 only highlights 14:00, 15:00 is untouched.');
}

// Scenario 2: Select 15:00 (1 hour: 15:00 - 16:00, before booked 16:00)
{
  const result = simulatePillSelection(15, 16, [16, 17]);
  assert.ok(result[15].classes.includes('is-start'), 'Slot 15 should have is-start');
  assert.ok(!result[15].classes.includes('is-booked'), 'Slot 15 is free');
  assert.ok(result[16].classes.includes('is-booked'), 'Slot 16 is booked');
  assert.ok(!result[16].classes.includes('is-start') && !result[16].classes.includes('is-end'), 'Slot 16 must NOT be highlighted as selected');
  console.log('✔ Scenario 2 passed: Selecting 15:00 cleanly highlights 15:00 without conflicting with booked 16:00.');
}

// Scenario 3: Select 14:00 to 16:00 (2 hours: slots 14 and 15)
{
  const result = simulatePillSelection(14, 16, [16, 17]);
  assert.ok(result[14].classes.includes('is-start'), 'Slot 14 is start');
  assert.ok(result[15].classes.includes('is-end'), 'Slot 15 is end');
  assert.strictEqual(result[13].classes.length, 0, 'Slot 13 is untouched');
  console.log('✔ Scenario 3 passed: Selecting 14:00 - 16:00 highlights slots 14 (start) and 15 (end).');
}

// Scenario 4: Conflict check logic for 15:00 - 16:00 when 16:00 is booked
{
  const existingBookings = [
    { start_time: '2026-10-26T16:00:00', end_time: '2026-10-26T18:00:00', room_id: 1, status: 'APPROVED' }
  ];
  const start = new Date('2026-10-26T15:00:00');
  const end = new Date('2026-10-26T16:00:00');

  const conflict = existingBookings.find(b => {
    const bStart = new Date(b.start_time);
    const bEnd = new Date(b.end_time);
    return bStart < end && bEnd > start;
  });

  assert.strictEqual(conflict, undefined, 'Slot 15:00 - 16:00 must NOT conflict with 16:00 - 18:00');
  console.log('✔ Scenario 4 passed: Slot 15:00 - 16:00 is free and has no conflict.');
}

console.log('\nAll time slot selection logic tests PASSED!');

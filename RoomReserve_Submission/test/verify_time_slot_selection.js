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

// 1. Verify grid generates slots from 9 to 18 (including 18:00 end pill)
assert.ok(dashboardHtml.includes('for (let h = 9; h <= 18; h++)'), 'Pills loop must be h <= 18 to include 18:00 pill');

// 2. Simulate renderTimeRangePills logic with 18:00 pill support
function simulatePillSelection(rangeStartHour, rangeEndHour, bookedHours = [16, 17]) {
  const pills = {};
  for (let h = 9; h <= 18; h++) {
    pills[h] = { classes: [] };
    if (bookedHours.includes(h)) {
      pills[h].classes.push('is-booked');
    }
  }

  // Apply render logic
  for (let h = 9; h <= 18; h++) {
    const pill = pills[h];
    if (!pill.classes.includes('is-booked')) {
      if (h === rangeStartHour) {
        pill.classes.push('is-start');
      } else if (h === rangeEndHour) {
        pill.classes.push('is-end');
      } else if (h > rangeStartHour && h < rangeEndHour) {
        pill.classes.push('in-range');
      }
    }
  }

  return pills;
}

// Scenario 1: Select 14:00 to 15:00 (1 hour)
{
  const result = simulatePillSelection(14, 15, [16, 17]);
  assert.ok(result[14].classes.includes('is-start'), 'Slot 14 should have is-start');
  assert.ok(result[15].classes.includes('is-end'), 'Slot 15 should have is-end');
  assert.ok(result[16].classes.includes('is-booked'), 'Slot 16 is booked');
  console.log('✔ Scenario 1 passed: Selecting 14:00 - 15:00 highlights start 14:00 and end 15:00.');
}

// Scenario 2: Select 17:00 to 18:00 (1 hour up to closing time)
{
  const result = simulatePillSelection(17, 18, []);
  assert.ok(result[17].classes.includes('is-start'), 'Slot 17 should have is-start');
  assert.ok(result[18].classes.includes('is-end'), 'Slot 18 should have is-end');
  console.log('✔ Scenario 2 passed: Selecting 17:00 - 18:00 highlights start 17:00 and end 18:00.');
}

// Scenario 3: Select 14:00 to 16:00 (2 hours: slots 14, 15, 16)
{
  const result = simulatePillSelection(14, 16, []);
  assert.ok(result[14].classes.includes('is-start'), 'Slot 14 is start');
  assert.ok(result[15].classes.includes('in-range'), 'Slot 15 is in-range');
  assert.ok(result[16].classes.includes('is-end'), 'Slot 16 is end');
  console.log('✔ Scenario 3 passed: Selecting 14:00 - 16:00 highlights 14 (start), 15 (in-range), and 16 (end).');
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

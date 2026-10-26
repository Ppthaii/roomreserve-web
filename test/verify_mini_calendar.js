const http = require('http');

async function testMiniCalendar() {
  const loginData = new URLSearchParams({ username: 'somchai', password: 'user123' }).toString();
  const req = http.request('http://localhost:3000/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(loginData)
    }
  }, (res) => {
    const cookie = res.headers['set-cookie'];
    if (!cookie) {
      console.error('Login failed, no cookie');
      process.exit(1);
    }
    
    const appReq = http.request('http://localhost:3000/app?view=booking', {
      headers: { 'Cookie': cookie.join('; ') }
    }, (appRes) => {
      let data = '';
      appRes.on('data', chunk => data += chunk);
      appRes.on('end', () => {
        const roomsBoxIdx = data.indexOf('id="buildingRoomsBox"');
        const miniCalIdx = data.indexOf('class="mini-calendar-container"');
        const bookingFormIdx = data.indexOf('id="bookingMainForm"');

        console.log('--- TEST RESULTS ---');
        console.log('roomsBoxIdx:', roomsBoxIdx);
        console.log('miniCalIdx:', miniCalIdx);
        console.log('bookingFormIdx:', bookingFormIdx);

        const isOrdered = roomsBoxIdx !== -1 && miniCalIdx !== -1 && bookingFormIdx !== -1 &&
                          roomsBoxIdx < miniCalIdx && miniCalIdx < bookingFormIdx;
        console.log('1. Mini Calendar is placed BELOW room selection and ABOVE booking form:', isOrdered);

        const hasCards = data.includes('mini-cal-day-card');
        console.log('2. Mini Calendar Day Cards rendered:', hasCards);

        const hasActive = data.includes('mini-cal-day-card active');
        console.log('3. Mini Calendar Active Day Card highlighted:', hasActive);

        const hasPicker = data.includes('id="miniCalDateInput"');
        console.log('4. Mini Calendar Datepicker present:', hasPicker);

        if (isOrdered && hasCards && hasActive && hasPicker) {
          console.log('\n>>> ALL CHECKS PASSED SUCCESSFULLY! <<<');
          process.exit(0);
        } else {
          console.error('\n>>> SOME CHECKS FAILED! <<<');
          process.exit(1);
        }
      });
    });
    appReq.end();
  });
  req.write(loginData);
  req.end();
}

testMiniCalendar();

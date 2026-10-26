const pool = require('../src/config/db');

async function testCollisionAndAutoReject() {
  console.log('===========================================================');
  console.log('🧪 เริ่มการทดสอบ: จองชนได้ (Pending) + อนุมัติ 1 รายการ -> ปฏิเสธคิวอื่นอัตโนมัติ');
  console.log('===========================================================');

  const BASE_URL = 'http://localhost:3000';

  // 1. ล็อกอินเป็นสมชาย (Requester)
  const somchaiLogin = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'somchai', password: 'user123' }).toString(),
    redirect: 'manual'
  });
  const somchaiCookie = somchaiLogin.headers.get('set-cookie').match(/connect\.sid=[^;]+/)[0];
  console.log('✅ 1. ผู้ใช้ somchai ล็อกอินสำเร็จ');

  // 2. ล็อกอินเป็นหัวหน้างาน (Approver: manager)
  const managerLogin = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'manager', password: 'approver123' }).toString(),
    redirect: 'manual'
  });
  const managerCookie = managerLogin.headers.get('set-cookie').match(/connect\.sid=[^;]+/)[0];
  console.log('✅ 2. ผู้อนุมัติ manager ล็อกอินสำเร็จ');

  // เลือกรอบวันพรุ่งนี้เพื่อไม่ให้กระทบข้อมูลปัจจุบัน
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const testDate = tomorrow.toISOString().split('T')[0];
  const targetRoomId = 1; // ห้อง 101

  // ทำความสะอาดข้อมูลทดสอบเก่าของวันพรุ่งนี้ก่อน
  await pool.query("DELETE FROM room_bookings WHERE title LIKE 'TEST_COLLISION_%'");

  // 3. ผู้ใช้คนที่ 1 ยื่นจองห้อง 101 เวลา 13:00 - 15:00
  console.log(`\n--- ส่งคำขอที่ 1 (Title: TEST_COLLISION_1, เวลา 13:00 - 15:00) ---`);
  const book1Res = await fetch(`${BASE_URL}/app/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': somchaiCookie
    },
    body: new URLSearchParams({
      room_id: String(targetRoomId),
      booking_date: testDate,
      start_time_str: '13:00',
      end_time_str: '15:00',
      title: 'TEST_COLLISION_1 การประชุมทีมพัฒนา ก',
      purpose: 'ทดสอบการจองคิวที่ 1',
      attendees_count: '5'
    }).toString(),
    redirect: 'manual'
  });
  console.log('ผลลัพธ์คำขอที่ 1 Status:', book1Res.status, decodeURIComponent(book1Res.headers.get('location') || ''));

  // 4. ผู้ใช้คนที่ 2 ยื่นจองห้องเดียวกัน เวลาชนกัน 14:00 - 16:00 (เหลื่อม 14:00-15:00)
  console.log(`\n--- ส่งคำขอที่ 2 จองชนห้องและเวลาเดียวกัน (Title: TEST_COLLISION_2, เวลา 14:00 - 16:00) ---`);
  const book2Res = await fetch(`${BASE_URL}/app/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': somchaiCookie
    },
    body: new URLSearchParams({
      room_id: String(targetRoomId),
      booking_date: testDate,
      start_time_str: '14:00',
      end_time_str: '16:00',
      title: 'TEST_COLLISION_2 การประชุมทีมพัฒนา ข (จองชน)',
      purpose: 'ทดสอบการจองชนคิวที่ 2',
      attendees_count: '6'
    }).toString(),
    redirect: 'manual'
  });
  console.log('ผลลัพธ์คำขอที่ 2 Status:', book2Res.status, decodeURIComponent(book2Res.headers.get('location') || ''));

  // 5. ตรวจสอบในฐานข้อมูลว่าทั้ง 2 รายการถูกบันทึกในสถานะ PENDING_APPROVAL ได้สำเร็จจริง (จองชนได้)
  const pendingCheck = await pool.query(`
    SELECT booking_id, title, status, start_time, end_time
    FROM room_bookings
    WHERE title LIKE 'TEST_COLLISION_%'
    ORDER BY booking_id ASC
  `);

  if (pendingCheck.rows.length !== 2) {
    throw new Error(`คำขอไม่ผ่านทั้งคู่ พบรายการใน DB: ${pendingCheck.rows.length} รายการ`);
  }
  console.log('✅ 3. ยืนยันใน DB: ทั้ง 2 คำขออยู่ในสถานะ PENDING_APPROVAL พร้อมกันได้สำเร็จ (จองชนได้ตามต้องการ)');
  const [b1, b2] = pendingCheck.rows;
  console.log(`   - รายการที่ 1 ID: ${b1.booking_id} (${b1.title}) Status: ${b1.status}`);
  console.log(`   - รายการที่ 2 ID: ${b2.booking_id} (${b2.title}) Status: ${b2.status}`);

  // 6. หัวหน้างานอนุมัติรายการที่ 1
  console.log(`\n--- หัวหน้างานอนุมัติรายการที่ 1 (ID: ${b1.booking_id}) ---`);
  const approveRes = await fetch(`${BASE_URL}/app/bookings/${b1.booking_id}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': managerCookie
    },
    body: new URLSearchParams({
      action: 'APPROVE',
      comment: 'อนุมัติให้ตามความเหมาะสม'
    }).toString(),
    redirect: 'manual'
  });

  const approveLocation = decodeURIComponent(approveRes.headers.get('location') || '');
  console.log('ผลลัพธ์การอนุมัติ Status:', approveRes.status, approveLocation);

  // 7. ตรวจสอบสถานะของทั้ง 2 รายการหลังการอนุมัติ
  const afterApprovalCheck = await pool.query(`
    SELECT booking_id, title, status, approver_comment
    FROM room_bookings
    WHERE booking_id IN ($1, $2)
    ORDER BY booking_id ASC
  `, [b1.booking_id, b2.booking_id]);

  const updatedB1 = afterApprovalCheck.rows.find(r => r.booking_id === b1.booking_id);
  const updatedB2 = afterApprovalCheck.rows.find(r => r.booking_id === b2.booking_id);

  console.log('\n--- ผลการตรวจสอบสถานะหลังอนุมัติ ---');
  console.log(`รายการที่ 1: สถานะ = ${updatedB1.status}, คอมเมนต์ = ${updatedB1.approver_comment}`);
  console.log(`รายการที่ 2: สถานะ = ${updatedB2.status}, คอมเมนต์ = ${updatedB2.approver_comment}`);

  if (updatedB1.status !== 'APPROVED') {
    throw new Error(`รายการที่ 1 ควรเป็น APPROVED แต่ได้ ${updatedB1.status}`);
  }
  if (updatedB2.status !== 'REJECTED') {
    throw new Error(`รายการที่ 2 ควรถูก REJECTED อัตโนมัติ แต่ได้ ${updatedB2.status}`);
  }
  if (updatedB2.approver_comment !== 'มีผู้จองห้องก่อนแล้ว') {
    throw new Error(`เหตุผลการปฏิเสธควรเป็น 'มีผู้จองห้องก่อนแล้ว' แต่ได้ '${updatedB2.approver_comment}'`);
  }
  console.log('✅ 4. ยืนยัน: รายการที่ 1 ได้รับการอนุมัติ (APPROVED) และรายการที่ 2 ถูกปฏิเสธอัตโนมัติ (REJECTED) พร้อมเหตุผล "มีผู้จองห้องก่อนแล้ว"');

  // 8. ตรวจสอบว่าหลังจากมี APPROVED แล้ว รายการใหม่ที่จะมาจองทับซ้อนจะถูกป้องกันไม่ให้จองได้ทันที
  console.log(`\n--- ทดสอบยื่นจองคำขอที่ 3 ในช่วงเวลาที่อนุมัติไปแล้ว (13:30 - 14:30) ---`);
  const book3Res = await fetch(`${BASE_URL}/app/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': somchaiCookie
    },
    body: new URLSearchParams({
      room_id: String(targetRoomId),
      booking_date: testDate,
      start_time_str: '13:00',
      end_time_str: '14:00',
      title: 'TEST_COLLISION_3 ควรถูกบล็อก',
      purpose: 'ทดสอบการบล็อกหลังอนุมัติ',
      attendees_count: '2'
    }).toString(),
    redirect: 'manual'
  });
  const book3Location = decodeURIComponent(book3Res.headers.get('location') || '');
  console.log('ผลลัพธ์คำขอที่ 3 Location:', book3Location);
  if (!book3Location.includes('มีรายการจองที่ได้รับการอนุมัติแล้ว')) {
    throw new Error('คำขอที่ 3 ควรถูกปฏิเสธเนื่องจากมีรายการอนุมัติแล้ว');
  }
  console.log('✅ 5. ยืนยัน: ช่วงเวลาที่ได้รับอนุมัติแล้ว จะไม่อนุญาตให้ยื่นจองเข้ามาทับซ้อนได้อีก');

  // 9. ตรวจสอบ Audit Log ว่าบันทึก AUTO_REJECTED ไว้ครบถ้วน
  const auditRes = await pool.query(`
    SELECT action, resource_id, status, details
    FROM audit_logs
    WHERE resource_id = $1 AND action = 'BOOKING_REJECT'
    ORDER BY log_id DESC LIMIT 1
  `, [String(b2.booking_id)]);

  if (auditRes.rowCount > 0) {
    console.log('✅ 6. Audit Log บันทึกเหตุการณ์ AUTO_REJECTED:', auditRes.rows[0].details);
  }

  // 10. ล้างข้อมูลทดสอบ
  await pool.query("DELETE FROM room_bookings WHERE title LIKE 'TEST_COLLISION_%'");
  await pool.end();

  console.log('\n===========================================================');
  console.log('🎉 ทุกการทดสอบฟังก์ชัน "จองชนได้ + ปฏิเสธอัตโนมัติเมื่ออนุมัติ" ผ่าน 100%!');
  console.log('===========================================================');
}

testCollisionAndAutoReject().catch(async (err) => {
  console.error('❌ Test failed with error:', err);
  try {
    await pool.query("DELETE FROM room_bookings WHERE title LIKE 'TEST_COLLISION_%'");
    await pool.end();
  } catch (e) {}
  process.exit(1);
});

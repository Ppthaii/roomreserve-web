const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const facilityController = require('../controllers/facilityController');
const fileController = require('../controllers/fileController');
const { requireAuth, requirePermission } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const verifyFileSignature = require('../middlewares/fileSignature');

const roomController = require('../controllers/roomController');

// หน้า Dashboard กลาง & ตารางปฏิทิน
router.get('/', requireAuth, requirePermission('room.view_schedule'), bookingController.getDashboard);

// หน้าจัดการห้องประชุม (Rooms Management)
router.get('/rooms', requireAuth, requirePermission('room.view_schedule'), roomController.getRoomsPage);
router.post('/rooms/create', requireAuth, requirePermission('room.manage'), roomController.createRoom);
router.post('/rooms/:id/toggle', requireAuth, requirePermission('room.manage'), roomController.toggleRoom);

// ยื่นจองห้อง (Requester) - มี Transaction + Row Lock กัน Race Condition
router.post('/bookings', 
  requireAuth, 
  requirePermission('booking.create'), 
  upload.single('agenda_file'), 
  verifyFileSignature,
  bookingController.createBooking
);

// ยกเลิกการจองของตนเอง
router.post('/bookings/:id/cancel', 
  requireAuth, 
  requirePermission('booking.cancel_own'), 
  bookingController.cancelBooking
);

// ล้างประวัติคำขอที่สิ้นสุดแล้วทั้งหมด (Requester)
router.post('/bookings/clear-history',
  requireAuth,
  requirePermission('booking.read_own'),
  bookingController.clearBookingHistory
);

// ลบประวัติคำขอรายแถวที่สิ้นสุดแล้ว (Requester)
router.post('/bookings/:id/delete',
  requireAuth,
  requirePermission('booking.read_own'),
  bookingController.deleteBookingHistory
);

// อนุมัติ / ปฏิเสธ (Approver)
router.post('/bookings/:id/review', 
  requireAuth, 
  requirePermission('booking.approve'), 
  bookingController.reviewBooking
);

// Safety Rollback: ยกเลิกการอนุมัติดึงสถานะกลับเป็น PENDING_APPROVAL (Approver)
router.post('/bookings/:id/revoke', 
  requireAuth, 
  requirePermission('booking.approve'), 
  bookingController.revokeApproval
);

// บล็อกตารางห้องล่วงหน้า (Facility Officer)
router.post('/facility/block', 
  requireAuth, 
  requirePermission('room.block_schedule'), 
  facilityController.blockSchedule
);

// ส่งมอบห้อง / Check-in (Facility Officer)
router.post('/facility/checkin/:id', 
  requireAuth, 
  requirePermission('facility.checkin'), 
  facilityController.checkinRoom
);

// ตรวจห้องและปิดงาน / Check-out พร้อมแนบรูป (Facility Officer)
router.post('/facility/checkout/:id', 
  requireAuth, 
  requirePermission('facility.checkout'), 
  upload.single('inspection_file'), 
  verifyFileSignature,
  facilityController.checkoutRoom
);

// ดาวน์โหลด/เปิดดูไฟล์แบบ Protected Stream (Anti-IDOR)
router.get('/files/:id', 
  requireAuth, 
  requirePermission('file.view'), 
  fileController.getFile
);

module.exports = router;

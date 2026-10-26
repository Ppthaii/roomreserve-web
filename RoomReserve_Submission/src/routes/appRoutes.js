const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const facilityController = require('../controllers/facilityController');
const fileController = require('../controllers/fileController');
const { requireAuth, requirePermission } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const verifyFileSignature = require('../middlewares/fileSignature');

const roomController = require('../controllers/roomController');

router.get('/', requireAuth, requirePermission('room.view_schedule'), bookingController.getDashboard);

router.get('/rooms', requireAuth, requirePermission('room.view_schedule'), roomController.getRoomsPage);
router.post('/rooms/create', requireAuth, requirePermission('room.manage'), roomController.createRoom);
router.post('/rooms/:id/edit', requireAuth, requirePermission('room.manage'), roomController.updateRoom);
router.post('/rooms/:id/toggle', requireAuth, requirePermission('room.manage'), roomController.toggleRoom);
router.post('/rooms/:id/delete', requireAuth, requirePermission('room.manage'), roomController.deleteRoom);

router.post('/bookings',
  requireAuth,
  requirePermission('booking.create'),
  upload.single('agenda_file'),
  verifyFileSignature,
  bookingController.createBooking
);

router.post('/bookings/:id/cancel',
  requireAuth,
  requirePermission('booking.cancel_own'),
  bookingController.cancelBooking
);

router.post('/bookings/clear-history',
  requireAuth,
  requirePermission('booking.read_own'),
  bookingController.clearBookingHistory
);

router.post('/bookings/:id/delete',
  requireAuth,
  requirePermission('booking.read_own'),
  bookingController.deleteBookingHistory
);

router.post('/bookings/:id/review',
  requireAuth,
  requirePermission('booking.approve'),
  bookingController.reviewBooking
);

router.post('/bookings/:id/revoke',
  requireAuth,
  requirePermission('booking.approve'),
  bookingController.revokeApproval
);

router.post('/facility/block',
  requireAuth,
  requirePermission('room.block_schedule'),
  facilityController.blockSchedule
);

router.post('/facility/checkin/:id',
  requireAuth,
  requirePermission('facility.checkin'),
  facilityController.checkinRoom
);

router.post('/facility/checkout/:id',
  requireAuth,
  requirePermission('facility.checkout'),
  upload.single('inspection_file'),
  verifyFileSignature,
  facilityController.checkoutRoom
);

router.get('/files/:id',
  requireAuth,
  requirePermission('file.view'),
  fileController.getFile
);

module.exports = router;

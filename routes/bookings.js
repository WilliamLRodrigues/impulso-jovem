const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  createBooking, 
  getAllBookings, 
  getBookingById, 
  updateBooking,
  acceptBooking,
  getPendingBookingsForOng,
  getPendingBookingsForJovem,
  getAvailableSlots,
  getAvailableServicesForClient,
  acceptBookingByJovem,
  rejectBookingByJovem,
  generateCheckInPin,
  validateCheckInPin,
  completeServiceByClient,
  cancelBookingByClient,
  rescheduleBookingByClient
} = require('../controllers/bookingController');

router.post('/', authenticateToken, createBooking);
router.get('/', authenticateToken, getAllBookings);
router.get('/available-services', authenticateToken, getAvailableServicesForClient);
router.get('/available-slots', authenticateToken, getAvailableSlots);
router.get('/:id', authenticateToken, getBookingById);
router.put('/:id', authenticateToken, updateBooking);
router.post('/:id/accept', authenticateToken, acceptBooking);
router.post('/:id/accept-jovem', authenticateToken, acceptBookingByJovem);
router.post('/:id/reject-jovem', authenticateToken, rejectBookingByJovem);
router.post('/:id/generate-pin', authenticateToken, generateCheckInPin);
router.post('/:id/validate-pin', authenticateToken, validateCheckInPin);
router.post('/:id/complete', authenticateToken, completeServiceByClient);
router.post('/:id/cancel-client', authenticateToken, cancelBookingByClient);
router.post('/:id/reschedule-client', authenticateToken, rescheduleBookingByClient);
router.get('/pending/ong/:ongId', authenticateToken, getPendingBookingsForOng);
router.get('/pending/jovem/:jovemId', authenticateToken, getPendingBookingsForJovem);

module.exports = router;

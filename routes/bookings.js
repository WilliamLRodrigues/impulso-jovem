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
  getPendingBookingsForJovem
} = require('../controllers/bookingController');

router.post('/', authenticateToken, createBooking);
router.get('/', authenticateToken, getAllBookings);
router.get('/:id', authenticateToken, getBookingById);
router.put('/:id', authenticateToken, updateBooking);
router.post('/:id/accept', authenticateToken, acceptBooking);
router.get('/pending/ong/:ongId', authenticateToken, getPendingBookingsForOng);
router.get('/pending/jovem/:jovemId', authenticateToken, getPendingBookingsForJovem);

module.exports = router;

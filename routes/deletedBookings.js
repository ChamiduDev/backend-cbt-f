const express = require('express');
const router = express.Router();
const { getDeletedBookings, getDeletedBooking, getDeletedBookingsStats } = require('../controllers/deletedBookingController');
const { protect, authorize } = require('../middleware/auth');

// @route    GET api/deleted-bookings
// @desc     Get all deleted bookings (Admin only)
// @access   Private (Admin)
router.get('/', protect, authorize('admin'), getDeletedBookings);

// @route    GET api/deleted-bookings/stats
// @desc     Get deleted bookings statistics (Admin only)
// @access   Private (Admin)
router.get('/stats', protect, authorize('admin'), getDeletedBookingsStats);

// @route    GET api/deleted-bookings/:id
// @desc     Get a specific deleted booking (Admin only)
// @access   Private (Admin)
router.get('/:id', protect, authorize('admin'), getDeletedBooking);

module.exports = router;

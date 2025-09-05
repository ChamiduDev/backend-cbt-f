const express = require('express');
const router = express.Router();
const { createBooking, getBookings, updateBookingStatus, deleteBooking, acceptBooking, cancelBooking, rejectRide, startRide, finishRide, getRideHistory, getFinishedRides, getOnTheWayRides } = require('../controllers/bookingController');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

// @route    POST api/bookings
// @desc     Create a new booking
// @access   Private (Hotel/Broker/Admin)
router.post('/', auth, createBooking);

// @route    GET api/bookings
// @desc     Get all bookings (Admin only) or user's bookings (Hotel/Broker/Rider)
// @access   Private
router.get('/', auth, getBookings);

// @route    GET api/bookings/history
// @desc     Get ride history for riders (completed rides)
// @access   Private (Rider only)
router.get('/history', auth, getRideHistory);

// @route    GET api/bookings/finished
// @desc     Get all finished rides (Admin only)
// @access   Private (Admin only)
router.get('/finished', auth, admin, getFinishedRides);

// @route    GET api/bookings/on-the-way
// @desc     Get all on-the-way rides (Admin only)
// @access   Private (Admin only)
router.get('/on-the-way', auth, admin, getOnTheWayRides);

// @route    PUT api/bookings/:id/status
// @desc     Update booking status (Admin only)
// @access   Private (Admin)
router.put('/:id/status', auth, admin, updateBookingStatus);

// @route    PUT api/bookings/:id/accept
// @desc     Accept a booking (Rider)
// @access   Private (Rider)
router.put('/:id/accept', auth, acceptBooking);

// @route    DELETE api/bookings/:id
// @desc     Delete a booking (Admin/Hotel/Broker can delete their own bookings)
// @access   Private
router.delete('/:id', auth, deleteBooking);

// @route    PUT api/bookings/:id/cancel
// @desc     Cancel a booking
// @access   Private
router.put('/:id/cancel', auth, cancelBooking);

// @route    PUT api/bookings/:id/reject
// @desc     Reject a ride (Rider)
// @access   Private (Rider)
router.put('/:id/reject', auth, rejectRide);

// @route    PUT api/bookings/:id/start
// @desc     Start a ride (Rider)
// @access   Private (Rider)
router.put('/:id/start', auth, startRide);

// @desc     Finish a ride (Rider)
// @access   Private (Rider)
router.put('/:id/finish', auth, finishRide);

module.exports = router;

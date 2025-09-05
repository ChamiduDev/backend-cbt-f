const express = require('express');
const router = express.Router();
const { getOverdueRides, getOverdueStats } = require('../controllers/overdueRidesController');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

// @route    GET api/overdue-rides
// @desc     Get all overdue rides (Admin only)
// @access   Private (Admin only)
router.get('/', auth, admin, getOverdueRides);

// @route    GET api/overdue-rides/stats
// @desc     Get overdue rides statistics (Admin only)
// @access   Private (Admin only)
router.get('/stats', auth, admin, getOverdueStats);

module.exports = router;

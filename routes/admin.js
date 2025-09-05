const express = require('express');
const router = express.Router();
const { getAllUsers, approveUser, blockUser, rejectUser, getVehicleStatusCounts, getAllVehicleStatuses, getRiderCommissionSummary, getCommissionAnalytics, getHotelCommissionAnalytics, getRevenueAnalytics, getDashboardAnalytics } = require('../controllers/adminController');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

router.get('/users', auth, admin, getAllUsers);
router.put('/approve-user/:userId', auth, admin, approveUser);
router.put('/block-user/:userId', auth, admin, blockUser);
router.delete('/reject-user/:userId', auth, admin, rejectUser);

// Vehicle Status Routes
router.get('/vehicle-status/counts', auth, admin, getVehicleStatusCounts);
router.get('/vehicle-status', auth, admin, getAllVehicleStatuses);

// Rider Commission Summary Route
router.get('/rider-commission-summary/:riderId', auth, admin, getRiderCommissionSummary);

// Commission Analytics Route
router.get('/commission-analytics', auth, admin, getCommissionAnalytics);
router.get('/hotel-commission-analytics', auth, admin, getHotelCommissionAnalytics);

// Revenue Analytics Route
router.get('/revenue-analytics', auth, admin, getRevenueAnalytics);

// Dashboard Analytics Route
router.get('/dashboard-analytics', auth, admin, getDashboardAnalytics);

module.exports = router;
const express = require('express');
const router = express.Router();
const rideLimitController = require('../controllers/bidLimitController');
const { protect, authorize } = require('../middleware/auth');

// Test endpoint to check if bid limits API is working
router.get('/test', (req, res) => {
  res.json({ message: 'Bid limits API is working!', timestamp: new Date().toISOString() });
});

// Admin routes
router.get('/global', protect, authorize('admin'), rideLimitController.getGlobalRideLimit);
router.put('/global', protect, authorize('admin'), rideLimitController.updateGlobalRideLimit);
router.post('/reset-daily', protect, authorize('admin'), rideLimitController.resetDailyUsage);
router.post('/reset-all', protect, authorize('admin'), rideLimitController.resetAllDailyUsage);

// Rider routes
router.get('/rider/:riderId', protect, rideLimitController.getRiderRideLimit);
router.get('/check/:riderId', protect, rideLimitController.checkRideEligibility);
router.post('/increment', protect, rideLimitController.incrementRideCount);

// Backward compatibility routes
router.get('/bid-check/:riderId', protect, rideLimitController.checkBidEligibility);
router.post('/bid-increment', protect, rideLimitController.incrementBidCount);

module.exports = router;

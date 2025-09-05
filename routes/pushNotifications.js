const express = require('express');
const router = express.Router();
const {
  sendNotificationToRole,
  sendNotificationToUsers,
  sendNotificationToUser,
  sendNotificationToAll,
  getUserStats,
  getUsers,
  testNotification
} = require('../controllers/pushNotificationController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Send notification to users by role
router.post('/send-to-role', sendNotificationToRole);

// Send notification to specific users
router.post('/send-to-users', sendNotificationToUsers);

// Send notification to a specific user
router.post('/send-to-user', sendNotificationToUser);

// Send notification to all users
router.post('/send-to-all', sendNotificationToAll);

// Get user statistics for targeting
router.get('/user-stats', getUserStats);

// Get list of users for targeting
router.get('/users', getUsers);

// Test notification endpoint
router.post('/test', testNotification);

module.exports = router;

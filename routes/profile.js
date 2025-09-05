const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/profileController');

// Get admin profile
router.get('/profile', protect, adminMiddleware, getProfile);

// Update admin profile
router.put('/profile', protect, adminMiddleware, updateProfile);

// Change admin password
router.put('/change-password', protect, adminMiddleware, changePassword);

module.exports = router;

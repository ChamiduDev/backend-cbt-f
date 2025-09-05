const express = require('express');
const router = express.Router();
const { 
  getRejectReasons, 
  createRejectReason, 
  updateRejectReason, 
  toggleRejectReasonStatus, 
  deleteRejectReason,
  getActiveRejectReasons,
  incrementUsageCount
} = require('../controllers/rejectReasonController');
const auth = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

// @route    GET api/reject-reasons
// @desc     Get all reject reasons (Admin only)
// @access   Private (Admin)
router.get('/', auth, admin, getRejectReasons);

// @route    POST api/reject-reasons
// @desc     Create a new reject reason (Admin only)
// @access   Private (Admin)
router.post('/', auth, admin, createRejectReason);

// @route    PUT api/reject-reasons/:id
// @desc     Update a reject reason (Admin only)
// @access   Private (Admin)
router.put('/:id', auth, admin, updateRejectReason);

// @route    PUT api/reject-reasons/:id/toggle
// @desc     Toggle active status of a reject reason (Admin only)
// @access   Private (Admin)
router.put('/:id/toggle', auth, admin, toggleRejectReasonStatus);

// @route    DELETE api/reject-reasons/:id
// @desc     Delete a reject reason (Admin only)
// @access   Private (Admin)
router.delete('/:id', auth, admin, deleteRejectReason);

// @route    GET api/reject-reasons/active
// @desc     Get all active reject reasons (for riders to select from)
// @access   Private (Rider)
router.get('/active', auth, getActiveRejectReasons);

// @route    PUT api/reject-reasons/:id/increment-usage
// @desc     Increment usage count when reason is used (System use)
// @access   Private (System)
router.put('/:id/increment-usage', auth, incrementUsageCount);

module.exports = router;


const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const HotelBrokerCommissionService = require('../services/hotelBrokerCommissionService');

// @route   GET /api/hotel-broker-commission/summary
// @desc    Get commission summary for current user
// @access  Private (Hotel/Broker)
router.get('/summary', auth, async (req, res) => {
  try {
    // Check if user is hotel or broker
    if (!['hotel', 'broker'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Only hotels and brokers can access this endpoint.' });
    }

    const summary = await HotelBrokerCommissionService.getCommissionSummary(req.user.id);
    
    res.json({
      totalCommission: summary.totalCommission,
      totalBookings: summary.totalBookings,
      completedBookings: summary.completedBookings,
      totalAmount: summary.totalAmount,
      receivedAmount: summary.receivedAmount,
      pendingAmount: summary.pendingAmount,
      lastUpdated: summary.lastUpdated
    });
  } catch (error) {
    console.error('Error fetching commission summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/hotel-broker-commission/update
// @desc    Manually update commission summary for current user
// @access  Private (Hotel/Broker)
router.post('/update', auth, async (req, res) => {
  try {
    // Check if user is hotel or broker
    if (!['hotel', 'broker'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Only hotels and brokers can access this endpoint.' });
    }

    const summary = await HotelBrokerCommissionService.updateCommissionSummary(req.user.id);
    
    res.json({
      message: 'Commission summary updated successfully',
      totalCommission: summary.totalCommission,
      totalBookings: summary.totalBookings,
      completedBookings: summary.completedBookings,
      totalAmount: summary.totalAmount,
      receivedAmount: summary.receivedAmount,
      pendingAmount: summary.pendingAmount,
      lastUpdated: summary.lastUpdated
    });
  } catch (error) {
    console.error('Error updating commission summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/hotel-broker-commission/all
// @desc    Get all commission summaries (Admin only)
// @access  Private (Admin)
router.get('/all', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const HotelBrokerCommissionSummary = require('../models/HotelBrokerCommissionSummary');
    const summaries = await HotelBrokerCommissionSummary.find()
      .populate('user', 'fullName email role')
      .sort({ lastUpdated: -1 });
    
    res.json(summaries);
  } catch (error) {
    console.error('Error fetching all commission summaries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/hotel-broker-commission/update-all
// @desc    Update all commission summaries (Admin only)
// @access  Private (Admin)
router.post('/update-all', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    await HotelBrokerCommissionService.updateAllCommissionSummaries();
    
    res.json({ message: 'All commission summaries updated successfully' });
  } catch (error) {
    console.error('Error updating all commission summaries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

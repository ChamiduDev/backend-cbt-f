const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const HotelBrokerPayment = require('../models/HotelBrokerPayment');
const HotelBrokerCommissionService = require('../services/hotelBrokerCommissionService');

// @route   GET /api/hotel-broker-payments
// @desc    Get all hotel/broker payments (Admin only)
// @access  Private (Admin)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const payments = await HotelBrokerPayment.find()
      .populate('user', 'fullName email role')
      .populate('paidBy', 'fullName email')
      .populate('relatedBookings', 'pickupDate totalAmount commission status')
      .sort({ paidAt: -1 });
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching hotel/broker payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/hotel-broker-payments/user/:userId
// @desc    Get payments for a specific hotel/broker
// @access  Private (Admin)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { userId } = req.params;
    const payments = await HotelBrokerPayment.find({ user: userId })
      .populate('user', 'fullName email role')
      .populate('paidBy', 'fullName email')
      .populate('relatedBookings', 'pickupDate totalAmount commission status')
      .sort({ paidAt: -1 });
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching user payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/hotel-broker-payments/summary/:userId
// @desc    Get payment summary for a specific hotel/broker
// @access  Private (Admin)
router.get('/summary/:userId', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { userId } = req.params;
    
    // Get total payments
    const mongoose = require('mongoose');
    const totalPayments = await HotelBrokerPayment.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalPaidAmount = totalPayments.length > 0 ? totalPayments[0].total : 0;
    
    // Get commission summary
    const commissionSummary = await HotelBrokerCommissionService.getCommissionSummary(userId);
    
    // Debug logging
    console.log('Hotel/Broker Commission Summary Debug:', {
      userId,
      totalCommission: commissionSummary.totalCommission,
      totalPaidAmount,
      pendingAmount: commissionSummary.pendingAmount,
      receivedAmount: commissionSummary.receivedAmount,
      totalPayments: await HotelBrokerPayment.countDocuments({ user: userId, status: 'completed' })
    });
    
    res.json({
      totalCommission: commissionSummary.totalCommission,
      totalPaidAmount,
      pendingAmount: commissionSummary.pendingAmount,
      totalPayments: await HotelBrokerPayment.countDocuments({ user: userId, status: 'completed' })
    });
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/hotel-broker-payments
// @desc    Create a new payment for hotel/broker
// @access  Private (Admin)
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { userId, amount, paymentType, description, relatedBookings } = req.body;

    // Validate required fields
    if (!userId || !amount) {
      return res.status(400).json({ message: 'User ID and amount are required' });
    }

    // Create new payment
    const payment = new HotelBrokerPayment({
      user: userId,
      amount: parseFloat(amount),
      paymentType: paymentType || 'commission_payment',
      description: description || '',
      status: 'completed',
      paidBy: req.user.id,
      relatedBookings: relatedBookings || []
    });

    await payment.save();

    // Update commission summary
    await HotelBrokerCommissionService.updateCommissionOnPayment(userId, parseFloat(amount));
    
    // Force refresh the commission summary to ensure it's up to date
    await HotelBrokerCommissionService.updateCommissionSummary(userId);

    // Populate the response
    await payment.populate([
      { path: 'user', select: 'fullName email role' },
      { path: 'paidBy', select: 'fullName email' },
      { path: 'relatedBookings', select: 'pickupDate totalAmount commission status' }
    ]);

    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/hotel-broker-payments/:paymentId
// @desc    Update a payment
// @access  Private (Admin)
router.put('/:paymentId', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { paymentId } = req.params;
    const { userId, amount, paymentType, description, status } = req.body;

    const payment = await HotelBrokerPayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Store original values for commission calculation
    const originalAmount = payment.amount;
    const originalUserId = payment.user;

    // Update fields if provided
    if (userId) payment.user = userId;
    if (amount !== undefined) payment.amount = amount;
    if (paymentType) payment.paymentType = paymentType;
    if (description !== undefined) payment.description = description;
    if (status) payment.status = status;

    await payment.save();

    // Update commission summary if amount or user changed
    if (amount !== undefined && amount !== originalAmount) {
      // Remove original payment amount
      await HotelBrokerCommissionService.updateCommissionOnPayment(originalUserId, -originalAmount);
      // Add new payment amount
      await HotelBrokerCommissionService.updateCommissionOnPayment(payment.user, amount);
    } else if (userId && userId !== originalUserId) {
      // User changed, update both users' commission
      await HotelBrokerCommissionService.updateCommissionOnPayment(originalUserId, -originalAmount);
      await HotelBrokerCommissionService.updateCommissionOnPayment(userId, payment.amount);
    }

    await payment.populate([
      { path: 'user', select: 'fullName email role' },
      { path: 'paidBy', select: 'fullName email' },
      { path: 'relatedBookings', select: 'pickupDate totalAmount commission status' }
    ]);

    res.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/hotel-broker-payments/:paymentId
// @desc    Delete a payment
// @access  Private (Admin)
router.delete('/:paymentId', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }

    const { paymentId } = req.params;

    const payment = await HotelBrokerPayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const userId = payment.user;
    const amount = payment.amount;
    
    await HotelBrokerPayment.findByIdAndDelete(paymentId);

    // Update commission summary after payment deletion
    await HotelBrokerCommissionService.updateCommissionOnPayment(userId, -amount);

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


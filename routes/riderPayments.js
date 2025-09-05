const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const RiderPayment = require('../models/RiderPayment');
const User = require('../models/User');
const Booking = require('../models/Booking');
const AppCommission = require('../models/AppCommission');
const EarningsService = require('../services/earningsService');
const auth = require('../middleware/authMiddleware');

// Get all rider payments
router.get('/', auth, async (req, res) => {
  try {
    const payments = await RiderPayment.find()
      .populate('rider', 'fullName email phone')
      .populate('paidBy', 'fullName email')
      .populate('relatedBookings', 'pickupDate totalAmount commission status')
      .sort({ paidAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching rider payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get rider commission summary
router.get('/rider/summary', auth, async (req, res) => {
  try {
    const riderId = req.user.id; // Get current user's ID (the rider themselves)
    
    // Get pre-calculated earnings summary
    const earningsSummary = await EarningsService.getRiderEarningsSummary(riderId);

    // Debug logging
    console.log('Rider Payment Summary Debug:', {
      riderId,
      totalEarnings: earningsSummary.totalEarnings,
      totalCommission: earningsSummary.totalCommission,
      totalHotelCommission: earningsSummary.totalHotelCommission,
      totalAppCommission: earningsSummary.totalAppCommission,
      paidAmount: earningsSummary.totalPaidCommission,
      pendingAmount: earningsSummary.pendingCommission,
      completedRides: earningsSummary.totalRides,
      lastUpdated: earningsSummary.lastUpdated
    });

    res.json({
      totalEarnings: earningsSummary.totalEarnings,
      totalCommission: earningsSummary.totalCommission,
      totalHotelCommission: earningsSummary.totalHotelCommission,
      totalAppCommission: earningsSummary.totalAppCommission,
      paidAmount: earningsSummary.totalPaidCommission,
      pendingAmount: earningsSummary.pendingCommission,
      completedRides: earningsSummary.totalRides,
      lastUpdated: earningsSummary.lastUpdated
    });
  } catch (error) {
    console.error('Error fetching rider commission summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payments for a specific rider
router.get('/rider/:riderId', auth, async (req, res) => {
  try {
    const { riderId } = req.params;
    
    const payments = await RiderPayment.find({ rider: riderId })
      .populate('rider', 'fullName email phone')
      .populate('paidBy', 'fullName email')
      .populate('relatedBookings', 'pickupDate totalAmount commission status')
      .sort({ paidAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching rider payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new payment
router.post('/', auth, async (req, res) => {
  try {
    const { riderId, amount, paymentType, description, relatedBookings } = req.body;

    // Validate required fields
    if (!riderId || !amount) {
      return res.status(400).json({ message: 'Rider ID and amount are required' });
    }

    // Check if rider exists
    const rider = await User.findById(riderId);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    // Create the payment record
    const payment = new RiderPayment({
      rider: riderId,
      amount: parseFloat(amount),
      paymentType: paymentType || 'commission_payment',
      description: description || '',
      paidBy: req.user.id,
      relatedBookings: relatedBookings || [],
      status: 'completed'
    });

    await payment.save();

    // Update rider earnings summary
    try {
      await EarningsService.updateEarningsOnPayment(riderId, parseFloat(amount));
      // Force refresh the earnings summary to ensure it's up to date
      await EarningsService.updateRiderEarningsSummary(riderId);
      console.log(`Updated earnings summary for rider ${riderId} after payment of ${amount}`);
    } catch (earningsError) {
      console.error('Error updating earnings summary on payment:', earningsError);
      // Don't fail the payment creation if earnings update fails
    }

    // Populate the response
    await payment.populate([
      { path: 'rider', select: 'fullName email phone' },
      { path: 'paidBy', select: 'fullName email' },
      { path: 'relatedBookings', select: 'pickupDate totalAmount commission status' }
    ]);

    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating rider payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment
router.put('/:paymentId', auth, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { riderId, amount, paymentType, description, status } = req.body;

    const payment = await RiderPayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Store original amount for earnings calculation
    const originalAmount = payment.amount;
    const originalRiderId = payment.rider;

    // Update fields if provided
    if (riderId) payment.rider = riderId;
    if (amount !== undefined) payment.amount = amount;
    if (paymentType) payment.paymentType = paymentType;
    if (description !== undefined) payment.description = description;
    if (status) payment.status = status;

    await payment.save();

    // Update earnings summary if amount or rider changed
    if (amount !== undefined && amount !== originalAmount) {
      // Remove original payment amount
      await EarningsService.updateEarningsOnPayment(originalRiderId, -originalAmount);
      // Add new payment amount
      await EarningsService.updateEarningsOnPayment(payment.rider, amount);
    } else if (riderId && riderId !== originalRiderId) {
      // Rider changed, update both riders' earnings
      await EarningsService.updateEarningsOnPayment(originalRiderId, -originalAmount);
      await EarningsService.updateEarningsOnPayment(riderId, payment.amount);
    }

    await payment.populate([
      { path: 'rider', select: 'fullName email phone' },
      { path: 'paidBy', select: 'fullName email' },
      { path: 'relatedBookings', select: 'pickupDate totalAmount commission status' }
    ]);

    res.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete payment
router.delete('/:paymentId', auth, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await RiderPayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const riderId = payment.rider;
    await RiderPayment.findByIdAndDelete(paymentId);

    // Update earnings summary after payment deletion
    await EarningsService.updateEarningsOnPayment(riderId, -payment.amount);

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

const HotelBrokerCommissionSummary = require('../models/HotelBrokerCommissionSummary');
const HotelBrokerPayment = require('../models/HotelBrokerPayment');
const Booking = require('../models/Booking');

const mongoose = require('mongoose');

class HotelBrokerCommissionService {
  /**
   * Calculate and update commission summary for a specific hotel/broker
   * @param {string} userId - The hotel/broker's ID
   */
  static async updateCommissionSummary(userId) {
    try {
      console.log(`Updating commission summary for hotel/broker: ${userId}`);
      
      // Get all bookings for the hotel/broker
      const allBookings = await Booking.find({
        user: userId
      }).sort({ createdAt: -1 });

      // Get completed bookings for commission calculation
      const completedBookings = await Booking.find({
        user: userId,
        status: 'completed'
      }).sort({ completedAt: -1 });

      // Calculate totals
      let totalCommission = 0;
      let totalAmount = 0;

      for (const booking of completedBookings) {
        const bookingCommission = booking.commission || 0;
        const bookingTotal = booking.totalAmount || 0;
        
        totalCommission += bookingCommission;
        totalAmount += bookingTotal;
      }

      // Get total payments received
      const totalPayments = await HotelBrokerPayment.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const receivedAmount = totalPayments.length > 0 ? totalPayments[0].total : 0;
      const pendingAmount = totalCommission - receivedAmount;
      
      // Debug logging
      console.log('Commission Summary Calculation Debug:', {
        userId,
        totalCommission,
        receivedAmount,
        pendingAmount,
        totalPaymentsCount: totalPayments.length
      });

      // Get the latest booking ID for tracking
      const lastBookingId = allBookings.length > 0 ? allBookings[0]._id : null;

      // Update or create the commission summary
      const commissionSummary = await HotelBrokerCommissionSummary.findOneAndUpdate(
        { user: userId },
        {
          totalCommission,
          totalBookings: allBookings.length,
          completedBookings: completedBookings.length,
          totalAmount,
          receivedAmount,
          pendingAmount,
          lastUpdated: new Date(),
          lastBookingId
        },
        { 
          upsert: true, 
          new: true,
          runValidators: true
        }
      );

      console.log(`Updated commission summary for hotel/broker ${userId}:`,
        {
          totalCommission,
          totalBookings: allBookings.length,
          completedBookings: completedBookings.length,
          totalAmount,
          receivedAmount,
          pendingAmount
        });

      return commissionSummary;
    } catch (error) {
      console.error('Error updating commission summary:', error);
      throw error;
    }
  }

  /**
   * Get commission summary for a specific hotel/broker
   * @param {string} userId - The hotel/broker's ID
   */
  static async getCommissionSummary(userId) {
    try {
      let summary = await HotelBrokerCommissionSummary.findOne({ user: userId });
      
      if (!summary) {
        // If no summary exists, create one
        summary = await this.updateCommissionSummary(userId);
      }
      
      return summary;
    } catch (error) {
      console.error('Error getting commission summary:', error);
      throw error;
    }
  }

  /**
   * Update commission summary when a booking is completed
   * @param {string} userId - The hotel/broker's ID
   * @param {string} bookingId - The completed booking ID
   */
  static async updateCommissionOnBookingCompletion(userId, bookingId) {
    try {
      console.log(`Updating commission summary for booking completion: ${bookingId}`);
      await this.updateCommissionSummary(userId);
    } catch (error) {
      console.error('Error updating commission on booking completion:', error);
      throw error;
    }
  }

  /**
   * Update commission summary when a payment is made
   * @param {string} userId - The hotel/broker's ID
   * @param {number} paymentAmount - The payment amount
   */
  static async updateCommissionOnPayment(userId, paymentAmount) {
    try {
      console.log(`Updating commission summary for payment: ${paymentAmount} to user: ${userId}`);
      await this.updateCommissionSummary(userId);
    } catch (error) {
      console.error('Error updating commission on payment:', error);
      throw error;
    }
  }

  /**
   * Update all hotel/broker commission summaries
   */
  static async updateAllCommissionSummaries() {
    try {
      console.log('Updating all hotel/broker commission summaries...');
      
      // Get all users with hotel or broker role
      const User = require('../models/User');
      const hotelBrokers = await User.find({ 
        role: { $in: ['hotel', 'broker'] } 
      });

      for (const user of hotelBrokers) {
        await this.updateCommissionSummary(user._id);
      }

      console.log(`Updated commission summaries for ${hotelBrokers.length} hotel/brokers`);
    } catch (error) {
      console.error('Error updating all commission summaries:', error);
      throw error;
    }
  }
}

module.exports = HotelBrokerCommissionService;

const RiderEarningsSummary = require('../models/RiderEarningsSummary');
const Booking = require('../models/Booking');
const AppCommission = require('../models/AppCommission');
const RiderPayment = require('../models/RiderPayment');
const Bid = require('../models/Bid');
const mongoose = require('mongoose');

class EarningsService {
  /**
   * Calculate and update earnings summary for a specific rider
   * @param {string} riderId - The rider's ID
   */
  static async updateRiderEarningsSummary(riderId) {
    try {
      console.log(`Updating earnings summary for rider: ${riderId}`);
      
      // Get completed bookings for the rider where they were confirmed (accepted bid)
      const completedBookings = await Booking.find({
        rider: riderId,
        status: 'completed',
        confirmedBid: { $exists: true, $ne: null } // Only include bookings where a bid was confirmed
      }).sort({ completedAt: -1 });

      // Get app commission settings
      const appCommissionSettings = await AppCommission.findOne();
      const appCommissionType = appCommissionSettings?.type || 'percentage';
      const appCommissionValue = appCommissionSettings?.value || 10;

      // Calculate totals
      let totalEarnings = 0;
      let totalCommission = 0;
      let totalHotelCommission = 0;
      let totalAppCommission = 0;
      let totalBidAmount = 0;

      for (const booking of completedBookings) {
        // Get the confirmed bid for this booking
        const confirmedBid = await Bid.findById(booking.confirmedBid);
        if (!confirmedBid) {
          console.log(`No confirmed bid found for booking ${booking._id}, skipping...`);
          continue;
        }
        
        const bidAmount = confirmedBid.bidAmount || 0;
        const hotelCommission = booking.commission || 0;
        
        // Calculate app commission based on bid amount
        let appCommission = 0;
        if (appCommissionType === 'percentage') {
          appCommission = bidAmount * (appCommissionValue / 100);
        } else {
          appCommission = appCommissionValue;
        }
        
        // Calculate rider earnings (bid amount - hotel commission - app commission)
        const riderEarnings = bidAmount - hotelCommission - appCommission;
        
        totalBidAmount += bidAmount;
        totalEarnings += riderEarnings;
        totalHotelCommission += hotelCommission;
        totalAppCommission += appCommission;
        totalCommission += hotelCommission + appCommission;
      }

      // Get total payments made to this rider
      const totalPayments = await RiderPayment.aggregate([
        { $match: { rider: new mongoose.Types.ObjectId(riderId), status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const totalPaidCommission = totalPayments.length > 0 ? totalPayments[0].total : 0;
      const pendingCommission = totalCommission - totalPaidCommission;

      // Get the latest booking ID for tracking
      const lastBookingId = completedBookings.length > 0 ? completedBookings[0]._id : null;

      // Update or create the earnings summary
      const earningsSummary = await RiderEarningsSummary.findOneAndUpdate(
        { rider: riderId },
        {
          totalBidAmount,
          totalEarnings,
          totalCommission,
          totalHotelCommission,
          totalAppCommission,
          totalPaidCommission,
          pendingCommission,
          totalRides: completedBookings.length,
          lastUpdated: new Date(),
          lastBookingId
        },
        { 
          upsert: true, 
          new: true,
          runValidators: true
        }
      );

      console.log(`Updated earnings summary for rider ${riderId}:`, {
        totalEarnings,
        totalCommission,
        totalPaidCommission,
        pendingCommission,
        totalRides: completedBookings.length
      });

      return earningsSummary;
    } catch (error) {
      console.error(`Error updating earnings summary for rider ${riderId}:`, error);
      throw error;
    }
  }

  /**
   * Update earnings summary when a payment is made
   * @param {string} riderId - The rider's ID
   * @param {number} paymentAmount - The payment amount
   */
  static async updateEarningsOnPayment(riderId, paymentAmount) {
    try {
      const summary = await RiderEarningsSummary.findOne({ rider: riderId });
      if (summary) {
        summary.totalPaidCommission += paymentAmount;
        summary.pendingCommission = summary.totalCommission - summary.totalPaidCommission;
        summary.lastUpdated = new Date();
        await summary.save();
        
        console.log(`Updated earnings summary for rider ${riderId} after payment of ${paymentAmount}`);
      }
    } catch (error) {
      console.error(`Error updating earnings on payment for rider ${riderId}:`, error);
      throw error;
    }
  }

  /**
   * Get earnings summary for a rider
   * @param {string} riderId - The rider's ID
   */
  static async getRiderEarningsSummary(riderId) {
    try {
      let summary = await RiderEarningsSummary.findOne({ rider: riderId });
      
      // If no summary exists, create one
      if (!summary) {
        summary = await this.updateRiderEarningsSummary(riderId);
      }
      
      return summary;
    } catch (error) {
      console.error(`Error getting earnings summary for rider ${riderId}:`, error);
      throw error;
    }
  }

  /**
   * Update all riders' earnings summaries (for maintenance)
   */
  static async updateAllRidersEarnings() {
    try {
      const User = require('../models/User');
      const riders = await User.find({ role: 'ride' });
      
      console.log(`Updating earnings summaries for ${riders.length} riders`);
      
      for (const rider of riders) {
        await this.updateRiderEarningsSummary(rider._id);
      }
      
      console.log('Completed updating all riders earnings summaries');
    } catch (error) {
      console.error('Error updating all riders earnings:', error);
      throw error;
    }
  }
}

module.exports = EarningsService;


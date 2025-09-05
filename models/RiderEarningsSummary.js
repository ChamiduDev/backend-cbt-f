const mongoose = require('mongoose');

const riderEarningsSummarySchema = new mongoose.Schema({
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalBidAmount: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalCommission: {
    type: Number,
    default: 0
  },
  totalHotelCommission: {
    type: Number,
    default: 0
  },
  totalAppCommission: {
    type: Number,
    default: 0
  },
  totalPaidCommission: {
    type: Number,
    default: 0
  },
  pendingCommission: {
    type: Number,
    default: 0
  },
  totalRides: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }
}, {
  timestamps: true
});

// Index for faster queries
riderEarningsSummarySchema.index({ rider: 1 });
riderEarningsSummarySchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('RiderEarningsSummary', riderEarningsSummarySchema);


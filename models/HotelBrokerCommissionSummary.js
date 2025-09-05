const mongoose = require('mongoose');

const hotelBrokerCommissionSummarySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalCommission: {
    type: Number,
    default: 0
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  completedBookings: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  receivedAmount: {
    type: Number,
    default: 0
  },
  pendingAmount: {
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
hotelBrokerCommissionSummarySchema.index({ user: 1 });
hotelBrokerCommissionSummarySchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('HotelBrokerCommissionSummary', hotelBrokerCommissionSummarySchema);

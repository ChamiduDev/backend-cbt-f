const mongoose = require('mongoose');

const hotelBrokerPaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentType: {
    type: String,
    enum: ['commission_payment', 'bonus', 'adjustment'],
    default: 'commission_payment'
  },
  description: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  relatedBookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  paidAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
hotelBrokerPaymentSchema.index({ user: 1 });
hotelBrokerPaymentSchema.index({ paidAt: -1 });
hotelBrokerPaymentSchema.index({ status: 1 });

module.exports = mongoose.model('HotelBrokerPayment', hotelBrokerPaymentSchema);


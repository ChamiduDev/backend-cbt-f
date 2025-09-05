const mongoose = require('mongoose');

const riderPaymentSchema = new mongoose.Schema({
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentType: {
    type: String,
    enum: ['commission_payment', 'bonus', 'adjustment'],
    default: 'commission_payment',
  },
  description: {
    type: String,
    required: false,
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // Admin who made the payment
  },
  paidAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed',
  },
  relatedBookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('RiderPayment', riderPaymentSchema);


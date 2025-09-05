const mongoose = require('mongoose');

const BidSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bidAmount: {
    type: Number,
    required: true,
  },
  commissionRate: {
    type: Number,
    required: true,
  },
  riderIncome: {
    type: Number,
    required: true,
  },
  selectedVehicle: {
    model: { type: String, required: true },
    number: { type: String, required: true },
    year: { type: Number, required: true },
    totalPassengers: { type: Number, required: true },
    category: { type: String, required: true },
    location: {
      city_id: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
      sub_area_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SubArea', required: true },
    },
  },
  status: {
    type: String,
    enum: ['pending', 'pending_confirmation', 'accepted', 'rejected'],
    default: 'pending',
  },
  rejectionReason: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Bid', BidSchema);

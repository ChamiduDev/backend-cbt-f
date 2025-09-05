const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  city_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: true,
  },
  sub_area_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubArea',
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
    required: false, // Not always required if manually entered
  },
  longitude: {
    type: Number,
    required: false, // Not always required if manually entered
  },
});

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  pickupLocation: {
    type: locationSchema,
    required: true,
  },
  destinationLocation: {
    type: locationSchema,
    required: false, // Optional
  },
  pickupDate: {
    type: Date,
    required: true,
  },
  pickupTime: {
    type: String, // Storing as string for simplicity, can be Date if needed
    required: true,
  },
  riderAmount: {
    type: Number,
    required: true,
  },
  commission: {
    type: Number,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: false,
  },
  numberOfGuests: {
    type: Number,
    required: false,
  },
  vehicleType: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'bid_placed', 'accepted', 'pending_confirmation', 'rejected', 'in_progress'],
    default: 'pending',
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  confirmedBid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bid',
  },
  rejectionReason: {
    type: String,
    required: false,
  },
  rejectedAt: {
    type: Date,
    required: false,
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  startedAt: {
    type: Date,
    required: false,
  },
  startedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  completedAt: {
    type: Date,
    required: false,
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Booking', bookingSchema);

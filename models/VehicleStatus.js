const mongoose = require('mongoose');

const VehicleStatusSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  vehicleIndex: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['waiting', 'on_the_way', 'not_available'],
    required: true,
  },
  city_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: function() {
      return this.status === 'waiting';
    },
  },
  sub_area_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubArea',
    required: function() {
      return this.status === 'waiting';
    },
  },
  fromLocation: {
    type: String,  // Keep as String to handle existing data
    required: function() {
      return this.status === 'on_the_way';
    },
  },
  toLocation: {
    type: String,  // Keep as String to handle existing data
    required: function() {
      return this.status === 'on_the_way';
    },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure only one status per vehicle per user
VehicleStatusSchema.index({ user: 1, vehicleIndex: 1 }, { unique: true });

module.exports = mongoose.model('VehicleStatus', VehicleStatusSchema); 
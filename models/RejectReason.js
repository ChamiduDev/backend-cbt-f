const mongoose = require('mongoose');

const rejectReasonSchema = new mongoose.Schema({
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    enum: [
      'General',
      'Vehicle Related',
      'Distance Related',
      'Safety Related',
      'Personal',
      'Weather',
      'Other'
    ],
    default: 'General'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
rejectReasonSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Create indexes for better query performance
rejectReasonSchema.index({ category: 1, isActive: 1 });
rejectReasonSchema.index({ reason: 'text' });

module.exports = mongoose.model('RejectReason', rejectReasonSchema);


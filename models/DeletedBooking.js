const mongoose = require('mongoose');

const deletedBookingSchema = new mongoose.Schema({
  originalBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  bookingData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  deletedBy: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
  },
  deletionReason: {
    type: String,
    required: true,
  },
  deletedAt: {
    type: Date,
    default: Date.now,
  },
  relatedBids: [{
    bidId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    riderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    riderName: {
      type: String,
      required: true,
    },
    bidAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
  }],
  restoredRiders: [{
    riderId: {
      type: String,
      required: true,
    },
    riderName: {
      type: String,
      required: true,
    },
    previousCount: {
      type: Number,
      required: true,
    },
    newCount: {
      type: Number,
      required: true,
    },
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('DeletedBooking', deletedBookingSchema);

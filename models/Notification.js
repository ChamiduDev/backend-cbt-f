const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  type: {
    type: String,
    required: true,
    enum: [
      'ride_confirmed',
      'new_booking_available', 
      'ride_started',
      'ride_rejected',
      'admin_notification',
      'general'
    ],
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed'],
    default: 'pending',
  },
  deliveryAttempts: {
    type: Number,
    default: 0,
  },
  maxDeliveryAttempts: {
    type: Number,
    default: 3,
  },
  deliveredAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Notifications expire after 24 hours
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
NotificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup

// Update the updatedAt field before saving
NotificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Notification', NotificationSchema);

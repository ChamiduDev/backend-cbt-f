const mongoose = require('mongoose');

const RideLimitSchema = new mongoose.Schema({
  // Global ride limit settings
  isGlobal: {
    type: Boolean,
    default: true,
  },
  dailyLimit: {
    type: Number,
    required: true,
    default: 10, // Default daily limit for all riders
    min: 1,
    max: 100,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Track daily usage for all riders (combined bids + accepts)
  dailyUsage: {
    type: Map,
    of: {
      ridesUsed: { type: Number, default: 0 },
      lastRideDate: { type: Date, default: Date.now },
    },
    default: new Map(),
  },
  lastResetDate: {
    type: Date,
    default: Date.now,
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

// Method to check if a rider can take a ride action (bid or accept)
RideLimitSchema.methods.canTakeRideAction = function(riderId) {
  if (!this.isActive) {
    return { canTakeAction: false, reason: 'Ride limits are currently disabled' };
  }

  const today = new Date().toDateString();
  const riderUsage = this.dailyUsage.get(riderId);
  
  // If no usage record for today, reset it
  if (!riderUsage || riderUsage.lastRideDate.toDateString() !== today) {
    this.dailyUsage.set(riderId, { ridesUsed: 0, lastRideDate: new Date() });
    this.save();
    return { canTakeAction: true, remainingRides: this.dailyLimit };
  }

  const remainingRides = this.dailyLimit - riderUsage.ridesUsed;
  
  if (remainingRides <= 0) {
    return { canTakeAction: false, reason: 'Daily ride limit reached', remainingRides: 0 };
  }

  return { canTakeAction: true, remainingRides };
};

// Method to increment ride count for a rider (bid or accept)
RideLimitSchema.methods.incrementRideCount = async function(riderId) {
  const today = new Date().toDateString();
  const riderUsage = this.dailyUsage.get(riderId);
  
  if (!riderUsage || riderUsage.lastRideDate.toDateString() !== today) {
    // Reset for new day
    this.dailyUsage.set(riderId, { ridesUsed: 1, lastRideDate: new Date() });
  } else {
    // Increment existing count
    this.dailyUsage.set(riderId, { 
      ridesUsed: riderUsage.ridesUsed + 1, 
      lastRideDate: new Date() 
    });
  }
  
  this.updatedAt = new Date();
  
  // Use findOneAndUpdate to avoid parallel save issues
  return await this.constructor.findOneAndUpdate(
    { _id: this._id },
    { 
      $set: { 
        [`dailyUsage.${riderId}`]: this.dailyUsage.get(riderId),
        updatedAt: this.updatedAt
      }
    },
    { new: true }
  );
};

// Method to get remaining rides for a rider
RideLimitSchema.methods.getRemainingRides = function(riderId) {
  const today = new Date().toDateString();
  const riderUsage = this.dailyUsage.get(riderId);
  
  if (!riderUsage || riderUsage.lastRideDate.toDateString() !== today) {
    return this.dailyLimit;
  }
  
  return Math.max(0, this.dailyLimit - riderUsage.ridesUsed);
};

// Method to reset all daily usage (run daily)
RideLimitSchema.methods.resetDailyUsage = async function() {
  this.dailyUsage.clear();
  this.lastResetDate = new Date();
  this.updatedAt = new Date();
  
  // Use findOneAndUpdate to avoid parallel save issues
  return await this.constructor.findOneAndUpdate(
    { _id: this._id },
    { 
      $set: { 
        dailyUsage: this.dailyUsage,
        lastResetDate: this.lastResetDate,
        updatedAt: this.updatedAt
      }
    },
    { new: true }
  );
};

// Static method to get or create global ride limit
RideLimitSchema.statics.getGlobalRideLimit = async function() {
  let globalLimit = await this.findOne({ isGlobal: true });
  
  if (!globalLimit) {
    globalLimit = new this({
      isGlobal: true,
      dailyLimit: 10,
      isActive: true,
    });
    await globalLimit.save();
  }
  
  return globalLimit;
};

// Backward compatibility methods
RideLimitSchema.methods.canPlaceBid = RideLimitSchema.methods.canTakeRideAction;
RideLimitSchema.methods.incrementBidCount = RideLimitSchema.methods.incrementRideCount;
RideLimitSchema.methods.getRemainingBids = RideLimitSchema.methods.getRemainingRides;
RideLimitSchema.statics.getGlobalBidLimit = RideLimitSchema.statics.getGlobalRideLimit;

module.exports = mongoose.model('RideLimit', RideLimitSchema);

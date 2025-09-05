const RideLimit = require('../models/RideLimit');
const User = require('../models/User');

// Get global ride limit settings
exports.getGlobalRideLimit = async (req, res) => {
  try {
    const globalLimit = await RideLimit.getGlobalRideLimit();
    
    // Get rider usage statistics
    const riders = await User.find({ role: 'ride' });
    const riderStats = riders.map(rider => ({
      rider: {
        _id: rider._id,
        fullName: rider.fullName,
        username: rider.username,
        email: rider.email,
        role: rider.role,
      },
      ridesUsedToday: globalLimit.dailyUsage.get(rider._id.toString())?.ridesUsed || 0,
      remainingRides: globalLimit.getRemainingRides(rider._id.toString()),
    }));

    res.json({
      success: true,
      data: {
        globalLimit: {
          _id: globalLimit._id,
          dailyLimit: globalLimit.dailyLimit,
          isActive: globalLimit.isActive,
          lastResetDate: globalLimit.lastResetDate,
          createdAt: globalLimit.createdAt,
          updatedAt: globalLimit.updatedAt,
        },
        riderStats,
      },
    });
  } catch (error) {
    console.error('Error getting global bid limit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get global bid limit',
      error: error.message,
    });
  }
};

// Update global ride limit settings
exports.updateGlobalRideLimit = async (req, res) => {
  try {
    const { dailyLimit, isActive } = req.body;
    
    if (dailyLimit < 1 || dailyLimit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Daily limit must be between 1 and 100',
      });
    }

    let globalLimit = await RideLimit.findOne({ isGlobal: true });
    
    if (!globalLimit) {
      globalLimit = new RideLimit({
        isGlobal: true,
        dailyLimit,
        isActive,
      });
    } else {
      globalLimit.dailyLimit = dailyLimit;
      globalLimit.isActive = isActive;
      globalLimit.updatedAt = new Date();
    }

    await globalLimit.save();

    res.json({
      success: true,
      message: 'Global ride limit updated successfully',
      data: globalLimit,
    });
  } catch (error) {
    console.error('Error updating global ride limit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update global ride limit',
      error: error.message,
    });
  }
};

// Reset daily usage for all riders
exports.resetDailyUsage = async (req, res) => {
  try {
    const globalLimit = await RideLimit.getGlobalRideLimit();
    await globalLimit.resetDailyUsage();

    res.json({
      success: true,
      message: 'Daily usage reset successfully for all riders',
    });
  } catch (error) {
    console.error('Error resetting daily usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset daily usage',
      error: error.message,
    });
  }
};

// Reset all daily usage and create new global limit if needed
exports.resetAllDailyUsage = async (req, res) => {
  try {
    // Delete all existing ride limits
    await RideLimit.deleteMany({});
    
    // Create a new global ride limit with default settings
    const newGlobalLimit = new RideLimit({
      isGlobal: true,
      dailyLimit: 10,
      isActive: true,
      dailyUsage: new Map(),
      lastResetDate: new Date(),
    });
    
    await newGlobalLimit.save();

    res.json({
      success: true,
      message: 'All ride limits reset successfully. New global limit created with default settings.',
      data: newGlobalLimit,
    });
  } catch (error) {
    console.error('Error resetting all ride limits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset all ride limits',
      error: error.message,
    });
  }
};

// Check if a specific rider can take a ride action (bid or accept)
exports.checkRideEligibility = async (req, res) => {
  try {
    const { riderId } = req.params;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: 'Rider ID is required',
      });
    }

    const globalLimit = await RideLimit.getGlobalRideLimit();
    const eligibility = globalLimit.canTakeRideAction(riderId);

    res.json({
      success: true,
      data: {
        canTakeAction: eligibility.canTakeAction,
        reason: eligibility.reason,
        remainingRides: eligibility.remainingRides,
        dailyLimit: globalLimit.dailyLimit,
        isActive: globalLimit.isActive,
      },
    });
  } catch (error) {
    console.error('Error checking ride eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check ride eligibility',
      error: error.message,
    });
  }
};

// Increment ride count for a rider (bid or accept)
exports.incrementRideCount = async (req, res) => {
  try {
    const { riderId } = req.body;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: 'Rider ID is required',
      });
    }

    const globalLimit = await RideLimit.getGlobalRideLimit();
    
    // Check if rider can take ride action before incrementing
    const eligibility = globalLimit.canTakeRideAction(riderId);
    if (!eligibility.canTakeAction) {
      return res.status(400).json({
        success: false,
        message: eligibility.reason,
        remainingRides: eligibility.remainingRides,
      });
    }

    await globalLimit.incrementRideCount(riderId);

    res.json({
      success: true,
      message: 'Ride count incremented successfully',
      data: {
        remainingRides: globalLimit.getRemainingRides(riderId),
        dailyLimit: globalLimit.dailyLimit,
      },
    });
  } catch (error) {
    console.error('Error incrementing ride count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to increment ride count',
      error: error.message,
    });
  }
};

// Get ride limit status for a specific rider
exports.getRiderRideLimit = async (req, res) => {
  try {
    const { riderId } = req.params;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: 'Rider ID is required',
      });
    }

    const globalLimit = await RideLimit.getGlobalRideLimit();
    const remainingRides = globalLimit.getRemainingRides(riderId);
    const ridesUsedToday = globalLimit.dailyUsage.get(riderId)?.ridesUsed || 0;

    res.json({
      success: true,
      data: {
        dailyLimit: globalLimit.dailyLimit,
        ridesUsedToday,
        remainingRides,
        isActive: globalLimit.isActive,
        lastResetDate: globalLimit.lastResetDate,
      },
    });
  } catch (error) {
    console.error('Error getting rider ride limit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rider ride limit',
      error: error.message,
    });
  }
};

// Backward compatibility methods
exports.getGlobalBidLimit = exports.getGlobalRideLimit;
exports.updateGlobalBidLimit = exports.updateGlobalRideLimit;

// Create backward compatibility wrapper for checkBidEligibility
exports.checkBidEligibility = async (req, res) => {
  try {
    const { riderId } = req.params;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: 'Rider ID is required',
      });
    }

    const globalLimit = await RideLimit.getGlobalRideLimit();
    const eligibility = globalLimit.canTakeRideAction(riderId);

    res.json({
      success: true,
      data: {
        canBid: eligibility.canTakeAction,
        reason: eligibility.reason,
        remainingBids: eligibility.remainingRides,
        dailyLimit: globalLimit.dailyLimit,
        isActive: globalLimit.isActive,
      },
    });
  } catch (error) {
    console.error('Error checking bid eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check bid eligibility',
      error: error.message,
    });
  }
};

// Create backward compatibility wrapper for incrementBidCount
exports.incrementBidCount = async (req, res) => {
  try {
    const { riderId } = req.body;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: 'Rider ID is required',
      });
    }

    const globalLimit = await RideLimit.getGlobalRideLimit();
    
    // Check if rider can take ride action before incrementing
    const eligibility = globalLimit.canTakeRideAction(riderId);
    if (!eligibility.canTakeAction) {
      return res.status(400).json({
        success: false,
        message: eligibility.reason,
        remainingBids: eligibility.remainingRides,
      });
    }

    await globalLimit.incrementRideCount(riderId);

    res.json({
      success: true,
      message: 'Bid count incremented successfully',
      data: {
        remainingBids: globalLimit.getRemainingRides(riderId),
        dailyLimit: globalLimit.dailyLimit,
      },
    });
  } catch (error) {
    console.error('Error incrementing bid count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to increment bid count',
      error: error.message,
    });
  }
};

// Create backward compatibility wrapper for getRiderBidLimit
exports.getRiderBidLimit = async (req, res) => {
  try {
    const { riderId } = req.params;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: 'Rider ID is required',
      });
    }

    const globalLimit = await RideLimit.getGlobalRideLimit();
    const remainingRides = globalLimit.getRemainingRides(riderId);
    const ridesUsedToday = globalLimit.dailyUsage.get(riderId)?.ridesUsed || 0;

    res.json({
      success: true,
      data: {
        dailyLimit: globalLimit.dailyLimit,
        bidsUsedToday: ridesUsedToday,
        remainingBids: remainingRides,
        isActive: globalLimit.isActive,
        lastResetDate: globalLimit.lastResetDate,
      },
    });
  } catch (error) {
    console.error('Error getting rider bid limit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rider bid limit',
      error: error.message,
    });
  }
};

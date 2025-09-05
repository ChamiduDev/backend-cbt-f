const cron = require('node-cron');
const RideLimit = require('../models/RideLimit');

// Reset daily ride limits every day at midnight
const resetDailyRideLimits = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running scheduled task: Reset daily ride limits');
    
    const globalLimit = await RideLimit.getGlobalRideLimit();
    if (globalLimit.isActive) {
      await globalLimit.resetDailyUsage();
      console.log('Daily ride limits reset successfully at:', new Date().toISOString());
    } else {
      console.log('Ride limits are disabled, skipping reset');
    }
  } catch (error) {
    console.error('Error resetting daily ride limits:', error);
  }
}, {
  scheduled: false, // Don't start automatically
  timezone: "Asia/Colombo" // Sri Lanka timezone
});

// Start the cron job
const startCronJobs = () => {
  resetDailyRideLimits.start();
  console.log('Cron jobs started');
};

// Stop the cron job
const stopCronJobs = () => {
  resetDailyRideLimits.stop();
  console.log('Cron jobs stopped');
};

module.exports = {
  startCronJobs,
  stopCronJobs,
  resetDailyRideLimits
};

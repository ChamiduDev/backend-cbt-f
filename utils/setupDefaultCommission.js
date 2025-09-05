const mongoose = require('mongoose');
const connectDB = require('../config/db');
const AppCommission = require('../models/AppCommission');

const setupDefaultCommission = async () => {
  try {
    await connectDB();
    
    // Check if commission already exists
    const existingCommission = await AppCommission.findOne();
    
    if (existingCommission) {
      console.log('AppCommission already exists:', existingCommission);
      return;
    }
    
    // Create default commission (15% percentage)
    const defaultCommission = new AppCommission({
      type: 'percentage',
      value: 15, // 15%
    });
    
    await defaultCommission.save();
    console.log('Default AppCommission created:', defaultCommission);
    
  } catch (error) {
    console.error('Error setting up default commission:', error);
  } finally {
    mongoose.connection.close();
  }
};

setupDefaultCommission();

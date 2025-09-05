#!/usr/bin/env node

/**
 * Production Setup Script for Ceylon Black Taxi Backend
 * Run this script in Railway console after deployment
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const RideLimit = require('./models/RideLimit');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

const createDefaultAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@ceylonblacktaxi.com' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      // Update role if needed
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        existingAdmin.isAdmin = true;
        await existingAdmin.save();
        console.log('✅ Updated admin user role');
      }
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = new User({
      email: 'admin@ceylonblacktaxi.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      fullName: 'Admin User',
      phone: '+94123456789',
      username: 'admin',
      role: 'admin',
      isAdmin: true,
      isVerified: true,
      status: 'approved',
      userStatus: 'approved',
      address: 'Admin Address',
      city_id: new mongoose.Types.ObjectId(), // You'll need to replace with actual city ID
      sub_area_id: new mongoose.Types.ObjectId(), // You'll need to replace with actual sub area ID
    });

    await adminUser.save();
    console.log('✅ Default admin user created successfully');
    console.log('📧 Email: admin@ceylonblacktaxi.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
};

const createDefaultRideLimit = async () => {
  try {
    // Check if global ride limit already exists
    const existingLimit = await RideLimit.findOne({ isGlobal: true });
    
    if (existingLimit) {
      console.log('✅ Global ride limit already exists');
      return;
    }

    // Create default global ride limit
    const globalLimit = new RideLimit({
      isGlobal: true,
      dailyLimit: 10,
      isActive: true,
      lastResetDate: new Date(),
    });

    await globalLimit.save();
    console.log('✅ Default global ride limit created successfully');
    
  } catch (error) {
    console.error('❌ Error creating global ride limit:', error.message);
  }
};

const checkEnvironmentVariables = () => {
  const requiredVars = [
    'MONGO_URI',
    'JWT_SECRET',
    'EMAIL_SERVICE',
    'EMAIL_USERNAME',
    'EMAIL_PASSWORD',
    'EMAIL_FROM'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.log('❌ Missing environment variables:', missing.join(', '));
    console.log('Please set these variables in Railway dashboard');
    return false;
  }

  console.log('✅ All required environment variables are set');
  return true;
};

const main = async () => {
  console.log('🚀 Starting production setup...\n');
  
  // Check environment variables
  if (!checkEnvironmentVariables()) {
    process.exit(1);
  }
  
  // Connect to database
  await connectDB();
  
  // Create default admin user
  await createDefaultAdmin();
  
  // Create default ride limit
  await createDefaultRideLimit();
  
  console.log('\n✅ Production setup completed successfully!');
  console.log('🌐 Your backend is ready to serve requests');
  
  process.exit(0);
};

// Run the setup
main().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});

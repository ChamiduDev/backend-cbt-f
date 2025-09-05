const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const bcrypt = require('bcrypt');

const verifyUser = async () => {
  await connectDB();

  try {
    console.log('🔍 Verifying user credentials...\n');

    // Test different users
    const testUsers = [
      { email: 'admin@admin.com', password: 'admin123' },
      { email: 'hotel@paradise.com', password: 'password123' },
      { email: 'broker@travel.com', password: 'password123' },
      { email: 'john@driver.com', password: 'password123' }
    ];

    for (const testUser of testUsers) {
      const user = await User.findOne({ email: testUser.email });
      
      if (user) {
        console.log(`✅ User found: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.userStatus}`);
        console.log(`   Has password: ${user.password ? 'Yes' : 'No'}`);
        
        if (user.password) {
          const isValid = await bcrypt.compare(testUser.password, user.password);
          console.log(`   Password valid: ${isValid ? '✅ Yes' : '❌ No'}`);
        }
        console.log('');
      } else {
        console.log(`❌ User not found: ${testUser.email}\n`);
      }
    }

    // Let's also try to create a fresh user with a simple password
    console.log('🔄 Creating a test user with simple credentials...');
    
    const testPassword = 'test123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    const testUser = new User({
      role: 'ride',
      fullName: 'Test Driver',
      address: 'Test Address',
      city_id: new mongoose.Types.ObjectId(),
      sub_area_id: new mongoose.Types.ObjectId(),
      phone: '+94 77 000 0000',
      username: 'test_driver',
      email: 'test@driver.com',
      password: hashedPassword,
      userStatus: 'approved'
    });

    await testUser.save();
    console.log('✅ Test user created: test@driver.com / test123');
    console.log('   This should work for testing!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  mongoose.connection.close();
};

verifyUser();

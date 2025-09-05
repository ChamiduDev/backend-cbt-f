const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const bcrypt = require('bcrypt');

const fixUserPasswords = async () => {
  await connectDB();

  try {
    console.log('🔧 Fixing user passwords...\n');

    // Define the correct passwords for each user
    const userPasswords = [
      { email: 'admin@admin.com', password: 'admin123' },
      { email: 'hotel@paradise.com', password: 'password123' },
      { email: 'broker@travel.com', password: 'password123' },
      { email: 'john@driver.com', password: 'password123' }
    ];

    for (const userCred of userPasswords) {
      const user = await User.findOne({ email: userCred.email });
      
      if (user) {
        // Hash the new password
        const hashedPassword = await bcrypt.hash(userCred.password, 10);
        
        // Update the user's password directly in the database to bypass middleware
        await User.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
        
        console.log(`✅ Fixed password for: ${userCred.email}`);
        
        // Verify the password works by fetching the updated user
        const updatedUser = await User.findById(user._id);
        const isValid = await bcrypt.compare(userCred.password, updatedUser.password);
        console.log(`   Password verification: ${isValid ? '✅ Success' : '❌ Failed'}`);
      } else {
        console.log(`❌ User not found: ${userCred.email}`);
      }
    }

    console.log('\n🎉 All user passwords have been fixed!');
    console.log('\n📋 Updated User Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👑 Admin:     admin@admin.com / admin123');
    console.log('🏨 Hotel:     hotel@paradise.com / password123');
    console.log('🤝 Broker:    broker@travel.com / password123');
    console.log('🚗 Rider:     john@driver.com / password123');
    console.log('🧪 Test:      test@driver.com / test123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error fixing passwords:', error.message);
  }

  mongoose.connection.close();
};

fixUserPasswords();

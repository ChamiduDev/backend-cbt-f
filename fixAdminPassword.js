const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcrypt');

const fixAdminPassword = async () => {
  await connectDB();

  try {
    // Find admin user
    const admin = await User.findOne({ email: 'admin@admin.com' });
    if (!admin) {
      console.log('❌ Admin user not found');
      mongoose.connection.close();
      return;
    }

    console.log('🔍 Found admin user:', admin.email);
    console.log('🔍 Current password hash:', admin.password);

    // Test the current password
    const testPassword = 'admin123';
    const isCurrentMatch = await bcrypt.compare(testPassword, admin.password);
    console.log('🔍 Current password match:', isCurrentMatch);

    // Hash new password with explicit salt rounds
    const newPassword = 'admin123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    console.log('🔍 New password hash:', hashedPassword);

    // Update password
    admin.password = hashedPassword;
    await admin.save();

    // Verify the new password works
    const isNewMatch = await bcrypt.compare(newPassword, admin.password);
    console.log('🔍 New password match:', isNewMatch);

    if (isNewMatch) {
      console.log('✅ Admin password fixed successfully!');
      console.log('📧 Email: admin@admin.com');
      console.log('🔑 Password: admin123');
      console.log('👤 Role: Administrator');
      console.log('🔓 Status: Approved');
    } else {
      console.log('❌ Password verification failed after update');
    }

  } catch (error) {
    console.error('❌ Error fixing admin password:', error.message);
  }

  mongoose.connection.close();
};

fixAdminPassword();

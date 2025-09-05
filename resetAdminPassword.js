const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcrypt');

const resetAdminPassword = async () => {
  await connectDB();

  try {
    // Find admin user
    const admin = await User.findOne({ email: 'admin@admin.com' });
    if (!admin) {
      console.log('❌ Admin user not found');
      mongoose.connection.close();
      return;
    }

    // Hash new password
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    admin.password = hashedPassword;
    await admin.save();

    console.log('✅ Admin password reset successfully!');
    console.log('📧 Email: admin@admin.com');
    console.log('🔑 New Password: admin123');
    console.log('👤 Role: Administrator');
    console.log('🔓 Status: Approved');

  } catch (error) {
    console.error('❌ Error resetting admin password:', error.message);
  }

  mongoose.connection.close();
};

resetAdminPassword();

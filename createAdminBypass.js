const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const City = require('./models/City');
const SubArea = require('./models/SubArea');
const bcrypt = require('bcrypt');

const createAdminBypass = async () => {
  await connectDB();

  try {
    // Delete existing admin user
    await User.deleteOne({ email: 'admin@admin.com' });
    console.log('🗑️ Deleted existing admin user');

    // Get or create a city (Colombo)
    let city = await City.findOne({ name: 'Colombo' });
    if (!city) {
      city = await City.create({ name: 'Colombo' });
      console.log('🏙️ Created city: Colombo');
    }

    // Get or create a sub-area (Fort)
    let subArea = await SubArea.findOne({ name: 'Fort' });
    if (!subArea) {
      subArea = await SubArea.create({ 
        name: 'Fort', 
        city_id: city._id 
      });
      console.log('📍 Created sub-area: Fort');
    }

    // Create admin user data
    const adminData = {
      fullName: 'System Administrator',
      email: 'admin@admin.com',
      password: 'admin123', // Plain text - will be hashed by middleware
      role: 'admin',
      isAdmin: true,
      userStatus: 'approved',
      address: 'System Administration Office',
      city_id: city._id,
      sub_area_id: subArea._id,
      phone: '+94 11 000 0000',
      username: 'admin',
    };

    // Create new admin user (password will be hashed by middleware)
    const admin = new User(adminData);
    await admin.save();
    console.log('✅ New admin user created successfully!');

    // Test the password by querying the user again
    const testUser = await User.findOne({ email: 'admin@admin.com' });
    const isMatch = await bcrypt.compare('admin123', testUser.password);
    console.log('🔍 Password test result:', isMatch);

    if (isMatch) {
      console.log('✅ Admin user ready for login!');
      console.log('📧 Email: admin@admin.com');
      console.log('🔑 Password: admin123');
      console.log('👤 Role: Administrator');
      console.log('🔓 Status: Approved');
    } else {
      console.log('❌ Password verification failed');
      console.log('🔍 Stored password hash:', testUser.password);
    }

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }

  mongoose.connection.close();
};

createAdminBypass();

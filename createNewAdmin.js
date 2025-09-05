const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const City = require('./models/City');
const SubArea = require('./models/SubArea');
const bcrypt = require('bcrypt');

const createNewAdmin = async () => {
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

    // Create simple password hash
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 Password hashed successfully');

    // Create new admin user
    const admin = new User({
      fullName: 'System Administrator',
      email: 'admin@admin.com',
      password: hashedPassword,
      role: 'admin',
      isAdmin: true,
      userStatus: 'approved',
      address: 'System Administration Office',
      city_id: city._id,
      sub_area_id: subArea._id,
      phone: '+94 11 000 0000',
      username: 'admin',
    });

    await admin.save();
    console.log('✅ New admin user created successfully!');

    // Test the password
    const testUser = await User.findOne({ email: 'admin@admin.com' });
    const isMatch = await bcrypt.compare(password, testUser.password);
    console.log('🔍 Password test result:', isMatch);

    if (isMatch) {
      console.log('✅ Admin user ready for login!');
      console.log('📧 Email: admin@admin.com');
      console.log('🔑 Password: admin123');
      console.log('👤 Role: Administrator');
      console.log('🔓 Status: Approved');
    } else {
      console.log('❌ Password verification failed');
    }

  } catch (error) {
    console.error('❌ Error creating new admin user:', error.message);
  }

  mongoose.connection.close();
};

createNewAdmin();

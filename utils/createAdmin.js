const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const City = require('../models/City');
const SubArea = require('../models/SubArea');
const bcrypt = require('bcrypt');

const createAdmin = async () => {
  await connectDB();

  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@admin.com' });
    if (adminExists) {
      console.log('Admin user already exists');
      mongoose.connection.close();
      return;
    }

    // Get or create a city (Colombo)
    let city = await City.findOne({ name: 'Colombo' });
    if (!city) {
      city = await City.create({ name: 'Colombo' });
      console.log('Created city: Colombo');
    }

    // Get or create a sub-area (Fort)
    let subArea = await SubArea.findOne({ name: 'Fort' });
    if (!subArea) {
      subArea = await SubArea.create({ 
        name: 'Fort', 
        city_id: city._id 
      });
      console.log('Created sub-area: Fort');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
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
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@admin.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: Administrator');
    console.log('🔓 Status: Approved');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }

  mongoose.connection.close();
};

createAdmin();

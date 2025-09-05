const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const City = require('../models/City');
const SubArea = require('../models/SubArea');
const bcrypt = require('bcrypt');

const setupUsers = async () => {
  await connectDB();

  try {
    console.log('🚀 Setting up essential users for testing...\n');

    // Get or create cities
    let colombo = await City.findOne({ name: 'Colombo' });
    if (!colombo) {
      colombo = await City.create({ name: 'Colombo' });
      console.log('✅ Created city: Colombo');
    }

    let kandy = await City.findOne({ name: 'Kandy' });
    if (!kandy) {
      kandy = await City.create({ name: 'Kandy' });
      console.log('✅ Created city: Kandy');
    }

    let galle = await City.findOne({ name: 'Galle' });
    if (!galle) {
      galle = await City.create({ name: 'Galle' });
      console.log('✅ Created city: Galle');
    }

    // Get or create sub-areas
    let fort = await SubArea.findOne({ name: 'Fort' });
    if (!fort) {
      fort = await SubArea.create({ name: 'Fort', city_id: colombo._id });
      console.log('✅ Created sub-area: Fort (Colombo)');
    }

    let pettah = await SubArea.findOne({ name: 'Pettah' });
    if (!pettah) {
      pettah = await SubArea.create({ name: 'Pettah', city_id: colombo._id });
      console.log('✅ Created sub-area: Pettah (Colombo)');
    }

    let peradeniya = await SubArea.findOne({ name: 'Peradeniya' });
    if (!peradeniya) {
      peradeniya = await SubArea.create({ name: 'Peradeniya', city_id: kandy._id });
      console.log('✅ Created sub-area: Peradeniya (Kandy)');
    }

    let galleFort = await SubArea.findOne({ name: 'Galle Fort' });
    if (!galleFort) {
      galleFort = await SubArea.create({ name: 'Galle Fort', city_id: galle._id });
      console.log('✅ Created sub-area: Galle Fort (Galle)');
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Hotel User
    const hotelExists = await User.findOne({ email: 'hotel@paradise.com' });
    if (!hotelExists) {
      const hotelUser = await User.create({
        role: 'hotel',
        fullName: 'Hotel Paradise',
        hotelName: 'Paradise Hotel',
        address: '123 Beach Road, Colombo',
        city_id: colombo._id,
        sub_area_id: fort._id,
        phone: '+94 11 234 5678',
        username: 'hotel_paradise',
        email: 'hotel@paradise.com',
        password: hashedPassword,
        userStatus: 'approved'
      });
      console.log('✅ Created Hotel User: hotel@paradise.com');
    } else {
      console.log('ℹ️  Hotel User already exists: hotel@paradise.com');
    }

    // Create Broker User
    const brokerExists = await User.findOne({ email: 'broker@travel.com' });
    if (!brokerExists) {
      const brokerUser = await User.create({
        role: 'broker',
        fullName: 'Travel Broker Pro',
        hotelName: 'Travel Broker Pro',
        address: '456 Travel Street, Colombo',
        city_id: colombo._id,
        sub_area_id: pettah._id,
        phone: '+94 11 345 6789',
        username: 'travel_broker',
        email: 'broker@travel.com',
        password: hashedPassword,
        userStatus: 'approved'
      });
      console.log('✅ Created Broker User: broker@travel.com');
    } else {
      console.log('ℹ️  Broker User already exists: broker@travel.com');
    }

    // Create Rider User
    const riderExists = await User.findOne({ email: 'john@driver.com' });
    if (!riderExists) {
      const riderUser = await User.create({
        role: 'ride',
        fullName: 'John Driver',
        address: '789 Driver Street, Colombo',
        city_id: colombo._id,
        sub_area_id: pettah._id,
        phone: '+94 77 123 4567',
        username: 'john_driver',
        email: 'john@driver.com',
        password: hashedPassword,
        userStatus: 'approved',
        vehicles: [{
          model: 'Toyota Corolla',
          number: 'ABC-1234',
          year: 2020,
          totalPassengers: 4,
          category: 'Car',
          location: {
            city_id: colombo._id,
            sub_area_id: pettah._id
          }
        }]
      });
      console.log('✅ Created Rider User: john@driver.com');
    } else {
      console.log('ℹ️  Rider User already exists: john@driver.com');
    }

    console.log('\n🎉 User setup completed successfully!');
    console.log('\n📋 Test User Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👑 Admin:     admin@admin.com / admin123');
    console.log('🏨 Hotel:     hotel@paradise.com / password123');
    console.log('🤝 Broker:    broker@travel.com / password123');
    console.log('🚗 Rider:     john@driver.com / password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error setting up users:', error.message);
  }

  mongoose.connection.close();
};

setupUsers();

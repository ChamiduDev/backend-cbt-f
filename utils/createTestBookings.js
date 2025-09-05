const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Booking = require('../models/Booking');
const City = require('../models/City');
const SubArea = require('../models/SubArea');

const createTestBookings = async () => {
  await connectDB();

  try {
    console.log('🚀 Creating test bookings for ride history testing...\n');

    // Get users
    const hotelUser = await User.findOne({ email: 'hotel@paradise.com' });
    const riderUser = await User.findOne({ email: 'john@driver.com' });
    const colombo = await City.findOne({ name: 'Colombo' });
    const kandy = await City.findOne({ name: 'Kandy' });
    const galle = await City.findOne({ name: 'Galle' });
    const fort = await SubArea.findOne({ name: 'Fort' });
    const peradeniya = await SubArea.findOne({ name: 'Peradeniya' });
    const galleFort = await SubArea.findOne({ name: 'Galle Fort' });

    if (!hotelUser || !riderUser) {
      console.log('❌ Required users not found. Please run setupUsers.js first.');
      mongoose.connection.close();
      return;
    }

    // Clear existing test bookings
    await Booking.deleteMany({});
    console.log('🧹 Cleared existing test bookings');

    // Create dates for testing
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Create completed booking from 3 days ago
    const completedBooking1 = await Booking.create({
      user: hotelUser._id,
      pickupLocation: {
        city_id: colombo._id,
        sub_area_id: fort._id,
        address: 'Paradise Hotel, Fort, Colombo'
      },
      destinationLocation: {
        city_id: kandy._id,
        sub_area_id: peradeniya._id,
        address: 'University of Peradeniya, Kandy'
      },
      pickupDate: threeDaysAgo,
      pickupTime: '09:00',
      riderAmount: 5000,
      commission: 500,
      totalAmount: 5500,
      phoneNumber: '+94 11 234 5678',
      numberOfGuests: 2,
      vehicleType: 'Car',
      status: 'completed',
      rider: riderUser._id,
      startedAt: new Date(threeDaysAgo.getTime() + 2 * 60 * 60 * 1000), // 2 hours after pickup
      completedAt: new Date(threeDaysAgo.getTime() + 4 * 60 * 60 * 1000), // 4 hours after pickup
      createdAt: threeDaysAgo
    });
    console.log('✅ Created completed booking 1 (3 days ago)');

    // Create completed booking from 2 days ago
    const completedBooking2 = await Booking.create({
      user: hotelUser._id,
      pickupLocation: {
        city_id: colombo._id,
        sub_area_id: fort._id,
        address: 'Paradise Hotel, Fort, Colombo'
      },
      destinationLocation: {
        city_id: galle._id,
        sub_area_id: galleFort._id,
        address: 'Galle Fort, Galle'
      },
      pickupDate: twoDaysAgo,
      pickupTime: '14:00',
      riderAmount: 8000,
      commission: 800,
      totalAmount: 8800,
      phoneNumber: '+94 11 234 5678',
      numberOfGuests: 3,
      vehicleType: 'Van',
      status: 'completed',
      rider: riderUser._id,
      startedAt: new Date(twoDaysAgo.getTime() + 2 * 60 * 60 * 1000), // 2 hours after pickup
      completedAt: new Date(twoDaysAgo.getTime() + 5 * 60 * 60 * 1000), // 5 hours after pickup
      createdAt: twoDaysAgo
    });
    console.log('✅ Created completed booking 2 (2 days ago)');

    // Create completed booking from yesterday
    const completedBooking3 = await Booking.create({
      user: hotelUser._id,
      pickupLocation: {
        city_id: colombo._id,
        sub_area_id: fort._id,
        address: 'Paradise Hotel, Fort, Colombo'
      },
      destinationLocation: {
        city_id: kandy._id,
        sub_area_id: peradeniya._id,
        address: 'Temple of the Tooth, Kandy'
      },
      pickupDate: yesterday,
      pickupTime: '16:00',
      riderAmount: 6000,
      commission: 600,
      totalAmount: 6600,
      phoneNumber: '+94 11 234 5678',
      numberOfGuests: 4,
      vehicleType: 'Van',
      status: 'completed',
      rider: riderUser._id,
      startedAt: new Date(yesterday.getTime() + 1 * 60 * 60 * 1000), // 1 hour after pickup
      completedAt: new Date(yesterday.getTime() + 3 * 60 * 60 * 1000), // 3 hours after pickup
      createdAt: yesterday
    });
    console.log('✅ Created completed booking 3 (yesterday)');

    // Create a pending booking for today
    const pendingBooking = await Booking.create({
      user: hotelUser._id,
      pickupLocation: {
        city_id: colombo._id,
        sub_area_id: fort._id,
        address: 'Paradise Hotel, Fort, Colombo'
      },
      destinationLocation: {
        city_id: kandy._id,
        sub_area_id: peradeniya._id,
        address: 'University of Peradeniya, Kandy'
      },
      pickupDate: now,
      pickupTime: '18:00',
      riderAmount: 5000,
      commission: 500,
      totalAmount: 5500,
      phoneNumber: '+94 11 234 5678',
      numberOfGuests: 2,
      vehicleType: 'Car',
      status: 'pending',
      createdAt: now
    });
    console.log('✅ Created pending booking (today)');

    console.log('\n🎉 Test bookings created successfully!');
    console.log('📊 Summary:');
    console.log('   • 3 completed rides (3, 2, and 1 days ago)');
    console.log('   • 1 pending booking (today)');
    console.log('   • All rides assigned to: john@driver.com');
    console.log('\n🧪 Now you can test the ride history functionality!');

  } catch (error) {
    console.error('❌ Error creating test bookings:', error.message);
  }

  mongoose.connection.close();
};

createTestBookings();

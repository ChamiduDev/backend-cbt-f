const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'admin@admin.com';
const TEST_PASSWORD = 'admin123';

async function testConfirmedRideNotification() {
  console.log('🧪 Testing Notification for Existing Confirmed Ride...\n');

  try {
    // Step 1: Login to get admin token
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    const token = loginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Step 2: Get confirmed bookings
    console.log('2️⃣ Getting confirmed bookings...');
    const bookingsResponse = await axios.get(`${BASE_URL}/bookings`, {
      headers: { 'x-auth-token': token }
    });

    const confirmedBookings = bookingsResponse.data.filter(booking => 
      booking.status === 'confirmed'
    );

    if (confirmedBookings.length === 0) {
      console.log('❌ No confirmed bookings found');
      return;
    }

    // Use the first confirmed booking
    const testBooking = confirmedBookings[0];
    console.log(`✅ Using confirmed booking: ${testBooking._id}`);
    console.log(`   Rider: ${testBooking.rider}`);
    console.log(`   Confirmed Bid: ${testBooking.confirmedBid}\n`);

    // Step 3: Extract notification data from booking
    console.log('3️⃣ Extracting notification data...');
    const pickupCity = testBooking.pickupLocation?.city_id?.name || 'Unknown City';
    const destinationCity = testBooking.destinationLocation?.city_id?.name || 'Unknown City';
    const customerName = testBooking.user?.fullName || 'Customer';
    const riderId = testBooking.rider;

    console.log(`📊 Notification Data:`);
    console.log(`   Pickup: ${pickupCity}`);
    console.log(`   Destination: ${destinationCity}`);
    console.log(`   Customer: ${customerName}`);
    console.log(`   Rider ID: ${riderId}\n`);

    // Step 4: Send manual notification to the rider
    console.log('4️⃣ Sending manual notification to confirmed rider...');
    const notificationResponse = await axios.post(`${BASE_URL}/push-notifications/send-to-users`, {
      userIds: [riderId],
      title: 'Ride Confirmed! 🎉',
      body: `Your ride from ${pickupCity} to ${destinationCity} has been confirmed by ${customerName}. Check your confirmed rides!`,
      data: {
        bookingId: testBooking._id,
        bidId: testBooking.confirmedBid,
        pickupCity: pickupCity,
        destinationCity: destinationCity,
        customerName: customerName,
        type: 'ride_confirmation',
        isRetroactive: true
      }
    }, {
      headers: { 'x-auth-token': token }
    });

    console.log('✅ Manual notification sent successfully');
    console.log(`📱 Sent to ${notificationResponse.data.sentCount} user(s)`);
    console.log('📱 Notification details:', JSON.stringify(notificationResponse.data, null, 2));

    // Step 5: Get user info for the rider
    console.log('\n5️⃣ Getting rider information...');
    const userStatsResponse = await axios.get(`${BASE_URL}/push-notifications/user-stats`, {
      headers: { 'x-auth-token': token }
    });

    const riderUser = userStatsResponse.data.byRole.ride?.users.find(user => 
      user.id === riderId
    );

    if (riderUser) {
      console.log(`✅ Found rider: ${riderUser.name} (${riderUser.email})`);
      console.log('\n🎉 Test completed!');
      console.log('\n📋 Check the Flutter app for the notification:');
      console.log(`   - Login as: ${riderUser.email}`);
      console.log(`   - Look for notification: "Ride Confirmed! 🎉"`);
      console.log(`   - Check confirmed rides for booking: ${testBooking._id}`);
      console.log(`   - This is a retroactive notification for an existing confirmed ride`);
    } else {
      console.log('⚠️ Could not find rider user details');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Authentication failed. Check credentials.');
    } else if (error.response?.status === 400) {
      console.log('\n💡 Bad request. Check the data being sent.');
    }
    
    console.log('\n🔍 Debug info:');
    console.log('Status:', error.response?.status);
    console.log('Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

// Run the test
testConfirmedRideNotification();

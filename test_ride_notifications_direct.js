const axios = require('axios');

// Test configuration
const BASE_URL = 'http://192.168.251.89:3000/api';

async function testRideNotificationsDirect() {
  console.log('🚗 Testing Ride Notifications Direct API...\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@admin.com',
      password: 'admin123'
    });

    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Step 2: Find confirmed bookings
    console.log('2️⃣ Finding confirmed bookings...');
    const bookingsResponse = await axios.get(`${BASE_URL}/bookings`, {
      headers: { 'x-auth-token': adminToken }
    });

    const confirmedBookings = bookingsResponse.data.filter(booking => 
      booking.status === 'confirmed' && booking.rider
    );
    
    console.log(`✅ Found ${confirmedBookings.length} confirmed bookings with riders`);

    if (confirmedBookings.length === 0) {
      console.log('⚠️ No confirmed bookings found. Cannot test ride notifications.');
      return;
    }

    // Step 3: Test direct notification to hotel/broker
    console.log('\n3️⃣ Testing direct notification to hotel/broker...');
    const testBooking = confirmedBookings[0];
    const hotelBrokerId = testBooking.user._id;
    
    console.log(`📋 Testing with booking: ${testBooking._id}`);
    console.log(`   - Hotel/Broker: ${testBooking.user.fullName} (${hotelBrokerId})`);
    console.log(`   - Rider: ${testBooking.rider.fullName}`);
    console.log(`   - Pickup: ${testBooking.pickupLocation.city_id.name} - ${testBooking.pickupLocation.sub_area_id.name}`);
    console.log(`   - Destination: ${testBooking.destinationLocation.city_id.name} - ${testBooking.destinationLocation.sub_area_id.name}`);

    // Test ride start notification
    console.log('\n4️⃣ Testing ride start notification...');
    const rideStartNotificationResponse = await axios.post(`${BASE_URL}/push-notifications/send-to-users`, {
      userIds: [hotelBrokerId],
      title: 'Ride Started! 🚗',
      body: `Your ride from ${testBooking.pickupLocation.city_id.name} - ${testBooking.pickupLocation.sub_area_id.name} to ${testBooking.destinationLocation.city_id.name} has been started by ${testBooking.rider.fullName}.`,
      data: {
        bookingId: testBooking._id,
        pickupCity: testBooking.pickupLocation.city_id.name,
        pickupSubArea: testBooking.pickupLocation.sub_area_id.name,
        destinationCity: testBooking.destinationLocation.city_id.name,
        riderName: testBooking.rider.fullName,
        totalAmount: testBooking.totalAmount,
        pickupDate: testBooking.pickupDate,
        pickupTime: testBooking.pickupTime,
        type: 'ride_started'
      }
    }, {
      headers: { 'x-auth-token': adminToken }
    });

    console.log('✅ Ride start notification sent successfully');
    console.log('Response:', JSON.stringify(rideStartNotificationResponse.data, null, 2));

    // Test ride rejection notification
    console.log('\n5️⃣ Testing ride rejection notification...');
    const rideRejectNotificationResponse = await axios.post(`${BASE_URL}/push-notifications/send-to-users`, {
      userIds: [hotelBrokerId],
      title: 'Ride Rejected ❌',
      body: `Your ride from ${testBooking.pickupLocation.city_id.name} - ${testBooking.pickupLocation.sub_area_id.name} to ${testBooking.destinationLocation.city_id.name} has been rejected by ${testBooking.rider.fullName}. Reason: Test rejection for notification system.`,
      data: {
        bookingId: testBooking._id,
        pickupCity: testBooking.pickupLocation.city_id.name,
        pickupSubArea: testBooking.pickupLocation.sub_area_id.name,
        destinationCity: testBooking.destinationLocation.city_id.name,
        riderName: testBooking.rider.fullName,
        totalAmount: testBooking.totalAmount,
        pickupDate: testBooking.pickupDate,
        pickupTime: testBooking.pickupTime,
        rejectionReason: 'Test rejection for notification system',
        type: 'ride_rejected'
      }
    }, {
      headers: { 'x-auth-token': adminToken }
    });

    console.log('✅ Ride rejection notification sent successfully');
    console.log('Response:', JSON.stringify(rideRejectNotificationResponse.data, null, 2));

    console.log('\n🎯 Ride Notifications Direct Test Completed!');
    console.log('\n📋 What was tested:');
    console.log('   ✅ Direct notification to hotel/broker for ride start');
    console.log('   ✅ Direct notification to hotel/broker for ride rejection');
    console.log('   ✅ Notification content includes booking details');
    console.log('   ✅ Notification data includes all relevant information');

    console.log('\n📱 Flutter app logs to look for:');
    console.log('   📱 "📱 Received push notification"');
    console.log('   📱 "Notification type: ride_started"');
    console.log('   📱 "Notification type: ride_rejected"');
    console.log('   📱 "Notification title: Ride Started! 🚗"');
    console.log('   📱 "Notification title: Ride Rejected ❌"');

    console.log('\n🔍 Expected notification content:');
    console.log('   🚗 "Your ride from [City] - [SubArea] to [Destination] has been started by [Rider]"');
    console.log('   ❌ "Your ride from [City] - [SubArea] to [Destination] has been rejected by [Rider]. Reason: [Reason]"');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Authentication failed. Check credentials.');
    } else if (error.response?.status === 400) {
      console.log('\n💡 Bad request. Check the data being sent.');
    } else if (error.response?.status === 500) {
      console.log('\n💡 Server error. Check backend logs for details.');
    }
    
    console.log('\n🔍 Debug info:');
    console.log('Status:', error.response?.status);
    console.log('Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

// Run the test
testRideNotificationsDirect();

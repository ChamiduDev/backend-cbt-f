const axios = require('axios');

// Test configuration
const BASE_URL = 'http://192.168.251.89:3000/api';

async function testRideStartRejectNotifications() {
  console.log('🚗 Testing Ride Start & Reject Notifications...\n');

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
      console.log('⚠️ No confirmed bookings found. Cannot test ride start/reject notifications.');
      return;
    }

    // Step 3: Get rider credentials for testing
    console.log('\n3️⃣ Getting rider credentials...');
    const statsResponse = await axios.get(`${BASE_URL}/push-notifications/user-stats`, {
      headers: { 'x-auth-token': adminToken }
    });

    const riders = statsResponse.data.byRole.ride?.users || [];
    if (riders.length === 0) {
      console.log('❌ No riders found for testing');
      return;
    }

    const testRider = riders[0];
    console.log(`📱 Using rider: ${testRider.name} (${testRider.email})`);

    // Step 4: Login as rider
    console.log('\n4️⃣ Logging in as rider...');
    const riderLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testRider.email,
      password: 'password123' // You may need to adjust this password
    });

    if (riderLoginResponse.status !== 200) {
      console.log('⚠️ Could not login as rider. Proceeding with admin testing...');
      console.log('💡 Note: Ride start/reject requires rider authentication');
      return;
    }

    const riderToken = riderLoginResponse.data.token;
    console.log('✅ Rider login successful');

    // Step 5: Test ride start notification
    console.log('\n5️⃣ Testing ride start notification...');
    const testBooking = confirmedBookings[0];
    console.log(`📋 Testing with booking: ${testBooking._id}`);
    console.log(`   - Hotel/Broker: ${testBooking.user.fullName}`);
    console.log(`   - Rider: ${testBooking.rider.fullName}`);
    console.log(`   - Pickup: ${testBooking.pickupLocation.city_id.name} - ${testBooking.pickupLocation.sub_area_id.name}`);
    console.log(`   - Destination: ${testBooking.destinationLocation.city_id.name} - ${testBooking.destinationLocation.sub_area_id.name}`);

    try {
      const startRideResponse = await axios.put(`${BASE_URL}/bookings/${testBooking._id}/start`, {}, {
        headers: { 'x-auth-token': riderToken }
      });

      console.log('✅ Ride started successfully');
      console.log('Response:', JSON.stringify(startRideResponse.data, null, 2));

      // Wait for notification processing
      console.log('\n⏳ Waiting 3 seconds for notification processing...');
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (startError) {
      console.log('❌ Ride start failed:', startError.response?.data || startError.message);
      
      if (startError.response?.status === 401) {
        console.log('💡 Only the assigned rider can start the ride');
      } else if (startError.response?.status === 400) {
        console.log('💡 Ride might already be started or in wrong status');
      }
    }

    // Step 6: Test ride rejection notification (if we have another confirmed booking)
    if (confirmedBookings.length > 1) {
      console.log('\n6️⃣ Testing ride rejection notification...');
      const rejectBooking = confirmedBookings[1];
      console.log(`📋 Testing with booking: ${rejectBooking._id}`);
      console.log(`   - Hotel/Broker: ${rejectBooking.user.fullName}`);
      console.log(`   - Rider: ${rejectBooking.rider.fullName}`);

      try {
        const rejectRideResponse = await axios.put(`${BASE_URL}/bookings/${rejectBooking._id}/reject`, {
          reason: 'Test rejection - testing notification system'
        }, {
          headers: { 'x-auth-token': riderToken }
        });

        console.log('✅ Ride rejected successfully');
        console.log('Response:', JSON.stringify(rejectRideResponse.data, null, 2));

        // Wait for notification processing
        console.log('\n⏳ Waiting 3 seconds for notification processing...');
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (rejectError) {
        console.log('❌ Ride rejection failed:', rejectError.response?.data || rejectError.message);
        
        if (rejectError.response?.status === 401) {
          console.log('💡 Only the assigned rider can reject the ride');
        } else if (rejectError.response?.status === 400) {
          console.log('💡 Ride might not be in confirmed status');
        }
      }
    } else {
      console.log('\n6️⃣ Skipping ride rejection test - only one confirmed booking found');
    }

    console.log('\n🎯 Ride Start & Reject Notification Test Completed!');
    console.log('\n📋 Check the backend server console for these logs:');
    console.log('   🚗 "[NOTIFY HOTEL/BROKER RIDE START] Starting notification process"');
    console.log('   🚗 "[NOTIFY HOTEL/BROKER RIDE START] Notification sent to hotel/broker"');
    console.log('   ❌ "[NOTIFY HOTEL/BROKER RIDE REJECTION] Starting notification process"');
    console.log('   ❌ "[NOTIFY HOTEL/BROKER RIDE REJECTION] Notification sent to hotel/broker"');
    console.log('   📱 "Push notification sent to X specific users"');

    console.log('\n🔍 Expected backend logs for successful notifications:');
    console.log('   🚗 "Ride Started! 🚗 - Your ride from [City] - [SubArea] to [Destination] has been started by [Rider]"');
    console.log('   ❌ "Ride Rejected ❌ - Your ride from [City] - [SubArea] to [Destination] has been rejected by [Rider]. Reason: [Reason]"');

    console.log('\n📱 Flutter app logs to look for:');
    console.log('   📱 "📱 Received push notification"');
    console.log('   📱 "Notification type: ride_started"');
    console.log('   📱 "Notification type: ride_rejected"');

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
testRideStartRejectNotifications();

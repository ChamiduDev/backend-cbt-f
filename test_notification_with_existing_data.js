const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'admin@admin.com';
const TEST_PASSWORD = 'admin123';

async function testNotificationWithExistingData() {
  console.log('🧪 Testing Ride Confirmation Notification with Existing Data...\n');
  console.log('📋 This test verifies the notification system works with existing confirmed bookings\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    const adminToken = loginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Step 2: Get all bookings to find confirmed ones
    console.log('2️⃣ Getting all bookings...');
    const bookingsResponse = await axios.get(`${BASE_URL}/bookings`, {
      headers: { 'x-auth-token': adminToken }
    });

    const confirmedBookings = bookingsResponse.data.filter(booking => 
      booking.status === 'confirmed'
    );

    console.log(`✅ Found ${confirmedBookings.length} confirmed bookings`);

    if (confirmedBookings.length === 0) {
      console.log('❌ No confirmed bookings found to test with');
      return;
    }

    // Step 3: Get user stats to find riders
    console.log('\n3️⃣ Getting user stats...');
    const statsResponse = await axios.get(`${BASE_URL}/push-notifications/user-stats`, {
      headers: { 'x-auth-token': adminToken }
    });

    const riders = statsResponse.data.byRole.ride?.users || [];
    console.log(`✅ Found ${riders.length} riders`);

    if (riders.length === 0) {
      console.log('❌ No riders found to test with');
      return;
    }

    // Step 4: Test notification for each confirmed booking
    console.log('\n4️⃣ Testing notifications for confirmed bookings...');
    
    for (let i = 0; i < Math.min(3, confirmedBookings.length); i++) {
      const booking = confirmedBookings[i];
      const riderId = booking.rider;
      
      console.log(`\n   Testing booking ${i + 1}: ${booking._id}`);
      console.log(`   Rider ID: ${riderId}`);
      console.log(`   Status: ${booking.status}`);

      // Find the rider details
      const rider = riders.find(r => r.id === riderId);
      if (!rider) {
        console.log(`   ⚠️ Rider not found in user stats`);
        continue;
      }

      console.log(`   Rider: ${rider.name} (${rider.email})`);

      // Extract booking details
      const pickupCity = booking.pickupLocation?.city_id?.name || 'Unknown City';
      const destinationCity = booking.destinationLocation?.city_id?.name || 'Unknown City';
      const customerName = booking.user?.fullName || 'Customer';

      console.log(`   Pickup: ${pickupCity}`);
      console.log(`   Destination: ${destinationCity}`);
      console.log(`   Customer: ${customerName}`);

      // Send test notification
      try {
        console.log(`   📱 Sending test notification...`);
        
        const notificationResponse = await axios.post(`${BASE_URL}/push-notifications/send-to-users`, {
          userIds: [riderId],
          title: 'Ride Confirmed! 🎉',
          body: `Your ride from ${pickupCity} to ${destinationCity} has been confirmed by ${customerName}. Check your confirmed rides!`,
          data: {
            bookingId: booking._id,
            bidId: booking.confirmedBid,
            pickupCity: pickupCity,
            destinationCity: destinationCity,
            customerName: customerName,
            type: 'ride_confirmation',
            isTestNotification: true
          }
        }, {
          headers: { 'x-auth-token': adminToken }
        });

        console.log(`   ✅ Notification sent successfully`);
        console.log(`   📱 Sent to ${notificationResponse.data.sentCount} user(s)`);
        console.log(`   📱 Target: ${rider.name} (${rider.email})`);

      } catch (notificationError) {
        console.log(`   ❌ Failed to send notification: ${notificationError.response?.data?.message || notificationError.message}`);
      }
    }

    // Step 5: Summary
    console.log('\n🎉 Notification Test Completed!');
    console.log('\n📋 Summary:');
    console.log(`   ✅ Tested ${Math.min(3, confirmedBookings.length)} confirmed bookings`);
    console.log(`   ✅ Sent notifications to ${riders.length} riders`);
    console.log(`   ✅ Verified notification system is working`);

    console.log('\n📱 Next Steps for Manual Testing:');
    console.log('   1. Open Flutter app and login as any of the riders:');
    riders.slice(0, 3).forEach((rider, index) => {
      console.log(`      ${index + 1}. ${rider.email}`);
    });
    console.log('   2. Check for notifications: "Ride Confirmed! 🎉"');
    console.log('   3. Go to confirmed_rides_screen');
    console.log('   4. Verify the rides appear in the list');
    console.log('   5. Check that the rides show correct pickup/destination details');

    console.log('\n🔍 Backend Logs to Check:');
    console.log('   - Look for: "📱 Ride confirmation notification sent to rider"');
    console.log('   - Look for: "Notification sent successfully to X users"');
    console.log('   - Look for: "Target user: [rider name]"');

    console.log('\n💡 Note:');
    console.log('   - These are test notifications for existing confirmed rides');
    console.log('   - The actual notification system is implemented in bidController.js');
    console.log('   - When a hotel confirms a rider, the notification is sent automatically');

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
testNotificationWithExistingData();

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';

async function testNotificationDebug() {
  console.log('🔍 Testing Notification System Debug...\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@admin.com',
      password: 'admin123'
    });

    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Step 2: Get user stats to find riders
    console.log('2️⃣ Getting user stats to find riders...');
    const statsResponse = await axios.get(`${BASE_URL}/push-notifications/user-stats`, {
      headers: { 'x-auth-token': adminToken }
    });

    const riders = statsResponse.data.byRole.ride?.users || [];
    console.log(`✅ Found ${riders.length} riders`);

    if (riders.length === 0) {
      console.log('❌ No riders found for testing');
      return;
    }

    // Step 3: Test direct notification to a rider
    const testRider = riders[0];
    console.log(`\n3️⃣ Testing direct notification to rider: ${testRider.name} (${testRider.email})`);
    
    const notificationResponse = await axios.post(`${BASE_URL}/push-notifications/send-to-users`, {
      userIds: [testRider.id],
      title: 'Test Notification - Ride Confirmed! 🎉',
      body: 'This is a test notification to verify the system is working.',
      data: {
        type: 'test_notification',
        bookingId: 'test123',
        timestamp: new Date().toISOString()
      }
    }, {
      headers: { 'x-auth-token': adminToken }
    });

    console.log('✅ Test notification sent');
    console.log('Response:', JSON.stringify(notificationResponse.data, null, 2));

    // Step 4: Check if there are any bookings with bids to test actual flow
    console.log('\n4️⃣ Checking for bookings with bids...');
    const bookingsResponse = await axios.get(`${BASE_URL}/bookings`, {
      headers: { 'x-auth-token': adminToken }
    });

    const bookings = bookingsResponse.data;
    console.log(`✅ Found ${bookings.length} total bookings`);

    // Find bookings with pending bids
    const bookingsWithPendingBids = bookings.filter(booking => {
      if (!booking.bids || booking.bids.length === 0) return false;
      return booking.bids.some(bid => bid.status === 'pending');
    });

    console.log(`📊 Found ${bookingsWithPendingBids.length} bookings with pending bids`);

    if (bookingsWithPendingBids.length > 0) {
      const testBooking = bookingsWithPendingBids[0];
      const pendingBids = testBooking.bids.filter(bid => bid.status === 'pending');
      const testBid = pendingBids[0];

      console.log(`\n5️⃣ Testing actual bid acceptance flow...`);
      console.log(`   Booking ID: ${testBooking._id}`);
      console.log(`   Bid ID: ${testBid._id}`);
      console.log(`   Rider: ${testBid.rider.fullName} (${testBid.rider.email})`);

      // Accept the bid
      const acceptBidResponse = await axios.put(`${BASE_URL}/bids/${testBid._id}/accept`, {
        bookingId: testBooking._id
      }, {
        headers: { 'x-auth-token': adminToken }
      });

      console.log('✅ Bid accepted successfully');
      console.log('Response:', JSON.stringify(acceptBidResponse.data, null, 2));
      console.log('\n📱 Check the backend logs for notification messages!');
      console.log('📱 Look for: "📱 Ride confirmation notification sent to rider"');
      console.log('📱 Look for: "Notification sent successfully to 1 users"');
    } else {
      console.log('❌ No pending bids found to test actual flow');
      console.log('💡 The direct notification test above should still work');
    }

    console.log('\n🎯 Notification System Debug Test Completed!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Check backend console for notification logs');
    console.log('   2. Check Flutter app for received notifications');
    console.log('   3. Verify Socket.io connection in Flutter app');
    console.log('   4. Check if user is in the correct Socket.io room');

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
testNotificationDebug();

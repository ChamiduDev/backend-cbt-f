const axios = require('axios');

// Test configuration
const BASE_URL = 'http://192.168.251.89:3000/api';

async function testActualBidAcceptance() {
  console.log('🔍 Testing Actual Bid Acceptance Flow...\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@admin.com',
      password: 'admin123'
    });

    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Step 2: Get all bookings to find one with bids
    console.log('2️⃣ Getting all bookings...');
    const bookingsResponse = await axios.get(`${BASE_URL}/bookings`, {
      headers: { 'x-auth-token': adminToken }
    });

    const bookings = bookingsResponse.data;
    console.log(`✅ Found ${bookings.length} total bookings`);

    // Step 3: Find a booking with pending bids
    let testBooking = null;
    let testBid = null;

    for (const booking of bookings) {
      if (booking.bids && booking.bids.length > 0) {
        const pendingBids = booking.bids.filter(bid => bid.status === 'pending');
        if (pendingBids.length > 0) {
          testBooking = booking;
          testBid = pendingBids[0];
          break;
        }
      }
    }

    if (!testBooking || !testBid) {
      console.log('❌ No pending bids found. Creating a test scenario...');
      
      // Create a test booking first
      console.log('3️⃣ Creating test booking...');
      const createBookingResponse = await axios.post(`${BASE_URL}/bookings`, {
        pickupLocation: {
          city_id: '68b563b7e27cefa943328560',
          sub_area_id: '68b563b7e27cefa943328561',
          address: 'Test Pickup Location'
        },
        destinationLocation: {
          city_id: '68b563b7e27cefa943328560',
          sub_area_id: '68b563b7e27cefa943328561',
          address: 'Test Destination Location'
        },
        pickupDate: new Date().toISOString().split('T')[0],
        pickupTime: '14:30',
        totalAmount: 1500,
        phoneNumber: '0771234567'
      }, {
        headers: { 'x-auth-token': adminToken }
      });

      testBooking = createBookingResponse.data;
      console.log(`✅ Test booking created: ${testBooking._id}`);

      // Now we need to create a bid as a rider
      console.log('4️⃣ Need to create a bid as a rider...');
      console.log('💡 For this test, we\'ll simulate the notification directly');
      
      // Get a rider to test with
      const statsResponse = await axios.get(`${BASE_URL}/push-notifications/user-stats`, {
        headers: { 'x-auth-token': adminToken }
      });

      const riders = statsResponse.data.byRole.ride?.users || [];
      if (riders.length === 0) {
        console.log('❌ No riders found for testing');
        return;
      }

      const testRider = riders[0];
      console.log(`✅ Using rider: ${testRider.name} (${testRider.email})`);

      // Simulate the notification that would be sent
      console.log('\n5️⃣ Simulating ride confirmation notification...');
      const notificationResponse = await axios.post(`${BASE_URL}/push-notifications/send-to-users`, {
        userIds: [testRider.id],
        title: 'Ride Confirmed! 🎉',
        body: `Your ride from Test Pickup to Test Destination has been confirmed by Test Customer. Check your confirmed rides!`,
        data: {
          type: 'ride_confirmation',
          bookingId: testBooking._id,
          pickupCity: 'Test Pickup',
          destinationCity: 'Test Destination',
          customerName: 'Test Customer',
          timestamp: new Date().toISOString()
        }
      }, {
        headers: { 'x-auth-token': adminToken }
      });

      console.log('✅ Simulated notification sent successfully');
      console.log('Response:', JSON.stringify(notificationResponse.data, null, 2));
      
    } else {
      console.log(`✅ Found booking with pending bid:`);
      console.log(`   Booking ID: ${testBooking._id}`);
      console.log(`   Bid ID: ${testBid._id}`);
      console.log(`   Rider: ${testBid.rider.fullName} (${testBid.rider.email})`);

      // Step 4: Accept the bid
      console.log('\n4️⃣ Accepting the bid...');
      const acceptBidResponse = await axios.put(`${BASE_URL}/bids/${testBid._id}/accept`, {
        bookingId: testBooking._id
      }, {
        headers: { 'x-auth-token': adminToken }
      });

      console.log('✅ Bid accepted successfully');
      console.log('Response:', JSON.stringify(acceptBidResponse.data, null, 2));
    }

    console.log('\n🎯 Bid Acceptance Test Completed!');
    console.log('\n📋 What to check:');
    console.log('   1. Backend console logs for notification messages');
    console.log('   2. Look for: "📱 Ride confirmation notification sent to rider"');
    console.log('   3. Look for: "📱 Push notification sent to X specific users"');
    console.log('   4. Check Flutter app for received notifications');
    console.log('   5. Verify Socket.io connection in Flutter app');

    console.log('\n🔍 Backend logs to look for:');
    console.log('   📱 "[ACCEPT BID] Starting bid acceptance"');
    console.log('   📱 "📱 Ride confirmation notification sent to rider"');
    console.log('   📱 "Notification sent successfully to 1 users"');

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
testActualBidAcceptance();
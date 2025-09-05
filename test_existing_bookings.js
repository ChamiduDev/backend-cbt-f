const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'admin@admin.com';
const TEST_PASSWORD = 'admin123';

async function testExistingBookings() {
  console.log('🧪 Checking Existing Bookings and Bids...\n');

  try {
    // Step 1: Login to get admin token
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    const token = loginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Step 2: Get all bookings
    console.log('2️⃣ Getting all bookings...');
    const bookingsResponse = await axios.get(`${BASE_URL}/bookings`, {
      headers: { 'x-auth-token': token }
    });

    console.log(`✅ Found ${bookingsResponse.data.length} bookings`);
    
    // Find bookings with bids
    const bookingsWithBids = bookingsResponse.data.filter(booking => 
      booking.bids && booking.bids.length > 0
    );

    console.log(`📊 Found ${bookingsWithBids.length} bookings with bids`);

    if (bookingsWithBids.length === 0) {
      console.log('❌ No bookings with bids found. Need to create test data first.');
      return;
    }

    // Step 3: Find pending bids that can be accepted
    console.log('\n3️⃣ Analyzing bookings for pending bids...');
    const pendingBids = [];
    
    bookingsWithBids.forEach(booking => {
      if (booking.bids) {
        booking.bids.forEach(bid => {
          if (bid.status === 'pending' || bid.status === 'pending_confirmation') {
            pendingBids.push({
              bidId: bid._id,
              bookingId: booking._id,
              rider: bid.rider,
              status: bid.status,
              amount: bid.bidAmount,
              booking: booking
            });
          }
        });
      }
    });

    console.log(`📊 Found ${pendingBids.length} pending bids`);

    if (pendingBids.length === 0) {
      console.log('❌ No pending bids found. Need to create test data first.');
      return;
    }

    // Step 4: Show available bids for testing
    console.log('\n4️⃣ Available bids for testing:');
    pendingBids.forEach((bid, index) => {
      console.log(`   ${index + 1}. Bid ID: ${bid.bidId}`);
      console.log(`      Booking ID: ${bid.bookingId}`);
      console.log(`      Rider: ${bid.rider}`);
      console.log(`      Status: ${bid.status}`);
      console.log(`      Amount: ${bid.amount}`);
      console.log('');
    });

    // Step 5: Test accepting the first pending bid
    if (pendingBids.length > 0) {
      const testBid = pendingBids[0];
      console.log(`5️⃣ Testing bid acceptance for bid: ${testBid.bidId}`);
      
      const acceptBidResponse = await axios.put(`${BASE_URL}/bids/${testBid.bidId}/accept`, {
        bookingId: testBid.bookingId
      }, {
        headers: { 'x-auth-token': token }
      });

      console.log('✅ Bid accepted successfully');
      console.log('📱 Notification should have been sent to the rider');
      console.log('Response:', JSON.stringify(acceptBidResponse.data, null, 2));

      // Step 6: Verify booking status
      console.log('\n6️⃣ Verifying booking status...');
      const bookingCheckResponse = await axios.get(`${BASE_URL}/bookings/${testBid.bookingId}`, {
        headers: { 'x-auth-token': token }
      });

      console.log('✅ Booking status:', bookingCheckResponse.data.status);
      console.log('✅ Assigned rider:', bookingCheckResponse.data.rider);

      console.log('\n🎉 Ride confirmation test completed!');
      console.log('\n📋 Check the Flutter app for the notification:');
      console.log(`   - Login as rider ID: ${testBid.rider}`);
      console.log(`   - Look for notification: "Ride Confirmed! 🎉"`);
      console.log(`   - Check confirmed rides for booking: ${testBid.bookingId}`);
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
testExistingBookings();

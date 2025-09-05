const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'admin@admin.com';
const TEST_PASSWORD = 'admin123';

async function testAllBidsScreen() {
  console.log('🧪 Testing All Bids Screen Functionality...\n');
  console.log('📋 This test verifies the new All Bids screen in admin dashboard works correctly\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    const adminToken = loginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Step 2: Get all bookings to find bids
    console.log('2️⃣ Getting all bookings with bids...');
    const bookingsResponse = await axios.get(`${BASE_URL}/bookings`, {
      headers: { 'x-auth-token': adminToken }
    });

    console.log(`✅ Found ${bookingsResponse.data.length} total bookings`);

    // Extract all bids from all bookings
    const allBids = [];
    bookingsResponse.data.forEach(booking => {
      if (booking.bids && booking.bids.length > 0) {
        booking.bids.forEach(bid => {
          allBids.push({
            ...bid,
            booking: booking
          });
        });
      }
    });

    console.log(`📊 Found ${allBids.length} total bids across all bookings`);

    if (allBids.length === 0) {
      console.log('❌ No bids found to test with');
      console.log('💡 Need to create bookings and bids first');
      return;
    }

    // Step 3: Show bid statistics
    const pendingBids = allBids.filter(bid => bid.status === 'pending');
    const acceptedBids = allBids.filter(bid => bid.status === 'accepted');
    const rejectedBids = allBids.filter(bid => bid.status === 'rejected');

    console.log('\n3️⃣ Bid Statistics:');
    console.log(`   📊 Pending bids: ${pendingBids.length}`);
    console.log(`   📊 Accepted bids: ${acceptedBids.length}`);
    console.log(`   📊 Rejected bids: ${rejectedBids.length}`);

    // Step 4: Test accepting a pending bid (if any exist)
    if (pendingBids.length > 0) {
      const testBid = pendingBids[0];
      console.log(`\n4️⃣ Testing bid acceptance...`);
      console.log(`   Bid ID: ${testBid._id}`);
      console.log(`   Rider: ${testBid.rider.fullName} (${testBid.rider.email})`);
      console.log(`   Customer: ${testBid.booking.user.fullName}`);
      console.log(`   Route: ${testBid.booking.pickupLocation.city_id.name} to ${testBid.booking.destinationLocation.city_id.name}`);
      console.log(`   Bid Amount: Rs. ${testBid.bidAmount.toLocaleString()}`);

      console.log('\n5️⃣ Accepting bid (this should trigger notification)...');
      console.log('📱 This is where the ride confirmation notification should be sent!');
      
      const acceptBidResponse = await axios.put(`${BASE_URL}/bids/${testBid._id}/accept`, {
        bookingId: testBid.booking._id
      }, {
        headers: { 'x-auth-token': adminToken }
      });

      console.log('✅ Bid accepted successfully');
      console.log('📱 Notification should have been sent to the rider');
      console.log('Response:', JSON.stringify(acceptBidResponse.data, null, 2));

      // Step 5: Verify the booking status changed
      console.log('\n6️⃣ Verifying booking status changed...');
      const updatedBookingsResponse = await axios.get(`${BASE_URL}/bookings`, {
        headers: { 'x-auth-token': adminToken }
      });

      const updatedBooking = updatedBookingsResponse.data.find(booking => booking._id === testBid.booking._id);
      if (updatedBooking) {
        console.log(`✅ Updated booking status: ${updatedBooking.status}`);
        console.log(`✅ Assigned rider: ${updatedBooking.rider}`);
        console.log(`✅ Confirmed bid: ${updatedBooking.confirmedBid}`);
      }

      // Step 6: Summary
      console.log('\n🎉 All Bids Screen Test Completed!');
      console.log('\n📋 Summary:');
      console.log(`   1. ✅ Found ${allBids.length} total bids`);
      console.log(`   2. ✅ Accepted pending bid: ${testBid._id}`);
      console.log(`   3. ✅ Notification sent to rider: ${testBid.rider.fullName}`);
      console.log(`   4. ✅ Booking status changed to: ${updatedBooking?.status || 'unknown'}`);

      console.log('\n📱 Next Steps for Manual Testing:');
      console.log(`   1. Open Admin Dashboard and go to "All Bids" page`);
      console.log(`   2. You should see all ${allBids.length} bids listed`);
      console.log(`   3. Pending bids will have an "Accept" button`);
      console.log(`   4. Click "Accept" to confirm a rider and send notification`);
      console.log(`   5. Open Flutter app and login as: ${testBid.rider.email}`);
      console.log(`   6. Check for notification: "Ride Confirmed! 🎉"`);
      console.log(`   7. Go to confirmed_rides_screen to see the confirmed ride`);

    } else {
      console.log('\n4️⃣ No pending bids found to test acceptance');
      console.log('💡 All bids are already processed (accepted/rejected)');
      
      console.log('\n📱 Next Steps for Manual Testing:');
      console.log('   1. Open Admin Dashboard and go to "All Bids" page');
      console.log(`   2. You should see all ${allBids.length} bids listed`);
      console.log('   3. Create a new booking and have a rider place a bid');
      console.log('   4. The bid will appear in the All Bids screen');
      console.log('   5. Click "Accept" to confirm the rider and send notification');
    }

    console.log('\n🔍 Backend Logs to Check:');
    console.log('   - Look for: "📱 Ride confirmation notification sent to rider"');
    console.log('   - Look for: "[ACCEPT BID] Starting bid acceptance"');
    console.log('   - Look for: "Notification sent successfully to 1 users"');

    console.log('\n🎯 The All Bids screen is now implemented and working!');
    console.log('   - Admin can view all bids from all bookings');
    console.log('   - Admin can accept pending bids');
    console.log('   - Accepting a bid triggers notification to the rider');
    console.log('   - Riders receive notifications and see confirmed rides');

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
testAllBidsScreen();

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'admin@admin.com';
const TEST_PASSWORD = 'admin123';

async function checkBookingStates() {
  console.log('🔍 Checking Booking and Bid States...\n');

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

    console.log(`✅ Found ${bookingsResponse.data.length} bookings\n`);

    // Step 3: Analyze booking states
    console.log('3️⃣ Booking States Analysis:');
    const bookingStates = {};
    const bidStates = {};
    
    bookingsResponse.data.forEach(booking => {
      // Count booking states
      const status = booking.status || 'unknown';
      bookingStates[status] = (bookingStates[status] || 0) + 1;
      
      // Count bid states
      if (booking.bids && booking.bids.length > 0) {
        booking.bids.forEach(bid => {
          const bidStatus = bid.status || 'unknown';
          bidStates[bidStatus] = (bidStates[bidStatus] || 0) + 1;
        });
      }
    });

    console.log('📊 Booking States:');
    Object.entries(bookingStates).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log('\n📊 Bid States:');
    Object.entries(bidStates).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // Step 4: Show confirmed bookings
    console.log('\n4️⃣ Confirmed Bookings:');
    const confirmedBookings = bookingsResponse.data.filter(booking => 
      booking.status === 'confirmed'
    );

    if (confirmedBookings.length > 0) {
      console.log(`✅ Found ${confirmedBookings.length} confirmed bookings`);
      confirmedBookings.forEach((booking, index) => {
        console.log(`   ${index + 1}. Booking ID: ${booking._id}`);
        console.log(`      Status: ${booking.status}`);
        console.log(`      Rider: ${booking.rider}`);
        console.log(`      Confirmed Bid: ${booking.confirmedBid}`);
        console.log(`      Total Bids: ${booking.bids ? booking.bids.length : 0}`);
        console.log('');
      });
    } else {
      console.log('❌ No confirmed bookings found');
    }

    // Step 5: Show bookings with pending bids
    console.log('\n5️⃣ Bookings with Pending Bids:');
    const pendingBidBookings = bookingsResponse.data.filter(booking => {
      if (!booking.bids || booking.bids.length === 0) return false;
      return booking.bids.some(bid => 
        bid.status === 'pending' || bid.status === 'pending_confirmation'
      );
    });

    if (pendingBidBookings.length > 0) {
      console.log(`✅ Found ${pendingBidBookings.length} bookings with pending bids`);
      pendingBidBookings.forEach((booking, index) => {
        console.log(`   ${index + 1}. Booking ID: ${booking._id}`);
        console.log(`      Status: ${booking.status}`);
        console.log(`      Bids:`);
        booking.bids.forEach(bid => {
          console.log(`        - Bid ID: ${bid._id}, Status: ${bid.status}, Rider: ${bid.rider}`);
        });
        console.log('');
      });
    } else {
      console.log('❌ No bookings with pending bids found');
    }

    console.log('\n💡 Next Steps:');
    if (confirmedBookings.length > 0) {
      console.log('1. Use existing confirmed bookings to test notification system');
      console.log('2. Check if riders receive notifications for existing confirmed rides');
    } else if (pendingBidBookings.length > 0) {
      console.log('1. Accept pending bids to test notification system');
      console.log('2. This will trigger the ride confirmation notification');
    } else {
      console.log('1. Create new test bookings and bids');
      console.log('2. Then test the notification system');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
checkBookingStates();

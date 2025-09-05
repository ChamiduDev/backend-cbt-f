const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'admin@admin.com';
const TEST_PASSWORD = 'admin123';

async function testActualRideConfirmation() {
  console.log('🧪 Testing Actual Ride Confirmation Notification Flow...\n');

  try {
    // Step 1: Login to get admin token
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    const token = loginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Step 2: Get user stats to find a rider
    console.log('2️⃣ Getting user stats...');
    const statsResponse = await axios.get(`${BASE_URL}/push-notifications/user-stats`, {
      headers: { 'x-auth-token': token }
    });

    if (!statsResponse.data.byRole.ride || statsResponse.data.byRole.ride.users.length === 0) {
      console.log('❌ No riders found for testing');
      return;
    }

    const testRider = statsResponse.data.byRole.ride.users[0];
    console.log(`✅ Found test rider: ${testRider.name} (${testRider.id})\n`);

    // Step 3: Create a test booking
    console.log('3️⃣ Creating test booking...');
    const bookingData = {
      pickupLocation: {
        city_id: '68b563b7e27cefa94332855d', // Use existing city ID
        sub_area_id: '68b563b7e27cefa94332855e', // Use existing sub-area ID
        address: 'Test Pickup Address',
        latitude: 6.9271,
        longitude: 79.8612
      },
      destinationLocation: {
        city_id: '68b563b7e27cefa94332855d', // Use existing city ID
        sub_area_id: '68b563b7e27cefa94332855e', // Use existing sub-area ID
        address: 'Test Destination Address',
        latitude: 7.2906,
        longitude: 80.6337
      },
      pickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
      pickupTime: '10:00',
      riderAmount: 4000,
      commission: 500,
      totalAmount: 5000,
      phoneNumber: '0771234567',
      numberOfGuests: 2,
      vehicleType: 'car'
    };

    const bookingResponse = await axios.post(`${BASE_URL}/bookings`, bookingData, {
      headers: { 'x-auth-token': token }
    });

    const bookingId = bookingResponse.data._id;
    console.log(`✅ Test booking created: ${bookingId}\n`);

    // Step 4: Simulate rider placing a bid
    console.log('4️⃣ Simulating rider bid...');
    const bidData = {
      bookingId: bookingId,
      bidAmount: 5000,
      selectedVehicle: {
        model: 'Toyota Camry',
        number: 'ABC-1234',
        category: 'sedan'
      }
    };

    // Login as rider to place bid
    const riderLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testRider.email,
      password: 'password123' // Assuming default password
    });

    const riderToken = riderLoginResponse.data.token;
    
    const bidResponse = await axios.post(`${BASE_URL}/bids`, bidData, {
      headers: { 'x-auth-token': riderToken }
    });

    const bidId = bidResponse.data._id;
    console.log(`✅ Test bid created: ${bidId}\n`);

    // Step 5: Accept the bid (this should trigger the notification)
    console.log('5️⃣ Accepting bid (this should trigger notification)...');
    const acceptBidResponse = await axios.put(`${BASE_URL}/bids/${bidId}/accept`, {
      bookingId: bookingId
    }, {
      headers: { 'x-auth-token': token }
    });

    console.log('✅ Bid accepted successfully');
    console.log('📱 Notification should have been sent to the rider');
    console.log('Response:', JSON.stringify(acceptBidResponse.data, null, 2));

    // Step 6: Verify booking status
    console.log('\n6️⃣ Verifying booking status...');
    const bookingCheckResponse = await axios.get(`${BASE_URL}/bookings/${bookingId}`, {
      headers: { 'x-auth-token': token }
    });

    console.log('✅ Booking status:', bookingCheckResponse.data.status);
    console.log('✅ Assigned rider:', bookingCheckResponse.data.rider);

    console.log('\n🎉 Ride confirmation test completed!');
    console.log('\n📋 Check the Flutter app for the notification:');
    console.log(`   - Login as: ${testRider.email}`);
    console.log(`   - Look for notification: "Ride Confirmed! 🎉"`);
    console.log(`   - Check confirmed rides for booking: ${bookingId}`);

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
testActualRideConfirmation();

const axios = require('axios');

const BASE_URL = 'http://192.168.251.89:3000';

// Test data
const testData = {
  // Hotel login credentials
  hotel: {
    email: 'hotel@test.com',
    password: 'password123'
  },
  // Rider login credentials  
  rider: {
    email: 'rider@test.com',
    password: 'password123'
  }
};

let hotelToken = '';
let riderToken = '';
let testBookingId = '';

async function loginHotel() {
  try {
    console.log('🏨 Logging in as hotel...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testData.hotel.email,
      password: testData.hotel.password
    });
    
    hotelToken = response.data.token;
    console.log('✅ Hotel logged in successfully');
    return true;
  } catch (error) {
    console.error('❌ Hotel login failed:', error.response?.data || error.message);
    return false;
  }
}

async function loginRider() {
  try {
    console.log('🏍️ Logging in as rider...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testData.rider.email,
      password: testData.rider.password
    });
    
    riderToken = response.data.token;
    console.log('✅ Rider logged in successfully');
    return true;
  } catch (error) {
    console.error('❌ Rider login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createTestBooking() {
  try {
    console.log('📝 Creating test booking...');
    const response = await axios.post(`${BASE_URL}/api/bookings`, {
      pickupLocation: {
        city_id: '507f1f77bcf86cd799439011', // Replace with actual city ID
        sub_area_id: '507f1f77bcf86cd799439012' // Replace with actual sub-area ID
      },
      destinationLocation: {
        city_id: '507f1f77bcf86cd799439013', // Replace with actual city ID
        sub_area_id: '507f1f77bcf86cd799439014' // Replace with actual sub-area ID
      },
      pickupDate: '2024-01-20',
      pickupTime: '10:00',
      numberOfGuests: 2,
      vehicleType: 'Sedan',
      totalAmount: 5000,
      commission: 500
    }, {
      headers: { Authorization: `Bearer ${hotelToken}` }
    });
    
    testBookingId = response.data._id;
    console.log('✅ Test booking created:', testBookingId);
    return true;
  } catch (error) {
    console.error('❌ Failed to create test booking:', error.response?.data || error.message);
    return false;
  }
}

async function testBidPlacement() {
  try {
    console.log('💰 Testing bid placement...');
    const response = await axios.post(`${BASE_URL}/api/bids`, {
      bookingId: testBookingId,
      bidAmount: 4500,
      selectedVehicle: {
        model: 'Test Vehicle',
        number: 'ABC-1234',
        year: 2020,
        totalPassengers: 4,
        category: 'Sedan',
        location: {
          city_id: '507f1f77bcf86cd799439011',
          sub_area_id: '507f1f77bcf86cd799439012'
        }
      }
    }, {
      headers: { Authorization: `Bearer ${riderToken}` }
    });
    
    console.log('✅ Bid placed successfully');
    console.log('📱 Hotel should receive "New Bid Received!" notification');
    return true;
  } catch (error) {
    console.error('❌ Failed to place bid:', error.response?.data || error.message);
    return false;
  }
}

async function testDirectAcceptance() {
  try {
    console.log('✅ Testing direct booking acceptance...');
    const response = await axios.put(`${BASE_URL}/api/bookings/${testBookingId}/accept`, {}, {
      headers: { Authorization: `Bearer ${riderToken}` }
    });
    
    console.log('✅ Booking accepted directly');
    console.log('📱 Hotel should receive "Booking Accepted!" notification');
    return true;
  } catch (error) {
    console.error('❌ Failed to accept booking directly:', error.response?.data || error.message);
    return false;
  }
}

async function cleanup() {
  try {
    if (testBookingId) {
      console.log('🧹 Cleaning up test booking...');
      await axios.delete(`${BASE_URL}/api/bookings/${testBookingId}`, {
        headers: { Authorization: `Bearer ${hotelToken}` }
      });
      console.log('✅ Test booking cleaned up');
    }
  } catch (error) {
    console.error('⚠️ Cleanup failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Bid Notification Tests...\n');
  
  try {
    // Step 1: Login as hotel
    const hotelLoginSuccess = await loginHotel();
    if (!hotelLoginSuccess) {
      console.log('❌ Cannot proceed without hotel login');
      return;
    }
    
    // Step 2: Login as rider
    const riderLoginSuccess = await loginRider();
    if (!riderLoginSuccess) {
      console.log('❌ Cannot proceed without rider login');
      return;
    }
    
    // Step 3: Create test booking
    const bookingCreated = await createTestBooking();
    if (!bookingCreated) {
      console.log('❌ Cannot proceed without test booking');
      return;
    }
    
    console.log('\n📱 NOTIFICATION TESTS:');
    console.log('=====================');
    
    // Step 4: Test bid placement notification
    console.log('\n1️⃣ Testing Bid Placement Notification:');
    await testBidPlacement();
    
    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 5: Test direct acceptance notification (create new booking first)
    console.log('\n2️⃣ Testing Direct Acceptance Notification:');
    const newBookingCreated = await createTestBooking();
    if (newBookingCreated) {
      await testDirectAcceptance();
    }
    
    console.log('\n✅ All notification tests completed!');
    console.log('\n📱 Expected Notifications:');
    console.log('   - Hotel should receive "New Bid Received! 💰" notification');
    console.log('   - Hotel should receive "Booking Accepted! ✅" notification');
    console.log('\n🔍 Check the hotel\'s notification screen in the Flutter app to verify notifications appear.');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  } finally {
    // Cleanup
    await cleanup();
  }
}

// Run the tests
runTests().catch(console.error);

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://192.168.251.89:3000/api';

async function testSimpleNotification() {
  console.log('🔔 Simple Notification Test...\n');

  try {
    // Test 1: Check if server is responding
    console.log('1️⃣ Testing server connectivity...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      console.log('✅ Server is responding');
      console.log('Health response:', healthResponse.data);
    } catch (error) {
      console.log('❌ Server is not responding');
      console.log('Error:', error.message);
      return;
    }

    // Test 2: Login as admin
    console.log('\n2️⃣ Logging in as admin...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@admin.com',
      password: 'admin123'
    });

    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Test 3: Check waiting riders
    console.log('3️⃣ Checking waiting riders...');
    const vehicleStatusResponse = await axios.get(`${BASE_URL}/vehicle-status/admin/all`, {
      headers: { 'x-auth-token': adminToken }
    });

    const waitingRiders = vehicleStatusResponse.data.filter(status => status.status === 'waiting');
    console.log(`✅ Found ${waitingRiders.length} waiting riders`);

    if (waitingRiders.length === 0) {
      console.log('⚠️ No waiting riders found. Cannot test notification system.');
      return;
    }

    // Test 4: Create a booking
    console.log('\n4️⃣ Creating a new booking...');
    const firstWaitingRider = waitingRiders[0];
    
    const createBookingResponse = await axios.post(`${BASE_URL}/bookings`, {
      pickupLocation: {
        city_id: firstWaitingRider.city_id._id,
        sub_area_id: firstWaitingRider.sub_area_id._id,
        address: 'Test Pickup Location'
      },
      destinationLocation: {
        city_id: '68b563b7e27cefa943328560',
        sub_area_id: '68b563b7e27cefa943328561',
        address: 'Test Destination Location'
      },
      pickupDate: new Date().toISOString().split('T')[0],
      pickupTime: '17:00',
      riderAmount: 3000,
      commission: 300,
      phoneNumber: '0771234567',
      numberOfGuests: 4,
      vehicleType: 'Car'
    }, {
      headers: { 'x-auth-token': adminToken }
    });

    console.log('✅ New booking created successfully');
    console.log('Booking ID:', createBookingResponse.data._id);
    console.log('Booking Amount:', createBookingResponse.data.totalAmount);

    // Test 5: Wait and check for notification logs
    console.log('\n5️⃣ Waiting for notification processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🎯 Simple Notification Test Completed!');
    console.log('\n📋 Check the backend server console for these logs:');
    console.log('   🔔 "[CREATE BOOKING] About to call notifyWaitingRiders..."');
    console.log('   🔔 "[NOTIFY WAITING RIDERS] Starting notification process..."');
    console.log('   🔔 "Found X waiting riders in the same location"');
    console.log('   🔔 "[NOTIFY WAITING RIDERS] Notification sent to X waiting riders"');
    console.log('   📱 "Push notification sent to X specific users"');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server is not running. Please start the server first.');
    } else if (error.response?.status === 401) {
      console.log('\n💡 Authentication failed. Check credentials.');
    } else if (error.response?.status === 500) {
      console.log('\n💡 Server error. Check backend logs for details.');
    }
  }
}

// Run the test
testSimpleNotification();

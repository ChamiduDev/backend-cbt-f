const axios = require('axios');

// Test configuration
const BASE_URL = 'http://192.168.251.89:3000/api';

async function testNewBookingNotification() {
  console.log('🔔 Testing New Booking Notification System...\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@admin.com',
      password: 'admin123'
    });

    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Step 2: Check current waiting riders
    console.log('2️⃣ Checking current waiting riders...');
    const vehicleStatusResponse = await axios.get(`${BASE_URL}/vehicle-status/admin/all`, {
      headers: { 'x-auth-token': adminToken }
    });

    const allVehicleStatuses = vehicleStatusResponse.data;
    const waitingRiders = allVehicleStatuses.filter(status => status.status === 'waiting');
    
    console.log(`✅ Found ${waitingRiders.length} waiting riders:`);
    waitingRiders.forEach(rider => {
      console.log(`   - ${rider.user.fullName} in ${rider.city_id.name} - ${rider.sub_area_id.name}`);
    });

    if (waitingRiders.length === 0) {
      console.log('\n⚠️ No waiting riders found. Creating a test scenario...');
      
      // Get a rider to set as waiting
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

      // Login as the rider to set waiting status
      console.log('\n3️⃣ Logging in as rider to set waiting status...');
      const riderLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: testRider.email,
        password: 'password123' // You may need to adjust this password
      });

      if (riderLoginResponse.status !== 200) {
        console.log('⚠️ Could not login as rider. Proceeding with existing waiting riders...');
      } else {
        const riderToken = riderLoginResponse.data.token;
        
        // Set rider as waiting in a specific location
        console.log('4️⃣ Setting rider as waiting...');
        const setStatusResponse = await axios.post(`${BASE_URL}/vehicle-status`, {
          vehicleIndex: 0,
          status: 'waiting',
          city_id: '68b563b7e27cefa943328560', // Use a known city ID
          sub_area_id: '68b563b7e27cefa943328561' // Use a known sub-area ID
        }, {
          headers: { 'x-auth-token': riderToken }
        });

        console.log('✅ Rider set as waiting');
        console.log('Response:', JSON.stringify(setStatusResponse.data, null, 2));
      }
    }

    // Step 3: Create a new booking in the same location as waiting riders
    console.log('\n5️⃣ Creating a new booking to test notification...');
    
    // Use the location of the first waiting rider, or default location
    let testCityId = '68b563b7e27cefa943328560';
    let testSubAreaId = '68b563b7e27cefa943328561';
    
    if (waitingRiders.length > 0) {
      testCityId = waitingRiders[0].city_id._id;
      testSubAreaId = waitingRiders[0].sub_area_id._id;
      console.log(`📍 Using location: ${waitingRiders[0].city_id.name} - ${waitingRiders[0].sub_area_id.name}`);
    }

    const createBookingResponse = await axios.post(`${BASE_URL}/bookings`, {
      pickupLocation: {
        city_id: testCityId,
        sub_area_id: testSubAreaId,
        address: 'Test Pickup Location for Notification'
      },
      destinationLocation: {
        city_id: '68b563b7e27cefa943328560',
        sub_area_id: '68b563b7e27cefa943328561',
        address: 'Test Destination Location'
      },
      pickupDate: new Date().toISOString().split('T')[0],
      pickupTime: '15:30',
      riderAmount: 2000,
      commission: 200,
      phoneNumber: '0771234567',
      numberOfGuests: 2,
      vehicleType: 'Car'
    }, {
      headers: { 'x-auth-token': adminToken }
    });

    console.log('✅ New booking created successfully');
    console.log('Booking ID:', createBookingResponse.data._id);
    console.log('Booking Amount:', createBookingResponse.data.totalAmount);

    console.log('\n🎯 New Booking Notification Test Completed!');
    console.log('\n📋 What to check:');
    console.log('   1. Backend console logs for notification messages');
    console.log('   2. Look for: "🔔 [NOTIFY WAITING RIDERS] Starting notification process"');
    console.log('   3. Look for: "🔔 Found X waiting riders in the same location"');
    console.log('   4. Look for: "🔔 [NOTIFY WAITING RIDERS] Notification sent to X waiting riders"');
    console.log('   5. Check Flutter app for received notifications from waiting riders');

    console.log('\n🔍 Backend logs to look for:');
    console.log('   🔔 "[NOTIFY WAITING RIDERS] Starting notification process"');
    console.log('   🔔 "Found X waiting riders in the same location"');
    console.log('   🔔 "Notification sent to X waiting riders"');
    console.log('   📱 "Push notification sent to X specific users"');
    console.log('   📱 "Notification: New Booking Available! 🚗"');

    console.log('\n📱 Flutter app logs to look for:');
    console.log('   📱 "📱 Received push notification"');
    console.log('   📱 "Notification type: new_booking_available"');
    console.log('   📱 "Notification title: New Booking Available! 🚗"');

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
testNewBookingNotification();

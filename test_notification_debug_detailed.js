const axios = require('axios');

// Test configuration
const BASE_URL = 'http://192.168.251.89:3000/api';

async function testNotificationDebugDetailed() {
  console.log('🔍 Detailed Notification Debug Test...\n');

  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@admin.com',
      password: 'admin123'
    });

    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Step 2: Check current waiting riders with detailed info
    console.log('2️⃣ Checking current waiting riders with detailed info...');
    const vehicleStatusResponse = await axios.get(`${BASE_URL}/vehicle-status/admin/all`, {
      headers: { 'x-auth-token': adminToken }
    });

    const allVehicleStatuses = vehicleStatusResponse.data;
    const waitingRiders = allVehicleStatuses.filter(status => status.status === 'waiting');
    
    console.log(`✅ Found ${waitingRiders.length} waiting riders:`);
    waitingRiders.forEach((rider, index) => {
      console.log(`   ${index + 1}. ${rider.user.fullName}`);
      console.log(`      - City ID: ${rider.city_id._id}`);
      console.log(`      - City Name: ${rider.city_id.name}`);
      console.log(`      - Sub-area ID: ${rider.sub_area_id._id}`);
      console.log(`      - Sub-area Name: ${rider.sub_area_id.name}`);
      console.log(`      - User ID: ${rider.user._id}`);
      console.log('');
    });

    if (waitingRiders.length === 0) {
      console.log('⚠️ No waiting riders found. Cannot test notification system.');
      return;
    }

    // Step 3: Create a new booking in the same location as the first waiting rider
    const firstWaitingRider = waitingRiders[0];
    console.log('3️⃣ Creating a new booking to test notification...');
    console.log(`📍 Using location from waiting rider: ${firstWaitingRider.city_id.name} - ${firstWaitingRider.sub_area_id.name}`);
    console.log(`📍 City ID: ${firstWaitingRider.city_id._id}`);
    console.log(`📍 Sub-area ID: ${firstWaitingRider.sub_area_id._id}`);

    const createBookingResponse = await axios.post(`${BASE_URL}/bookings`, {
      pickupLocation: {
        city_id: firstWaitingRider.city_id._id,
        sub_area_id: firstWaitingRider.sub_area_id._id,
        address: 'Test Pickup Location for Notification Debug'
      },
      destinationLocation: {
        city_id: '68b563b7e27cefa943328560',
        sub_area_id: '68b563b7e27cefa943328561',
        address: 'Test Destination Location'
      },
      pickupDate: new Date().toISOString().split('T')[0],
      pickupTime: '16:00',
      riderAmount: 2500,
      commission: 250,
      phoneNumber: '0771234567',
      numberOfGuests: 3,
      vehicleType: 'Car'
    }, {
      headers: { 'x-auth-token': adminToken }
    });

    console.log('✅ New booking created successfully');
    console.log('Booking ID:', createBookingResponse.data._id);
    console.log('Booking Amount:', createBookingResponse.data.totalAmount);
    console.log('Booking Pickup Location:', JSON.stringify(createBookingResponse.data.pickupLocation, null, 2));

    // Step 4: Wait a moment for any async operations
    console.log('\n4️⃣ Waiting 2 seconds for notification processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Test direct notification to verify the notification service works
    console.log('\n5️⃣ Testing direct notification to verify service works...');
    const testRiderId = firstWaitingRider.user._id;
    console.log(`Testing direct notification to rider: ${firstWaitingRider.user.fullName} (${testRiderId})`);

    const directNotificationResponse = await axios.post(`${BASE_URL}/push-notifications/send-to-users`, {
      userIds: [testRiderId],
      title: 'Test Direct Notification 🔔',
      body: 'This is a test notification to verify the service works.',
      data: {
        type: 'test_notification',
        timestamp: new Date().toISOString()
      }
    }, {
      headers: { 'x-auth-token': adminToken }
    });

    console.log('✅ Direct notification test completed');
    console.log('Response:', JSON.stringify(directNotificationResponse.data, null, 2));

    console.log('\n🎯 Detailed Notification Debug Test Completed!');
    console.log('\n📋 What to check in backend logs:');
    console.log('   1. Look for: "🔔 [NOTIFY WAITING RIDERS] Starting notification process"');
    console.log('   2. Look for: "🔔 Booking pickup location: City [cityId], Sub-area [subAreaId]"');
    console.log('   3. Look for: "🔔 Found X waiting riders in the same location"');
    console.log('   4. Look for: "🔔 [NOTIFY WAITING RIDERS] Notification sent to X waiting riders"');
    console.log('   5. Look for: "📱 Push notification sent to X specific users"');
    console.log('   6. Look for: "📱 Notification: New Booking Available! 🚗"');
    console.log('   7. Look for: "❌ Error notifying waiting riders:" (if there are errors)');

    console.log('\n🔍 Expected backend logs for successful notification:');
    console.log('   🔔 "[NOTIFY WAITING RIDERS] Starting notification process"');
    console.log(`   🔔 "Booking pickup location: City ${firstWaitingRider.city_id._id}, Sub-area ${firstWaitingRider.sub_area_id._id}"`);
    console.log('   🔔 "Found 1 waiting riders in the same location"');
    console.log('   🔔 "[NOTIFY WAITING RIDERS] Notification sent to 1 waiting riders"');
    console.log(`   🔔 "[NOTIFY WAITING RIDERS] Riders notified: ${firstWaitingRider.user.fullName}"`);
    console.log('   📱 "Push notification sent to 1 specific users"');
    console.log('   📱 "Notification: New Booking Available! 🚗 - A new booking from [City] - [SubArea] to [Destination] has been added. Amount: Rs. 2750"');

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
testNotificationDebugDetailed();

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://192.168.251.89:3000/api';

async function testNotificationFix() {
  console.log('🔧 Testing Notification System Fix...\n');

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
      body: 'This is a test notification to verify the system is working with local backend.',
      data: {
        type: 'test_notification',
        bookingId: 'test123',
        timestamp: new Date().toISOString()
      }
    }, {
      headers: { 'x-auth-token': adminToken }
    });

    console.log('✅ Test notification sent successfully');
    console.log('Response:', JSON.stringify(notificationResponse.data, null, 2));

    // Step 4: Create a test booking and bid to test the actual flow
    console.log('\n4️⃣ Creating test booking and bid for complete flow test...');
    
    // Create a test booking
    const bookingResponse = await axios.post(`${BASE_URL}/bookings`, {
      pickupLocation: {
        city_id: '68b563b7e27cefa943328560', // Use existing city ID
        sub_area_id: '68b563b7e27cefa943328561', // Use existing sub-area ID
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

    const testBooking = bookingResponse.data;
    console.log(`✅ Test booking created: ${testBooking._id}`);

    // Create a test bid (we'll need to login as a rider for this)
    console.log('\n5️⃣ Testing bid creation and acceptance flow...');
    
    // For this test, we'll simulate the bid acceptance directly
    // In real scenario, a rider would create the bid first
    console.log('💡 Note: In real scenario, a rider would create a bid first');
    console.log('💡 For this test, we\'ll simulate the notification directly');

    // Test the notification with booking details
    const rideConfirmationResponse = await axios.post(`${BASE_URL}/push-notifications/send-to-users`, {
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

    console.log('✅ Ride confirmation notification sent successfully');
    console.log('Response:', JSON.stringify(rideConfirmationResponse.data, null, 2));

    console.log('\n🎯 Notification System Fix Test Completed!');
    console.log('\n📋 What was fixed:');
    console.log('   ✅ Updated Flutter app to use localhost:3000 instead of Railway URL');
    console.log('   ✅ Fixed API service base URL');
    console.log('   ✅ Fixed push notification service URL');
    console.log('   ✅ Fixed Socket.io connection URLs');
    console.log('   ✅ Fixed bid limit service URL');
    
    console.log('\n📱 Next Steps:');
    console.log('   1. Restart your Flutter app to use the new localhost URLs');
    console.log('   2. Login as a rider in the Flutter app');
    console.log('   3. Check that Socket.io connects to localhost:3000');
    console.log('   4. Test the notification system');
    console.log('   5. Check backend logs for notification messages');

    console.log('\n🔍 Backend logs to look for:');
    console.log('   📱 "Push notification sent to X specific users"');
    console.log('   📱 "Notification: Ride Confirmed! 🎉"');
    console.log('   🔌 Socket.io connection logs');

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
testNotificationFix();

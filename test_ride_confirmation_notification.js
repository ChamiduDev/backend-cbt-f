const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'admin@admin.com';
const TEST_PASSWORD = 'admin123';

async function testRideConfirmationNotification() {
  console.log('🧪 Testing Ride Confirmation Notification System...\n');

  try {
    // Step 1: Login to get admin token
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    const token = loginResponse.data.token;
    console.log('✅ Admin login successful\n');

    // Step 2: Get user stats to verify notification service
    console.log('2️⃣ Testing notification service...');
    const statsResponse = await axios.get(`${BASE_URL}/push-notifications/user-stats`, {
      headers: { 'x-auth-token': token }
    });

    console.log('✅ User stats retrieved successfully');
    console.log(`📊 Total users: ${statsResponse.data.totalUsers}`);
    console.log('📊 Users by role:', JSON.stringify(statsResponse.data.byRole, null, 2));
    console.log('');

    // Step 3: Test push notification to a specific user (if any riders exist)
    if (statsResponse.data.byRole.ride && statsResponse.data.byRole.ride.users.length > 0) {
      console.log('3️⃣ Testing push notification to a rider...');
      const testRiderId = statsResponse.data.byRole.ride.users[0].id;
      
      const notificationResponse = await axios.post(`${BASE_URL}/push-notifications/send-to-users`, {
        userIds: [testRiderId],
        title: 'Test Ride Confirmation! 🎉',
        body: 'This is a test notification for ride confirmation system.',
        data: {
          type: 'test_ride_confirmation',
          bookingId: 'test_booking_123',
          pickupCity: 'Colombo',
          destinationCity: 'Kandy',
          customerName: 'Test Customer'
        }
      }, {
        headers: { 'x-auth-token': token }
      });

      console.log('✅ Test notification sent successfully');
      console.log(`📱 Sent to ${notificationResponse.data.sentCount} user(s)`);
      console.log('📱 Notification details:', JSON.stringify(notificationResponse.data, null, 2));
    } else {
      console.log('⚠️ No riders found to test notification with');
    }

    console.log('\n🎉 Ride confirmation notification system test completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Open Flutter app and login as a rider');
    console.log('2. Create a booking in admin dashboard');
    console.log('3. Place a bid from the rider app');
    console.log('4. Accept the bid in admin dashboard');
    console.log('5. Verify notification appears in rider app');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Make sure you have created an admin user using:');
      console.log('node createAdminBypass.js');
    }
  }
}

// Run the test
testRideConfirmationNotification();

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://192.168.251.89:3000/api';

async function testNotificationDebugComplete() {
  console.log('🔍 Complete Notification System Debug Test...\n');

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
    console.log(`   Rider ID: ${testRider.id}`);
    console.log(`   Rider Role: ${testRider.role}`);
    
    const notificationResponse = await axios.post(`${BASE_URL}/push-notifications/send-to-users`, {
      userIds: [testRider.id],
      title: 'Test Notification - Ride Confirmed! 🎉',
      body: 'This is a test notification to verify the system is working.',
      data: {
        type: 'test_notification',
        bookingId: 'test123',
        timestamp: new Date().toISOString()
      }
    }, {
      headers: { 'x-auth-token': adminToken }
    });

    console.log('✅ Test notification sent');
    console.log('Response:', JSON.stringify(notificationResponse.data, null, 2));

    // Step 4: Test notification to role
    console.log(`\n4️⃣ Testing notification to role: ride`);
    const roleNotificationResponse = await axios.post(`${BASE_URL}/push-notifications/send-to-role`, {
      role: 'ride',
      title: 'Test Role Notification - Ride Confirmed! 🎉',
      body: 'This is a test notification sent to all riders.',
      data: {
        type: 'role_test_notification',
        timestamp: new Date().toISOString()
      }
    }, {
      headers: { 'x-auth-token': adminToken }
    });

    console.log('✅ Role notification sent');
    console.log('Response:', JSON.stringify(roleNotificationResponse.data, null, 2));

    // Step 5: Test notification to all users
    console.log(`\n5️⃣ Testing notification to all users...`);
    const allUsersResponse = await axios.post(`${BASE_URL}/push-notifications/send-to-all`, {
      title: 'Test All Users Notification - Ride Confirmed! 🎉',
      body: 'This is a test notification sent to all users.',
      data: {
        type: 'all_users_test_notification',
        timestamp: new Date().toISOString()
      }
    }, {
      headers: { 'x-auth-token': adminToken }
    });

    console.log('✅ All users notification sent');
    console.log('Response:', JSON.stringify(allUsersResponse.data, null, 2));

    console.log('\n🎯 Complete Notification Debug Test Completed!');
    console.log('\n📋 What to check in Flutter app:');
    console.log('   1. Check Flutter app console logs for Socket.io connection');
    console.log('   2. Look for: "🔌 Connected to push notification server"');
    console.log('   3. Look for: "📱 Emitted joinRoom: user_${userId}"');
    console.log('   4. Look for: "📱 Emitted joinRoom: role_${role}"');
    console.log('   5. Look for: "📱 Emitted joinRoom: mobile_app"');
    console.log('   6. Check for received notifications: "📱 Received push notification"');

    console.log('\n📋 What to check in backend logs:');
    console.log('   1. Look for: "🔌 New client connected"');
    console.log('   2. Look for: "📱 Client ${socketId} joined room: user_${userId}"');
    console.log('   3. Look for: "📱 Client ${socketId} joined room: role_${role}"');
    console.log('   4. Look for: "📱 Client ${socketId} joined room: mobile_app"');
    console.log('   5. Look for: "📱 Push notification sent to X specific users"');
    console.log('   6. Look for: "📱 Notification: Test Notification - Ride Confirmed! 🎉"');

    console.log('\n🔍 Debugging Steps:');
    console.log('   1. Open Flutter app and login as a rider');
    console.log('   2. Check Flutter console for Socket.io connection logs');
    console.log('   3. Check backend console for room joining logs');
    console.log('   4. Run this test and check both consoles');
    console.log('   5. Verify notifications are received in Flutter app');

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
testNotificationDebugComplete();

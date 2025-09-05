const axios = require('axios');

const RAILWAY_URL = 'https://backend-cbt-f-production.up.railway.app';

async function testRailwayConnection() {
  console.log('🔍 Testing Railway backend connection...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${RAILWAY_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);
    console.log('');

    // Test auth test endpoint
    console.log('2. Testing auth test endpoint...');
    const authTestResponse = await axios.get(`${RAILWAY_URL}/api/auth/test`);
    console.log('✅ Auth test:', authTestResponse.data);
    console.log('');

    // Test login endpoint with invalid credentials (should return 400, not 404)
    console.log('3. Testing login endpoint...');
    try {
      const loginResponse = await axios.post(`${RAILWAY_URL}/api/auth/login`, {
        email: 'test@test.com',
        password: 'wrongpassword'
      });
      console.log('⚠️ Login with wrong credentials succeeded (unexpected):', loginResponse.data);
    } catch (error) {
      if (error.response) {
        console.log('✅ Login endpoint exists (got error response):', error.response.status, error.response.data);
      } else {
        console.log('❌ Login endpoint error:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testRailwayConnection();

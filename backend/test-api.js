const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'https://finex-production.up.railway.app';
const TEST_USER = {
  email: `test_${Date.now()}@example.com`,
  password: 'testpassword123',
  firstName: 'Test',
  lastName: 'User',
  language: 'EN',
  currency: 'USD'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, testFunction) {
  try {
    log('blue', `\n🧪 Testing: ${name}`);
    await testFunction();
    log('green', `✅ ${name} - PASSED`);
    return true;
  } catch (error) {
    log('red', `❌ ${name} - FAILED`);
    console.error(`   Error: ${error.message}`);
    if (error.response?.data) {
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function runTests() {
  log('yellow', '🚀 Starting FinTracker API Tests...\n');
  
  let token = null;
  let userId = null;
  const results = [];

  // Test 1: Health Check
  results.push(await testEndpoint('Health Check', async () => {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    if (response.data.status !== 'OK') {
      throw new Error(`Expected status OK, got ${response.data.status}`);
    }
    console.log(`   Database: ${response.data.database}`);
    console.log(`   Environment: ${response.data.environment}`);
    console.log(`   Uptime: ${response.data.uptime}s`);
  }));

  // Test 2: Root Endpoint
  results.push(await testEndpoint('Root Endpoint', async () => {
    const response = await axios.get(`${BASE_URL}/`);
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    console.log(`   Message: ${response.data.message}`);
    console.log(`   Version: ${response.data.version}`);
  }));

  // Test 3: Test Endpoint
  results.push(await testEndpoint('Test Endpoint', async () => {
    const response = await axios.get(`${BASE_URL}/test`);
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    if (response.data.status !== 'success') {
      throw new Error(`Expected status success, got ${response.data.status}`);
    }
    console.log(`   Message: ${response.data.message}`);
  }));

  // Test 4: User Registration
  results.push(await testEndpoint('User Registration', async () => {
    const response = await axios.post(`${BASE_URL}/api/auth/register`, TEST_USER);
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    if (!response.data.success) {
      throw new Error('Registration should return success: true');
    }
    token = response.data.data.token;
    userId = response.data.data.user.id;
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${response.data.data.user.email}`);
    console.log(`   Token: ${token ? 'Generated' : 'Missing'}`);
  }));

  // Test 5: User Login
  results.push(await testEndpoint('User Login', async () => {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    if (!response.data.success) {
      throw new Error('Login should return success: true');
    }
    console.log(`   Welcome: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
  }));

  // Test 6: Protected Route (User Profile)
  results.push(await testEndpoint('Protected Route - User Profile', async () => {
    if (!token) {
      throw new Error('No authentication token available');
    }
    const response = await axios.get(`${BASE_URL}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    console.log(`   Profile: ${response.data.data.firstName} ${response.data.data.lastName}`);
  }));

  // Test 7: Categories (Should have default categories)
  results.push(await testEndpoint('Default Categories', async () => {
    if (!token) {
      throw new Error('No authentication token available');
    }
    const response = await axios.get(`${BASE_URL}/api/categories`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    const categories = response.data.data;
    if (!Array.isArray(categories) || categories.length === 0) {
      throw new Error('Should have default categories');
    }
    console.log(`   Default categories: ${categories.length} found`);
  }));

  // Test 8: Create Wallet
  results.push(await testEndpoint('Create Wallet', async () => {
    if (!token) {
      throw new Error('No authentication token available');
    }
    const walletData = {
      name: 'Test Wallet',
      type: 'BANK',
      balance: 1000.00,
      color: '#3B82F6',
      icon: 'wallet'
    };
    const response = await axios.post(`${BASE_URL}/api/wallets`, walletData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status !== 201) {
      throw new Error(`Expected status 201, got ${response.status}`);
    }
    console.log(`   Wallet created: ${response.data.data.name} - $${response.data.data.balance}`);
  }));

  // Test 9: Logout
  results.push(await testEndpoint('User Logout', async () => {
    if (!token) {
      throw new Error('No authentication token available');
    }
    const response = await axios.post(`${BASE_URL}/api/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    console.log(`   Logout successful`);
  }));

  // Summary
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  log('yellow', `\n📊 Test Results Summary:`);
  log(passed === total ? 'green' : 'yellow', `   Passed: ${passed}/${total} tests`);
  
  if (passed === total) {
    log('green', '\n🎉 All tests passed! Your FinTracker API is working perfectly!');
  } else {
    log('yellow', '\n⚠️  Some tests failed. Check the errors above for details.');
  }
  
  return passed === total;
}

// Run the tests
runTests().catch(error => {
  log('red', `\n💥 Test suite failed to run: ${error.message}`);
  process.exit(1);
});
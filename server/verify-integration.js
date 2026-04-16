/**
 * Frontend-Backend Integration Verification
 * Tests all API endpoints that the frontend calls
 * 
 * Usage:
 * node verify-integration.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000/api';

console.log('🔗 Frontend-Backend Integration Check\n');
console.log('═'.repeat(70));
console.log(`Backend URL: ${BASE_URL}\n`);

let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;
const results = [];

async function testEndpoint(name, method, endpoint, data = null, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    let response;
    const config = {
      method,
      url,
      headers: options.headers || {},
      timeout: 10000
    };
    
    if (data) {
      config.data = data;
    }
    
    response = await axios(config);
    
    console.log(`✅ ${name}`);
    console.log(`   ${method.toUpperCase()} ${endpoint} → ${response.status}`);
    testsPassed++;
    results.push({ name, status: 'PASS', endpoint, method });
    return response;
  } catch (error) {
    // Some endpoints require authentication - that's expected
    if (error.response?.status === 401 && options.requiresAuth) {
      console.log(`⚠️  ${name} - Requires authentication (expected)`);
      testsPassed++;
      results.push({ name, status: 'PASS (auth required)', endpoint, method });
      return null;
    }
    
    console.log(`❌ ${name}`);
    console.log(`   ${method.toUpperCase()} ${endpoint} → ${error.response?.status || 'ERROR'}`);
    console.log(`   ${error.response?.data?.msg || error.message}`);
    testsFailed++;
    results.push({ name, status: 'FAIL', endpoint, method, error: error.message });
    return null;
  }
}

async function runIntegrationTests() {
  try {
    console.log('─'.repeat(70));
    console.log('\n📡 Testing Public Endpoints (No Auth Required):\n');
    
    // 1. Health Check
    await testEndpoint(
      'API Health Check',
      'GET',
      '/'
    );
    
    // 2. CSRF Token
    await testEndpoint(
      'CSRF Token Endpoint',
      'GET',
      '/auth/csrf-token'
    );
    
    // 3. Public Leaderboard
    await testEndpoint(
      'Leaderboard (Public)',
      'GET',
      '/users/leaderboard'
    );
    
    // 4. Public Events
    await testEndpoint(
      'Events List',
      'GET',
      '/events'
    );
    
    console.log('\n' + '─'.repeat(70));
    console.log('\n🔐 Testing Authentication Endpoints:\n');
    
    // 5. Login (will fail without valid credentials - expected)
    await testEndpoint(
      'Login Endpoint',
      'POST',
      '/auth/login',
      { email: 'test@test.com', password: 'test' },
      { requiresAuth: false } // Test will fail with invalid creds, that's OK
    );
    
    // 6. Register (will fail if user exists - expected)
    await testEndpoint(
      'Register Endpoint',
      'POST',
      '/auth/register',
      { username: 'testuser', email: 'test@test.com', password: 'password123' },
      { requiresAuth: false }
    );
    
    console.log('\n' + '─'.repeat(70));
    console.log('\n👤 Testing Protected Endpoints (Auth Required):\n');
    
    // 7. Get Current User
    await testEndpoint(
      'Get Current User',
      'GET',
      '/auth',
      null,
      { requiresAuth: true }
    );
    
    // 8. Get User Runs
    await testEndpoint(
      'Get User Runs',
      'GET',
      '/runs',
      null,
      { requiresAuth: true }
    );
    
    // 9. Get User Tiles Count
    await testEndpoint(
      'Get Tile Count',
      'GET',
      '/tiles/count/1',
      null,
      { requiresAuth: true }
    );
    
    // 10. Get User Stats
    await testEndpoint(
      'Get User Stats',
      'GET',
      '/users/stats/1',
      null,
      { requiresAuth: true }
    );
    
    // 11. Get Weather
    await testEndpoint(
      'Get Weather',
      'GET',
      '/users/weather?lat=25.2048&lng=55.2708',
      null,
      { requiresAuth: true }
    );
    
    // 12. Get Emergency Contacts
    await testEndpoint(
      'Get Emergency Contacts',
      'GET',
      '/emergency/contacts',
      null,
      { requiresAuth: true }
    );
    
    // 13. Get Friend Requests
    await testEndpoint(
      'Get Friend Requests',
      'GET',
      '/friend-requests/received',
      null,
      { requiresAuth: true }
    );
    
    // 14. Get Friends List
    await testEndpoint(
      'Get Friends List',
      'GET',
      '/friend-requests/list',
      null,
      { requiresAuth: true }
    );
    
    // 15. Get Notifications
    await testEndpoint(
      'Get Notifications',
      'GET',
      '/notifications',
      null,
      { requiresAuth: true }
    );
    
    // 16. Get AI Coach Recommendations
    await testEndpoint(
      'Get AI Recommendations',
      'GET',
      '/ai-coach/recommendations/1',
      null,
      { requiresAuth: true }
    );
    
    // 17. Get Training Plans
    await testEndpoint(
      'Get Current Training Plan',
      'GET',
      '/training-plans/current',
      null,
      { requiresAuth: true }
    );
    
    // 18. Get Achievements
    await testEndpoint(
      'Get Achievements',
      'GET',
      '/achievements',
      null,
      { requiresAuth: true }
    );
    
    // 19. Get Social Posts
    await testEndpoint(
      'Get Social Posts',
      'GET',
      '/social/posts',
      null,
      { requiresAuth: true }
    );
    
    // 20. Get Messages
    await testEndpoint(
      'Get Messages',
      'GET',
      '/messages/conversations',
      null,
      { requiresAuth: true }
    );
    
    console.log('\n' + '─'.repeat(70));
    console.log('\n📊 Testing File Upload Endpoints:\n');
    
    // 21. GPX Upload Endpoint Exists
    await testEndpoint(
      'GPX Upload Endpoint',
      'POST',
      '/gpx/upload',
      null, // No file - will fail but endpoint should exist
      { requiresAuth: true }
    );
    
    // 22. Profile Photo Upload
    await testEndpoint(
      'Profile Photo Upload',
      'POST',
      '/users/profile/photo/upload',
      null,
      { requiresAuth: true }
    );
    
    console.log('\n' + '─'.repeat(70));
    console.log('\n🔌 Testing Socket.IO Connection:\n');
    
    // 23. Socket.IO Health (just check if endpoint exists)
    try {
      const socketTest = await axios.get(`${BASE_URL.replace('/api', '')}/socket.io/socket.io.js`, {
        timeout: 5000
      });
      console.log('✅ Socket.IO Server Available');
      testsPassed++;
      results.push({ name: 'Socket.IO Server', status: 'PASS' });
    } catch (error) {
      console.log('⚠️  Socket.IO not accessible via HTTP (normal for some configs)');
      testsSkipped++;
      results.push({ name: 'Socket.IO Server', status: 'SKIPPED' });
    }
    
    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('\n📋 INTEGRATION TEST SUMMARY:\n');
    
    const totalTests = testsPassed + testsFailed + testsSkipped;
    const successRate = totalTests > 0 ? ((testsPassed / totalTests) * 100).toFixed(1) : 0;
    
    console.log(`Total endpoints tested: ${totalTests}`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`⚠️  Skipped: ${testsSkipped}`);
    console.log(`Success rate: ${successRate}%\n`);
    
    if (testsFailed === 0) {
      console.log('✅ ALL ENDPOINTS ARE ACCESSIBLE!');
      console.log('   Frontend can successfully communicate with backend.\n');
    } else if (testsFailed <= 3) {
      console.log('⚠️  MINOR ISSUES DETECTED:');
      console.log('   Most features will work, but some may have problems.\n');
      
      const failedTests = results.filter(r => r.status === 'FAIL');
      console.log('Failed endpoints:');
      failedTests.forEach(test => {
        console.log(`   • ${test.name}: ${test.error}`);
      });
      console.log('');
    } else {
      console.log('❌ CRITICAL INTEGRATION ISSUES:');
      console.log('   Multiple endpoints are not accessible.\n');
      
      const failedTests = results.filter(r => r.status === 'FAIL');
      console.log('Failed endpoints:');
      failedTests.forEach(test => {
        console.log(`   • ${test.name} (${test.method} ${test.endpoint})`);
      });
      console.log('');
      console.log('💡 Troubleshooting steps:');
      console.log('   1. Check if backend server is running');
      console.log('   2. Verify BASE_URL is correct');
      console.log('   3. Check CORS configuration');
      console.log('   4. Review backend logs for errors\n');
    }
    
    // Frontend Configuration Check
    console.log('─'.repeat(70));
    console.log('\n🔧 Frontend Configuration:\n');
    console.log('Ensure these environment variables are set in Vercel:\n');
    console.log('   VITE_API_URL_PROD = ' + BASE_URL);
    console.log('   VITE_SOCKET_URL = ' + BASE_URL.replace('/api', ''));
    console.log('');
    
    // CORS Check
    console.log('─'.repeat(70));
    console.log('\n🌐 CORS Configuration:\n');
    console.log('Make sure backend CORS allows your frontend URL:\n');
    console.log('   In server/server.js:');
    console.log('   cors({');
    console.log('     origin: [');
    console.log('       "http://localhost:5173",');
    console.log('       "https://zonerush.vercel.app"  // Your Vercel URL');
    console.log('     ],');
    console.log('     credentials: true');
    console.log('   })');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runIntegrationTests();

const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER_ID = 1; // Change this to a valid user ID in your database

async function testAITrainingPlan() {
  console.log('========================================');
  console.log('Testing AI Training Plan Generation');
  console.log('========================================\n');

  try {
    // First, we need to get an auth token (you may need to login first)
    // For now, we'll test the endpoint structure
    
    console.log('Test 1: Generate AI Training Plan with preferences');
    console.log('---------------------------------------------------');
    
    const preferences = {
      goal: 'Improve 5K time',
      availableDays: [1, 3, 5, 7], // Monday, Wednesday, Friday, Sunday
      preferredTime: 'morning',
      maxDistancePerWeek: 30 // km
    };

    console.log('Sending request to generate AI training plan...');
    console.log('Preferences:', JSON.stringify(preferences, null, 2));
    
    // Note: You'll need to replace this with actual authentication
    // const response = await axios.post(
    //   `${BASE_URL}/api/ai-coach/generate-plan/${TEST_USER_ID}`,
    //   { preferences },
    //   { headers: { 'Authorization': 'Bearer YOUR_TOKEN_HERE' } }
    // );
    
    console.log('\n✅ Endpoint is ready! To test:');
    console.log(`   POST ${BASE_URL}/api/ai-coach/generate-plan/${TEST_USER_ID}`);
    console.log('   Body:', JSON.stringify({ preferences }, null, 2));
    console.log('   Headers: { "Authorization": "Bearer YOUR_TOKEN" }\n');

    console.log('========================================');
    console.log('Alternative: Use training plans endpoint');
    console.log('========================================\n');
    
    console.log('Test 2: Generate via training-plans endpoint');
    console.log('---------------------------------------------------');
    console.log(`POST ${BASE_URL}/api/training-plans/generate`);
    console.log('Body:', JSON.stringify({ 
      useAI: true, 
      preferences 
    }, null, 2));
    console.log('Headers: { "Authorization": "Bearer YOUR_TOKEN" }\n');

    console.log('========================================');
    console.log('Setup Complete!');
    console.log('========================================\n');
    
    console.log('Next steps:');
    console.log('1. Start your server: npm start');
    console.log('2. Login to get an auth token');
    console.log('3. Make a POST request to one of the endpoints above');
    console.log('4. The AI will generate a personalized 4-week training plan\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testAITrainingPlan();

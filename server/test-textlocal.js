require('dotenv').config();
const axios = require('axios');

// Test TextLocal SMS Integration
async function testTextLocal() {
  console.log('📱 Testing TextLocal SMS Integration...\n');

  const apiKey = process.env.TEXTLOCAL_API_KEY;
  const sender = process.env.TEXTLOCAL_SENDER || 'ZONERUSH';

  console.log('Configuration:');
  console.log('  API Key:', apiKey ? '✅ Configured' : '❌ Not configured');
  console.log('  Sender ID:', sender);
  console.log('');

  if (!apiKey || apiKey === 'your_textlocal_api_key_here') {
    console.error('❌ TextLocal API key not configured!');
    console.error('\nTo fix:');
    console.error('1. Sign up at https://www.textlocal.in/');
    console.error('2. Get your API key from Settings → API Keys');
    console.error('3. Add to server/.env: TEXTLOCAL_API_KEY=your_key_here');
    return;
  }

  // Test with a sample number (replace with your test number)
  const testNumber = '917836928539'; // Replace with actual test number
  
  console.log(`📤 Sending test SMS to: ${testNumber}\n`);

  try {
    const response = await axios.get('https://api.textlocal.in/send/', {
      params: {
        apikey: apiKey,
        numbers: testNumber,
        sender: sender,
        message: '🚨 TEST SOS ALERT from ZoneRush\nThis is a test message. Please ignore.\nSent at: ' + new Date().toLocaleString(),
        format: 'json'
      }
    });

    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.data.status === 'success') {
      console.log('\n✅ SUCCESS! SMS sent successfully.');
      console.log(`   Message ID: ${response.data.id}`);
      console.log(`   Balance: ${response.data.balance} credits remaining`);
      console.log('\nCheck your phone for the test SMS!');
    } else {
      console.error('\n❌ FAILED! TextLocal returned an error:');
      if (response.data.errors) {
        response.data.errors.forEach(err => {
          console.error(`   - ${err.message} (Code: ${err.code})`);
        });
      }
    }

  } catch (error) {
    console.error('\n❌ Request failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', error.message);
    if (error.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testTextLocal();

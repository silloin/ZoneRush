const axios = require('axios');

async function testRegistration() {
  try {
    console.log('🧪 Testing user registration...\n');
    
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'test123'
    };
    
    console.log('Registering user:', userData.username, userData.email);
    
    const response = await axios.post('http://localhost:5000/api/auth/register', userData);
    
    console.log('✅ Registration successful!');
    console.log('Token received:', response.data.token ? 'Yes' : 'No');
    
    // Now test login
    console.log('\n🔐 Testing login...');
    
    const loginData = {
      email: userData.email,
      password: userData.password
    };
    
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', loginData);
    
    console.log('✅ Login successful!');
    console.log('Token received:', loginResponse.data.token ? 'Yes' : 'No');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.msg || error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

testRegistration();
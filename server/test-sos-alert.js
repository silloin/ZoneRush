require('dotenv').config();
const axios = require('axios');
const tough = require('tough-cookie');
const CookieJar = tough.CookieJar;
const { wrapper } = require('axios-cookiejar-support');

// Test SOS Alert System
async function testSOSAlert() {
  console.log('🚨 Testing SOS Alert System...\n');

  // Configuration
  const API_URL = 'http://localhost:5000/api';
  
  // Create axios instance with cookie support
  const jar = new CookieJar();
  const api = wrapper(axios.create({
    baseURL: API_URL,
    jar: jar,
    withCredentials: true
  }));
  
  // Step 1: Make initial GET request to get CSRF cookie
  console.log('📝 Step 1: Getting CSRF token...');
  try {
    await api.get('/auth/csrf-token'); // This will set the cookie
    
    // Extract CSRF token from cookie
    const cookies = jar.getCookiesSync(API_URL);
    const csrfCookie = cookies.find(c => c.key === 'csrf-token');
    
    if (!csrfCookie) {
      throw new Error('CSRF cookie not received');
    }
    
    const csrfToken = csrfCookie.value;
    console.log(`✅ CSRF token received: ${csrfToken.substring(0, 16)}...`);
    
    // Set CSRF token in header for subsequent requests
    api.defaults.headers.common['x-csrf-token'] = csrfToken;
    
    // Step 2: Login
    console.log('\n📝 Step 2: Logging in...');
    const loginResponse = await api.post('/auth/login', {
      email: 'govind93005@gmail.com',
      password: 'changeme123'
    });

    const token = loginResponse.data.token;
    const userId = loginResponse.data.user.id;
    const username = loginResponse.data.user.username;
    
    console.log(`✅ Logged in as ${username} (ID: ${userId})\n`);

    // Step 3: Get emergency contacts
    console.log('📋 Step 3: Fetching emergency contacts...');
    const contactsResponse = await api.get('/emergency/contacts', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const contacts = contactsResponse.data;
    console.log(`Found ${contacts.length} emergency contacts:`);
    contacts.forEach((contact, idx) => {
      console.log(`  ${idx + 1}. ${contact.contact_name} - ${contact.email || 'No email'} - ${contact.phone_number}`);
    });
    console.log('');

    if (contacts.length === 0) {
      console.error('❌ No emergency contacts configured. Add contacts first!');
      return;
    }

    // Step 4: Send SOS Alert
    console.log('🚨 Step 4: Sending SOS Alert...');
    const testData = {
      latitude: 28.50691625,
      longitude: 77.33553124999999,
      message: 'This is a TEST SOS alert - Please ignore'
    };

    try {
      const sosResponse = await api.post(
        '/emergency/send-sos',
        testData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('\n✅ SOS Alert Response:');
      console.log('Message:', sosResponse.data.msg);
      console.log('Total Contacts:', sosResponse.data.totalContacts);
      console.log('Emails Sent:', sosResponse.data.emailsSent);
      console.log('Push Notifications:', sosResponse.data.pushNotificationsSent);
      
      if (sosResponse.data.emailResults && sosResponse.data.emailResults.length > 0) {
        console.log('\n📧 Email Results:');
        sosResponse.data.emailResults.forEach(result => {
          const status = result.status === 'sent' ? '✅' : '❌';
          console.log(`  ${status} ${result.contact} (${result.email}): ${result.status}`);
          if (result.error) {
            console.log(`     Error: ${result.error}`);
          }
        });
      }

      console.log('\n📍 Location:', sosResponse.data.mapsLink);
      
      if (sosResponse.data.whatsappLinks) {
        console.log('\n💬 WhatsApp Links (for manual sending):');
        sosResponse.data.whatsappLinks.forEach(link => {
          console.log(`  - ${link.name}: ${link.whatsappUrl}`);
        });
      }

      console.log('\n✅ TEST COMPLETE! Check email inboxes (and spam folders).');

    } catch (error) {
      console.error('\n❌ Failed to send SOS alert:');
      console.error('Status:', error.response?.status);
      console.error('Message:', error.response?.data?.msg || error.message);
      if (error.response?.data?.error) {
        console.error('Error:', error.response.data.error);
      }
    }

  } catch (error) {
    console.error('\n❌ Login failed:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.msg || error.message);
    console.error('\nMake sure:');
    console.error('1. Server is running on port 5000');
    console.error('2. User exists in database');
    console.error('3. Correct email and password');
  }
}

testSOSAlert();

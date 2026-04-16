require('dotenv').config({ path: './.env' });

// Initialize email service
const emailService = require('./services/emailService');
emailService.initialize();

async function testSOSEmail() {
  console.log('\n🚨 Testing SOS Email with Centralized Service...\n');

  const result = await emailService.sendSOSEmail({
    to: 'govind93005@gmail.com',
    userName: 'govind',
    location: '28.6139, 77.2090',
    mapsLink: 'https://www.google.com/maps?q=28.6139,77.2090',
    customMessage: 'This is a test SOS alert!'
  });

  console.log('\n✅ SOS Email Result:');
  console.log(result);
  console.log('\n📧 Check your inbox at: terra93005@gmail.com');
}

testSOSEmail().catch(console.error);

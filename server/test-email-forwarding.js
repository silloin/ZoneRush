// Set environment variables before loading email service
process.env.EMAIL_SERVICE = 'resend';
process.env.RESEND_API_KEY = 're_YG5TQReU_G1HE1gZvwAm65ywSDj9cyti8';

require('dotenv').config({ path: './.env' });
const emailService = require('./services/emailService');

async function testEmailForwarding() {
  console.log('🧪 Testing Email Forwarding Service...\n');

  // Test 1: SOS Email
  console.log('Test 1: Sending SOS Emergency Email...');
  const sosResult = await emailService.sendSOSEmail({
    to: 'gkgk93005@gmail.com',
    userName: 'Govind',
    location: '28.6139, 77.2090 (New Delhi, India)',
    mapsLink: 'https://www.google.com/maps?q=28.6139,77.2090',
    customMessage: 'This is a test SOS alert. Please verify the email forwarding works!'
  });
  console.log('SOS Email Result:', sosResult);
  console.log('');

  // Test 2: Verification Email
  console.log('Test 2: Sending Verification Email...');
  const verifyResult = await emailService.sendVerificationEmail({
    to: 'govind93005@gmail.com',
    username: 'TestUser123',
    verificationLink: 'http://localhost:5173/verify-email?token=test123token'
  });
  console.log('Verification Email Result:', verifyResult);
  console.log('');

  // Test 3: Password Reset Email
  console.log('Test 3: Sending Password Reset Email...');
  const resetResult = await emailService.sendPasswordResetEmail({
    to: 'anotheruser@gmail.com',
    username: 'JohnDoe',
    resetLink: 'http://localhost:5173/reset-password?token=reset123token'
  });
  console.log('Password Reset Email Result:', resetResult);
  console.log('');

  console.log('✅ All email tests completed!');
  console.log('📧 Check your inbox at: terra93005@gmail.com');
  console.log('📨 All emails should show original recipient info in the content');
}

testEmailForwarding().catch(console.error);

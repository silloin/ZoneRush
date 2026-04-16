// Manually set environment variables (bypass dotenv issue)
process.env.RESEND_API_KEY = 're_YG5TQReU_G1HE1gZvwAm65ywSDj9cyti8';
process.env.EMAIL_SERVICE = 'resend';
process.env.RESEND_FROM_EMAIL = 'onboarding@resend.dev';

require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

// Debug: Print loaded env vars (hide sensitive data)
console.log('📋 Environment Check:');
console.log('- RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set (' + process.env.RESEND_API_KEY.substring(0, 8) + '...)' : '❌ Not set');
console.log('- EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
console.log('- RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL);
console.log('');

// Test Resend Email Configuration
async function testResendEmail() {
  console.log('📧 Testing Resend Email Configuration...\n');

  // Check environment variables
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  console.log('RESEND_API_KEY configured:', !!resendApiKey);
  console.log('RESEND_FROM_EMAIL:', fromEmail);
  console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
  console.log('');

  if (!resendApiKey) {
    console.error('❌ Resend API key not configured in .env file');
    return;
  }

  // Create transporter with Resend SMTP
  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 587,
    secure: false,
    auth: {
      user: 'resend',
      pass: resendApiKey
    }
  });

  try {
    // Verify connection
    console.log('🔍 Verifying Resend connection...');
    await transporter.verify();
    console.log('✅ Resend connection successful!\n');

    // Send test email - MUST send to your own email (terra93005@gmail.com)
    console.log('📤 Sending test email to: terra93005@gmail.com');
    const info = await transporter.sendMail({
      from: `"ZoneRush Test" <${fromEmail}>`,
      to: 'terra93005@gmail.com',  // Must be your own email for testing
      subject: '🎉 ZoneRush - Resend Email Test Successful!',
      html: `
        <h1 style="color: #4CAF50;">✅ Resend Email Test Successful!</h1>
        <p>This is a <strong>TEST EMAIL</strong> from the ZoneRush system using Resend service.</p>
        <p>If you received this, the email system is working correctly!</p>
        <hr/>
        <h3>Configuration Details:</h3>
        <ul>
          <li><strong>Service:</strong> Resend</li>
          <li><strong>From:</strong> ${fromEmail}</li>
          <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
          <li><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
        </ul>
        <hr/>
        <p style="color: #6c757d; font-size: 12px;">Test sent at: ${new Date().toISOString()}</p>
        <p style="color: #6c757d; font-size: 12px;">ZoneRush Email System</p>
      `,
      text: `Resend Email Test Successful! This is a test email from ZoneRush using Resend service. Sent at: ${new Date().toLocaleString()}`
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('\nCheck your inbox (and spam folder) for the test email.');

  } catch (error) {
    console.error('❌ Resend email test failed!');
    console.error('Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('\nTroubleshooting:');
    console.error('1. Check if RESEND_API_KEY is correct in server/.env');
    console.error('2. Verify the API key at: https://resend.com/api-keys');
    console.error('3. Check if from email domain is verified in Resend');
    console.error('4. Ensure your Resend account is active');
  }
}

testResendEmail();

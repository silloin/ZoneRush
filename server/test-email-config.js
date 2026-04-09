require('dotenv').config();
const nodemailer = require('nodemailer');

// Test Email Configuration
async function testEmail() {
  console.log('📧 Testing Email Configuration...\n');

  // Check environment variables
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS;

  console.log('EMAIL_USER:', emailUser);
  console.log('EMAIL_PASS configured:', !!emailPass);
  console.log('');

  if (!emailUser || !emailPass) {
    console.error('❌ Email credentials not configured in .env file');
    return;
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  try {
    // Verify connection
    console.log('🔍 Verifying email connection...');
    await transporter.verify();
    console.log('✅ Email connection successful!\n');

    // Send test email
    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      from: `"SOS Alert Test" <${emailUser}>`,
      to: emailUser, // Send to yourself for testing
      subject: '🚨 SOS Alert System - TEST',
      html: `
        <h1 style="color: #dc3545;">🚨 SOS EMERGENCY ALERT - TEST</h1>
        <p>This is a <strong>TEST EMAIL</strong> from the ZoneRush SOS Alert System.</p>
        <p>If you received this, the email system is working correctly!</p>
        <hr/>
        <p style="color: #6c757d; font-size: 12px;">Test sent at: ${new Date().toLocaleString()}</p>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('\nCheck your inbox (and spam folder) for the test email.');

  } catch (error) {
    console.error('❌ Email test failed!');
    console.error('Error:', error.message);
    console.error('\nCommon issues:');
    console.error('1. Gmail App Password is incorrect or expired');
    console.error('2. 2-Step Verification not enabled on Gmail account');
    console.error('3. Less secure app access blocked');
    console.error('\nTo fix:');
    console.error('- Go to Google Account > Security > 2-Step Verification');
    console.error('- Generate a new App Password: https://myaccount.google.com/apppasswords');
    console.error('- Update EMAIL_APP_PASSWORD in server/.env file');
  }
}

testEmail();

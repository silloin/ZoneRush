require('dotenv').config({ path: './.env' });
const emailService = require('./services/emailService');

async function test() {
  console.log("Initializing email service...");
  emailService.initialize();
  
  console.log("Sending email...");
  const result = await emailService.sendEmail({
    to: 'test@example.com',
    subject: 'Test Resend API',
    html: '<p>This is a test message via Resend API in ZoneRush.</p>',
    text: 'This is a test message via Resend API in ZoneRush.'
  });
  
  console.log("Result:", result);
}

test().catch(console.error);

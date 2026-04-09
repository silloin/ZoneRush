require('dotenv').config();
const pool = require('./config/db');
const nodemailer = require('nodemailer');

// Direct SOS Email Test (bypasses authentication)
async function testDirectSOS() {
  console.log('🚨 Testing Direct SOS Email Alert...\n');

  const emailPass = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS;
  
  if (!process.env.EMAIL_USER || !emailPass) {
    console.error('❌ Email not configured in .env');
    return;
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: emailPass
    }
  });

  try {
    // Get emergency contacts for user ID 1 (govind)
    console.log('📋 Fetching emergency contacts for user...');
    const contactsResult = await pool.query(
      'SELECT * FROM emergency_contacts WHERE user_id = $1 AND is_active = TRUE ORDER BY priority',
      [1]
    );

    const contacts = contactsResult.rows;
    console.log(`Found ${contacts.length} active contacts:\n`);
    
    contacts.forEach((contact, idx) => {
      console.log(`${idx + 1}. ${contact.contact_name}`);
      console.log(`   Email: ${contact.email || 'N/A'}`);
      console.log(`   Phone: ${contact.phone_number}`);
      console.log('');
    });

    if (contacts.length === 0) {
      console.error('❌ No active emergency contacts found!');
      return;
    }

    // Simulate SOS alert
    const userData = { username: 'govind' };
    const latitude = 28.50691625;
    const longitude = 77.33553124999999;
    const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const sosMessage = `🚨 SOS ALERT! ${userData.username} needs emergency assistance!`;
    const fullMessage = `${sosMessage}\n\n📍 Live Location: ${googleMapsLink}\n\nPlease help immediately!`;

    console.log('📤 Sending test SOS emails...\n');

    let successCount = 0;
    let failCount = 0;

    for (const contact of contacts) {
      if (!contact.email) {
        console.log(`⚠️  Skipping ${contact.contact_name} - no email address`);
        continue;
      }

      try {
        console.log(`Sending to ${contact.contact_name} (${contact.email})...`);
        
        await transporter.sendMail({
          from: `"SOS Alert - ${userData.username}" <${process.env.EMAIL_USER}>`,
          to: contact.email,
          subject: `🚨 SOS EMERGENCY ALERT - ${userData.username}`,
          html: `
            <h1 style="color: #dc3545;">🚨 SOS EMERGENCY ALERT</h1>
            <p><strong>${userData.username}</strong> needs emergency assistance!</p>
            <p><strong>📍 Live Location:</strong> <a href="${googleMapsLink}">View on Google Maps</a></p>
            <p><strong>Coordinates:</strong> ${latitude}, ${longitude}</p>
            <p><strong>Message:</strong> This is a TEST alert.</p>
            <hr/>
            <p style="color: #6c757d; font-size: 12px;">This is a TEST automated SOS alert from the ZoneRush system.</p>
            <p style="color: #6c757d; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
          `
        });

        console.log(`✅ Email sent successfully to ${contact.contact_name}\n`);
        successCount++;

      } catch (err) {
        console.error(`❌ Failed to send email to ${contact.contact_name}:`);
        console.error(`   Error: ${err.message}\n`);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS:');
    console.log('='.repeat(50));
    console.log(`Total Contacts: ${contacts.length}`);
    console.log(`Emails Sent: ${successCount}`);
    console.log(`Emails Failed: ${failCount}`);
    console.log(`Skipped (no email): ${contacts.filter(c => !c.email).length}`);
    console.log('='.repeat(50));

    if (successCount > 0) {
      console.log('\n✅ SUCCESS! Check email inboxes (and spam folders).');
      console.log(`   Recipients: ${contacts.filter(c => c.email).map(c => c.email).join(', ')}`);
    } else {
      console.log('\n❌ All emails failed. Check error messages above.');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

testDirectSOS();

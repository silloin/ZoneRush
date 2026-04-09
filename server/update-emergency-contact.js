const pool = require('./config/db');

async function updateEmergencyContact() {
  try {
    console.log('Updating emergency contact with email...\n');
    
    // First, get existing contacts
    const existing = await pool.query(
      'SELECT * FROM emergency_contacts WHERE user_id = $1',
      [1]
    );
    
    if (existing.rows.length === 0) {
      console.log('❌ No emergency contacts found. Run add-my-contact.js first.');
      process.exit(1);
    }
    
    console.log(`Found ${existing.rows.length} contact(s):\n`);
    existing.rows.forEach(contact => {
      console.log(`ID: ${contact.id}`);
      console.log(`  Name: ${contact.contact_name}`);
      console.log(`  Phone: ${contact.phone_number}`);
      console.log(`  Email: ${contact.email || 'Not set'}`);
      console.log(`  Priority: ${contact.priority}`);
      console.log();
    });
    
    // Update the first contact to add email
    const contactId = existing.rows[0].id;
    const testEmail = 'emergency@example.com'; // Replace with actual email
    
    const result = await pool.query(
      `UPDATE emergency_contacts 
       SET email = $1
       WHERE id = $2
       RETURNING *`,
      [testEmail, contactId]
    );
    
    console.log('✅ Emergency contact updated with email!\n');
    console.log(`Name: ${result.rows[0].contact_name}`);
    console.log(`Phone: ${result.rows[0].phone_number}`);
    console.log(`Email: ${result.rows[0].email}`);
    console.log('\nNow SOS alerts will be sent to this email address! 📧');
    console.log('\nTo enable email notifications:');
    console.log('1. Add EMAIL_USER and EMAIL_PASS to server/.env');
    console.log('2. Restart the server');
    console.log('3. Trigger an SOS alert');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updateEmergencyContact();

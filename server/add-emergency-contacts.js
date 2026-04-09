const pool = require('./config/db');

async function addEmergencyContacts() {
  try {
    console.log('Adding emergency contacts for user govind...\n');
    
    // Check if contacts already exist
    const existing = await pool.query(
      'SELECT * FROM emergency_contacts WHERE user_id = $1',
      [1]
    );
    
    if (existing.rows.length > 0) {
      console.log(`✅ User already has ${existing.rows.length} emergency contact(s):\n`);
      existing.rows.forEach(contact => {
        console.log(`- ${contact.contact_name}: ${contact.phone_number}`);
      });
      process.exit(0);
    }
    
    // Add test emergency contacts
    const contacts = [
      {
        contact_name: 'Emergency Contact 1',
        contact_type: 'parent',
        phone_number: '+1234567890',
        email: 'contact1@example.com',
        priority: 1
      },
      {
        contact_name: 'Emergency Contact 2',
        contact_type: 'friend',
        phone_number: '+0987654321',
        email: 'contact2@example.com',
        priority: 2
      }
    ];
    
    for (const contact of contacts) {
      const result = await pool.query(
        `INSERT INTO emergency_contacts 
         (user_id, contact_name, contact_type, phone_number, email, priority)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [1, contact.contact_name, contact.contact_type, contact.phone_number, contact.email, contact.priority]
      );
      console.log(`✅ Added: ${result.rows[0].contact_name} (${result.rows[0].phone_number})`);
    }
    
    console.log('\n✅ Emergency contacts added successfully!');
    console.log('You can now test the SOS button.');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

addEmergencyContacts();

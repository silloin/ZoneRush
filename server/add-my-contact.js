const pool = require('./config/db');

async function addMyEmergencyContact() {
  try {
    console.log('Adding your emergency contact...\n');
    
    const result = await pool.query(
      `INSERT INTO emergency_contacts 
       (user_id, contact_name, contact_type, phone_number, priority)
       VALUES ($1, $2, $3, $4, 1)
       RETURNING *`,
      [1, 'Emergency Contact', 'custom', '+1 234 567 8900']
    );
    
    console.log('✅ Emergency contact added successfully!');
    console.log(`Name: ${result.rows[0].contact_name}`);
    console.log(`Phone: ${result.rows[0].phone_number}`);
    console.log('\nYou can now test the SOS button! 🚨');
    
    process.exit(0);
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      console.log('ℹ️  Emergency contact already exists for this user');
    } else {
      console.error('❌ Error:', err.message);
    }
    process.exit(1);
  }
}

addMyEmergencyContact();

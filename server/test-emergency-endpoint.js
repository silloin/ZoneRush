const pool = require('./config/db');
require('dotenv').config();

async function testEmergencyContacts() {
  console.log('🧪 Testing Emergency Contacts Endpoint...\n');
  
  let client;
  
  try {
    client = await pool.connect();
    console.log('✅ Database connected\n');

    // Test the exact query from emergencyController
    console.log('1️⃣ Testing emergency contacts query for user_id = 1...');
    try {
      const result = await client.query(
        `SELECT * FROM emergency_contacts 
         WHERE user_id = $1 AND is_active = TRUE
         ORDER BY priority ASC`,
        [1]
      );
      
      console.log('✅ Query successful');
      console.log(`   Found ${result.rows.length} contacts`);
      console.log('   Contacts:', JSON.stringify(result.rows, null, 2));
    } catch (err) {
      console.error('❌ Query failed:', err.message);
      console.error('   Detail:', err.detail);
      console.error('   Hint:', err.hint);
      console.error('   Code:', err.code);
      console.error('   Where:', err.where);
      console.error('   Full error:', err);
    }

    console.log('\n2️⃣ Checking emergency_contacts table structure...');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'emergency_contacts'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Table columns:');
    columns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });

    console.log('\n3️⃣ Checking if user_id = 1 exists...');
    const userCheck = await client.query('SELECT id, username, email FROM users WHERE id = $1', [1]);
    if (userCheck.rows.length > 0) {
      console.log('✅ User exists:', userCheck.rows[0]);
    } else {
      console.log('⚠️  User ID 1 not found');
    }

    console.log('\n========================================');
    console.log('✅ Test complete!');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (client) {
      client.release();
    }
    process.exit(0);
  }
}

testEmergencyContacts();

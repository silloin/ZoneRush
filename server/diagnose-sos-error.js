const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'runterra',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function diagnoseSOSError() {
  console.log('🔍 Diagnosing SOS Emergency System...\n');
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check 1: Verify sos_alerts table structure
    console.log('Check 1: sos_alerts table structure');
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sos_alerts'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in sos_alerts:');
    tableStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '[NULL]' : '[NOT NULL]'}
`);
    });

    // Check 2: Try to insert a test alert
    console.log('\nCheck 2: Testing INSERT operation');
    try {
      const testResult = await client.query(`
        INSERT INTO sos_alerts (user_id, latitude, longitude, message, contacts_notified)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id`,
        [99999, 40.7128, -74.0060, 'Test alert', '[]']
      );
      
      console.log('✅ INSERT successful! Test ID:', testResult.rows[0].id);
      
      // Clean up
      await client.query('DELETE FROM sos_alerts WHERE id = $1', [testResult.rows[0].id]);
      console.log('✅ Test record cleaned up');
      
    } catch (insertErr) {
      console.log('❌ INSERT failed!');
      console.log('Error:', insertErr.message);
      console.log('SQL State:', insertErr.code);
      
      if (insertErr.detail) {
        console.log('Detail:', insertErr.detail);
      }
      
      if (insertErr.hint) {
        console.log('Hint:', insertErr.hint);
      }
    }

    // Check 3: Verify emergency_contacts table
    console.log('\nCheck 3: emergency_contacts table structure');
    const contactsStructure = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'emergency_contacts'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in emergency_contacts:');
    contactsStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Check 4: Count records
    console.log('\nCheck 4: Record counts');
    const sosCount = await client.query('SELECT COUNT(*) FROM sos_alerts');
    const contactsCount = await client.query('SELECT COUNT(*) FROM emergency_contacts');
    
    console.log(`  - sos_alerts: ${sosCount.rows[0].count} records`);
    console.log(`  - emergency_contacts: ${contactsCount.rows[0].count} records`);

  } catch (err) {
    console.error('❌ Diagnostic failed:', err.message);
  } finally {
    await client.end();
  }
  
  console.log('\n========================================');
  console.log('Diagnostic complete!');
  console.log('========================================\n');
}

diagnoseSOSError().catch(console.error);

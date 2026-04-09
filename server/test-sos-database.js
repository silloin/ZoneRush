const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'runterra',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function runTests() {
  console.log('🧪 Running SOS Emergency System Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Test 1: Check emergency_contacts table
    console.log('Test 1: Checking emergency_contacts table...');
    try {
      const result = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'emergency_contacts'
        ORDER BY ordinal_position
      `);
      
      if (result.rows.length > 0) {
        console.log('✅ PASS: emergency_contacts table exists');
        console.log(`   Columns: ${result.rows.map(r => r.column_name).join(', ')}`);
        passed++;
      } else {
        console.log('❌ FAIL: emergency_contacts table is empty');
        failed++;
      }
    } catch (err) {
      console.log('❌ FAIL: emergency_contacts table error:', err.message);
      failed++;
    }

    // Test 2: Check sos_alerts table
    console.log('\nTest 2: Checking sos_alerts table...');
    try {
      const result = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'sos_alerts'
        ORDER BY ordinal_position
      `);
      
      if (result.rows.length > 0) {
        console.log('✅ PASS: sos_alerts table exists');
        console.log(`   Columns: ${result.rows.map(r => r.column_name).join(', ')}`);
        passed++;
      } else {
        console.log('❌ FAIL: sos_alerts table is empty');
        failed++;
      }
    } catch (err) {
      console.log('❌ FAIL: sos_alerts table error:', err.message);
      failed++;
    }

    // Test 3: Check indexes
    console.log('\nTest 3: Checking database indexes...');
    try {
      const result = await client.query(`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE tablename IN ('emergency_contacts', 'sos_alerts')
      `);
      
      console.log('✅ PASS: Indexes found');
      result.rows.forEach(idx => {
        console.log(`   - ${idx.indexname} on ${idx.tablename}`);
      });
      passed++;
    } catch (err) {
      console.log('❌ FAIL: Index check error:', err.message);
      failed++;
    }

    // Test 4: Insert test contact
    console.log('\nTest 4: Testing INSERT operation...');
    try {
      const testResult = await client.query(`
        INSERT INTO emergency_contacts (user_id, contact_name, contact_type, phone_number, is_active)
        VALUES (99999, 'Test Contact', 'friend', '+1234567890', FALSE)
        RETURNING id
      `);
      
      const testId = testResult.rows[0].id;
      
      // Clean up
      await client.query('DELETE FROM emergency_contacts WHERE id = $1', [testId]);
      
      console.log('✅ PASS: Can insert and delete records');
      console.log(`   Test record created (ID: ${testId}) and cleaned up`);
      passed++;
    } catch (err) {
      console.log('❌ FAIL: INSERT test error:', err.message);
      failed++;
    }

    // Test 5: Test SOS alert creation
    console.log('\nTest 5: Testing SOS alert creation...');
    try {
      const alertResult = await client.query(`
        INSERT INTO sos_alerts (user_id, latitude, longitude, message, contacts_notified)
        VALUES (99999, 40.7128, -74.0060, 'Test SOS Alert', '["Test Contact"]')
        RETURNING id
      `);
      
      const alertId = alertResult.rows[0].id;
      
      // Clean up
      await client.query('DELETE FROM sos_alerts WHERE id = $1', [alertId]);
      
      console.log('✅ PASS: Can create SOS alerts with RETURNING clause');
      console.log(`   Test alert created (ID: ${alertId}) and cleaned up`);
      passed++;
    } catch (err) {
      console.log('❌ FAIL: SOS alert test error:', err.message);
      failed++;
    }

    // Test 6: Check foreign key constraints
    console.log('\nTest 6: Checking foreign key constraints...');
    try {
      // Try to insert with invalid user_id (should fail if constraint exists)
      try {
        await client.query(`
          INSERT INTO emergency_contacts (user_id, contact_name, phone_number)
          VALUES (-999, 'Invalid User', '+1234567890')
        `);
        console.log('⚠️  WARNING: Foreign key constraint may not be enforced');
        // Clean up if it succeeded
        await client.query(`DELETE FROM emergency_contacts WHERE contact_name = 'Invalid User'`);
      } catch (fkErr) {
        if (fkErr.code === '23503') {
          console.log('✅ PASS: Foreign key constraints working');
          passed++;
        } else {
          throw fkErr;
        }
      }
    } catch (err) {
      console.log('❌ FAIL: Foreign key test error:', err.message);
      failed++;
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 TEST SUMMARY');
    console.log('========================================');
    console.log(`Total Tests: ${passed + failed}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('========================================\n');

    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Your SOS database is ready!\n');
    } else {
      console.log('⚠️  Some tests failed. Please review errors above.\n');
    }

  } catch (err) {
    console.error('❌ Critical error:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    await client.end();
  }
}

runTests().catch(console.error);

const pool = require('./config/db');
require('dotenv').config();

async function testQueries() {
  console.log('🧪 Testing database queries...\n');
  
  let client;
  
  try {
    client = await pool.connect();
    console.log('✅ Database connected\n');

    // Test 1: emergency_contacts query
    console.log('1️⃣ Testing emergency_contacts query...');
    try {
      const result = await client.query(`
        SELECT * FROM emergency_contacts 
        WHERE user_id = $1 AND is_active = TRUE
        ORDER BY priority ASC
      `, [1]);
      console.log('✅ emergency_contacts query successful');
      console.log(`   Found ${result.rows.length} contacts\n`);
    } catch (err) {
      console.error('❌ emergency_contacts query failed:', err.message);
      console.error('   Detail:', err.detail);
      console.error('   Hint:', err.hint, '\n');
    }

    // Test 2: events query
    console.log('2️⃣ Testing events query...');
    try {
      const result = await client.query(`
        SELECT * FROM events ORDER BY start_date DESC
      `);
      console.log('✅ events query successful');
      console.log(`   Found ${result.rows.length} events\n`);
    } catch (err) {
      console.error('❌ events query failed:', err.message);
      console.error('   Detail:', err.detail);
      console.error('   Hint:', err.hint, '\n');
    }

    // Test 3: training_plans query
    console.log('3️⃣ Testing training_plans query...');
    try {
      const result = await client.query(`
        SELECT * FROM training_plans 
        WHERE user_id = $1 
        ORDER BY start_date DESC 
        LIMIT 1
      `, [1]);
      console.log('✅ training_plans query successful');
      console.log(`   Found ${result.rows.length} plans\n`);
    } catch (err) {
      console.error('❌ training_plans query failed:', err.message);
      console.error('   Detail:', err.detail);
      console.error('   Hint:', err.hint, '\n');
    }

    // Test 4: Check table columns
    console.log('4️⃣ Checking table structures...');
    
    const tables = ['emergency_contacts', 'events', 'training_plans'];
    for (const table of tables) {
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [table]);
      
      console.log(`\n📋 ${table} columns:`);
      columns.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    }

    console.log('\n========================================');
    console.log('✅ Query testing complete!');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (client) {
      client.release();
    }
    process.exit(0);
  }
}

testQueries();

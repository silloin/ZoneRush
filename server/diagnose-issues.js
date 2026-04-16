const pool = require('./config/db');
require('dotenv').config();

async function diagnoseIssues() {
  console.log('🔍 ZoneRush Diagnostic Tool\n');
  
  let client;
  
  try {
    // Connect to database
    console.log('1️⃣ Connecting to database...');
    client = await pool.connect();
    console.log('✅ Database connected\n');

    // Check achievements table columns
    console.log('2️⃣ Checking achievements table...');
    const columnsResult = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'achievements' 
      ORDER BY ordinal_position
    `);
    console.log('   Achievements table columns:');
    columnsResult.rows.forEach(row => {
      console.log(`     - ${row.column_name}`);
    });

    // Check for duplicate user achievements
    const duplicates = await client.query(`
      SELECT user_id, achievement_id, COUNT(*) as cnt 
      FROM user_achievements 
      GROUP BY user_id, achievement_id 
      HAVING COUNT(*) > 1
    `);
    if (duplicates.rows.length > 0) {
      console.log(`\n   ⚠️  Found ${duplicates.rows.length} duplicate achievement entries`);
    } else {
      console.log('\n   ✅ No duplicate achievements');
    }

    // Check emergency contacts
    console.log('\n3️⃣ Checking emergency contacts...');
    const contacts = await client.query(`
      SELECT COUNT(*) as count FROM emergency_contacts WHERE user_id = 5
    `);
    console.log(`   Emergency contacts for user 5: ${contacts.rows[0].count}`);
    if (contacts.rows[0].count === 0) {
      console.log('   ⚠️  User 5 has NO emergency contacts configured');
    }

    // Check tiles
    console.log('\n4️⃣ Checking tiles...');
    const tiles = await client.query(`
      SELECT COUNT(*) as count FROM captured_tiles
    `);
    console.log(`   Total captured tiles in database: ${tiles.rows[0].count}`);

    // Check users
    console.log('\n5️⃣ Checking user 5...');
    const users = await client.query(`
      SELECT id, username, email FROM users WHERE id = 5
    `);
    if (users.rows.length > 0) {
      console.log(`   User 5: ${users.rows[0].username} (${users.rows[0].email})`);
    } else {
      console.log('   ⚠️  User 5 not found!');
    }

    console.log('\n✅ Diagnostic complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (client) {
      client.release();
    }
  }
}

diagnoseIssues();

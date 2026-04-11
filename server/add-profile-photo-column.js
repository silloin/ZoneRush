const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running profile_photo_url migration...\n');

    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'profile_photo_url'
    `);

    if (checkResult.rows.length === 0) {
      console.log('⚠️  profile_photo_url column not found. Adding it...\n');
      
      // Add the column
      await pool.query('ALTER TABLE users ADD COLUMN profile_photo_url TEXT');
      
      console.log('✅ Successfully added profile_photo_url column to users table\n');
    } else {
      console.log('✅ profile_photo_url column already exists\n');
      console.log('Column details:', checkResult.rows[0], '\n');
    }

    // Verify all profile-related columns
    const verifyResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name LIKE '%profile%'
      ORDER BY column_name
    `);

    console.log('📊 Profile-related columns in users table:');
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

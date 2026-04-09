const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  password: '8810',
  host: 'localhost',
  database: 'zonerush',
  port: 5432
});

async function applyMigration() {
  try {
    console.log('🔄 Applying email verification migration...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migration_add_email_verification.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!\n');
    
    // Verify the table was created
    const tableCheck = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_verifications')"
    );
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ email_verifications table confirmed to exist\n');
      
      // Check users table has email_verified column
      const columnCheck = await pool.query(
        "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified')"
      );
      
      if (columnCheck.rows[0].exists) {
        console.log('✅ users.email_verified column confirmed to exist\n');
      } else {
        console.log('❌ users.email_verified column NOT found\n');
      }
    } else {
      console.log('❌ email_verifications table was NOT created\n');
    }
    
    await pool.end();
    console.log('✨ Migration complete! You can now restart the server.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    await pool.end();
    process.exit(1);
  }
}

applyMigration();

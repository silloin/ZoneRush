/**
 * Security Tables Migration Script
 * Run this to create missing database tables on Render/Supabase
 * 
 * Usage:
 * node migrate-security-tables.js
 */

const pool = require('./config/db');

async function runMigration() {
  console.log('🔒 Starting Security Tables Migration\n');
  console.log('═'.repeat(60));

  try {
    // 1. Create login_attempts table
    console.log('\n1️⃣  Creating login_attempts table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ip_address VARCHAR(45) NOT NULL,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at)`);
    console.log('   ✅ login_attempts table created');

    // 2. Create token_blacklist table
    console.log('\n2️⃣  Creating token_blacklist table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id SERIAL PRIMARY KEY,
        token_jti VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at)`);
    console.log('   ✅ token_blacklist table created');

    // 3. Add account security columns to users table
    console.log('\n3️⃣  Adding account security columns...');
    
    const columnsToAdd = [
      { name: 'account_locked', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'lockout_until', type: 'TIMESTAMP' },
      { name: 'last_failed_login', type: 'TIMESTAMP' }
    ];

    for (const col of columnsToAdd) {
      const check = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = $1
      `, [col.name]);

      if (check.rows.length === 0) {
        await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        console.log(`   ✅ Added ${col.name} column`);
      } else {
        console.log(`   ℹ️  ${col.name} column already exists`);
      }
    }

    // 4. Create password_history table
    console.log('\n4️⃣  Creating password_history table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_history_created ON password_history(created_at)`);
    console.log('   ✅ password_history table created');

    // 5. Create security_events table
    console.log('\n5️⃣  Creating security_events table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at)`);
    console.log('   ✅ security_events table created');

    // 6. Create password_resets table
    console.log('\n6️⃣  Creating password_resets table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at)`);
    console.log('   ✅ password_resets table created');

    // 7. Create email_verifications table
    console.log('\n7️⃣  Creating email_verifications table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id)`);
    console.log('   ✅ email_verifications table created');

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Tables created:');
    console.log('   • login_attempts - Brute force protection');
    console.log('   • token_blacklist - Session invalidation');
    console.log('   • password_history - Password reuse prevention');
    console.log('   • security_events - Audit logging');
    console.log('   • password_resets - Password reset tokens');
    console.log('   • email_verifications - Email verification');
    console.log('\n🔧 Your login should now work properly!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration();

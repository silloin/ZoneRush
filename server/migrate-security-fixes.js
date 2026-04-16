const pool = require('./config/db');

async function applySecurityFixes() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('🔒 Applying Security Fixes to ZoneRush Database\n');
    console.log('═'.repeat(60));

    // 1. Create token_blacklist table for session invalidation
    console.log('\n1️⃣  Creating token_blacklist table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id SERIAL PRIMARY KEY,
        token_jti VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at)
    `);
    console.log('   ✅ token_blacklist table created');

    // 2. Create login_attempts table for brute force protection
    console.log('\n2️⃣  Creating login_attempts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ip_address VARCHAR(45) NOT NULL,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at)
    `);
    console.log('   ✅ login_attempts table created');

    // 3. Add account_locked column to users table
    console.log('\n3️⃣  Adding account security columns...');
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'account_locked'
    `);
    
    if (columnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN account_locked BOOLEAN DEFAULT false,
        ADD COLUMN lockout_until TIMESTAMP,
        ADD COLUMN last_failed_login TIMESTAMP
      `);
      console.log('   ✅ Added account_locked, lockout_until, last_failed_login columns');
    } else {
      console.log('   ℹ️  Security columns already exist');
    }

    // 4. Create password history table (prevent password reuse)
    console.log('\n4️⃣  Creating password_history table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_history(user_id)
    `);
    console.log('   ✅ password_history table created');

    // 5. Add email verification columns if missing
    console.log('\n5️⃣  Checking email verification setup...');
    const emailVerifiedCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email_verified'
    `);
    
    if (emailVerifiedCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN email_verified BOOLEAN DEFAULT false
      `);
      console.log('   ✅ Added email_verified column');
    } else {
      console.log('   ℹ️  email_verified column already exists');
    }

    // 6. Create security_events table for audit logging
    console.log('\n6️⃣  Creating security_events table...');
    await client.query(`
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
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_security_events_time ON security_events(created_at)
    `);
    console.log('   ✅ security_events table created');

    // 7. Clean up expired tokens (maintenance)
    console.log('\n7️⃣  Cleaning up expired tokens...');
    const deletedTokens = await client.query(`
      DELETE FROM token_blacklist 
      WHERE expires_at < NOW()
    `);
    console.log(`   ✅ Deleted ${deletedTokens.rowCount} expired blacklist entries`);

    // 8. Clean up old login attempts
    console.log('\n8️⃣  Cleaning up old login attempts...');
    const deletedAttempts = await client.query(`
      DELETE FROM login_attempts 
      WHERE attempted_at < NOW() - INTERVAL '24 hours'
    `);
    console.log(`   ✅ Deleted ${deletedAttempts.rowCount} old login attempts`);

    // 9. Verify password_reset tokens table
    console.log('\n9️⃣  Checking password_resets table...');
    const passwordResetsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'password_resets'
      )
    `);
    
    if (!passwordResetsCheck.rows[0].exists) {
      await client.query(`
        CREATE TABLE password_resets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT false,
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id)
      `);
      console.log('   ✅ password_resets table created');
    } else {
      console.log('   ℹ️  password_resets table already exists');
    }

    // 10. Verify email_verifications table
    console.log('\n🔟  Checking email_verifications table...');
    const emailVerifCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'email_verifications'
      )
    `);
    
    if (!emailVerifCheck.rows[0].exists) {
      await client.query(`
        CREATE TABLE email_verifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          verified BOOLEAN DEFAULT false,
          verified_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id)
      `);
      console.log('   ✅ email_verifications table created');
    } else {
      console.log('   ℹ️  email_verifications table already exists');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ All security fixes applied successfully!\n');
    
    console.log('📋 Summary:');
    console.log('   • token_blacklist - Session invalidation');
    console.log('   • login_attempts - Brute force protection');
    console.log('   • account_locked - Account lockout support');
    console.log('   • password_history - Prevent password reuse');
    console.log('   • security_events - Audit logging');
    console.log('   • password_resets - Secure token storage');
    console.log('   • email_verifications - Email verification');
    
    console.log('\n🔧 Next Steps:');
    console.log('   1. Restart your server to apply changes');
    console.log('   2. Update frontend to use cookie-based auth only');
    console.log('   3. Rotate all exposed API keys in .env');
    console.log('   4. Enable email verification enforcement (optional)');
    console.log('   5. Monitor security_events table for suspicious activity');

  } catch (error) {
    console.error('\n❌ Error applying security fixes:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
  }
}

applySecurityFixes();

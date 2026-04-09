const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: '8810',
  host: 'localhost',
  database: 'zonerush',
  port: 5432
});

async function checkEmailVerifications() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_verifications')"
    );
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ email_verifications table does NOT exist!');
      console.log('\n📋 Available tables:');
      const tables = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
      );
      tables.rows.forEach(t => console.log(`  - ${t.table_name}`));
      await pool.end();
      return;
    }
    
    console.log('✅ email_verifications table exists\n');
    
    const result = await pool.query(
      `SELECT 
        u.username, 
        u.email, 
        u.email_verified,
        ev.token,
        ev.expires_at,
        ev.verified,
        ev.created_at
       FROM users u
       LEFT JOIN email_verifications ev ON u.id = ev.user_id
       ORDER BY ev.created_at DESC NULLS LAST
       LIMIT 5`
    );
    
    console.log('📧 Email Verification Status:\n');
    if (result.rows.length === 0) {
      console.log('No users found.');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. Username: ${row.username}`);
        console.log(`   Email: ${row.email}`);
        console.log(`   Email Verified: ${row.email_verified ? '✅ YES' : '❌ NO'}`);
        if (row.token) {
          console.log(`   Has Token: ✅ YES`);
          console.log(`   Token Verified: ${row.verified ? '✅ YES' : '❌ NO'}`);
          console.log(`   Token Expires: ${row.expires_at}`);
          console.log(`   Created: ${row.created_at}`);
        } else {
          console.log(`   Has Token: ❌ NO`);
        }
        console.log('');
      });
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    await pool.end();
    process.exit(1);
  }
}

checkEmailVerifications();

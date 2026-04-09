const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: '8810',
  host: 'localhost',
  database: 'zonerush',
  port: 5432
});

async function checkVerificationTokens() {
  try {
    const result = await pool.query(
      `SELECT 
        u.username, 
        u.email, 
        u.email_verified,
        vt.token,
        vt.expires_at,
        vt.created_at
       FROM users u
       LEFT JOIN verification_tokens vt ON u.id = vt.user_id
       ORDER BY vt.created_at DESC NULLS LAST
       LIMIT 5`
    );
    
    console.log('\n📧 Email Verification Status:\n');
    if (result.rows.length === 0) {
      console.log('No users found.');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. Username: ${row.username}`);
        console.log(`   Email: ${row.email}`);
        console.log(`   Verified: ${row.email_verified ? '✅ YES' : '❌ NO'}`);
        if (row.token) {
          console.log(`   Token: ${row.token.substring(0, 20)}...`);
          console.log(`   Token Expires: ${row.expires_at}`);
          console.log(`   Token Created: ${row.created_at}`);
        } else {
          console.log(`   Token: None`);
        }
        console.log('');
      });
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

checkVerificationTokens();

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: '8810',
  host: 'localhost',
  database: 'zonerush',
  port: 5432
});

async function checkUsers() {
  try {
    const result = await pool.query(
      'SELECT username, email, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );
    
    console.log('\n📋 Recent Users:\n');
    if (result.rows.length === 0) {
      console.log('No users found in database.');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Created: ${user.created_at}\n`);
      });
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

checkUsers();

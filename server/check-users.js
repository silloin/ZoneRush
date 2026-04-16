const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'zonerush',
  port: process.env.DB_PORT || 5432
});

if (!process.env.DB_PASSWORD) {
  console.error('❌ ERROR: DB_PASSWORD environment variable not set!');
  console.error('   Please create server/.env with database credentials.');
  console.error('   See server/.env.example for template.');
  process.exit(1);
}

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

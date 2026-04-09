const pool = require('./config/db');

async function checkUsersTable() {
  try {
    console.log('Checking users table structure...\n');
    
    // Get column information
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns:');
    console.log('='.repeat(50));
    columns.rows.forEach(col => {
      console.log(`${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable}`);
    });
    
    // Check if there are any users
    const users = await pool.query('SELECT id, username, email FROM users LIMIT 5');
    console.log('\n\nSample users:');
    console.log('='.repeat(50));
    if (users.rows.length === 0) {
      console.log('No users found in database');
    } else {
      users.rows.forEach(user => {
        console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkUsersTable();

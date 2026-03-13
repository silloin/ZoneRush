const pool = require('./config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testAuth() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    // Get all users
    const users = await pool.query('SELECT id, username, email FROM users ORDER BY id DESC');
    
    if (users.rows.length === 0) {
      console.log('❌ No users found in database!');
      console.log('💡 You need to register a new user first.\n');
    } else {
      console.log(`✅ Found ${users.rows.length} user(s):`);
      users.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.email}) - ID: ${user.id}`);
      });
      console.log('');
    }

    // Test password for first user if exists
    if (users.rows.length > 0) {
      const testEmail = users.rows[0].email;
      console.log(`\n🔐 Testing password verification for: ${testEmail}`);
      
      const userWithPassword = await pool.query('SELECT password FROM users WHERE email = $1', [testEmail]);
      
      if (userWithPassword.rows.length > 0) {
        const hashedPassword = userWithPassword.rows[0].password;
        console.log('Password hash exists:', hashedPassword.substring(0, 20) + '...');
        
        // You can test a password here
        const testPassword = 'test123'; // Change this to test
        const isMatch = await bcrypt.compare(testPassword, hashedPassword);
        console.log(`Testing password "${testPassword}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
      }
    }

    console.log('\n✅ Database connection working!');
    console.log('💡 To login, use the email and password you registered with.\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    pool.end();
  }
}

testAuth();

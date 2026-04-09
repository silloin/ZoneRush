const pool = require('./config/db');
require('dotenv').config();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database structure...\n');
    
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Users table does not exist!');
      console.log('💡 Run database setup first.\n');
      return;
    }
    
    console.log('✅ Users table exists');
    
    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Table structure:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Count users
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`\n👥 Total users: ${userCount.rows[0].count}`);
    
    // List all users
    const users = await pool.query('SELECT id, username, email FROM users');
    if (users.rows.length > 0) {
      console.log('\n📝 Users list:');
      users.rows.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.username} (${user.email}) - ID: ${user.id}`);
      });
    }
    
    // Create a test user
    console.log('\n🧪 Creating test user...');
    try {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const testPassword = process.env.TEST_USER_PASSWORD;
      if (!testPassword) {
        console.log('⚠️ Skipping test user creation: TEST_USER_PASSWORD env var not set');
        return;
      }
      const hashedPassword = await bcrypt.hash(testPassword, salt);
      
      const newUser = await pool.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
        ['testuser', 'test@example.com', hashedPassword]
      );
      
      console.log('✅ Test user created:', newUser.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        console.log('ℹ️ Test user already exists');
      } else {
        console.error('❌ Error creating test user:', err.message);
      }
    }
    
  } catch (err) {
    console.error('❌ Database error:', err.message);
  } finally {
    pool.end();
  }
}

checkDatabase();
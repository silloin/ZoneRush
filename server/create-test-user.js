require('dotenv').config();
const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    const email = process.env.TEST_USER_EMAIL;
    const username = process.env.TEST_USER_USERNAME;
    const password = process.env.TEST_USER_PASSWORD;

    if (!email || !username || !password) {
      console.error('❌ Missing TEST_USER_EMAIL, TEST_USER_USERNAME, or TEST_USER_PASSWORD in .env');
      process.exit(1);
    }

    console.log('Creating test user...\n');

    // Check if user already exists
    const existing = await pool.query('SELECT id, username, email FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('✅ User already exists!');
      console.log(`ID: ${existing.rows[0].id}`);
      console.log(`Username: ${existing.rows[0].username}`);
      console.log(`Email: ${existing.rows[0].email}`);
      console.log('\nYou can now login with:');
      console.log(`Email: ${email}`);
      console.log('Password: (see TEST_USER_PASSWORD in .env)');
      process.exit(0);
    }
    
    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insert user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );
    
    console.log('✅ Test user created successfully!\n');
    console.log(`ID: ${result.rows[0].id}`);
    console.log(`Username: ${result.rows[0].username}`);
    console.log(`Email: ${result.rows[0].email}`);
    console.log('\nYou can now login with:');
    console.log(`Email: ${email}`);
    console.log('Password: (see TEST_USER_PASSWORD in .env)');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

createTestUser();

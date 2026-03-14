const pool = require('./config/db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function investigateDatabase() {
  try {
    console.log('🔍 COMPREHENSIVE DATABASE INVESTIGATION\n');
    
    // 1. Check database connection details
    console.log('📊 Database Configuration:');
    console.log('- DB_HOST:', process.env.DB_HOST || 'localhost');
    console.log('- DB_DATABASE:', process.env.DB_DATABASE || 'runterra');
    console.log('- DB_USER:', process.env.DB_USER || 'postgres');
    console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set (production)' : 'Not set (local)');
    console.log('');
    
    // 2. Test basic connection
    const connectionTest = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log('✅ Connected to database:', connectionTest.rows[0].db_name);
    console.log('⏰ Server time:', connectionTest.rows[0].current_time);
    console.log('');
    
    // 3. Check if users table exists and its structure
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ CRITICAL: Users table does not exist!');
      return;
    }
    
    console.log('✅ Users table exists');
    
    // 4. Get table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Users table structure:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });
    console.log('');
    
    // 5. Count total users
    const userCount = await pool.query('SELECT COUNT(*) as total FROM users');
    console.log(`👥 Total users in database: ${userCount.rows[0].total}`);
    
    // 6. List all users with full details
    const allUsers = await pool.query(`
      SELECT id, username, email, 
             LENGTH(password) as password_length,
             createdat,
             CASE WHEN password IS NULL THEN 'NULL' 
                  WHEN password = '' THEN 'EMPTY' 
                  ELSE 'SET' END as password_status
      FROM users 
      ORDER BY id
    `);
    
    if (allUsers.rows.length > 0) {
      console.log('\n📝 All users in database:');
      allUsers.rows.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user.id}`);
        console.log(`     Username: ${user.username}`);
        console.log(`     Email: ${user.email}`);
        console.log(`     Password: ${user.password_status} (${user.password_length} chars)`);
        console.log(`     Created: ${user.createdat || 'Unknown'}`);
        console.log('');
      });
    } else {
      console.log('\n📝 No users found in database');
    }
    
    // 7. Test creating a user manually
    console.log('🧪 Testing user creation...');
    const testEmail = process.env.DEBUG_USER_EMAIL || 'debug@test.com';
    const testPassword = process.env.DEBUG_USER_PASSWORD;
    if (!testPassword) {
      console.log('⚠️  Skipping user creation test: DEBUG_USER_PASSWORD env var not set');
      return;
    }
    
    try {
      // Check if test user already exists
      const existingUser = await pool.query('SELECT id, email FROM users WHERE email = $1', [testEmail]);
      
      if (existingUser.rows.length > 0) {
        console.log(`ℹ️  Test user already exists with ID: ${existingUser.rows[0].id}`);
        
        // Test login with existing user
        const userWithPassword = await pool.query('SELECT password FROM users WHERE email = $1', [testEmail]);
        const isMatch = await bcrypt.compare(testPassword, userWithPassword.rows[0].password);
        console.log(`🔐 Password verification: ${isMatch ? '✅ CORRECT' : '❌ INCORRECT'}`);
      } else {
        // Create new test user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(testPassword, salt);
        
        const newUser = await pool.query(
          'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
          ['debuguser', testEmail, hashedPassword]
        );
        
        console.log('✅ Test user created successfully:', newUser.rows[0]);
        
        // Immediately verify we can find this user
        const verification = await pool.query('SELECT id, username, email FROM users WHERE email = $1', [testEmail]);
        console.log('🔍 Verification - User found:', verification.rows.length > 0 ? 'YES' : 'NO');
        
        if (verification.rows.length > 0) {
          console.log('   User details:', verification.rows[0]);
        }
      }
    } catch (createError) {
      console.error('❌ Error during user creation test:', createError.message);
      if (createError.code) {
        console.error('   Error code:', createError.code);
      }
    }
    
    // 8. Check for any database constraints or triggers
    console.log('\n🔧 Checking database constraints...');
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users'
    `);
    
    if (constraints.rows.length > 0) {
      console.log('📋 Table constraints:');
      constraints.rows.forEach(constraint => {
        console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
      });
    } else {
      console.log('ℹ️  No constraints found on users table');
    }
    
    console.log('\n✅ Investigation complete!');
    
  } catch (err) {
    console.error('❌ Investigation failed:', err.message);
    console.error('Stack trace:', err.stack);
  } finally {
    pool.end();
  }
}

investigateDatabase();
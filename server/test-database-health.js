/**
 * Database Health Check Script
 * Tests actual database operations to ensure backend can work properly
 * 
 * Usage:
 * node test-database-health.js
 */

const pool = require('./config/db');

async function testDatabaseHealth() {
  console.log('🏥 Database Health Check\n');
  console.log('═'.repeat(70));
  
  let testsPassed = 0;
  let testsFailed = 0;
  let testResults = [];
  
  async function runTest(name, testFn) {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      testsPassed++;
      testResults.push({ name, status: 'PASS' });
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      testsFailed++;
      testResults.push({ name, status: 'FAIL', error: error.message });
    }
  }
  
  try {
    // Test 1: Database Connection
    await runTest('Database Connection', async () => {
      const result = await pool.query('SELECT NOW() as current_time');
      if (!result.rows[0].current_time) {
        throw new Error('Could not get current timestamp');
      }
    });
    
    // Test 2: Users Table - Read
    await runTest('Users Table - Read', async () => {
      await pool.query('SELECT id, username, email FROM users LIMIT 1');
    });
    
    // Test 3: Users Table - Write
    await runTest('Users Table - Write', async () => {
      await pool.query(`
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO NOTHING
      `, ['test_user_health_check', 'healthcheck@test.com', 'test_hash']);
    });
    
    // Test 4: Runs Table
    await runTest('Runs Table - Read', async () => {
      await pool.query('SELECT id, user_id, distance FROM runs LIMIT 1');
    });
    
    // Test 5: Tiles Table
    await runTest('Tiles Table - Read', async () => {
      await pool.query('SELECT id, geohash FROM tiles LIMIT 1');
    });
    
    // Test 6: User Tiles Table
    await runTest('User Tiles Table - Read', async () => {
      await pool.query('SELECT id, user_id, tile_id FROM user_tiles LIMIT 1');
    });
    
    // Test 7: Login Attempts Table (Security)
    await runTest('Login Attempts Table - Read', async () => {
      await pool.query('SELECT id, user_id, ip_address FROM login_attempts LIMIT 1');
    });
    
    // Test 8: Token Blacklist Table (Security)
    await runTest('Token Blacklist Table - Read', async () => {
      await pool.query('SELECT id, token_jti, expires_at FROM token_blacklist LIMIT 1');
    });
    
    // Test 9: Password Resets Table
    await runTest('Password Resets Table - Read', async () => {
      await pool.query('SELECT id, user_id, token FROM password_resets LIMIT 1');
    });
    
    // Test 10: Email Verifications Table
    await runTest('Email Verifications Table - Read', async () => {
      await pool.query('SELECT id, user_id, token FROM email_verifications LIMIT 1');
    });
    
    // Test 11: Security Events Table
    await runTest('Security Events Table - Read', async () => {
      await pool.query('SELECT id, user_id, event_type FROM security_events LIMIT 1');
    });
    
    // Test 12: Emergency Contacts Table
    await runTest('Emergency Contacts Table - Read', async () => {
      await pool.query('SELECT id, user_id, name, phone FROM emergency_contacts LIMIT 1');
    });
    
    // Test 13: SOS Alerts Table
    await runTest('SOS Alerts Table - Read', async () => {
      await pool.query('SELECT id, user_id, latitude, longitude FROM sos_alerts LIMIT 1');
    });
    
    // Test 14: Friendships Table
    await runTest('Friendships Table - Read', async () => {
      await pool.query('SELECT id, user_id, friend_id, status FROM friendships LIMIT 1');
    });
    
    // Test 15: Messages Table
    await runTest('Messages Table - Read', async () => {
      await pool.query('SELECT id, sender_id, receiver_id, content FROM messages LIMIT 1');
    });
    
    // Test 16: Conversations Table
    await runTest('Conversations Table - Read', async () => {
      await pool.query('SELECT id, participant_1, participant_2 FROM conversations LIMIT 1');
    });
    
    // Test 17: Achievements Table
    await runTest('Achievements Table - Read', async () => {
      await pool.query('SELECT id, name, description FROM achievements LIMIT 1');
    });
    
    // Test 18: User Achievements Table
    await runTest('User Achievements Table - Read', async () => {
      await pool.query('SELECT id, user_id, achievement_id FROM user_achievements LIMIT 1');
    });
    
    // Test 19: AI Training Plans Table
    await runTest('AI Training Plans Table - Read', async () => {
      await pool.query('SELECT id, user_id, plan_name FROM ai_training_plans LIMIT 1');
    });
    
    // Test 20: Events Table
    await runTest('Events Table - Read', async () => {
      await pool.query('SELECT id, title, location FROM events LIMIT 1');
    });
    
    // Test 21: PostGIS Functions
    await runTest('PostGIS - ST_Point Function', async () => {
      await pool.query("SELECT ST_Point(0, 0) as test_point");
    });
    
    // Test 22: PostGIS Geography
    await runTest('PostGIS - Geography Column Check', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'runs' AND column_name = 'route_geometry'
        )
      `);
      if (!result.rows[0].exists) {
        throw new Error('route_geometry column not found');
      }
    });
    
    // Test 23: Indexes Check
    await runTest('Database Indexes', async () => {
      const result = await pool.query(`
        SELECT COUNT(*) as index_count
        FROM pg_indexes
        WHERE schemaname = 'public'
      `);
      const indexCount = parseInt(result.rows[0].index_count);
      if (indexCount < 10) {
        throw new Error(`Only ${indexCount} indexes found, expected more`);
      }
    });
    
    // Test 24: Foreign Keys Check
    await runTest('Foreign Keys', async () => {
      const result = await pool.query(`
        SELECT COUNT(*) as fk_count
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
      `);
      const fkCount = parseInt(result.rows[0].fk_count);
      if (fkCount < 5) {
        throw new Error(`Only ${fkCount} foreign keys found, expected more`);
      }
    });
    
    // Test 25: Database Size
    await runTest('Database Size Check', async () => {
      const result = await pool.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      console.log(`   Database size: ${result.rows[0].size}`);
    });
    
    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 HEALTH CHECK SUMMARY:\n');
    console.log(`Total tests: ${testsPassed + testsFailed}`);
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    
    const successRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
    console.log(`Success rate: ${successRate}%`);
    
    if (testsFailed === 0) {
      console.log('\n✅ DATABASE IS FULLY OPERATIONAL!');
      console.log('   All backend features should work correctly.\n');
    } else if (testsFailed <= 3) {
      console.log('\n⚠️  DATABASE HAS MINOR ISSUES:');
      console.log('   Most features will work, but some may have problems.\n');
      
      const failedTests = testResults.filter(r => r.status === 'FAIL');
      console.log('Failed tests:');
      failedTests.forEach(test => {
        console.log(`   • ${test.name}: ${test.error}`);
      });
      console.log('');
    } else {
      console.log('\n❌ DATABASE HAS CRITICAL ISSUES:');
      console.log('   Multiple features will not work. Run migrations immediately.\n');
      
      const failedTests = testResults.filter(r => r.status === 'FAIL');
      console.log('Failed tests:');
      failedTests.forEach(test => {
        console.log(`   • ${test.name}: ${test.error}`);
      });
      console.log('');
      console.log('💡 Recommended actions:');
      console.log('   1. Run: node verify-database.js (to check structure)');
      console.log('   2. Run: node migrate-security-tables.js (to create missing tables)');
      console.log('   3. Check database migrations in /database folder\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Health check failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run health check
testDatabaseHealth();

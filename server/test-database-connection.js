const pool = require('./config/db');

async function testDatabase() {
  console.log('🧪 Testing PostgreSQL Connection...\n');

  try {
    // Test 1: Basic connection
    console.log('1️⃣  Testing basic connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Connected to PostgreSQL');
    console.log(`   Server time: ${result.rows[0].current_time}\n`);

    // Test 2: Check PostGIS extension
    console.log('2️⃣  Checking PostGIS extension...');
    const postgisCheck = await pool.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'postgis'
    `);
    
    if (postgisCheck.rows.length > 0) {
      console.log('✅ PostGIS is installed');
      console.log(`   Version: ${postgisCheck.rows[0].extversion}\n`);
    } else {
      console.log('⚠️  PostGIS is NOT installed');
      console.log('   Installing PostGIS extension...\n');
      
      try {
        await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');
        console.log('✅ PostGIS extension created successfully\n');
      } catch (err) {
        console.error('❌ Failed to install PostGIS:', err.message);
        console.log('   You may need to install it manually:');
        console.log('   - Windows: Application Stack Builder');
        console.log('   - Ubuntu: sudo apt install postgresql-14-postgis-3\n');
      }
    }

    // Test 3: Test PostGIS spatial functions
    console.log('3️⃣  Testing PostGIS spatial functions...');
    try {
      const spatialTest = await pool.query(`
        SELECT ST_AsText(ST_Point(77.2090, 28.6139)) as location
      `);
      console.log('✅ PostGIS spatial functions working');
      console.log(`   Test point: ${spatialTest.rows[0].location}\n`);
    } catch (err) {
      console.error('❌ PostGIS spatial functions failed:', err.message, '\n');
    }

    // Test 4: Check database tables
    console.log('4️⃣  Checking database tables...');
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log(`✅ Found ${tables.rows.length} tables:`);
    tables.rows.forEach((table, idx) => {
      console.log(`   ${idx + 1}. ${table.tablename}`);
    });
    console.log('');

    // Test 5: Check users table
    console.log('5️⃣  Checking users table...');
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Users table has ${usersCount.rows[0].count} users\n`);

    // Test 6: Check if location column exists and has PostGIS type
    console.log('6️⃣  Checking spatial columns...');
    try {
      const spatialColumns = await pool.query(`
        SELECT f_table_name, f_geometry_column, type, srid
        FROM geometry_columns
        WHERE f_table_schema = 'public'
      `);
      
      if (spatialColumns.rows.length > 0) {
        console.log('✅ Spatial columns found:');
        spatialColumns.rows.forEach((col, idx) => {
          console.log(`   ${idx + 1}. ${col.f_table_name}.${col.f_geometry_column} (${col.type}, SRID: ${col.srid})`);
        });
      } else {
        console.log('ℹ️  No spatial columns found in geometry_columns');
        console.log('   This is OK if you are using regular lat/lng columns\n');
      }
    } catch (err) {
      console.log('ℹ️  geometry_columns view not accessible\n');
    }

    // Test 7: Database size
    console.log('7️⃣  Checking database size...');
    const dbSize = await pool.query(`
      SELECT pg_size_pretty(pg_database_size('zonerush')) as size
    `);
    console.log(`✅ Database size: ${dbSize.rows[0].size}\n`);

    console.log('🎉 All database tests completed successfully!\n');
    
  } catch (err) {
    console.error('❌ Database test failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testDatabase();

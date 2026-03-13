const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use environment variables or default local connection
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_DATABASE || 'runterra'}`;

async function resetDatabase() {
  const client = new Client({ 
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    console.log('🗑️  Dropping all existing tables...');
    // Drop in correct order due to foreign key constraints
    const tablesToDrop = [
      'push_tokens',
      'user_achievements',
      'achievements',
      'comments',
      'likes',
      'posts',
      'route_points',
      'training_plans',
      'events',
      'zones',
      'captured_tiles',
      'tiles',
      'runs',
      'users'
    ];
    
    for (const table of tablesToDrop) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
        console.log(`  Dropped ${table}`);
      } catch (err) {
        console.warn(`  ⚠️ Could not drop ${table}: ${err.message}`);
      }
    }
    
    console.log('\n🏗️  Recreating database schema...');
    
    // Read and execute SQL files in order
    const sqlFiles = [
      'setup_database.sql',
      'postgis_setup.sql', 
      'social_gamification.sql'
    ];
    
    for (const sqlFile of sqlFiles) {
      const sqlPath = path.join(__dirname, 'sql', sqlFile);
      if (fs.existsSync(sqlPath)) {
        console.log(`  Executing ${sqlFile}...`);
        const sql = fs.readFileSync(sqlPath, 'utf8');
        // Split by semicolon and execute each statement separately
        const statements = sql.split(';').filter(s => s.trim().length > 0);
        for (const statement of statements) {
          try {
            await client.query(statement + ';');
          } catch (err) {
            console.error(`  ❌ Error executing: ${statement.substring(0, 50)}...`);
            console.error(`     ${err.message}`);
          }
        }
        console.log(`  ✅ Successfully executed ${sqlFile}`);
      } else {
        console.warn(`  ⚠️ SQL file not found: ${sqlFile}`);
      }
    }
    
    console.log('\n✨ Database reset and recreation complete!');
    
  } catch (err) {
    console.error('❌ Error resetting database:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase();

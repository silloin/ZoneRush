const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use environment variables or default local connection
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_DATABASE || 'runterra'}`;

async function setupDatabase() {
  const client = new Client({ 
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Read and execute SQL files in order
    const sqlFiles = [
      'create_tables.sql',
      'postgis_setup.sql', 
      'social_gamification.sql'
    ];
    
    for (const sqlFile of sqlFiles) {
      const sqlPath = path.join(__dirname, 'sql', sqlFile);
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        // Split by semicolon and execute each statement separately
        const statements = sql.split(';').filter(s => s.trim().length > 0);
        for (const statement of statements) {
          try {
            await client.query(statement + ';');
          } catch (err) {
            // Ignore "already exists" errors
            if (err.message.includes('already exists') || err.message.includes('duplicate')) {
              console.log(`  ⚠️ Skipped (already exists): ${statement.substring(0, 50)}...`);
            } else {
              console.error(`  ❌ Error executing: ${statement.substring(0, 50)}...`);
              console.error(`     ${err.message}`);
            }
          }
        }
        console.log(`✅ Executed ${sqlFile}`);
      } else {
        console.warn(`⚠️ SQL file not found: ${sqlFile}`);
      }
    }
    
    console.log('\n✅ Database setup complete!');
    console.log('Tables created/updated:');
    console.log('  - users (with xp, level, streak, lastRunDate)');
    console.log('  - runs (with route_geom for PostGIS)');
    console.log('  - tiles (with location, area_geom)');
    console.log('  - zones');
    console.log('  - events (with participants)');
    console.log('  - training_plans');
    console.log('  - territories (PostGIS polygon)');
    console.log('  - posts, likes, comments (social)');
    console.log('  - achievements, user_achievements');
    console.log('  - push_tokens');
    
  } catch (err) {
    console.error('❌ Error setting up database:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();

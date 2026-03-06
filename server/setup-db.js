const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Use your Railway connection string
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:********@yamanote.proxy.rlwy.net:22157/railway';

async function setupDatabase() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'sql', 'setup_database.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute SQL
    await client.query(sql);
    console.log('✅ Database setup complete!');
    console.log('Tables created: users, runs, tiles, zones, events, training_plans');
    
  } catch (err) {
    console.error('❌ Error setting up database:', err.message);
  } finally {
    await client.end();
  }
}

setupDatabase();

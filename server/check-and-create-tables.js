const pool = require('./config/db');
require('dotenv').config();

async function checkAndCreateTables() {
  console.log('🔍 Checking and creating missing database tables...\n');
  
  let client;
  
  try {
    client = await pool.connect();
    console.log('✅ Database connected\n');

    // Check and create emergency_contacts table
    console.log('1️⃣ Checking emergency_contacts table...');
    const emergencyCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'emergency_contacts'
      );
    `);
    
    if (!emergencyCheck.rows[0].exists) {
      console.log('⚠️  Creating emergency_contacts table...');
      await client.query(`
        CREATE TABLE emergency_contacts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          contact_name VARCHAR(255) NOT NULL,
          contact_type VARCHAR(50) DEFAULT 'custom',
          phone_number VARCHAR(50) NOT NULL,
          email VARCHAR(255),
          priority INTEGER DEFAULT 1,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id);
        CREATE INDEX idx_emergency_contacts_active ON emergency_contacts(user_id, is_active);
      `);
      console.log('✅ emergency_contacts table created\n');
    } else {
      console.log('✅ emergency_contacts table exists\n');
    }

    // Check and create events table
    console.log('2️⃣ Checking events table...');
    const eventsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'events'
      );
    `);
    
    if (!eventsCheck.rows[0].exists) {
      console.log('⚠️  Creating events table...');
      await client.query(`
        CREATE TABLE events (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          goal_type VARCHAR(50) NOT NULL,
          goal_value NUMERIC NOT NULL,
          start_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          end_date TIMESTAMPTZ NOT NULL,
          participants JSONB DEFAULT '[]',
          status VARCHAR(50) DEFAULT 'active',
          location JSONB,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_events_status ON events(status);
        CREATE INDEX idx_events_dates ON events(start_date, end_date);
      `);
      console.log('✅ events table created\n');
    } else {
      console.log('✅ events table exists\n');
    }

    // Check and create training_plans table
    console.log('3️⃣ Checking training_plans table...');
    const trainingCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'training_plans'
      );
    `);
    
    if (!trainingCheck.rows[0].exists) {
      console.log('⚠️  Creating training_plans table...');
      await client.query(`
        CREATE TABLE training_plans (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          plan_type VARCHAR(50) NOT NULL,
          workouts JSONB NOT NULL,
          start_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          end_date TIMESTAMPTZ,
          is_active BOOLEAN DEFAULT true,
          metadata JSONB,
          generated_by VARCHAR(20) DEFAULT 'template',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_training_plans_user ON training_plans(user_id);
        CREATE INDEX idx_training_plans_user_active ON training_plans(user_id, is_active);
      `);
      console.log('✅ training_plans table created\n');
    } else {
      console.log('✅ training_plans table exists\n');
      
      // Check if is_active column exists
      console.log('4️⃣ Checking training_plans columns...');
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'training_plans' AND column_name = 'is_active';
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log('⚠️  Adding missing columns to training_plans...');
        await client.query(`
          ALTER TABLE training_plans ADD COLUMN is_active BOOLEAN DEFAULT true;
          ALTER TABLE training_plans ADD COLUMN end_date TIMESTAMPTZ;
          ALTER TABLE training_plans ADD COLUMN metadata JSONB;
          ALTER TABLE training_plans ADD COLUMN generated_by VARCHAR(20) DEFAULT 'template';
        `);
        console.log('✅ Missing columns added\n');
      } else {
        console.log('✅ All columns exist\n');
      }
    }

    console.log('========================================');
    console.log('✅ All required tables are ready!');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (client) {
      client.release();
    }
    process.exit(0);
  }
}

checkAndCreateTables();

const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'runterra',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function check() {
  await client.connect();
  
  console.log('Checking database columns...\n');
  
  // Check runs table
  const runs = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='runs'");
  console.log('Runs columns:', runs.rows.map(x => x.column_name).join(', '));
  
  // Check users table
  const users = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='users'");
  console.log('Users columns:', users.rows.map(x => x.column_name).join(', '));
  
  // Check if created_at exists in runs
  const hasCreatedAt = runs.rows.some(r => r.column_name === 'created_at');
  if (!hasCreatedAt) {
    console.log('\n⚠️ created_at column missing in runs table. Adding it...');
    await client.query('ALTER TABLE runs ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW()');
    console.log('✅ Added created_at column to runs table');
  } else {
    console.log('\n✅ created_at column exists in runs table');
  }
  
  // Check achievements table
  const achievements = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name='achievements'");
  if (achievements.rows.length === 0) {
    console.log('\n⚠️ achievements table missing. Creating it...');
    await client.query(`
      CREATE TABLE achievements (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        xpreward INTEGER DEFAULT 100,
        requirement JSONB
      )
    `);
    await client.query(`
      CREATE TABLE user_achievements (
        id SERIAL PRIMARY KEY,
        userid INTEGER REFERENCES users(id) ON DELETE CASCADE,
        achievementid INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
        unlockedat TIMESTAMP DEFAULT NOW(),
        UNIQUE(userid, achievementid)
      )
    `);
    // Insert default achievements
    await client.query(`
      INSERT INTO achievements (name, description, icon, xpreward, requirement) VALUES
      ('First Run', 'Complete your first run', '🏃', 50, '{"runs": 1}'),
      ('5K Runner', 'Run 5 kilometers', '🎯', 100, '{"distance": 5}'),
      ('10K Runner', 'Run 10 kilometers', '🏅', 200, '{"distance": 10}'),
      ('Territory Starter', 'Claim your first tile', '🗺️', 50, '{"tiles": 1}'),
      ('Territory Master', 'Claim 100 tiles', '👑', 500, '{"tiles": 100}'),
      ('Social Butterfly', 'Share 10 runs', '🦋', 150, '{"posts": 10}'),
      ('Week Warrior', 'Maintain a 7-day streak', '🔥', 300, '{"streak": 7}'),
      ('Marathon Runner', 'Run 42 kilometers', '🏆', 1000, '{"distance": 42}')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Created achievements tables');
  } else {
    console.log('✅ achievements table exists');
  }
  
  // Check posts table
  const posts = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name='posts'");
  if (posts.rows.length === 0) {
    console.log('\n⚠️ Social tables missing. Creating them...');
    await client.query(`
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        userid INTEGER REFERENCES users(id) ON DELETE CASCADE,
        runid INTEGER REFERENCES runs(id) ON DELETE CASCADE,
        caption TEXT,
        createdat TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE likes (
        id SERIAL PRIMARY KEY,
        userid INTEGER REFERENCES users(id) ON DELETE CASCADE,
        postid INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        createdat TIMESTAMP DEFAULT NOW(),
        UNIQUE(userid, postid)
      )
    `);
    await client.query(`
      CREATE TABLE comments (
        id SERIAL PRIMARY KEY,
        userid INTEGER REFERENCES users(id) ON DELETE CASCADE,
        postid INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        createdat TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created social tables (posts, likes, comments)');
  } else {
    console.log('✅ Social tables exist');
  }
  
  await client.end();
  console.log('\n✅ Database check complete!');
}

check().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

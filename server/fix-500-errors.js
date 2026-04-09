/**
 * Quick Fix Script for 500 Errors
 * Creates missing tables and checks configuration
 */

const pool = require('./config/db');

async function fixErrors() {
  console.log('🔧 Fixing 500 Internal Server Errors...\n');

  try {
    // 1. Create comments table
    console.log('1. Creating comments table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);
    `);
    console.log('✅ Comments table created\n');

    // 2. Add metadata column to training_plans if missing
    console.log('2. Checking training_plans table...');
    await pool.query(`
      ALTER TABLE training_plans 
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
      
      ALTER TABLE training_plans 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;
      
      CREATE INDEX IF NOT EXISTS idx_training_plans_user_active 
      ON training_plans(user_id, is_active) WHERE is_active = true;
    `);
    console.log('✅ Training plans table updated\n');

    // 2b. Add missing columns to users table for AI Coach
    console.log('2b. Adding AI Coach columns to users table...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS best_5k_time INTEGER;
      
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS best_10k_time INTEGER;
      
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS fitness_level VARCHAR(50) DEFAULT 'beginner';
      
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS weekly_goal_distance INTEGER DEFAULT 20000;
    `);
    console.log('✅ Users table updated for AI Coach\n');

    // 3. Check GROQ_API_KEY
    console.log('3. Checking GROQ_API_KEY...');
    if (process.env.GROQ_API_KEY) {
      console.log('✅ GROQ_API_KEY is set');
      console.log(`   Key starts with: ${process.env.GROQ_API_KEY.substring(0, 8)}...\n`);
    } else {
      console.log('❌ GROQ_API_KEY is NOT set in .env file\n');
      console.log('📝 Add this to server/.env:');
      console.log('   GROQ_API_KEY=<your-groq-api-key>\n');
    }

    // 4. Verify tables exist
    console.log('4. Verifying database tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('comments', 'posts', 'users', 'training_plans')
      ORDER BY table_name
    `);
    
    console.log('   Found tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    console.log('');

    console.log('✨ All fixes applied successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart your server (Ctrl+C then npm start)');
    console.log('   2. Test the comment feature');
    console.log('   3. Test AI plan generation');
    console.log('   4. Check server logs for any remaining errors\n');

  } catch (error) {
    console.error('\n❌ Error applying fixes:', error.message);
    console.error('\nFull error:', error);
    console.error('\n💡 Tip: Make sure PostgreSQL is running and you have the correct database credentials in .env');
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run the fix
fixErrors();

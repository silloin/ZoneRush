const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function setupChatSystem() {
  console.log('🚀 Setting up Chat and Notification System...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'sql', 'chat_system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Executing chat_system.sql...');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Chat system database setup complete!\n');
    console.log('Tables created:');
    console.log('  ✓ friend_requests');
    console.log('  ✓ messages (private)');
    console.log('  ✓ global_messages');
    console.log('  ✓ notifications');
    console.log('  ✓ user_fcm_tokens');
    console.log('  ✓ user_conversations (view)\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error setting up chat system:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

setupChatSystem();

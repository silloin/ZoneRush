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
  
  console.log('Checking chat system tables...\n');
  
  // Check messages table
  const messages = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name='messages'");
  if (messages.rows.length === 0) {
    console.log('⚠️ messages table missing!');
  } else {
    console.log('✅ messages table exists');
    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='messages' ORDER BY ordinal_position");
    console.log('Columns:', cols.rows.map(x => x.column_name).join(', '));
  }
  
  // Check friend_requests table
  const friends = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name='friend_requests'");
  if (friends.rows.length === 0) {
    console.log('⚠️ friend_requests table missing!');
  } else {
    console.log('✅ friend_requests table exists');
    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='friend_requests' ORDER BY ordinal_position");
    console.log('Columns:', cols.rows.map(x => x.column_name).join(', '));
  }
  
  // Check users table
  const users = await client.query("SELECT id, username FROM users LIMIT 1");
  console.log('\n✅ Users table accessible, sample:', users.rows[0]);
  
  // Test a simple conversation query
  try {
    const testQuery = await client.query(`
      SELECT 
        CASE WHEN sender_id = 1 THEN receiver_id ELSE sender_id END AS other_user_id,
        COUNT(*) FILTER (WHERE receiver_id = 1 AND is_read = FALSE) AS unread_count,
        MAX(created_at) AS last_message_at
      FROM messages
      WHERE sender_id = 1 OR receiver_id = 1
      GROUP BY 
        CASE WHEN sender_id = 1 THEN receiver_id ELSE sender_id END
    `);
    console.log('\n✅ Simple conversation query works! Rows:', testQuery.rows.length);
  } catch (err) {
    console.error('\n❌ Error testing conversation query:', err.message);
  }
  
  await client.end();
  console.log('\n✅ Database check complete!');
}

check().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

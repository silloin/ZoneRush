const pool = require('./config/db');

async function testFriendRequest() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Test user 5 (Govind8810)
    const user = await client.query('SELECT id, username, email FROM users WHERE id = 5');
    console.log('👤 User 5:', user.rows[0]);

    // Check notifications table exists
    const notificationsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notifications'
      )
    `);

    if (!notificationsCheck.rows[0].exists) {
      console.log('\n❌ notifications table does not exist!');
      console.log('This is likely causing the 500 error.\n');
      console.log('📝 Creating notifications table...');
      
      await client.query(`
        CREATE TABLE notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          data JSONB,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ notifications table created');
      
      // Create index
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      `);
      
      console.log('✅ Indexes created');
    } else {
      console.log('\n✅ notifications table exists');
      
      // Check columns
      const columns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'notifications'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Table columns:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    }

    // Test inserting a notification
    console.log('\n🧪 Testing notification insert...');
    try {
      const testNotif = await client.query(
        `INSERT INTO notifications (user_id, type, title, content, data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [5, 'friend_request', 'Test Notification', 'Test message', JSON.stringify({ test: true })]
      );
      console.log('✅ Notification created with ID:', testNotif.rows[0].id);
      
      // Clean up test notification
      await client.query('DELETE FROM notifications WHERE id = $1', [testNotif.rows[0].id]);
      console.log('✅ Test notification deleted\n');
    } catch (error) {
      console.error('❌ Failed to insert notification:', error.message);
      console.error('Error details:', error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (client) {
      client.release();
    }
  }
}

testFriendRequest();

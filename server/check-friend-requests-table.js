const pool = require('./config/db');

async function checkFriendRequestsTable() {
  let client;
  
  try {
    client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'friend_requests'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ friend_requests table does not exist!');
      console.log('\n📝 Creating table...');
      
      await client.query(`
        CREATE TABLE friend_requests (
          id SERIAL PRIMARY KEY,
          sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(sender_id, receiver_id)
        )
      `);
      
      console.log('✅ Table created successfully');
      
      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
        CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
        CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
      `);
      
      console.log('✅ Indexes created');
    } else {
      console.log('✅ friend_requests table exists\n');
      
      // Check columns
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'friend_requests'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Table columns:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
      });
      
      // Check for missing columns
      const requiredColumns = ['id', 'sender_id', 'receiver_id', 'status', 'created_at', 'updated_at'];
      const existingColumns = columns.rows.map(c => c.column_name);
      
      const missing = requiredColumns.filter(col => !existingColumns.includes(col));
      if (missing.length > 0) {
        console.log('\n❌ Missing columns:', missing.join(', '));
      } else {
        console.log('\n✅ All required columns present');
      }
      
      // Check constraints
      const constraints = await client.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'friend_requests'
      `);
      
      console.log('\n🔒 Constraints:');
      constraints.rows.forEach(c => {
        console.log(`   - ${c.constraint_name} (${c.constraint_type})`);
      });
    }

    // Check row count
    const countResult = await client.query('SELECT COUNT(*) FROM friend_requests');
    console.log(`\n📊 Total friend requests: ${countResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (client) {
      client.release();
    }
  }
}

checkFriendRequestsTable();

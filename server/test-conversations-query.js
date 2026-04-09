const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'runterra',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function testQuery() {
  const userId = 1; // Test with user ID 1
  
  try {
    console.log('Testing conversations query for user:', userId);
    
    const result = await pool.query(
      `WITH user_friends AS (
        SELECT 
          CASE 
            WHEN fr.sender_id = $1 THEN fr.receiver_id 
            ELSE fr.sender_id 
          END AS friend_id
        FROM friend_requests fr
        WHERE (fr.sender_id = $1 OR fr.receiver_id = $1)
          AND fr.status = 'accepted'
      ),
      conversations AS (
        SELECT 
          CASE 
            WHEN m.sender_id = $1 THEN m.receiver_id 
            ELSE m.sender_id 
          END AS other_user_id,
          COUNT(*) FILTER (WHERE m.receiver_id = $1 AND m.is_read = FALSE) AS unread_count,
          MAX(m.created_at) AS last_message_at,
          (SELECT content FROM messages 
           WHERE (sender_id = $1 AND receiver_id = c.other_user_id) 
              OR (sender_id = c.other_user_id AND receiver_id = $1)
           ORDER BY created_at DESC LIMIT 1) AS last_message_content,
          (SELECT sender_id FROM messages 
           WHERE (sender_id = $1 AND receiver_id = c.other_user_id) 
              OR (sender_id = c.other_user_id AND receiver_id = $1)
           ORDER BY created_at DESC LIMIT 1) AS last_message_sender_id
        FROM messages m
        CROSS JOIN LATERAL (
          SELECT CASE 
            WHEN m.sender_id = $1 THEN m.receiver_id 
            ELSE m.sender_id 
          END AS other_user_id
        ) c
        WHERE (m.sender_id = $1 OR m.receiver_id = $1)
        GROUP BY 
          CASE 
            WHEN m.sender_id = $1 THEN m.receiver_id 
            ELSE m.sender_id 
          END
      )
      SELECT 
        c.other_user_id,
        u.username AS other_username,
        c.unread_count,
        c.last_message_at,
        c.last_message_content,
        lu.username AS last_message_sender
      FROM conversations c
      JOIN users u ON u.id = c.other_user_id
      JOIN user_friends uf ON uf.friend_id = c.other_user_id
      LEFT JOIN users lu ON lu.id = c.last_message_sender_id
      ORDER BY c.last_message_at DESC`,
      [userId]
    );
    
    console.log('✅ Query successful! Rows:', result.rows.length);
    console.log(result.rows);
  } catch (err) {
    console.error('❌ Query failed:', err.message);
    console.error('SQL State:', err.code);
    console.error('Detail:', err.detail);
    console.error('Hint:', err.hint);
  } finally {
    await pool.end();
  }
}

testQuery();

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { messageProtection } = require('../middleware/abuseMiddleware');

// ============================================
// SEND PRIVATE MESSAGE
// ============================================
router.post('/private', auth, messageProtection, async (req, res) => {
  const { receiverId, content } = req.body;
  const senderId = req.user.id;

  try {
    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ message: 'Message too long (max 2000 characters)' });
    }

    // Fetch sender username if missing from token
    let senderUsername = req.user.username;
    if (!senderUsername) {
      const sender = await pool.query('SELECT username FROM users WHERE id = $1', [senderId]);
      if (sender.rows.length > 0) {
        senderUsername = sender.rows[0].username;
      } else {
        return res.status(404).json({ message: 'Sender not found' });
      }
    }

    // Validate receiver exists
    const receiver = await pool.query('SELECT id FROM users WHERE id = $1', [receiverId]);
    if (receiver.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Can't send message to yourself
    if (senderId === parseInt(receiverId)) {
      return res.status(400).json({ message: 'Cannot send message to yourself' });
    }

    // Check if users are friends
    const friendship = await pool.query(
      `SELECT * FROM friend_requests 
       WHERE ((sender_id = $1 AND receiver_id = $2) 
           OR (sender_id = $2 AND receiver_id = $1))
       AND status = 'accepted'`,
      [senderId, receiverId]
    );

    if (friendship.rows.length === 0) {
      return res.status(403).json({ message: 'Can only send messages to friends' });
    }

    // Insert message
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [senderId, receiverId, content]
    );

    // Create notification for receiver
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, content, data)
       VALUES ($1, 'message', 'New Message', $2, $3)`,
      [receiverId, `${senderUsername} sent you a message`, JSON.stringify({
        messageId: result.rows[0].id,
        senderId: senderId,
        senderUsername: senderUsername,
        content: content.substring(0, 100)
      })]
    );

    // Emit socket event if available
    if (req.io) {
      req.io.to(`user:${receiverId}`).emit('message-received', {
        messageId: result.rows[0].id,
        senderId: senderId,
        senderUsername: senderUsername,
        content: content
      });
    }

    res.json({
      message: 'Message sent successfully',
      messageData: result.rows[0]
    });

  } catch (err) {
    console.error('Error sending private message:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// GET CONVERSATION WITH USER
// ============================================
router.get('/conversation/:otherUserId', auth, async (req, res) => {
  const userId = req.user.id;
  const otherUserId = req.params.otherUserId;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    // Check if users are friends
    const friendship = await pool.query(
      `SELECT * FROM friend_requests 
       WHERE ((sender_id = $1 AND receiver_id = $2) 
           OR (sender_id = $2 AND receiver_id = $1))
       AND status = 'accepted'`,
      [userId, otherUserId]
    );

    if (friendship.rows.length === 0) {
      return res.status(403).json({ message: 'Can only view conversations with friends' });
    }

    const result = await pool.query(
      `SELECT m.*, 
              s.username as sender_username,
              r.username as receiver_username
       FROM messages m
       JOIN users s ON m.sender_id = s.id
       JOIN users r ON m.receiver_id = r.id
       WHERE ((m.sender_id = $1 AND m.receiver_id = $2) 
           OR (m.sender_id = $2 AND m.receiver_id = $1))
         AND m.deleted_by_sender = FALSE 
         AND m.deleted_by_receiver = FALSE
       ORDER BY m.created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, otherUserId, limit, offset]
    );

    // Mark messages as read
    await pool.query(
      `UPDATE messages 
       SET is_read = TRUE 
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [otherUserId, userId]
    );

    // Sort in ascending order (oldest first)
    const messages = result.rows.reverse();

    res.json(messages);
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// GET ALL CONVERSATIONS (with unread count)
// ============================================
router.get('/conversations', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    console.log('Fetching conversations for user:', userId);
    
    // Get all friends first
    const friendsResult = await pool.query(
      `SELECT 
        CASE 
          WHEN fr.sender_id = $1 THEN fr.receiver_id 
          ELSE fr.sender_id 
        END AS friend_id
      FROM friend_requests fr
      WHERE (fr.sender_id = $1 OR fr.receiver_id = $1)
        AND fr.status = 'accepted'`,
      [userId]
    );
    
    if (friendsResult.rows.length === 0) {
      return res.json([]);
    }
    
    const friendIds = friendsResult.rows.map(f => f.friend_id);
    
    // Get conversations with friends
    const result = await pool.query(
      `SELECT 
        CASE 
          WHEN m.sender_id = $1 THEN m.receiver_id 
          ELSE m.sender_id 
        END AS other_user_id,
        COUNT(*) FILTER (WHERE m.receiver_id = $1 AND m.is_read = FALSE) AS unread_count,
        MAX(m.created_at) AS last_message_at
      FROM messages m
      WHERE (m.sender_id = $1 OR m.receiver_id = $1)
      GROUP BY 
        CASE 
          WHEN m.sender_id = $1 THEN m.receiver_id 
          ELSE m.sender_id 
        END`,
      [userId]
    );
    
    // Enrich with user details and last message
    const conversations = [];
    for (const conv of result.rows) {
      const userData = await pool.query(
        'SELECT username FROM users WHERE id = $1',
        [conv.other_user_id]
      );
      
      const lastMessageData = await pool.query(
        `SELECT content, sender_id 
         FROM messages 
         WHERE (sender_id = $1 AND receiver_id = $2) 
            OR (sender_id = $2 AND receiver_id = $1)
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId, conv.other_user_id]
      );
      
      const lastSenderData = lastMessageData.rows.length > 0 
        ? await pool.query('SELECT username FROM users WHERE id = $1', [lastMessageData.rows[0].sender_id])
        : null;
      
      conversations.push({
        other_user_id: conv.other_user_id,
        other_username: userData.rows[0]?.username || 'Unknown',
        unread_count: parseInt(conv.unread_count) || 0,
        last_message_at: conv.last_message_at,
        last_message_content: lastMessageData.rows[0]?.content || null,
        last_message_sender: lastSenderData?.rows[0]?.username || null
      });
    }
    
    // Sort by last message date
    conversations.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
    
    console.log('Conversations fetched successfully:', conversations.length, 'rows');
    res.json(conversations);
  } catch (err) {
    console.error('Error fetching conversations:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// MARK MESSAGE AS READ
// ============================================
router.put('/read/:messageId', auth, async (req, res) => {
  const userId = req.user.id;
  const messageId = req.params.messageId;

  try {
    const result = await pool.query(
      `UPDATE messages 
       SET is_read = TRUE 
       WHERE id = $1 AND receiver_id = $2
       RETURNING *`,
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Message not found or not authorized' });
    }

    res.json({ message: 'Message marked as read' });
  } catch (err) {
    console.error('Error marking message as read:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// DELETE MESSAGE (Only sender can delete)
// ============================================
router.delete('/:messageId', auth, async (req, res) => {
  const userId = req.user.id;
  const messageId = req.params.messageId;

  try {
    const message = await pool.query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId]
    );

    if (message.rows.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only the sender can delete their own messages - IDOR PROTECTION
    if (String(message.rows[0].sender_id) !== String(userId)) {
      // Log unauthorized access attempt
      await pool.query(
        `INSERT INTO security_events (user_id, event_type, ip_address, details)
         VALUES ($1, 'unauthorized_access', $2, $3)`,
        [userId, req.ip, JSON.stringify({
          type: 'message_delete',
          messageId: messageId,
          messageOwner: message.rows[0].sender_id,
          attempt: 'IDOR'
        })]
      );
      
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    // Soft delete - mark as deleted by sender
    const result = await pool.query(
      `UPDATE messages 
       SET deleted_by_sender = TRUE 
       WHERE id = $1 
       RETURNING *`,
      [messageId]
    );

    // If both sender and receiver deleted, physically remove from DB
    if (result.rows[0].deleted_by_sender && result.rows[0].deleted_by_receiver) {
      await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

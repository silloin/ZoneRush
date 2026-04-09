const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// ============================================
// SEND GLOBAL MESSAGE
// ============================================
router.post('/global', auth, async (req, res) => {
  const { content } = req.body;
  const senderId = req.user.id;

  try {
    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content cannot be empty' });
    }

    if (content.length > 500) {
      return res.status(400).json({ message: 'Message too long (max 500 characters)' });
    }

    // Insert global message
    const result = await pool.query(
      `INSERT INTO global_messages (sender_id, content)
       VALUES ($1, $2)
       RETURNING *`,
      [senderId, content]
    );

    // Emit socket event to all connected clients
    if (req.io) {
      req.io.emit('global-message', {
        messageId: result.rows[0].id,
        senderId: senderId,
        senderUsername: req.user.username,
        content: content,
        createdAt: result.rows[0].created_at
      });
    }

    res.json({
      message: 'Global message sent successfully',
      messageData: result.rows[0]
    });

  } catch (err) {
    console.error('Error sending global message:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// GET GLOBAL MESSAGES
// ============================================
router.get('/global', async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const result = await pool.query(
      `SELECT gm.*, u.username as sender_username
       FROM global_messages gm
       JOIN users u ON gm.sender_id = u.id
       WHERE gm.deleted = FALSE
       ORDER BY gm.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Sort in ascending order (oldest first)
    const messages = result.rows.reverse();

    res.json(messages);
  } catch (err) {
    console.error('Error fetching global messages:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// DELETE GLOBAL MESSAGE (Admin Only)
// ============================================
router.delete('/global/:messageId', auth, async (req, res) => {
  const messageId = req.params.messageId;
  const userId = req.user.id;

  try {
    // Check if user is admin (you can add admin role check here)
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // For now, allow message deletion by the sender
    const message = await pool.query(
      'SELECT * FROM global_messages WHERE id = $1',
      [messageId]
    );

    if (message.rows.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.rows[0].sender_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    // Soft delete
    await pool.query(
      `UPDATE global_messages 
       SET deleted = TRUE, edited = TRUE 
       WHERE id = $1`,
      [messageId]
    );

    // Emit socket event
    if (req.io) {
      req.io.emit('global-message-deleted', {
        messageId: messageId
      });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Error deleting global message:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

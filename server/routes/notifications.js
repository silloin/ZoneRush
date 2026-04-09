const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// ============================================
// GET USER NOTIFICATIONS
// ============================================
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 50;
  const unreadOnly = req.query.unread === 'true';

  try {
    let query;
    if (unreadOnly) {
      query = `
        SELECT * FROM notifications 
        WHERE user_id = $1 AND is_read = FALSE 
        ORDER BY created_at DESC 
        LIMIT $2`;
    } else {
      query = `
        SELECT * FROM notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2`;
    }

    const result = await pool.query(query, [userId, limit]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// GET UNREAD COUNT
// ============================================
router.get('/unread/count', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM notifications 
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// MARK NOTIFICATION AS READ
// ============================================
router.put('/read/:notificationId', auth, async (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.notificationId;

  try {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// MARK ALL NOTIFICATIONS AS READ
// ============================================
router.put('/read-all', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE user_id = $1 AND is_read = FALSE
       RETURNING *`,
      [userId]
    );

    res.json({ 
      message: 'All notifications marked as read',
      markedCount: result.rows.length
    });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// DELETE NOTIFICATION
// ============================================
router.delete('/:notificationId', auth, async (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.notificationId;

  try {
    const result = await pool.query(
      `DELETE FROM notifications 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// SAVE FCM TOKEN
// ============================================
router.post('/fcm-token', auth, async (req, res) => {
  const { token, deviceInfo } = req.body;
  const userId = req.user.id;

  try {
    if (!token) {
      return res.status(400).json({ message: 'FCM token is required' });
    }

    // Upsert token (insert or update)
    const result = await pool.query(
      `INSERT INTO user_fcm_tokens (user_id, token, device_info, last_used_at, is_active)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, TRUE)
       ON CONFLICT (token) 
       DO UPDATE SET 
         user_id = $1,
         last_used_at = CURRENT_TIMESTAMP,
         is_active = TRUE,
         device_info = COALESCE($3, user_fcm_tokens.device_info)
       RETURNING *`,
      [userId, token, deviceInfo]
    );

    res.json({
      message: 'FCM token saved successfully',
      token: result.rows[0]
    });
  } catch (err) {
    console.error('Error saving FCM token:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// DEACTIVATE FCM TOKEN
// ============================================
router.delete('/fcm-token/:token', auth, async (req, res) => {
  const userId = req.user.id;
  const token = req.params.token;

  try {
    const result = await pool.query(
      `UPDATE user_fcm_tokens 
       SET is_active = FALSE 
       WHERE user_id = $1 AND token = $2
       RETURNING *`,
      [userId, token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'FCM token not found' });
    }

    res.json({ message: 'FCM token deactivated' });
  } catch (err) {
    console.error('Error deactivating FCM token:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// ============================================
// SEND FRIEND REQUEST
// ============================================
router.post('/send', auth, async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user.id;

  try {
    // Validate receiver exists
    const receiver = await pool.query('SELECT id FROM users WHERE id = $1', [receiverId]);
    if (receiver.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Can't send request to yourself
    if (senderId === parseInt(receiverId)) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    // Check if request already exists
    const existingRequest = await pool.query(
      `SELECT * FROM friend_requests 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1)`,
      [senderId, receiverId]
    );

    if (existingRequest.rows.length > 0) {
      const status = existingRequest.rows[0].status;
      if (status === 'accepted') {
        return res.status(400).json({ message: 'Already friends with this user' });
      } else if (status === 'pending' && existingRequest.rows[0].sender_id === senderId) {
        return res.status(400).json({ message: 'Friend request already sent' });
      } else if (status === 'rejected') {
        // Allow re-sending if previously rejected
        await pool.query(
          `UPDATE friend_requests 
           SET status = 'pending', updated_at = CURRENT_TIMESTAMP 
           WHERE sender_id = $1 AND receiver_id = $2`,
          [senderId, receiverId]
        );
      }
    }

    // Insert new friend request or update existing rejected one
    const result = await pool.query(
      `INSERT INTO friend_requests (sender_id, receiver_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (sender_id, receiver_id) 
       DO UPDATE SET status = 'pending', updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [senderId, receiverId]
    );

    // Create notification for receiver
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'friend_request', 'New Friend Request', $2, $3)`,
      [receiverId, `${req.user.username} wants to be your friend`, JSON.stringify({
        senderId: senderId,
        senderUsername: req.user.username,
        // The message is now directly in the 'message' column, so it might be redundant in 'data'
        // message: `${req.user.username} wants to be your friend`
      })]
    );

    // Emit socket event if socket.io is available
    if (req.io) {
      req.io.to(`user:${receiverId}`).emit('notification-received', {
        type: 'friend_request',
        senderId: senderId,
        senderUsername: req.user.username
      });
    }

    res.json({
      message: 'Friend request sent successfully',
      request: result.rows[0]
    });

  } catch (err) {
    console.error('Error sending friend request:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// GET PENDING FRIEND REQUESTS
// ============================================
router.get('/received', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT fr.*, u.username as sender_username, u.email as sender_email
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching friend requests:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// ACCEPT FRIEND REQUEST
// ============================================
router.post('/accept/:requestId', auth, async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user.id;

  try {
    // Get the request
    const request = await pool.query(
      'SELECT * FROM friend_requests WHERE id = $1',
      [requestId]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (request.rows[0].receiver_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    if (request.rows[0].status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    // Update request status
    const result = await pool.query(
      `UPDATE friend_requests 
       SET status = 'accepted', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [requestId]
    );

    // Create notification for sender
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'system', 'Friend Request Accepted', $2, $3)`,
      [request.rows[0].sender_id, `${req.user.username} accepted your friend request`, JSON.stringify({
        requestId: requestId,
        accepterId: userId,
        accepterUsername: req.user.username
      })]
    );

    // Emit socket event
    if (req.io) {
      req.io.to(`user:${request.rows[0].sender_id}`).emit('friend-request-accepted', {
        requestId: requestId,
        accepterId: userId,
        accepterUsername: req.user.username
      });
    }

    res.json({
      message: 'Friend request accepted successfully',
      request: result.rows[0]
    });

  } catch (err) {
    console.error('Error accepting friend request:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// REJECT FRIEND REQUEST
// ============================================
router.post('/reject/:requestId', auth, async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user.id;

  try {
    const request = await pool.query(
      'SELECT * FROM friend_requests WHERE id = $1',
      [requestId]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (request.rows[0].receiver_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }

    const result = await pool.query(
      `UPDATE friend_requests 
       SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [requestId]
    );

    res.json({
      message: 'Friend request rejected',
      request: result.rows[0]
    });

  } catch (err) {
    console.error('Error rejecting friend request:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// GET USER'S FRIENDS
// ============================================
router.get('/list', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT DISTINCT u.id, u.username, u.email, u.created_at
       FROM friend_requests fr
       JOIN users u ON (fr.sender_id = u.id AND fr.receiver_id = $1) 
                    OR (fr.receiver_id = u.id AND fr.sender_id = $1)
       WHERE fr.status = 'accepted'
       ORDER BY u.username`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching friends:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ============================================
// CHECK FRIENDSHIP STATUS
// ============================================
router.get('/status/:otherUserId', auth, async (req, res) => {
  const userId = req.user.id;
  const otherUserId = req.params.otherUserId;

  try {
    const result = await pool.query(
      `SELECT * FROM friend_requests 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId, otherUserId]
    );

    let status = 'not_friends';
    if (result.rows.length > 0) {
      const row = result.rows[0];
      if (row.status === 'accepted') {
        status = 'friends';
      } else if (row.sender_id === userId) {
        status = 'pending_outgoing';
      } else if (row.receiver_id === userId) {
        status = 'pending_incoming';
      }
    }

    res.json({
      status: status,
      request: result.rows[0] || null
    });
  } catch (err) {
    console.error('Error checking friendship status:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
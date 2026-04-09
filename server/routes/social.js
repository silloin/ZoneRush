const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

// @route   POST api/social/posts
// @desc    Create a post (share a run)
// @access  Private
router.post('/posts', auth, async (req, res) => {
  const { runId, caption } = req.body;
  try {
    const post = await pool.query(
      'INSERT INTO posts (user_id, run_id, caption, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [req.user.id, runId, caption]
    );
    res.json(post.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/social/feed
// @desc    Get social feed
// @access  Private
router.get('/feed', auth, async (req, res) => {
  try {
    const feed = await pool.query(
      `SELECT p.*, u.username, r.distance, r.duration, 
       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes,
       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments,
       EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       LEFT JOIN runs r ON p.run_id = r.id 
       ORDER BY p.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(feed.rows);
  } catch (err) {
    console.error('GET /social/feed error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   POST api/social/like/:postId
// @desc    Like a post
// @access  Private
router.post('/like/:postId', auth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.postId]
    );
    res.json({ msg: 'Post liked' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/social/like/:postId
// @desc    Unlike a post
// @access  Private
router.delete('/like/:postId', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [
      req.user.id,
      req.params.postId,
    ]);
    res.json({ msg: 'Post unliked' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/social/comment/:postId
// @desc    Comment on a post
// @access  Private
router.post('/comment/:postId', auth, async (req, res) => {
  const { text } = req.body;
  try {
    const comment = await pool.query(
      'INSERT INTO comments (user_id, post_id, text, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [req.user.id, req.params.postId, text]
    );
    res.json(comment.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/social/comments/:postId
// @desc    Get comments for a post
// @access  Public
router.get('/comments/:postId', async (req, res) => {
  try {
    const comments = await pool.query(
      'SELECT c.*, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at DESC',
      [req.params.postId]
    );
    res.json(comments.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/social/posts/:postId
// @desc    Update a post
// @access  Private
router.put('/posts/:postId', auth, async (req, res) => {
  const { caption } = req.body;
  try {
    // Check if post exists and belongs to user
    const post = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.postId]);
    
    if (post.rows.length === 0) {
      return res.status(404).json({ msg: 'Post not found' });
    }
    
    if (post.rows[0].user_id !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    const updatedPost = await pool.query(
      'UPDATE posts SET caption = $1 WHERE id = $2 RETURNING *',
      [caption, req.params.postId]
    );
    res.json(updatedPost.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/social/posts/:postId
// @desc    Delete a post
// @access  Private
router.delete('/posts/:postId', auth, async (req, res) => {
  try {
    // Check if post exists and belongs to user
    const post = await pool.query('SELECT * FROM posts WHERE id = $1', [req.params.postId]);
    
    if (post.rows.length === 0) {
      return res.status(404).json({ msg: 'Post not found' });
    }
    
    if (post.rows[0].user_id !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.postId]);
    res.json({ msg: 'Post removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

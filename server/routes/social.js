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
      'INSERT INTO posts (userid, runid, caption, createdat) VALUES ($1, $2, $3, NOW()) RETURNING *',
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
       (SELECT COUNT(*) FROM likes WHERE postid = p.id) as likes,
       (SELECT COUNT(*) FROM comments WHERE postid = p.id) as comments
       FROM posts p 
       JOIN users u ON p.userid = u.id 
       LEFT JOIN runs r ON p.runid = r.id 
       ORDER BY p.createdat DESC LIMIT 50`
    );
    res.json(feed.rows);
  } catch (err) {
    console.error('GET /social/feed error:', err.message);
    console.error(err.stack);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   POST api/social/like/:postId
// @desc    Like a post
// @access  Private
router.post('/like/:postId', auth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO likes (userid, postid) VALUES ($1, $2) ON CONFLICT DO NOTHING',
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
    await pool.query('DELETE FROM likes WHERE userid = $1 AND postid = $2', [
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
      'INSERT INTO comments (userid, postid, text, createdat) VALUES ($1, $2, $3, NOW()) RETURNING *',
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
      'SELECT c.*, u.username FROM comments c JOIN users u ON c.userid = u.id WHERE c.postid = $1 ORDER BY c.createdat DESC',
      [req.params.postId]
    );
    res.json(comments.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

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
    
    // Fetch comments for each post
    const feedWithComments = await Promise.all(
      feed.rows.map(async (post) => {
        const commentsRes = await pool.query(
          `SELECT c.id, c.user_id, c.post_id, c.comment_text, c.created_at, u.username 
           FROM comments c 
           JOIN users u ON c.user_id = u.id 
           WHERE c.post_id = $1 
           ORDER BY c.created_at ASC 
           LIMIT 10`,
          [post.id]
        );
        return {
          ...post,
          commentsList: commentsRes.rows
        };
      })
    );
    
    res.json(feedWithComments);
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
  const postId = parseInt(req.params.postId, 10);
  
  if (!text || isNaN(postId)) {
    return res.status(400).json({ msg: 'Text and valid postId required' });
  }
  
  try {
    const comment = await pool.query(
      'INSERT INTO comments (user_id, post_id, comment_text, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [req.user.id, postId, text]
    );
    res.json(comment.rows[0]);
  } catch (err) {
    console.error('POST /social/comment error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/social/comments/:postId
// @desc    Get comments for a post
// @access  Public
router.get('/comments/:postId', async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const comments = await pool.query(
      'SELECT c.id, c.user_id, c.post_id, c.comment_text, c.created_at, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at DESC',
      [postId]
    );
    res.json(comments.rows);
  } catch (err) {
    console.error('GET /social/comments error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   PUT api/social/comments/:commentId
// @desc    Update a comment
// @access  Private
router.put('/comments/:commentId', auth, async (req, res) => {
  const { text } = req.body;
  const commentId = parseInt(req.params.commentId, 10);
  
  if (!text || isNaN(commentId)) {
    return res.status(400).json({ msg: 'Text and valid commentId required' });
  }
  
  try {
    // Check if comment exists and belongs to user
    const comment = await pool.query('SELECT * FROM comments WHERE id = $1', [commentId]);
    
    if (comment.rows.length === 0) {
      return res.status(404).json({ msg: 'Comment not found' });
    }
    
    if (comment.rows[0].user_id !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    const updatedComment = await pool.query(
      'UPDATE comments SET comment_text = $1, created_at = NOW() WHERE id = $2 RETURNING id, user_id, post_id, comment_text, created_at',
      [text, commentId]
    );
    
    // Get username for the updated comment
    const commentWithUser = await pool.query(
      'SELECT c.id, c.user_id, c.post_id, c.comment_text, c.created_at, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = $1',
      [commentId]
    );
    
    res.json(commentWithUser.rows[0]);
  } catch (err) {
    console.error('PUT /social/comments error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   DELETE api/social/comments/:commentId
// @desc    Delete a comment
// @access  Private
router.delete('/comments/:commentId', auth, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId, 10);
    
    // Check if comment exists and belongs to user
    const comment = await pool.query('SELECT * FROM comments WHERE id = $1', [commentId]);
    
    if (comment.rows.length === 0) {
      return res.status(404).json({ msg: 'Comment not found' });
    }
    
    if (comment.rows[0].user_id !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
    res.json({ msg: 'Comment removed', commentId });
  } catch (err) {
    console.error('DELETE /social/comments error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
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

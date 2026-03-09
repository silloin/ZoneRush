const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

// @route   GET api/achievements
// @desc    Get user achievements
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const achievements = await pool.query(
      'SELECT a.*, ua.unlockedat FROM achievements a LEFT JOIN user_achievements ua ON a.id = ua.achievementid AND ua.userid = $1',
      [req.user.id]
    );
    res.json(achievements.rows);
  } catch (err) {
    console.error('GET /achievements error:', err.message);
    console.error(err.stack);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   POST api/achievements/unlock
// @desc    Unlock achievement
// @access  Private
router.post('/unlock', auth, async (req, res) => {
  const { achievementId } = req.body;
  try {
    const unlock = await pool.query(
      'INSERT INTO user_achievements (userid, achievementid, unlockedat) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING RETURNING *',
      [req.user.id, achievementId]
    );
    
    // Award XP
    const achievement = await pool.query('SELECT xpreward FROM achievements WHERE id = $1', [achievementId]);
    if (achievement.rows[0]) {
      await pool.query('UPDATE users SET xp = xp + $1, level = FLOOR(xp / 1000) + 1 WHERE id = $2', [
        achievement.rows[0].xpreward,
        req.user.id
      ]);
    }
    
    res.json(unlock.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/achievements/profile/:userId
// @desc    Get user profile with stats
// @access  Public
router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT u.id, u.username, u.xp, u.level, u.city,
       (SELECT COUNT(*) FROM tiles WHERE ownerid = u.id) as totaltiles,
       (SELECT COALESCE(SUM(distance), 0) FROM runs WHERE userid = u.id) as totaldistance,
       (SELECT COUNT(*) FROM user_achievements WHERE userid = u.id) as achievements
       FROM users u WHERE u.id = $1`,
      [req.params.userId]
    );
    res.json(user.rows[0]);
  } catch (err) {
    console.error('GET /achievements/profile error:', err.message);
    console.error(err.stack);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   POST api/achievements/xp
// @desc    Add XP to user
// @access  Private
router.post('/xp', auth, async (req, res) => {
  const { xp, reason } = req.body;
  try {
    await pool.query('UPDATE users SET xp = xp + $1, level = FLOOR((xp + $1) / 1000) + 1 WHERE id = $2', [
      xp,
      req.user.id
    ]);
    
    const user = await pool.query('SELECT xp, level FROM users WHERE id = $1', [req.user.id]);
    res.json({ xp: user.rows[0].xp, level: user.rows[0].level, added: xp, reason });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

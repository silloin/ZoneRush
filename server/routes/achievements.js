const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const achievementService = require('../services/achievementService');
const authenticateToken = require('../middleware/auth');

// Get all achievements
router.get('/', authenticateToken, async (req, res) => {
  try {
    const achievements = await achievementService.getAllAchievements();
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Get user's unlocked achievements
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const achievements = await achievementService.getUserAchievements(req.params.userId);
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ error: 'Failed to fetch user achievements' });
  }
});

// Get achievement progress for user
router.get('/user/:userId/progress', authenticateToken, async (req, res) => {
  try {
    const progress = await achievementService.getAchievementProgress(req.params.userId);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching achievement progress:', error);
    res.status(500).json({ error: 'Failed to fetch achievement progress' });
  }
});

// Check and unlock achievements
router.post('/check/:userId', authenticateToken, async (req, res) => {
  try {
    const unlockedAchievements = await achievementService.checkAchievements(req.params.userId);
    res.json({ unlocked: unlockedAchievements });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

// Get user profile stats (XP, level, streak)
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT id, username, xp, level, streak FROM users WHERE id = $1';
    const result = await pool.query(query, [req.params.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile stats:', error);
    res.status(500).json({ error: 'Failed to fetch profile stats' });
  }
});

module.exports = router;

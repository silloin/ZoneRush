const express = require('express');
const router = express.Router();
const statsService = require('../services/statsService');
const authenticateToken = require('../middleware/auth');

// Get leaderboard
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type = 'distance', limit = 50 } = req.query;
    
    const validTypes = ['distance', 'runs', 'tiles', 'xp', 'streak'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid leaderboard type' });
    }
    
    const leaderboard = await statsService.getLeaderboard(type, parseInt(limit));
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user's rank
router.get('/user/:userId/rank', authenticateToken, async (req, res) => {
  try {
    const { type = 'distance' } = req.query;
    const leaderboard = await statsService.getLeaderboard(type, 1000);
    
    const userRank = leaderboard.find(entry => entry.id === parseInt(req.params.userId));
    
    if (!userRank) {
      return res.json({ rank: null, message: 'User not ranked yet' });
    }
    
    res.json(userRank);
  } catch (error) {
    console.error('Error fetching user rank:', error);
    res.status(500).json({ error: 'Failed to fetch user rank' });
  }
});

module.exports = router;

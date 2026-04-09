const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const statsService = require('../services/statsService');
const weatherService = require('../services/weatherService');
const { redisClient, isRedisAvailable } = require('../middleware/rateLimiter');

// @route   GET api/users/leaderboard
// @desc    Get global or city leaderboard
// @access  Public
router.get('/leaderboard', userController.getLeaderboard);

// @route   POST api/users/prize-draw
// @desc    Random monthly prize draw from top users
// @access  Private/Admin
router.post('/prize-draw', userController.monthlyPrizeDraw);

// @route   GET api/users/profile
// @desc    Get current user's full profile
// @access  Private
router.get('/profile', auth, userController.getProfile);

// @route   PUT api/users/profile
// @desc    Update user profile (username, city)
// @access  Private
router.put('/profile', auth, userController.updateProfile);

// @route   PUT api/users/profile/photo
// @desc    Update user profile photo URL
// @access  Private
router.put('/profile/photo', auth, userController.updateProfilePhoto);

// @route   GET api/users/stats/:userId
// @desc    Get user statistics
// @access  Private
router.get('/stats/:userId', auth, async (req, res) => {
  const userId = req.params.userId;
  const cacheKey = `stats:${userId}`;

  try {
    // Try to get from Redis cache
    if (isRedisAvailable()) {
      const cachedStats = await redisClient.get(cacheKey);
      if (cachedStats) {
        return res.json(JSON.parse(cachedStats));
      }
    }

    const stats = await statsService.getBasicStats(userId);

    // Cache in Redis for 30 seconds
    if (isRedisAvailable()) {
      await redisClient.setEx(cacheKey, 30, JSON.stringify(stats));
    }

    res.json(stats);
  } catch (error) {
    console.error('=== STATS API ERROR ===');
    console.error('UserId:', userId);
    console.error('Full error:', error);
    console.error('Error stack:', error.stack);
    console.error('====================');
    res.status(500).json({ error: 'Failed to fetch stats', details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error' });
  }
});

// @route   GET api/users/hr-zones/:userId
// @desc    Get heart rate zones based on age
// @access  Private
router.get('/hr-zones/:userId', auth, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT created_at FROM users WHERE id = $1', [req.params.userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ msg: 'User not found' });
    
    // Assume age 30 if not available, or calculate from birth_date if we had it
    // For now, let's use a default or mock age
    const age = 30; 
    const maxHR = 220 - age;
    
    const zones = {
      maxHR,
      zones: {
        zone1: { name: 'Recovery', min: Math.round(maxHR * 0.50), max: Math.round(maxHR * 0.60) },
        zone2: { name: 'Aerobic', min: Math.round(maxHR * 0.60), max: Math.round(maxHR * 0.70) },
        zone3: { name: 'Tempo', min: Math.round(maxHR * 0.70), max: Math.round(maxHR * 0.80) },
        zone4: { name: 'Threshold', min: Math.round(maxHR * 0.80), max: Math.round(maxHR * 0.90) },
        zone5: { name: 'VO2 Max', min: Math.round(maxHR * 0.90), max: maxHR }
      }
    };
    
    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET api/users/weather
// @desc    Get current weather for user's location
// @access  Private
router.get('/weather', auth, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    const weather = await weatherService.getWeatherData(parseFloat(lat), parseFloat(lng));
    const recommendation = weatherService.getTrainingRecommendation(weather);
    
    res.json({
      weather,
      recommendation
    });
  } catch (error) {
    console.error('Error fetching weather:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

module.exports = router;


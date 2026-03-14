const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// @route   GET api/users/leaderboard
// @desc    Get global or city leaderboard
// @access  Public
router.get('/leaderboard', userController.getLeaderboard);

// @route   POST api/users/prize-draw
// @desc    Random monthly prize draw from top users
// @access  Private/Admin
router.post('/prize-draw', userController.monthlyPrizeDraw);

module.exports = router;

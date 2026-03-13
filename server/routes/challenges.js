const express = require('express');
const router = express.Router();
const challengeService = require('../services/challengeService');
const authenticateToken = require('../middleware/auth');

// Get today's challenges
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const challenges = await challengeService.getTodaysChallenges();
    res.json(challenges);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// Get user's challenge progress
router.get('/user/:userId/progress', authenticateToken, async (req, res) => {
  try {
    const progress = await challengeService.getUserChallengeProgress(req.params.userId);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching challenge progress:', error);
    res.status(500).json({ error: 'Failed to fetch challenge progress' });
  }
});

// Update challenge progress
router.post('/:challengeId/progress', authenticateToken, async (req, res) => {
  try {
    const { progress } = req.body;
    const userId = req.user.id;
    
    if (progress === undefined) {
      return res.status(400).json({ error: 'Missing progress value' });
    }
    
    const updated = await challengeService.updateChallengeProgress(
      userId,
      req.params.challengeId,
      progress
    );
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    res.status(500).json({ error: 'Failed to update challenge progress' });
  }
});

// Create daily challenge (admin)
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { title, description, challengeType, targetValue, xpReward, validDate } = req.body;
    
    if (!title || !challengeType || !targetValue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const challenge = await challengeService.createDailyChallenge(
      title,
      description,
      challengeType,
      targetValue,
      xpReward || 100,
      validDate || new Date()
    );
    
    res.status(201).json(challenge);
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// Generate random daily challenges (admin)
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { date } = req.body;
    const challenges = await challengeService.generateDailyChallenges(date ? new Date(date) : new Date());
    res.status(201).json(challenges);
  } catch (error) {
    console.error('Error generating challenges:', error);
    res.status(500).json({ error: 'Failed to generate challenges' });
  }
});

module.exports = router;

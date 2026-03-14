const express = require('express');
const router = express.Router();
const aiCoachService = require('../services/aiCoachService');
const authenticateToken = require('../middleware/auth');

// Generate recommendations for user
router.post('/generate/:userId', authenticateToken, async (req, res) => {
  try {
    const recommendations = await aiCoachService.generateRecommendations(req.params.userId);
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Get active recommendations
router.get('/recommendations/:userId', authenticateToken, async (req, res) => {
  try {
    const recommendations = await aiCoachService.getRecommendations(req.params.userId);
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Mark recommendation as read
router.put('/recommendations/:recommendationId/read', authenticateToken, async (req, res) => {
  try {
    await aiCoachService.markAsRead(req.params.recommendationId);
    res.json({ message: 'Recommendation marked as read' });
  } catch (error) {
    console.error('Error marking recommendation as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Dismiss recommendation
router.delete('/recommendations/:recommendationId', authenticateToken, async (req, res) => {
  try {
    await aiCoachService.dismissRecommendation(req.params.recommendationId);
    res.json({ message: 'Recommendation dismissed' });
  } catch (error) {
    console.error('Error dismissing recommendation:', error);
    res.status(500).json({ error: 'Failed to dismiss recommendation' });
  }
});

// Get weekly summary
router.get('/summary/:userId/weekly', authenticateToken, async (req, res) => {
  try {
    const summary = await aiCoachService.generateWeeklySummary(req.params.userId);
    res.json(summary);
  } catch (error) {
    console.error('Error generating weekly summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

module.exports = router;

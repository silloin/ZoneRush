const express = require('express');
const router = express.Router();
const segmentService = require('../services/segmentService');
const authenticateToken = require('../middleware/auth');

// Get all segments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    
    if (lat && lng) {
      const segments = await segmentService.getNearbySegments(
        parseFloat(lat),
        parseFloat(lng),
        radius ? parseInt(radius) : 5000
      );
      return res.json(segments);
    }
    
    res.status(400).json({ error: 'Missing location parameters' });
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

// Get segment details
router.get('/:segmentId', authenticateToken, async (req, res) => {
  try {
    const segment = await segmentService.getSegment(req.params.segmentId);
    
    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }
    
    res.json(segment);
  } catch (error) {
    console.error('Error fetching segment:', error);
    res.status(500).json({ error: 'Failed to fetch segment' });
  }
});

// Get segment leaderboard
router.get('/:segmentId/leaderboard', authenticateToken, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const leaderboard = await segmentService.getSegmentLeaderboard(req.params.segmentId, limit);
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching segment leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user's best effort on segment
router.get('/:segmentId/user/:userId/best', authenticateToken, async (req, res) => {
  try {
    const effort = await segmentService.getUserBestEffort(req.params.segmentId, req.params.userId);
    res.json(effort);
  } catch (error) {
    console.error('Error fetching user best effort:', error);
    res.status(500).json({ error: 'Failed to fetch best effort' });
  }
});

// Create new segment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, coordinates, distance, difficulty } = req.body;
    const userId = req.user.id;
    
    if (!name || !coordinates || !distance) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const segment = await segmentService.createSegment(
      name,
      description,
      coordinates,
      distance,
      difficulty,
      userId
    );
    
    res.status(201).json(segment);
  } catch (error) {
    console.error('Error creating segment:', error);
    res.status(500).json({ error: 'Failed to create segment' });
  }
});

// Record segment effort
router.post('/:segmentId/efforts', authenticateToken, async (req, res) => {
  try {
    const { runId, elapsedTime, startedAt, completedAt } = req.body;
    const userId = req.user.id;
    const segmentId = req.params.segmentId;
    
    if (!runId || !elapsedTime || !startedAt || !completedAt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const effort = await segmentService.recordSegmentEffort(
      segmentId,
      userId,
      runId,
      elapsedTime,
      startedAt,
      completedAt
    );
    
    res.status(201).json(effort);
  } catch (error) {
    console.error('Error recording segment effort:', error);
    res.status(500).json({ error: 'Failed to record effort' });
  }
});

// Get user's segment efforts
router.get('/user/:userId/efforts', authenticateToken, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const efforts = await segmentService.getUserSegmentEfforts(req.params.userId, limit);
    res.json(efforts);
  } catch (error) {
    console.error('Error fetching user efforts:', error);
    res.status(500).json({ error: 'Failed to fetch efforts' });
  }
});

module.exports = router;

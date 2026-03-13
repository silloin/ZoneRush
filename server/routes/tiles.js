const express = require('express');
const router = express.Router();
const tileService = require('../services/tileService');
const authenticateToken = require('../middleware/auth');

// Get all tiles for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tiles = await tileService.getUserCapturedTiles(req.user.id);
    res.json(tiles);
  } catch (error) {
    console.error('Error fetching user tiles:', error);
    res.status(500).json({ error: 'Failed to fetch tiles' });
  }
});

// Get user's captured tiles for specific user ID (backward compatibility or admin)
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const tiles = await tileService.getUserCapturedTiles(req.params.userId);
    res.json(tiles);
  } catch (error) {
    console.error('Error fetching user tiles:', error);
    res.status(500).json({ error: 'Failed to fetch tiles' });
  }
});

// Get tiles in bounding box
router.get('/bounds', authenticateToken, async (req, res) => {
  try {
    const { minLat, minLng, maxLat, maxLng } = req.query;
    
    if (!minLat || !minLng || !maxLat || !maxLng) {
      return res.status(400).json({ error: 'Missing bounding box parameters' });
    }
    
    const tiles = await tileService.getTilesInBounds(
      parseFloat(minLat),
      parseFloat(minLng),
      parseFloat(maxLat),
      parseFloat(maxLng)
    );
    
    res.json(tiles);
  } catch (error) {
    console.error('Error fetching tiles in bounds:', error);
    res.status(500).json({ error: 'Failed to fetch tiles' });
  }
});

// Capture a single tile
router.post('/capture', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, runId } = req.body;
    const userId = req.user.id;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }
    
    const result = await tileService.captureTile(userId, lat, lng, runId);
    res.json(result);
  } catch (error) {
    console.error('Error capturing tile:', error);
    res.status(500).json({ error: 'Failed to capture tile' });
  }
});

// Get tile statistics
router.get('/stats/:userId', authenticateToken, async (req, res) => {
  try {
    const stats = await tileService.getTileStats(req.params.userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching tile stats:', error);
    res.status(500).json({ error: 'Failed to fetch tile statistics' });
  }
});

module.exports = router;

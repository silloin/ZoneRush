const express = require('express');
const router = express.Router();
const heatmapService = require('../services/heatmapService');
const authenticateToken = require('../middleware/auth');

// Get heatmap data for map bounds
router.get('/bounds', authenticateToken, async (req, res) => {
  try {
    const { minLat, minLng, maxLat, maxLng, minIntensity = 5 } = req.query;
    
    console.log('🔍 Fetching heatmap for bounds:', { minLat, minLng, maxLat, maxLng, minIntensity });

    if (!minLat || !minLng || !maxLat || !maxLng) {
      return res.status(400).json({ error: 'Missing bounding box parameters' });
    }
    
    const heatmap = await heatmapService.getHeatmapData(
      parseFloat(minLat),
      parseFloat(minLng),
      parseFloat(maxLat),
      parseFloat(maxLng),
      parseInt(minIntensity)
    );
    
    res.json(heatmap);
  } catch (error) {
    console.error('❌ Error fetching heatmap:', error);
    res.status(500).json({ 
      error: 'Failed to fetch heatmap',
      details: error.message,
      hint: 'Ensure route_heatmap table exists and PostGIS is enabled'
    });
  }
});

// Get user's personal heatmap
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const heatmap = await heatmapService.getUserHeatmap(req.params.userId);
    res.json(heatmap);
  } catch (error) {
    console.error('Error fetching user heatmap:', error);
    res.status(500).json({ error: 'Failed to fetch user heatmap' });
  }
});

// Get popular routes
router.get('/popular', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, radius = 5000, limit = 10 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Missing location parameters' });
    }
    
    const routes = await heatmapService.getPopularRoutes(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radius),
      parseInt(limit)
    );
    
    res.json(routes);
  } catch (error) {
    console.error('Error fetching popular routes:', error);
    res.status(500).json({ error: 'Failed to fetch popular routes' });
  }
});

// Get hotspots
router.get('/hotspots', authenticateToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const hotspots = await heatmapService.getHotspots(parseInt(limit));
    res.json(hotspots);
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    res.status(500).json({ error: 'Failed to fetch hotspots' });
  }
});

// Get heatmap statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await heatmapService.getHeatmapStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching heatmap stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;

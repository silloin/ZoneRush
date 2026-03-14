const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const tileService = require('../services/tileService');
const segmentService = require('../services/segmentService');
const achievementService = require('../services/achievementService');
const challengeService = require('../services/challengeService');
const statsService = require('../services/statsService');
const authenticateToken = require('../middleware/auth');

// Get all runs for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user.id;
    
    const query = `
      SELECT 
        r.*,
        r.pace as avgpace,
        ST_AsGeoJSON(r.route_geometry) as route_json,
        ST_AsGeoJSON(r.start_location) as start_json,
        ST_AsGeoJSON(r.end_location) as end_json
      FROM runs r
      WHERE r.user_id = $1
      ORDER BY r.completed_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [userId, limit, offset]);
    
    const runs = result.rows.map(row => ({
      ...row,
      route_geometry: row.route_json ? JSON.parse(row.route_json) : null,
      start_location: row.start_json ? JSON.parse(row.start_json) : null,
      end_location: row.end_json ? JSON.parse(row.end_json) : null
    }));
    
    res.json(runs);
  } catch (error) {
    console.error('Error fetching runs:', error);
    res.status(500).json({ error: 'Failed to fetch runs' });
  }
});

// Get all runs for specific user ID (backward compatibility or admin)
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const query = `
      SELECT 
        r.*,
        r.pace as avgpace,
        ST_AsGeoJSON(r.route_geometry) as route_json,
        ST_AsGeoJSON(r.start_location) as start_json,
        ST_AsGeoJSON(r.end_location) as end_json
      FROM runs r
      WHERE r.user_id = $1
      ORDER BY r.completed_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [req.params.userId, limit, offset]);
    
    const runs = result.rows.map(row => ({
      ...row,
      route_geometry: row.route_json ? JSON.parse(row.route_json) : null,
      start_location: row.start_json ? JSON.parse(row.start_json) : null,
      end_location: row.end_json ? JSON.parse(row.end_json) : null
    }));
    
    res.json(runs);
  } catch (error) {
    console.error('Error fetching runs:', error);
    res.status(500).json({ error: 'Failed to fetch runs' });
  }
});

// Get single run details
router.get('/:runId', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        r.*,
        ST_AsGeoJSON(r.route_geometry) as route_json,
        ST_AsGeoJSON(r.start_location) as start_json,
        ST_AsGeoJSON(r.end_location) as end_json,
        u.username
      FROM runs r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `;
    
    const result = await pool.query(query, [req.params.runId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    const run = {
      ...result.rows[0],
      route_geometry: result.rows[0].route_json ? JSON.parse(result.rows[0].route_json) : null,
      start_location: result.rows[0].start_json ? JSON.parse(result.rows[0].start_json) : null,
      end_location: result.rows[0].end_json ? JSON.parse(result.rows[0].end_json) : null
    };
    
    // Get route points
    const pointsQuery = `
      SELECT 
        ST_AsGeoJSON(location) as location_json,
        altitude,
        speed,
        heading,
        recorded_at,
        sequence_order
      FROM route_points
      WHERE run_id = $1
      ORDER BY sequence_order ASC
    `;
    
    const pointsResult = await pool.query(pointsQuery, [req.params.runId]);
    run.route_points = pointsResult.rows.map(row => ({
      ...row,
      location: JSON.parse(row.location_json)
    }));
    
    res.json(run);
  } catch (error) {
    console.error('Error fetching run:', error);
    res.status(500).json({ error: 'Failed to fetch run' });
  }
});

// Create new run
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      distance = 0,
      duration = 0,
      pace = 0,
      calories = 0,
      elevation_gain = 0,
      route_points,
      started_at,
      completed_at
    } = req.body;
    
    const userId = req.user.id;
    
    // Check for required fields more robustly
    if (!route_points || route_points.length === 0 || !started_at || !completed_at) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { 
          distance, 
          duration, 
          route_points_count: route_points?.length,
          started_at,
          completed_at
        }
      });
    }
    
    // Create LineString from route points
    const coordinates = route_points.map(p => `${p.lng} ${p.lat}`).join(', ');
    const lineString = `LINESTRING(${coordinates})`;
    const startPoint = `POINT(${route_points[0].lng} ${route_points[0].lat})`;
    const endPoint = `POINT(${route_points[route_points.length - 1].lng} ${route_points[route_points.length - 1].lat})`;
    
    // Insert run
    const runQuery = `
      INSERT INTO runs 
      (user_id, distance, duration, pace, calories, elevation_gain, 
       route_geometry, start_location, end_location, started_at, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6, 
              ST_GeomFromText($7, 4326), ST_GeomFromText($8, 4326), 
              ST_GeomFromText($9, 4326), $10, $11)
      RETURNING *
    `;
    
    const runResult = await client.query(runQuery, [
      userId, distance, duration, pace, calories, elevation_gain,
      lineString, startPoint, endPoint, started_at, completed_at
    ]);
    
    const run = runResult.rows[0];
    
    // Insert route points
    for (let i = 0; i < route_points.length; i++) {
      const point = route_points[i];
      const pointQuery = `
        INSERT INTO route_points 
        (run_id, location, altitude, speed, heading, accuracy, recorded_at, sequence_order)
        VALUES ($1, ST_GeomFromText($2, 4326), $3, $4, $5, $6, $7, $8)
      `;
      
      await client.query(pointQuery, [
        run.id,
        `POINT(${point.lng} ${point.lat})`,
        point.altitude || null,
        point.speed || null,
        point.heading || null,
        point.accuracy || null,
        point.timestamp || new Date(),
        i
      ]);
    }
    
    // Process tiles
    const capturedTiles = await tileService.processRouteForTiles(userId, route_points, run.id);
    
    // Detect segments
    const segments = await segmentService.detectSegments(lineString);
    
    // Check achievements
    const unlockedAchievements = await achievementService.checkAchievements(userId);
    
    // Update challenges
    await challengeService.processRunForChallenges(userId, {
      distance,
      duration,
      pace,
      tilesCapture: capturedTiles.length
    });
    
    // Calculate streak
    await statsService.calculateStreak(userId);
    
    await client.query('COMMIT');
    
    res.status(201).json({
      run,
      capturedTiles: capturedTiles.length,
      segments: segments.length,
      unlockedAchievements
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating run:', error);
    res.status(500).json({ error: 'Failed to create run' });
  } finally {
    client.release();
  }
});

// Delete run
router.delete('/:runId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify ownership
    const checkQuery = 'SELECT user_id FROM runs WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [req.params.runId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    if (checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const deleteQuery = 'DELETE FROM runs WHERE id = $1';
    await pool.query(deleteQuery, [req.params.runId]);
    
    res.json({ message: 'Run deleted successfully' });
  } catch (error) {
    console.error('Error deleting run:', error);
    res.status(500).json({ error: 'Failed to delete run' });
  }
});

// Get user statistics
router.get('/user/:userId/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await statsService.getUserStats(req.params.userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get activity heatmap
router.get('/user/:userId/heatmap', authenticateToken, async (req, res) => {
  try {
    const { days = 365 } = req.query;
    const heatmap = await statsService.getActivityHeatmap(req.params.userId, parseInt(days));
    res.json(heatmap);
  } catch (error) {
    console.error('Error fetching heatmap:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
});

// Get pace progression
router.get('/user/:userId/pace-progression', authenticateToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const progression = await statsService.getPaceProgression(req.params.userId, parseInt(limit));
    res.json(progression);
  } catch (error) {
    console.error('Error fetching pace progression:', error);
    res.status(500).json({ error: 'Failed to fetch pace progression' });
  }
});

// Get distance progression
router.get('/user/:userId/distance-progression', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const progression = await statsService.getDistanceProgression(req.params.userId, parseInt(days));
    res.json(progression);
  } catch (error) {
    console.error('Error fetching distance progression:', error);
    res.status(500).json({ error: 'Failed to fetch distance progression' });
  }
});

module.exports = router;

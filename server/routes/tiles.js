const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');
const ngeohash = require('ngeohash');

const GEOHASH_PRECISION = 7;

// @route   POST api/tiles/capture
// @desc    Capture tiles based on route
// @access  Private
router.post('/capture', auth, async (req, res) => {
  const { route } = req.body; // Array of { lat, lng }
  const userId = req.user.id;

  try {
    const capturedTiles = [];
    const uniqueGeohashes = new Map();

    route.forEach((point) => {
      const hash = ngeohash.encode(point.lat, point.lng, GEOHASH_PRECISION);
      uniqueGeohashes.set(hash, { lat: point.lat, lng: point.lng });
    });

    for (const [hash, coords] of uniqueGeohashes) {
      let tileResult = await pool.query('SELECT id, geohash, ownerid as "ownerId", capturedat as "capturedAt", history FROM tiles WHERE geohash = $1', [hash]);
      let tile = tileResult.rows[0];

      if (!tile) {
        let newTileResult;
        try {
          // Try with PostGIS location
          newTileResult = await pool.query(
            'INSERT INTO tiles (geohash, location, ownerid) VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4) RETURNING id, geohash, ownerid as "ownerId", capturedat as "capturedAt", history',
            [hash, coords.lng, coords.lat, userId]
          );
        } catch (postgisErr) {
          // Fallback without PostGIS
          newTileResult = await pool.query(
            'INSERT INTO tiles (geohash, ownerid) VALUES ($1, $2) RETURNING id, geohash, ownerid as "ownerId", capturedat as "capturedAt", history',
            [hash, userId]
          );
        }
        tile = newTileResult.rows[0];
      } else {
        if (tile.ownerId !== userId) {
          const history = tile.history ? tile.history : [];
          history.push({ owner: tile.ownerId, timestamp: tile.capturedAt });
          const updatedTileResult = await pool.query(
            'UPDATE tiles SET ownerid = $1, capturedat = NOW(), history = $2 WHERE geohash = $3 RETURNING id, geohash, ownerid as "ownerId", capturedat as "capturedAt", history',
            [userId, JSON.stringify(history), hash]
          );
          tile = updatedTileResult.rows[0];
        }
      }

      capturedTiles.push(tile);
    }

    res.json(capturedTiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/tiles
// @desc    Get all tiles
// @access  Public
router.get('/', async (req, res) => {
  try {
    const tiles = await pool.query('SELECT id, geohash, ownerid as "ownerId", capturedat as "capturedAt", history FROM tiles');
    res.json(tiles.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

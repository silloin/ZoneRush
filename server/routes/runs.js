const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { antiCheatMiddleware } = require('../middleware/anticheat');
const pool = require('../config/db');

// @route   POST api/runs
// @desc    Create a run
// @access  Private
router.post('/', auth, antiCheatMiddleware, async (req, res) => {
  const { distance, duration, avgPace, route } = req.body;

  try {
    // Validate input
    if (!route || !Array.isArray(route) || route.length === 0) {
      return res.status(400).json({ msg: 'Route data is required' });
    }

    // Check if route_geom column exists
    const columnCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name='runs' AND column_name='route_geom'`
    );

    let newRun;
    if (columnCheck.rows.length > 0) {
      // PostGIS enabled - store LINESTRING
      try {
        const linestring = await pool.query(
          `SELECT ST_AsText(ST_MakeLine(
            ARRAY(
              SELECT ST_SetSRID(ST_MakePoint((coord->>'lng')::float, (coord->>'lat')::float), 4326)
              FROM jsonb_array_elements($1::jsonb) AS coord
            )
          )) as linestring`,
          [JSON.stringify(route)]
        );

        newRun = await pool.query(
          'INSERT INTO runs (userid, distance, duration, avgpace, route, route_geom) VALUES ($1, $2, $3, $4, $5, $6::geometry) RETURNING *',
          [req.user.id, distance, duration, avgPace, JSON.stringify(route), linestring.rows[0].linestring]
        );
      } catch (postgisErr) {
        // Fallback if PostGIS fails
        console.warn('PostGIS insert failed, using fallback:', postgisErr.message);
        newRun = await pool.query(
          'INSERT INTO runs (userid, distance, duration, avgpace, route) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [req.user.id, distance, duration, avgPace, JSON.stringify(route)]
        );
      }
    } else {
      // PostGIS not enabled - store JSON only
      newRun = await pool.query(
        'INSERT INTO runs (userid, distance, duration, avgpace, route) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.user.id, distance, duration, avgPace, JSON.stringify(route)]
      );
    }

    // Award XP for distance
    const xpEarned = Math.floor(distance * 10);
    await pool.query('UPDATE users SET xp = xp + $1, level = FLOOR((xp + $1) / 1000) + 1, lastrundate = CURRENT_DATE WHERE id = $2', [
      xpEarned,
      req.user.id
    ]);

    res.json({ run: newRun.rows[0], xpEarned });
  } catch (err) {
    console.error('POST /runs error:', err.message);
    console.error('Error details:', err);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   GET api/runs
// @desc    Get all runs for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const runs = await pool.query('SELECT id, userid, distance, duration, avgpace, route, created_at FROM runs WHERE userid = $1 ORDER BY id DESC', [
      req.user.id,
    ]);
    res.json(runs.rows);
  } catch (err) {
    console.error('GET /runs error:', err.message);
    console.error(err.stack);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// @route   DELETE api/runs/:id
// @desc    Delete a run
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if run exists and belongs to user
    const runCheck = await pool.query('SELECT * FROM runs WHERE id = $1 AND userid = $2', [
      req.params.id,
      req.user.id
    ]);
    
    if (runCheck.rows.length === 0) {
      return res.status(404).json({ msg: 'Run not found or not authorized' });
    }
    
    // Delete the run
    await pool.query('DELETE FROM runs WHERE id = $1', [req.params.id]);
    
    res.json({ msg: 'Run deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

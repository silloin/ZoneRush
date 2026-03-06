const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

// @route   POST api/runs
// @desc    Create a run
// @access  Private
router.post('/', auth, async (req, res) => {
  const { distance, duration, avgPace, route } = req.body;

  try {
    const newRun = await pool.query(
      'INSERT INTO runs (userid, distance, duration, avgpace, route) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, distance, duration, avgPace, JSON.stringify(route)]
    );

    res.json(newRun.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/runs
// @desc    Get all runs for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const runs = await pool.query('SELECT id, userid, distance, duration, avgpace, route FROM runs WHERE userid = $1 ORDER BY id DESC', [
      req.user.id,
    ]);
    res.json(runs.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

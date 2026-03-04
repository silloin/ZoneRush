const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// @route   GET api/zones
// @desc    Get all zones
// @access  Public
router.get('/', async (req, res) => {
  try {
    const zones = await pool.query('SELECT * FROM zones');
    res.json(zones.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

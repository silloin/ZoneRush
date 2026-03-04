const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// @route   GET api/events
// @desc    Get all events
// @access  Public
router.get('/', async (req, res) => {
  try {
    const events = await pool.query('SELECT * FROM events');
    res.json(events.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
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

// @route   POST api/events/join/:eventId
// @desc    Join an event
// @access  Private
router.post('/join/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Add user to event participants
    const event = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (event.rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }

    const eventData = event.rows[0];
    let participants = eventData.participants || [];
    
    // Check if participants is a string (PostgreSQL JSONB might return as object/array or string depending on driver config)
    if (typeof participants === 'string') {
      try {
        participants = JSON.parse(participants);
      } catch (e) {
        participants = [];
      }
    }

    if (!Array.isArray(participants)) {
      participants = [];
    }
    
    if (!participants.includes(userId)) {
      participants.push(userId);
      await pool.query('UPDATE events SET participants = $1 WHERE id = $2', [
        JSON.stringify(participants),
        eventId
      ]);
    }

    res.json({ msg: 'Successfully joined event' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

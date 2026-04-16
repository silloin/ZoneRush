const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

// @route   GET api/events
// @desc    Get all events
// @access  Public
router.get('/', async (req, res) => {
  try {
    const events = await pool.query('SELECT * FROM events ORDER BY start_date DESC');
    res.json(events.rows);
  } catch (err) {
    console.error('❌ Error fetching events:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      msg: 'Failed to fetch events',
      error: err.message,
      detail: err.detail,
      hint: err.hint
    });
  }
});

// @route   POST api/events
// @desc    Create a new event/challenge
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, goal_type, goal_value, start_date, end_date } = req.body;
    const creatorId = req.user.id;

    // Validation
    if (!name || !description || !goal_type || !goal_value || !end_date) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // Use current time if start_date not provided
    const startDate = start_date || new Date().toISOString();

    // Create event with creator as first participant
    const newEvent = await pool.query(
      `INSERT INTO events (name, description, goal_type, goal_value, start_date, end_date, participants, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name,
        description,
        goal_type,
        goal_value,
        startDate,
        end_date,
        JSON.stringify([creatorId]), // Creator is automatically a participant
        'active'
      ]
    );

    res.json({
      msg: 'Event created successfully!',
      event: newEvent.rows[0]
    });
  } catch (err) {
    console.error('Error creating event:', err.message);
    res.status(500).json({ 
      msg: 'Server Error',
      error: err.message 
    });
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

// @route   PUT api/events/:eventId
// @desc    Update an event
// @access  Private
router.put('/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, description, goal_type, goal_value, start_date, end_date, status } = req.body;
    const userId = req.user.id;

    // Check if event exists
    const event = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (event.rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }

    const eventData = event.rows[0];
    
    // Check if user is the creator (first participant)
    let participants = eventData.participants || [];
    if (typeof participants === 'string') {
      try {
        participants = JSON.parse(participants);
      } catch (e) {
        participants = [];
      }
    }

    if (!Array.isArray(participants) || participants[0] !== userId) {
      return res.status(401).json({ msg: 'Only the event creator can update this event' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (goal_type !== undefined) {
      updates.push(`goal_type = $${paramCount}`);
      values.push(goal_type);
      paramCount++;
    }
    if (goal_value !== undefined) {
      updates.push(`goal_value = $${paramCount}`);
      values.push(goal_value);
      paramCount++;
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramCount}`);
      values.push(start_date);
      paramCount++;
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramCount}`);
      values.push(end_date);
      paramCount++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ msg: 'No fields to update' });
    }

    values.push(eventId);
    const query = `UPDATE events SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const updatedEvent = await pool.query(query, values);
    res.json({
      msg: 'Event updated successfully',
      event: updatedEvent.rows[0]
    });
  } catch (err) {
    console.error('Error updating event:', err.message);
    res.status(500).json({ 
      msg: 'Server Error',
      error: err.message 
    });
  }
});

// @route   DELETE api/events/:eventId
// @desc    Delete an event
// @access  Private
router.delete('/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Check if event exists
    const event = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (event.rows.length === 0) {
      return res.status(404).json({ msg: 'Event not found' });
    }

    const eventData = event.rows[0];
    
    // Check if user is the creator (first participant)
    let participants = eventData.participants || [];
    if (typeof participants === 'string') {
      try {
        participants = JSON.parse(participants);
      } catch (e) {
        participants = [];
      }
    }

    if (!Array.isArray(participants) || participants[0] !== userId) {
      return res.status(401).json({ msg: 'Only the event creator can delete this event' });
    }

    await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
    res.json({ msg: 'Event deleted successfully', eventId });
  } catch (err) {
    console.error('Error deleting event:', err.message);
    res.status(500).json({ 
      msg: 'Server Error',
      error: err.message 
    });
  }
});

module.exports = router;

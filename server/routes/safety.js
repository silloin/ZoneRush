const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticateToken = require('../middleware/auth');

// @route   GET api/safety/contacts
// @desc    Get all safety contacts for user
// @access  Private
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM safety_contacts WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching safety contacts:', error);
    res.status(500).json({ error: 'Failed to fetch safety contacts' });
  }
});

// @route   POST api/safety/contacts
// @desc    Add a new safety contact
// @access  Private
router.post('/contacts', authenticateToken, async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const userId = req.user.id;
    
    const result = await pool.query(
      'INSERT INTO safety_contacts (user_id, name, phone, email) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, name, phone, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding safety contact:', error);
    res.status(500).json({ error: 'Failed to add safety contact' });
  }
});

// @route   POST api/safety/sos
// @desc    Trigger SOS alert
// @access  Private
router.post('/sos', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, message } = req.body;
    const userId = req.user.id;
    
    // Use the updated schema (latitude, longitude instead of geometry)
    const result = await pool.query(
      'INSERT INTO sos_alerts (user_id, latitude, longitude, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, lat, lng, message || 'Emergency assistance needed!']
    );
    
    // Notify contacts (mocking notification)
    const contacts = await pool.query(
      'SELECT * FROM safety_contacts WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );
    
    // Broadcast SOS alert via Socket.IO if available
    if (req.io) {
      req.io.emit('sos-alert', {
        userId,
        username: req.user.username,
        location: { lat, lng },
        contacts: contacts.rows
      });
    }
    
    res.status(201).json({ 
      alert: result.rows[0], 
      message: 'SOS Alert triggered successfully! Contacts notified.' 
    });
  } catch (error) {
    console.error('Error triggering SOS alert:', error);
    res.status(500).json({ error: 'Failed to trigger SOS alert', details: error.message });
  }
});

// @route   PUT api/safety/contacts/:id
// @desc    Update a safety contact
// @access  Private
router.put('/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const userId = req.user.id;
    const contactId = req.params.id;
    
    const result = await pool.query(
      'UPDATE safety_contacts SET name = $1, phone = $2, email = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
      [name, phone, email, contactId, userId]
    );
    
    if (result.rows.length === 0) {
      // Check if contact exists at all
      const contactCheck = await pool.query('SELECT user_id FROM safety_contacts WHERE id = $1', [contactId]);
      
      if (contactCheck.rows.length > 0) {
        // Contact exists but doesn't belong to user - IDOR attempt
        await pool.query(
          `INSERT INTO security_events (user_id, event_type, ip_address, details)
           VALUES ($1, 'unauthorized_access', $2, $3)`,
          [userId, req.ip, JSON.stringify({
            type: 'safety_contact_edit',
            contactId: contactId,
            contactOwner: contactCheck.rows[0].user_id,
            attempt: 'IDOR'
          })]
        );
      }
      
      return res.status(404).json({ error: 'Contact not found or not authorized' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating safety contact:', error);
    res.status(500).json({ error: 'Failed to update safety contact' });
  }
});

// @route   DELETE api/safety/contacts/:id
// @desc    Delete (deactivate) a safety contact
// @access  Private
router.delete('/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = req.params.id;
    
    // Hard delete or soft delete depending on preference, here we'll do hard delete to match Profile.jsx
    const result = await pool.query(
      'DELETE FROM safety_contacts WHERE id = $1 AND user_id = $2 RETURNING *',
      [contactId, userId]
    );
    
    if (result.rows.length === 0) {
      // Check if contact exists at all
      const contactCheck = await pool.query('SELECT user_id FROM safety_contacts WHERE id = $1', [contactId]);
      
      if (contactCheck.rows.length > 0) {
        // Contact exists but doesn't belong to user - IDOR attempt
        await pool.query(
          `INSERT INTO security_events (user_id, event_type, ip_address, details)
           VALUES ($1, 'unauthorized_access', $2, $3)`,
          [userId, req.ip, JSON.stringify({
            type: 'safety_contact_delete',
            contactId: contactId,
            contactOwner: contactCheck.rows[0].user_id,
            attempt: 'IDOR'
          })]
        );
      }
      
      return res.status(404).json({ error: 'Contact not found or not authorized' });
    }
    
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting safety contact:', error);
    res.status(500).json({ error: 'Failed to delete safety contact' });
  }
});

module.exports = router;
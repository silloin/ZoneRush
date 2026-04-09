const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

/**
 * Clan Routes - Handles Clan creation, membership, and territory association.
 */

// @route   GET api/clans
// @desc    Get all clans with stats
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.username as leader_name
      FROM clans c
      LEFT JOIN users u ON c.leader_id = u.id
      ORDER BY total_territory_area DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST api/clans
// @desc    Create a new clan
router.post('/', auth, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ msg: 'Clan name is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if user is already in a clan
    const memberCheck = await client.query('SELECT clan_id FROM clan_members WHERE user_id = $1', [req.user.id]);
    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ msg: 'You are already in a clan' });
    }

    const clanResult = await client.query(
      'INSERT INTO clans (name, description, leader_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, req.user.id]
    );
    const clan = clanResult.rows[0];

    await client.query(
      'INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, $3)',
      [clan.id, req.user.id, 'leader']
    );

    await client.query('COMMIT');
    res.status(201).json(clan);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// @route   POST api/clans/join/:clanId
// @desc    Join a clan
router.post('/join/:clanId', auth, async (req, res) => {
  try {
    const { clanId } = req.params;
    
    // Check if user is already in a clan
    const memberCheck = await pool.query('SELECT clan_id FROM clan_members WHERE user_id = $1', [req.user.id]);
    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ msg: 'You are already in a clan' });
    }

    await pool.query(
      'INSERT INTO clan_members (clan_id, user_id) VALUES ($1, $2)',
      [clanId, req.user.id]
    );

    // Update clan member count
    await pool.query('UPDATE clans SET member_count = member_count + 1 WHERE id = $1', [clanId]);

    res.json({ msg: 'Successfully joined clan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET api/clans/my-clan
// @desc    Get user's current clan details
router.get('/my-clan', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, cm.role
      FROM clan_members cm
      JOIN clans c ON cm.clan_id = c.id
      WHERE cm.user_id = $1
    `, [req.user.id]);
    
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

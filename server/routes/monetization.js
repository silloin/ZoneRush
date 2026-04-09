const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialized');
} else {
  console.warn('⚠️ Stripe disabled - No STRIPE_SECRET_KEY in .env. Add to server/.env to enable payments.');
}

// @route   POST api/monetization/create-checkout-session
// @desc    Create Stripe checkout session for Pro plan
router.post('/create-checkout-session', auth, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe payments temporarily unavailable. Contact support or check server logs.' });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/pro-upgrade`,
      client_reference_id: req.user.id.toString(),
      customer_email: req.user.email,
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET api/monetization/inventory
// @desc    Get user's virtual goods inventory
router.get('/inventory', auth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Inventory service temporarily unavailable' });
    }
    const result = await pool.query(`
      SELECT vi.*, ui.is_equipped, ui.purchased_at
      FROM user_inventory ui
      JOIN virtual_items vi ON ui.item_id = vi.id
      WHERE ui.user_id = $1
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST api/monetization/purchase/:itemId
// @desc    Purchase virtual item with XP
router.post('/purchase/:itemId', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const itemResult = await client.query('SELECT * FROM virtual_items WHERE id = $1', [req.params.itemId]);
    if (itemResult.rows.length === 0) return res.status(404).json({ msg: 'Item not found' });
    const item = itemResult.rows[0];

    const userResult = await client.query('SELECT xp FROM users WHERE id = $1', [req.user.id]);
    const userXP = userResult.rows[0].xp;

    if (userXP < item.price_xp) {
      return res.status(400).json({ msg: 'Insufficient XP' });
    }

    // Deduct XP
    await client.query('UPDATE users SET xp = xp - $1 WHERE id = $2', [item.price_xp, req.user.id]);
    
    // Add to inventory
    await client.query(
      'INSERT INTO user_inventory (user_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, item.id]
    );

    await client.query('COMMIT');
    res.json({ msg: 'Purchase successful', item });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;

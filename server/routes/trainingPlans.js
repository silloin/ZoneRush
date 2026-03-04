const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');

// @route   POST api/training-plans
// @desc    Create a training plan
// @access  Private
router.post('/', auth, async (req, res) => {
  const { planType, workouts } = req.body;

  try {
    const newPlan = await pool.query(
      'INSERT INTO training_plans (userId, planType, workouts) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, planType, JSON.stringify(workouts)]
    );

    res.json(newPlan.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/training-plans
// @desc    Get the user's training plan
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const plan = await pool.query('SELECT * FROM training_plans WHERE userId = $1', [
      req.user.id,
    ]);
    res.json(plan.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

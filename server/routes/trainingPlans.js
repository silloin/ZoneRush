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
      'INSERT INTO training_plans (userid, plantype, workouts) VALUES ($1, $2, $3) RETURNING *',
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
    const plan = await pool.query('SELECT * FROM training_plans WHERE userid = $1', [
      req.user.id,
    ]);
    res.json(plan.rows[0] || null);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/training-plans/current
// @desc    Get the user's current training plan
// @access  Private
router.get('/current', auth, async (req, res) => {
  try {
    const plan = await pool.query('SELECT * FROM training_plans WHERE userid = $1 ORDER BY startdate DESC LIMIT 1', [
      req.user.id,
    ]);
    res.json(plan.rows[0] || null);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/training-plans/generate
// @desc    Generate a new training plan
// @access  Private
router.post('/generate', auth, async (req, res) => {
  const { planType } = req.body;

  try {
    // Generate sample workouts based on plan type
    const workouts = generateWorkouts(planType);
    
    const newPlan = await pool.query(
      'INSERT INTO training_plans (userid, plantype, workouts) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, planType, JSON.stringify(workouts)]
    );

    res.json(newPlan.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/training-plans/workout/:workoutId
// @desc    Mark a workout as completed
// @access  Private
router.put('/workout/:workoutId', auth, async (req, res) => {
  try {
    const { workoutId } = req.params;
    
    // Get current plan
    const planResult = await pool.query('SELECT * FROM training_plans WHERE userid = $1', [
      req.user.id,
    ]);
    
    if (planResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Training plan not found' });
    }

    const plan = planResult.rows[0];
    const workouts = plan.workouts || [];
    
    // Find and mark workout as completed
    const updatedWorkouts = workouts.map((w) => 
      w._id === workoutId ? { ...w, completed: true } : w
    );

    const updatedPlan = await pool.query(
      'UPDATE training_plans SET workouts = $1 WHERE userid = $2 RETURNING *',
      [JSON.stringify(updatedWorkouts), req.user.id]
    );

    res.json(updatedPlan.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Helper function to generate workouts based on plan type
function generateWorkouts(planType) {
  const workouts = [];
  const baseWorkouts = {
    beginner: [
      { day: 1, workoutType: 'Easy Run', distance: 3, duration: 1800 },
      { day: 2, workoutType: 'Rest Day', distance: 0, duration: 0 },
      { day: 3, workoutType: 'Easy Run', distance: 3, duration: 1800 },
      { day: 4, workoutType: 'Speed Work', distance: 2, duration: 1200 },
      { day: 5, workoutType: 'Easy Run', distance: 4, duration: 2400 },
      { day: 6, workoutType: 'Rest Day', distance: 0, duration: 0 },
      { day: 7, workoutType: 'Long Run', distance: 6, duration: 3600 },
    ],
    '5k': [
      { day: 1, workoutType: 'Easy Run', distance: 4, duration: 2400 },
      { day: 2, workoutType: 'Intervals', distance: 5, duration: 1800 },
      { day: 3, workoutType: 'Easy Run', distance: 4, duration: 2400 },
      { day: 4, workoutType: 'Tempo Run', distance: 5, duration: 1800 },
      { day: 5, workoutType: 'Easy Run', distance: 3, duration: 1800 },
      { day: 6, workoutType: 'Rest Day', distance: 0, duration: 0 },
      { day: 7, workoutType: 'Long Run', distance: 8, duration: 3600 },
    ],
  };

  const selectedWorkouts = baseWorkouts[planType] || baseWorkouts.beginner;
  return selectedWorkouts.map((w, idx) => ({ ...w, _id: `${idx}_${Date.now()}`, completed: false }));
}

module.exports = router;

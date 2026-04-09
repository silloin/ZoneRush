const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');
const aiCoachService = require('../services/aiCoachService');

// @route   POST api/training-plans
// @desc    Create a training plan
// @access  Private
router.post('/', auth, async (req, res) => {
  const { planType, workouts } = req.body;

  try {
    const newPlan = await pool.query(
      'INSERT INTO training_plans (user_id, plan_type, workouts) VALUES ($1, $2, $3) RETURNING *',
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
    const plan = await pool.query('SELECT * FROM training_plans WHERE user_id = $1', [
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
    const plan = await pool.query('SELECT * FROM training_plans WHERE user_id = $1 ORDER BY start_date DESC LIMIT 1', [
      req.user.id,
    ]);
    res.json(plan.rows[0] || null);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/training-plans/generate
// @desc    Generate a new training plan (AI-powered)
// @access  Private
router.post('/generate', auth, async (req, res) => {
  const { planType, useAI, preferences } = req.body;

  try {
    // If useAI is true, generate AI-powered plan
    if (useAI) {
      const aiPlan = await aiCoachService.generateAITrainingPlan(req.user.id, preferences || {});
      return res.json(aiPlan);
    }

    // Otherwise, use template-based generation
    const workouts = generateWorkouts(planType);
    
    const newPlan = await pool.query(
      'INSERT INTO training_plans (user_id, plan_type, workouts) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, planType, JSON.stringify(workouts)]
    );

    res.json(newPlan.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/training-plans/workout/:workoutId
// @desc    Mark a workout as completed (supports both legacy and AI-generated plans)
// @access  Private
router.put('/workout/:workoutId', auth, async (req, res) => {
  try {
    const { workoutId } = req.params;
    
    console.log('Completing workout:', workoutId, 'for user:', req.user.id);
    
    // Get current active plan
    const planResult = await pool.query(
      'SELECT * FROM training_plans WHERE user_id = $1 AND is_active = true ORDER BY start_date DESC LIMIT 1', 
      [req.user.id]
    );
    
    if (planResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Training plan not found' });
    }

    const plan = planResult.rows[0];
    console.log('Plan found:', plan.id, 'Is AI:', plan.metadata?.isAI);
    let updatedPlan;
    
    // Check if this is an AI-generated plan with weekly structure
    if (plan.metadata && plan.metadata.isAI) {
      // Handle AI-generated plan with weekly structure
      const metadata = plan.metadata || {};
      const weeklyPlans = plan.workouts || [];
      
      console.log('Processing AI plan workout ID:', workoutId);
      
      // Parse workout ID (format: "weekIndex-workoutIndex")
      const parts = workoutId.split('-');
      if (parts.length !== 2) {
        console.error('Invalid workout ID format:', workoutId);
        return res.status(400).json({ msg: 'Invalid workout ID format for AI plan. Expected format: week-workout (e.g., 1-0)' });
      }
      
      const weekIdx = parseInt(parts[0]) - 1; // Convert to 0-based index
      const workoutIdx = parseInt(parts[1]);
      
      console.log('Parsed indices - Week:', weekIdx, 'Workout:', workoutIdx);
      
      if (isNaN(weekIdx) || isNaN(workoutIdx) || weekIdx < 0 || workoutIdx < 0) {
        console.error('Invalid parsed indices:', { weekIdx, workoutIdx });
        return res.status(400).json({ msg: 'Invalid workout ID' });
      }
      
      // Update the specific workout
      const updatedWeeklyPlans = weeklyPlans.map((week, wIdx) => {
        if (wIdx === weekIdx && week.workouts) {
          const updatedWorkouts = week.workouts.map((workout, woIdx) => {
            if (woIdx === workoutIdx) {
              return { ...workout, completed: true, completedAt: new Date().toISOString() };
            }
            return workout;
          });
          return { ...week, workouts: updatedWorkouts };
        }
        return week;
      });
      
      // Track completion progress in metadata
      const totalWorkouts = weeklyPlans.reduce((sum, week) => sum + (week.workouts?.length || 0), 0);
      const completedWorkouts = updatedWeeklyPlans.reduce((sum, week) => 
        sum + (week.workouts?.filter(w => w.completed)?.length || 0), 0
      );
      
      updatedPlan = await pool.query(
        'UPDATE training_plans SET workouts = $1, metadata = $2 WHERE id = $3 RETURNING *',
        [
          JSON.stringify(updatedWeeklyPlans),
          JSON.stringify({ ...metadata, completedWorkouts, totalWorkouts, lastCompletedAt: new Date().toISOString() }),
          plan.id
        ]
      );
    } else {
      // Handle legacy template-based plan
      const workouts = plan.workouts || [];
      
      console.log('Processing legacy plan workout ID:', workoutId);
      
      // Find and mark workout as completed
      const updatedWorkouts = workouts.map((w) => {
        if ((w._id || w.id) === workoutId) {
          return { ...w, completed: true, completedAt: new Date().toISOString() };
        }
        return w;
      });

      updatedPlan = await pool.query(
        'UPDATE training_plans SET workouts = $1 WHERE id = $2 RETURNING *',
        [JSON.stringify(updatedWorkouts), plan.id]
      );
    }

    console.log('Workout completed successfully');
    res.json(updatedPlan.rows[0]);
  } catch (err) {
    console.error('Error completing workout:', err.message);
    res.status(500).json({ error: 'Server Error', details: err.message });
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

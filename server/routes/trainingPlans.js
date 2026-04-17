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
    console.error('❌ Error fetching training plan:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      msg: 'Failed to fetch training plan',
      error: err.message,
      detail: err.detail,
      hint: err.hint
    });
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
      
      // Save the AI plan to database
      const savedPlan = await pool.query(
        'INSERT INTO training_plans (user_id, plan_type, workouts, metadata, start_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [
          req.user.id, 
          'ai-generated', 
          JSON.stringify(aiPlan.weeklyPlans || aiPlan.workouts || []),
          JSON.stringify({ 
            isAI: true, 
            goal: aiPlan.goal, 
            duration: aiPlan.duration,
            tips: aiPlan.tips,
            warnings: aiPlan.warnings,
            preferences: preferences,
            createdAt: new Date().toISOString()
          }),
          new Date().toISOString()
        ]
      );
      
      return res.json(savedPlan.rows[0]);
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
    
    console.log('=== WORKOUT COMPLETION DEBUG ===');
    console.log('Completing workout:', workoutId, 'for user:', req.user.id);
    console.log('Workout ID type:', typeof workoutId);
    console.log('Workout ID contains underscore:', workoutId.includes('_'));
    console.log('Workout ID contains dash:', workoutId.includes('-'));
    
    // Get current active plan - with fallback if is_active column doesn't exist
    let planResult;
    try {
      planResult = await pool.query(
        `SELECT * FROM training_plans WHERE user_id = $1 AND is_active = true ORDER BY start_date DESC LIMIT 1`, 
        [req.user.id]
      );
    } catch (err) {
      if (err.message.includes('is_active')) {
        console.log('Column is_active does not exist yet, trying without it...');
        // Fallback: query without is_active column
        planResult = await pool.query(
          `SELECT * FROM training_plans WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, 
          [req.user.id]
        );
      } else {
        throw err;
      }
    }
    
    if (planResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Training plan not found' });
    }

    const plan = planResult.rows[0];
    console.log('Plan found:', plan.id, 'Is AI:', plan.metadata?.isAI);
    let updatedPlan;
    
    // Check if this is an AI-generated plan with weekly structure
    // Multiple safety checks to prevent false positives
    const isAIPlan = plan.metadata && 
                     plan.metadata.isAI === true && 
                     plan.plan_type === 'ai-generated';
    
    // More robust check for weekly structure
    let hasWeeklyStructure = false;
    if (plan.workouts && Array.isArray(plan.workouts) && plan.workouts.length > 0) {
      const firstWeek = plan.workouts[0];
      hasWeeklyStructure = firstWeek && 
                          typeof firstWeek === 'object' && 
                          firstWeek.week !== undefined && 
                          Array.isArray(firstWeek.workouts);
    }
    
    console.log('Plan analysis:', { 
      isAIPlan, 
      hasWeeklyStructure, 
      workoutId, 
      workoutIdType: typeof workoutId,
      planId: plan.id,
      planType: plan.plan_type,
      metadata: plan.metadata,
      workoutsStructure: plan.workouts ? (Array.isArray(plan.workouts[0]?.workouts) ? 'weekly' : 'legacy') : 'none',
      firstWorkoutItem: plan.workouts?.[0],
      workoutsArray: plan.workouts,
      metadataString: JSON.stringify(plan.metadata)
    });
    
    // Only process as AI plan if it's explicitly marked as AI AND has proper weekly structure
    if (isAIPlan && hasWeeklyStructure) {
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
module.exports.generateWorkouts = generateWorkouts;

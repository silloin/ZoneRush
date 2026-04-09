const pool = require('../config/db');
const Groq = require('groq-sdk');

// Initialize Groq client with environment variable
if (!process.env.GROQ_API_KEY) {
  console.error('CRITICAL ERROR: GROQ_API_KEY environment variable is not set!');
  console.error('Please add GROQ_API_KEY to your .env file');
  throw new Error('Missing required environment variable: GROQ_API_KEY');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

class AICoachService {
  // Main function to generate personalized recommendations
  async generateRecommendations(userId) {
    const userData = await this.getUserAnalytics(userId);
    const recommendations = [];

    // Analyze different aspects
    recommendations.push(...await this.analyzePace(userId, userData));
    recommendations.push(...await this.analyzeVolume(userId, userData));
    recommendations.push(...await this.analyzeConsistency(userId, userData));
    recommendations.push(...await this.analyzeRecovery(userId, userData));
    recommendations.push(...await this.suggestTrainingPlan(userId, userData));
    
    // Tier 2: AI Route Generation Recommendation
    const routeRecs = await this.analyzeScenicRoutes(userId);
    if (routeRecs) recommendations.push(routeRecs);

    // Save recommendations to database
    await this.saveRecommendations(userId, recommendations);

    return recommendations;
  }

  // Tier 2: Suggest routes with high scenic value (parks/water) using PostGIS
  async analyzeScenicRoutes(userId) {
    try {
      // Find nearby parks or water bodies that the user hasn't visited much
      // This is a simplified version of scenic route suggestion
      const query = `
        WITH user_location AS (
          SELECT start_location as loc FROM runs WHERE user_id = $1 ORDER BY completed_at DESC LIMIT 1
        ),
        nearby_scenic AS (
          SELECT t.id, t.geohash, ST_AsGeoJSON(t.geometry) as geom
          FROM tiles t, user_location ul
          WHERE ST_DWithin(t.center_point::geography, ul.loc::geography, 5000)
          AND (t.geohash LIKE 'g%' OR t.geohash LIKE 'u%') -- Example: common prefixes for parks/scenic areas
          AND NOT EXISTS (SELECT 1 FROM captured_tiles ct WHERE ct.tile_id = t.id AND ct.user_id = $1)
          LIMIT 3
        )
        SELECT * FROM nearby_scenic;
      `;
      
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length > 0) {
        return {
          type: 'route',
          title: 'Explore a Scenic Route',
          description: `We've found ${result.rows.length} scenic areas nearby that you haven't explored yet. Nature runs can improve your mental well-being and motivation!`,
          priority: 'medium',
          actionable_steps: [
            'Try a run in a local park',
            'Explore near water bodies',
            'Capture new scenic tiles'
          ]
        };
      }
      return null;
    } catch (error) {
      console.error('Error analyzing scenic routes:', error);
      return null;
    }
  }

  // Get comprehensive user analytics
  async getUserAnalytics(userId) {
    const query = `
      SELECT 
        u.level,
        u.total_distance,
        u.streak,
        u.fitness_level,
        u.best_5k_time,
        u.best_10k_time,
        (SELECT COUNT(*) FROM runs WHERE user_id = $1 AND completed_at >= CURRENT_DATE - INTERVAL '7 days') as runs_last_week,
        (SELECT COUNT(*) FROM runs WHERE user_id = $1 AND completed_at >= CURRENT_DATE - INTERVAL '30 days') as runs_last_month,
        (SELECT AVG(distance) FROM runs WHERE user_id = $1 AND completed_at >= CURRENT_DATE - INTERVAL '30 days') as avg_distance_30d,
        (SELECT AVG(pace) FROM runs WHERE user_id = $1 AND completed_at >= CURRENT_DATE - INTERVAL '30 days') as avg_pace_30d,
        (SELECT AVG(duration) FROM runs WHERE user_id = $1 AND completed_at >= CURRENT_DATE - INTERVAL '30 days') as avg_duration_30d,
        (SELECT STDDEV(pace) FROM runs WHERE user_id = $1 AND completed_at >= CURRENT_DATE - INTERVAL '30 days') as pace_variance,
        (SELECT MIN(pace) FROM runs WHERE user_id = $1 AND completed_at >= CURRENT_DATE - INTERVAL '30 days') as best_pace,
        (SELECT MAX(completed_at) FROM runs WHERE user_id = $1) as last_run_date
      FROM users u
      WHERE u.id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows[0] || {};
  }

  // Analyze pace and suggest improvements
  async analyzePace(userId, userData) {
    const recommendations = [];
    
    if (!userData.best_pace) return recommendations;

    const avgPace = parseFloat(userData.avg_pace_30d);
    const bestPace = parseFloat(userData.best_pace);
    const paceVariance = parseFloat(userData.pace_variance);

    // High pace variance - inconsistent running
    if (paceVariance > 1.0) {
      recommendations.push({
        type: 'pace',
        title: 'Improve Pace Consistency',
        description: `Your pace varies significantly between runs (±${paceVariance.toFixed(2)} min/km). Try to maintain a more consistent pace during your runs. Use a running watch or app to monitor your pace in real-time.`,
        priority: 'medium',
        actionable_steps: [
          'Start each run at a comfortable pace',
          'Use interval training to build speed control',
          'Practice negative splits (faster second half)'
        ]
      });
    }

    // Pace improvement potential
    if (avgPace > bestPace * 1.15) {
      const targetPace = bestPace * 1.05;
      recommendations.push({
        type: 'pace',
        title: 'You Can Run Faster!',
        description: `Your average pace (${avgPace.toFixed(2)} min/km) is slower than your best (${bestPace.toFixed(2)} min/km). You have the potential to improve! Target pace: ${targetPace.toFixed(2)} min/km.`,
        priority: 'high',
        actionable_steps: [
          'Add one tempo run per week',
          'Include 400m or 800m intervals',
          'Focus on form and breathing'
        ]
      });
    }

    // Suggest speed work based on fitness level
    if (userData.fitness_level === 'intermediate' || userData.fitness_level === 'advanced') {
      const hasRecentSpeedWork = await this.checkRecentSpeedWork(userId);
      if (!hasRecentSpeedWork) {
        recommendations.push({
          type: 'pace',
          title: 'Add Speed Training',
          description: 'Incorporate interval training to improve your speed and VO2 max. Speed work once a week can significantly improve your race times.',
          priority: 'medium',
          actionable_steps: [
            'Warm up for 10-15 minutes',
            'Run 6x400m at 5K pace with 90s rest',
            'Cool down for 10 minutes'
          ]
        });
      }
    }

    return recommendations;
  }

  // Analyze weekly volume and suggest adjustments
  async analyzeVolume(userId, userData) {
    const recommendations = [];
    
    const weeklyDistance = parseFloat(userData.total_distance) / (userData.total_runs / 7);
    const runsLastWeek = parseInt(userData.runs_last_week);
    const avgDistance = parseFloat(userData.avg_distance_30d);

    // Too few runs per week
    if (runsLastWeek < 3 && userData.fitness_level !== 'beginner') {
      recommendations.push({
        type: 'distance',
        title: 'Increase Running Frequency',
        description: `You ran ${runsLastWeek} times last week. Aim for at least 3-4 runs per week to build consistency and improve fitness.`,
        priority: 'high',
        actionable_steps: [
          'Schedule runs in your calendar',
          'Start with shorter, easier runs',
          'Build up gradually (10% rule)'
        ]
      });
    }

    // Suggest distance increase (10% rule)
    if (runsLastWeek >= 3 && userData.current_streak >= 4) {
      const currentWeeklyKm = (weeklyDistance / 1000).toFixed(1);
      const suggestedIncrease = (weeklyDistance * 1.1 / 1000).toFixed(1);
      
      recommendations.push({
        type: 'distance',
        title: 'Ready to Increase Distance',
        description: `You're running consistently! Current weekly distance: ${currentWeeklyKm} km. Consider increasing to ${suggestedIncrease} km next week (10% increase).`,
        priority: 'medium',
        actionable_steps: [
          'Add 5-10 minutes to one run',
          'Keep other runs at current distance',
          'Listen to your body'
        ]
      });
    }

    // Long run suggestion
    const hasLongRun = await this.checkRecentLongRun(userId);
    if (!hasLongRun && userData.fitness_level !== 'beginner') {
      recommendations.push({
        type: 'distance',
        title: 'Add a Long Run',
        description: 'Include one longer run per week to build endurance. Long runs should be 25-30% of your weekly mileage.',
        priority: 'medium',
        actionable_steps: [
          'Run at an easy, conversational pace',
          'Start with 30-40 minutes',
          'Gradually increase by 5-10 minutes'
        ]
      });
    }

    return recommendations;
  }

  // Analyze consistency and streak
  async analyzeConsistency(userId, userData) {
    const recommendations = [];
    
    const currentStreak = parseInt(userData.current_streak);
    const longestStreak = parseInt(userData.longest_streak);
    const daysSinceLastRun = userData.last_run_date 
      ? Math.floor((new Date() - new Date(userData.last_run_date)) / (1000 * 60 * 60 * 24))
      : 999;

    // Encourage streak building
    if (currentStreak >= 3 && currentStreak < 7) {
      recommendations.push({
        type: 'streak',
        title: 'Keep Your Streak Going! 🔥',
        description: `You're on a ${currentStreak}-day streak! Just ${7 - currentStreak} more days to unlock the "Week Warrior" achievement.`,
        priority: 'high',
        actionable_steps: [
          'Even a short 15-minute run counts',
          'Set a daily reminder',
          'Plan your runs in advance'
        ]
      });
    }

    // Streak broken - encourage comeback
    if (daysSinceLastRun > 3 && longestStreak > 0) {
      recommendations.push({
        type: 'streak',
        title: 'Time to Get Back Out There',
        description: `It's been ${daysSinceLastRun} days since your last run. Your longest streak was ${longestStreak} days - you can do it again!`,
        priority: 'high',
        actionable_steps: [
          'Start with an easy 20-minute run',
          'Don\'t worry about pace',
          'Focus on enjoying the run'
        ]
      });
    }

    // Celebrate consistency
    if (currentStreak >= 7) {
      recommendations.push({
        type: 'streak',
        title: 'Amazing Consistency! 🎉',
        description: `${currentStreak}-day streak! You're building a strong running habit. Keep it up!`,
        priority: 'low',
        actionable_steps: [
          'Consider a rest day or easy run',
          'Focus on recovery',
          'Celebrate your progress'
        ]
      });
    }

    return recommendations;
  }

  // Analyze recovery and prevent overtraining
  async analyzeRecovery(userId, userData) {
    const recommendations = [];
    
    const runsLastWeek = parseInt(userData.runs_last_week);
    const avgDuration = parseFloat(userData.avg_duration_30d);

    // Check for overtraining signs
    const recentRuns = await this.getRecentRunDetails(userId, 7);
    const avgPaceRecent = recentRuns.reduce((sum, run) => sum + parseFloat(run.pace), 0) / recentRuns.length;
    const historicalAvgPace = parseFloat(userData.avg_pace_30d);

    // Pace declining (getting slower)
    if (avgPaceRecent > historicalAvgPace * 1.1 && recentRuns.length >= 5) {
      recommendations.push({
        type: 'recovery',
        title: 'Consider a Recovery Week',
        description: 'Your recent pace is slower than usual, which might indicate fatigue. Consider reducing volume or taking extra rest days.',
        priority: 'high',
        actionable_steps: [
          'Reduce weekly mileage by 20-30%',
          'Add an extra rest day',
          'Focus on sleep and nutrition',
          'Consider cross-training (swimming, cycling)'
        ]
      });
    }

    // Running too frequently without rest
    if (runsLastWeek >= 6 && userData.fitness_level !== 'advanced') {
      recommendations.push({
        type: 'recovery',
        title: 'Rest Days Are Important',
        description: 'You ran 6+ times last week. Rest days are crucial for recovery and preventing injury. Aim for at least 1-2 rest days per week.',
        priority: 'high',
        actionable_steps: [
          'Schedule 1-2 complete rest days',
          'Try active recovery (walking, yoga)',
          'Focus on stretching and mobility'
        ]
      });
    }

    // Suggest recovery run
    const hasEasyRun = recentRuns.some(run => parseFloat(run.pace) > historicalAvgPace * 1.15);
    if (!hasEasyRun && recentRuns.length >= 3) {
      recommendations.push({
        type: 'recovery',
        title: 'Add Easy Recovery Runs',
        description: 'All your recent runs were at moderate to hard effort. Include easy recovery runs to improve aerobic base and prevent burnout.',
        priority: 'medium',
        actionable_steps: [
          'Run at conversational pace',
          'Keep heart rate in Zone 2',
          'Focus on time, not distance'
        ]
      });
    }

    return recommendations;
  }

  // Suggest personalized training plan
  async suggestTrainingPlan(userId, userData) {
    const recommendations = [];
    
    const totalDistance = parseFloat(userData.total_distance);
    const fitnessLevel = userData.fitness_level;
    const best5k = userData.best_5k_time;

    // Suggest 5K training plan
    if (!best5k && totalDistance > 10000 && fitnessLevel === 'beginner') {
      recommendations.push({
        type: 'training',
        title: 'Ready for a 5K Goal',
        description: 'You\'ve built a good base! Consider training for a 5K race. This will give you a specific goal and structure to your training.',
        priority: 'medium',
        actionable_steps: [
          'Follow a 6-8 week 5K plan',
          'Include one tempo run per week',
          'Build up to 20-25 km per week',
          'Find a local 5K race'
        ]
      });
    }

    // Suggest 10K training plan
    if (best5k && !userData.best_10k_time && totalDistance > 50000) {
      recommendations.push({
        type: 'training',
        title: 'Challenge Yourself with 10K',
        description: 'You\'ve conquered 5K! Time to level up to 10K. This distance will improve your endurance significantly.',
        priority: 'medium',
        actionable_steps: [
          'Follow an 8-10 week 10K plan',
          'Increase weekly mileage gradually',
          'Add a weekly long run (10-12 km)',
          'Include hill training'
        ]
      });
    }

    // Suggest half marathon
    if (userData.best_10k_time && totalDistance > 200000 && fitnessLevel === 'advanced') {
      recommendations.push({
        type: 'training',
        title: 'Half Marathon Challenge',
        description: 'Your fitness level suggests you\'re ready for a half marathon! This is a significant milestone that requires dedicated training.',
        priority: 'low',
        actionable_steps: [
          'Follow a 12-16 week half marathon plan',
          'Build up to 40-50 km per week',
          'Long run should reach 16-18 km',
          'Focus on nutrition and hydration'
        ]
      });
    }

    return recommendations;
  }

  // Helper: Check if user has done speed work recently
  async checkRecentSpeedWork(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM runs
      WHERE user_id = $1
      AND completed_at >= CURRENT_DATE - INTERVAL '14 days'
      AND (pace < (SELECT AVG(pace) * 0.85 FROM runs WHERE user_id = $1))
      AND distance < 8000
    `;
    
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count) > 0;
  }

  // Helper: Check if user has done a long run recently
  async checkRecentLongRun(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM runs
      WHERE user_id = $1
      AND completed_at >= CURRENT_DATE - INTERVAL '7 days'
      AND distance > (SELECT AVG(distance) * 1.5 FROM runs WHERE user_id = $1)
    `;
    
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count) > 0;
  }

  // Helper: Get recent run details
  async getRecentRunDetails(userId, days) {
    const safeDays = Math.max(1, Math.min(365, parseInt(days) || 7));
    const query = `
      SELECT pace, distance, duration, completed_at
      FROM runs
      WHERE user_id = $1
      AND completed_at >= CURRENT_DATE - ($2 || ' days')::INTERVAL
      ORDER BY completed_at DESC
    `;
    
    const result = await pool.query(query, [userId, safeDays]);
    return result.rows;
  }

  // Save recommendations to database
  async saveRecommendations(userId, recommendations) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Delete old unread recommendations (older than 7 days)
      await client.query(
        'DELETE FROM ai_recommendations WHERE user_id = $1 AND is_read = false AND created_at < CURRENT_DATE - INTERVAL \'7 days\'',
        [userId]
      );
      
      // Insert new recommendations
      for (const rec of recommendations) {
        await client.query(
          `INSERT INTO ai_recommendations 
           (user_id, recommendation_type, title, description, priority, valid_until)
           VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + INTERVAL '7 days')`,
          [userId, rec.type, rec.title, rec.description, rec.priority]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get active recommendations for user
  async getRecommendations(userId) {
    const query = `
      SELECT *
      FROM ai_recommendations
      WHERE user_id = $1
      AND is_dismissed = false
      AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      ORDER BY 
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Mark recommendation as read
  async markAsRead(recommendationId) {
    await pool.query(
      'UPDATE ai_recommendations SET is_read = true WHERE id = $1',
      [recommendationId]
    );
  }

  // Dismiss recommendation
  async dismissRecommendation(recommendationId) {
    await pool.query(
      'UPDATE ai_recommendations SET is_dismissed = true WHERE id = $1',
      [recommendationId]
    );
  }

  // Generate weekly summary
  async generateWeeklySummary(userId) {
    const query = `
      SELECT 
        COUNT(*) as runs_this_week,
        SUM(distance) as total_distance,
        SUM(duration) as total_duration,
        AVG(pace) as avg_pace,
        MIN(pace) as best_pace,
        SUM(elevation_gain) as total_elevation
      FROM runs
      WHERE user_id = $1
      AND completed_at >= CURRENT_DATE - INTERVAL '7 days'
    `;
    
    const result = await pool.query(query, [userId]);
    const stats = result.rows[0];
    
    const summary = {
      runs: parseInt(stats.runs_this_week) || 0,
      distance: parseFloat(stats.total_distance) || 0,
      duration: parseInt(stats.total_duration) || 0,
      avgPace: parseFloat(stats.avg_pace) || 0,
      bestPace: parseFloat(stats.best_pace) || 0,
      elevation: parseFloat(stats.total_elevation) || 0,
      insights: []
    };
    
    // Generate insights
    if (summary.runs >= 4) {
      summary.insights.push('Great consistency this week! 🎉');
    } else if (summary.runs === 0) {
      summary.insights.push('No runs this week. Let\'s get back out there! 💪');
    }
    
    if (summary.distance > 20000) {
      summary.insights.push(`Impressive ${(summary.distance / 1000).toFixed(1)} km this week!`);
    }
    
    return summary;
  }

  // NEW: Generate AI-powered personalized training plan using Groq
  async generateAITrainingPlan(userId, preferences = {}) {
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Generating AI training plan (attempt ${attempt}/${maxRetries})...`);
        
        // Get user data and analytics
        const userData = await this.getUserAnalytics(userId);
        
        // Get recent run history for context
        const recentRuns = await this.getRecentRunDetails(userId, 30);
        
        // Build prompt for Groq AI
        const prompt = this.buildTrainingPlanPrompt(userData, recentRuns, preferences);
        
        // Call Groq API with timeout
        const completion = await Promise.race([
          groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content: "You are an expert running coach with years of experience creating personalized training plans. You analyze runner data and create detailed, safe, and effective training plans."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 2000,
            response_format: { type: "json_object" }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Groq API timeout after 30 seconds')), 30000)
          )
        ]);

        // Validate response
        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from AI service');
        }

        let aiResponse;
        try {
          aiResponse = JSON.parse(content);
        } catch (parseError) {
          console.error('Failed to parse AI response as JSON:', content.substring(0, 200));
          throw new Error('Invalid JSON response from AI service');
        }
        
        // Validate and structure the response
        const trainingPlan = this.validateAndStructurePlan(aiResponse, userData);
        
        // Save to database
        await this.saveTrainingPlan(userId, trainingPlan);
        
        console.log('AI training plan generated successfully!');
        return trainingPlan;
        
      } catch (error) {
        lastError = error;
        console.error(`AI plan generation attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          console.log('All retry attempts failed. Falling back to template-based plan...');
          // Fallback to template-based plan
          return await this.generateFallbackPlan(userId, preferences);
        }
        
        // Wait before retry with exponential backoff
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Fallback method to generate template-based plan when AI fails
  async generateFallbackPlan(userId, preferences) {
    try {
      const userData = await this.getUserAnalytics(userId);
      const fitnessLevel = userData.fitness_level || 'beginner';
      
      // Determine plan type based on preferences or fitness level
      let planType = 'beginner';
      if (preferences.goal && preferences.goal.toLowerCase().includes('5k')) {
        planType = '5k';
      } else if (fitnessLevel === 'intermediate') {
        planType = '5k';
      }
      
      // Import the generateWorkouts function from trainingPlans route
      const { generateWorkouts } = require('../routes/trainingPlans');
      const workouts = generateWorkouts(planType);
      
      // Create a basic plan structure
      const fallbackPlan = {
        planName: `${planType.charAt(0).toUpperCase() + planType.slice(1)} Training Plan (Template)`,
        duration: "4 weeks",
        difficulty: fitnessLevel,
        goal: preferences.goal || `Complete ${planType.toUpperCase()} training`,
        weeklyPlans: this.convertWorkoutsToWeeklyPlan(workouts),
        tips: [
          "Listen to your body and rest when needed",
          "Stay hydrated throughout the day",
          "Get 7-9 hours of sleep for recovery",
          "Warm up before each run",
          "Cool down and stretch after runs"
        ],
        warnings: [
          "Consult a doctor before starting any new exercise program",
          "Stop immediately if you experience pain",
          "This is a template plan - consider working with a coach for personalized advice"
        ],
        generatedAt: new Date().toISOString(),
        isAI: false,
        isFallback: true,
        note: "This is a template plan generated because AI service was unavailable. You can regenerate an AI-powered plan later."
      };
      
      // Save to database
      await this.saveTrainingPlan(userId, fallbackPlan);
      
      console.log('Fallback template plan generated and saved');
      return fallbackPlan;
      
    } catch (error) {
      console.error('Failed to generate fallback plan:', error);
      throw new Error('Failed to generate training plan. Please try again later.');
    }
  }

  // Helper to convert flat workout array to weekly structure
  convertWorkoutsToWeeklyPlan(workouts) {
    const weeklyPlans = [];
    const workoutsPerWeek = 7;
    const totalWeeks = Math.ceil(workouts.length / workoutsPerWeek);
    
    for (let week = 1; week <= totalWeeks; week++) {
      const startIndex = (week - 1) * workoutsPerWeek;
      const endIndex = Math.min(startIndex + workoutsPerWeek, workouts.length);
      const weekWorkouts = workouts.slice(startIndex, endIndex);
      
      weeklyPlans.push({
        week: week,
        focus: week === 1 ? 'Building base' : 
               week === 2 ? 'Increasing intensity' :
               week === 3 ? 'Peak training' : 'Taper and recover',
        workouts: weekWorkouts.map((w, idx) => ({
          day: idx + 1,
          workoutType: w.workoutType || 'Easy Run',
          description: `${w.workoutType || 'Run'} - Focus on ${w.intensity || 'moderate'} effort`,
          distance: w.distance || 0,
          duration: w.duration || 0,
          intensity: w.intensity || 'moderate',
          notes: w.notes || ''
        }))
      });
    }
    
    return weeklyPlans;
  }

  // Build prompt for Groq AI
  buildTrainingPlanPrompt(userData, recentRuns, preferences) {
    const fitnessLevel = userData.fitness_level || 'beginner';
    const totalDistance = parseFloat(userData.total_distance) || 0;
    const avgPace = parseFloat(userData.avg_pace_30d) || 0;
    const runsLastWeek = parseInt(userData.runs_last_week) || 0;
    const currentStreak = parseInt(userData.current_streak) || 0;
    const best5k = userData.best_5k_time;
    const best10k = userData.best_10k_time;

    const recentRunSummary = recentRuns.map(run => ({
      date: run.completed_at,
      distance: parseFloat(run.distance),
      pace: parseFloat(run.pace),
      duration: parseInt(run.duration)
    }));

    return `
You are an expert running coach with years of experience creating personalized training plans. You analyze runner data and create detailed, safe, and effective training plans.

CRITICAL FORMATTING RULES FOR TIPS AND WARNINGS:

1. NEVER write long paragraphs in tips or warnings arrays.
2. Each tip/warning should be a SHORT, concise sentence (max 15 words).
3. Use bullet-point style language even within JSON strings.
4. Focus on ONE key point per tip/warning.

FORMATTING EXAMPLES:

✅ CORRECT tips:
- "Warm up 5 minutes before each run"
- "Stay hydrated throughout the day"
- "Rest when you feel pain"

❌ WRONG tips:
- "It is very important to make sure that you warm up properly before every single run because this helps prevent injuries and prepares your body for the workout ahead"

Your response must be valid JSON with the following structure:

Create a personalized running training plan based on the following runner profile:

RUNNER PROFILE:
- Fitness Level: ${fitnessLevel}
- Total Distance Run: ${(totalDistance / 1000).toFixed(1)} km
- Average Pace (last 30 days): ${avgPace.toFixed(2)} min/km
- Runs Last Week: ${runsLastWeek}
- Current Streak: ${currentStreak} days
- Best 5K Time: ${best5k ? best5k + ' seconds' : 'Not recorded'}
- Best 10K Time: ${best10k ? best10k + ' seconds' : 'Not recorded'}

RECENT RUN HISTORY (last 30 days):
${JSON.stringify(recentRunSummary, null, 2)}

USER PREFERENCES:
${JSON.stringify(preferences, null, 2)}

Please create a comprehensive 4-week training plan that includes:
1. Weekly schedule with specific workouts for each day
2. Mix of easy runs, tempo runs, interval training, long runs, and rest days
3. Progressive overload (gradually increasing difficulty)
4. Specific distances and durations for each workout
5. Clear workout descriptions and goals

Return the plan in the following JSON format:
{
  "planName": "string",
  "duration": "4 weeks",
  "difficulty": "${fitnessLevel}",
  "goal": "string describing the main goal",
  "weeklyPlans": [
    {
      "week": 1,
      "focus": "string",
      "workouts": [
        {
          "day": 1,
          "workoutType": "Easy Run|Tempo Run|Interval Training|Long Run|Rest Day|Cross Training",
          "description": "detailed description",
          "distance": number (in km, 0 for rest days),
          "duration": number (in minutes, 0 for rest days),
          "intensity": "easy|moderate|hard",
          "notes": "additional tips"
        }
      ]
    }
  ],
  "tips": ["array of SHORT general training tips (max 15 words each)"],
  "warnings": ["array of SHORT safety warnings (max 15 words each)"]
}

Make the plan realistic, safe, and tailored to this runner's current fitness level. Include proper warm-up and cool-down recommendations.
`;
  }

  // Validate and structure the AI response
  validateAndStructurePlan(aiResponse, userData) {
    const defaultPlan = {
      planName: "Personalized Training Plan",
      duration: "4 weeks",
      difficulty: userData.fitness_level || 'beginner',
      goal: "Improve running fitness",
      weeklyPlans: [],
      tips: ["Listen to your body", "Stay hydrated", "Get enough rest"],
      warnings: ["Consult a doctor before starting any new exercise program"]
    };

    if (!aiResponse || !aiResponse.weeklyPlans) {
      return defaultPlan;
    }

    return {
      planName: aiResponse.planName || defaultPlan.planName,
      duration: aiResponse.duration || defaultPlan.duration,
      difficulty: aiResponse.difficulty || defaultPlan.difficulty,
      goal: aiResponse.goal || defaultPlan.goal,
      weeklyPlans: aiResponse.weeklyPlans.map(week => ({
        week: week.week,
        focus: week.focus || 'General fitness',
        workouts: (week.workouts || []).map(workout => ({
          day: workout.day,
          workoutType: workout.workoutType || 'Easy Run',
          description: workout.description || '',
          distance: parseFloat(workout.distance) || 0,
          duration: parseInt(workout.duration) || 0,
          intensity: workout.intensity || 'moderate',
          notes: workout.notes || ''
        }))
      })),
      tips: aiResponse.tips || defaultPlan.tips,
      warnings: aiResponse.warnings || defaultPlan.warnings,
      generatedAt: new Date().toISOString(),
      isAI: true
    };
  }

  // Save training plan to database (with race condition protection)
  async saveTrainingPlan(userId, trainingPlan) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Use advisory lock to prevent race conditions
      await client.query('SELECT pg_advisory_xact_lock($1)', [userId]);
      
      // Deactivate previous plans
      await client.query(
        'UPDATE training_plans SET is_active = false WHERE user_id = $1',
        [userId]
      );
      
      // Insert new plan (trigger will handle deactivation of others)
      const result = await client.query(
        `INSERT INTO training_plans 
         (user_id, plan_type, workouts, start_date, end_date, is_active, metadata, generated_by)
         VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '28 days', true, $4, $5)
         RETURNING id`,
        [
          userId,
          trainingPlan.difficulty,
          JSON.stringify(trainingPlan.weeklyPlans),
          JSON.stringify({
            planName: trainingPlan.planName,
            goal: trainingPlan.goal,
            tips: trainingPlan.tips,
            warnings: trainingPlan.warnings,
            isAI: trainingPlan.isAI,
            generatedAt: trainingPlan.generatedAt
          }),
          trainingPlan.isAI ? 'ai' : 'template'
        ]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving training plan:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new AICoachService();

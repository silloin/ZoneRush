const pool = require('../config/database');

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

    // Save recommendations to database
    await this.saveRecommendations(userId, recommendations);

    return recommendations;
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
}

module.exports = new AICoachService();

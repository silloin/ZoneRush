const pool = require('../config/database');

class ChallengeService {
  // Get today's challenges
  async getTodaysChallenges() {
    const query = `
      SELECT * FROM challenges
      WHERE valid_date = CURRENT_DATE
      AND is_active = true
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  // Get user's challenge progress
  async getUserChallengeProgress(userId) {
    const query = `
      SELECT 
        c.*,
        uc.current_progress,
        uc.is_completed,
        uc.completed_at
      FROM challenges c
      LEFT JOIN user_challenges uc ON c.id = uc.challenge_id AND uc.user_id = $1
      WHERE c.valid_date = CURRENT_DATE
      AND c.is_active = true
      ORDER BY c.created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Update challenge progress
  async updateChallengeProgress(userId, challengeId, progress) {
    const challenge = await this.getChallenge(challengeId);
    
    if (!challenge) return null;
    
    const isCompleted = progress >= challenge.target_value;
    
    const query = `
      INSERT INTO user_challenges (user_id, challenge_id, current_progress, is_completed, completed_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, challenge_id) 
      DO UPDATE SET 
        current_progress = GREATEST(user_challenges.current_progress, $3),
        is_completed = $4,
        completed_at = CASE WHEN $4 = true AND user_challenges.is_completed = false THEN $5 ELSE user_challenges.completed_at END
      RETURNING *
    `;
    
    const completedAt = isCompleted ? new Date() : null;
    const result = await pool.query(query, [userId, challengeId, progress, isCompleted, completedAt]);
    
    if (isCompleted && result.rows[0].completed_at) {
      await this.rewardChallenge(userId, challenge);
    }
    
    return result.rows[0];
  }

  // Reward user for completing challenge
  async rewardChallenge(userId, challenge) {
    const query = `
      UPDATE users 
      SET xp = xp + $2,
          level = FLOOR((xp + $2) / 1000) + 1
      WHERE id = $1
      RETURNING xp, level
    `;
    
    await pool.query(query, [userId, challenge.xp_reward]);
    
    const activityQuery = `
      INSERT INTO posts (user_id, content, activity_type, activity_data)
      VALUES ($1, $2, 'challenge_completed', $3)
    `;
    
    await pool.query(activityQuery, [
      userId, 
      `Completed challenge: ${challenge.title}`, 
      JSON.stringify({ challengeId: challenge.id, title: challenge.title })
    ]);
  }

  // Get challenge by ID
  async getChallenge(challengeId) {
    const query = 'SELECT * FROM challenges WHERE id = $1';
    const result = await pool.query(query, [challengeId]);
    return result.rows[0] || null;
  }

  // Process run for challenges
  async processRunForChallenges(userId, runData) {
    const challenges = await this.getTodaysChallenges();
    const updates = [];
    
    for (const challenge of challenges) {
      let progress = 0;
      
      switch (challenge.challenge_type) {
        case 'distance':
          progress = runData.distance;
          break;
        case 'duration':
          progress = runData.duration;
          break;
        case 'tiles':
          progress = runData.tilesCapture || 0;
          break;
        case 'pace':
          if (runData.pace <= challenge.target_value) {
            progress = challenge.target_value;
          }
          break;
      }
      
      if (progress > 0) {
        const updated = await this.updateChallengeProgress(userId, challenge.id, progress);
        updates.push(updated);
      }
    }
    
    return updates;
  }

  // Create daily challenges (admin function)
  async createDailyChallenge(title, description, challengeType, targetValue, xpReward, validDate) {
    const query = `
      INSERT INTO challenges (title, description, challenge_type, target_value, xp_reward, valid_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await pool.query(query, [title, description, challengeType, targetValue, xpReward, validDate]);
    return result.rows[0];
  }

  // Generate random daily challenges
  async generateDailyChallenges(date = new Date()) {
    const challengeTemplates = [
      { title: 'Morning Runner', description: 'Run 3 km today', type: 'distance', value: 3000, xp: 100 },
      { title: 'Speed Demon', description: 'Run with pace under 5 min/km', type: 'pace', value: 5, xp: 150 },
      { title: 'Territory Hunter', description: 'Capture 5 new tiles', type: 'tiles', value: 5, xp: 120 },
      { title: 'Endurance Test', description: 'Run for 30 minutes', type: 'duration', value: 1800, xp: 130 },
      { title: 'Distance Master', description: 'Run 5 km today', type: 'distance', value: 5000, xp: 150 }
    ];
    
    const randomChallenges = challengeTemplates
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    const created = [];
    for (const template of randomChallenges) {
      const challenge = await this.createDailyChallenge(
        template.title,
        template.description,
        template.type,
        template.value,
        template.xp,
        date
      );
      created.push(challenge);
    }
    
    return created;
  }

  // Get user's completed challenges count
  async getUserCompletedChallengesCount(userId) {
    const query = `
      SELECT COUNT(*) as completed_count
      FROM user_challenges
      WHERE user_id = $1 AND is_completed = true
    `;
    
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].completed_count);
  }
}

module.exports = new ChallengeService();

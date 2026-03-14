const pool = require('../config/database');

class AchievementService {
  // Check and unlock achievements for user
  async checkAchievements(userId) {
    const stats = await this.getUserStats(userId);
    const achievements = await this.getAllAchievements();
    const unlockedAchievements = [];

    for (const achievement of achievements) {
      const isUnlocked = await this.isAchievementUnlocked(userId, achievement.id);
      
      if (!isUnlocked && this.meetsRequirement(stats, achievement)) {
        const unlocked = await this.unlockAchievement(userId, achievement.id);
        if (unlocked) {
          unlockedAchievements.push(achievement);
          await this.addXP(userId, achievement.xp_reward);
        }
      }
    }

    return unlockedAchievements;
  }

  // Check if achievement requirement is met
  meetsRequirement(stats, achievement) {
    if (!achievement.requirement) return false;
    
    const req = typeof achievement.requirement === 'string' 
      ? JSON.parse(achievement.requirement) 
      : achievement.requirement;
    
    if (req.runs && stats.total_runs >= req.runs) return true;
    if (req.distance && stats.total_distance >= req.distance) return true;
    if (req.tiles && stats.total_tiles_captured >= req.tiles) return true;
    if (req.streak && stats.current_streak >= req.streak) return true;
    if (req.posts && stats.total_posts >= req.posts) return true;
    
    return false;
  }

  // Get user stats
  async getUserStats(userId) {
    try {
      // Get stats from multiple tables
      const runsResult = await pool.query('SELECT COUNT(*) as total_runs, SUM(distance) as total_distance FROM runs WHERE user_id = $1', [userId]);
      const tilesResult = await pool.query('SELECT COUNT(*) as total_tiles FROM captured_tiles WHERE user_id = $1', [userId]);
      const userResult = await pool.query('SELECT streak as current_streak FROM users WHERE id = $1', [userId]);
      const postsResult = await pool.query('SELECT COUNT(*) as total_posts FROM posts WHERE user_id = $1', [userId]);

      return {
        total_runs: parseInt(runsResult.rows[0]?.total_runs || 0),
        total_distance: parseFloat(runsResult.rows[0]?.total_distance || 0) / 1000, // convert to km
        total_tiles_captured: parseInt(tilesResult.rows[0]?.total_tiles || 0),
        current_streak: parseInt(userResult.rows[0]?.current_streak || 0),
        total_posts: parseInt(postsResult.rows[0]?.total_posts || 0)
      };
    } catch (error) {
      console.error('Error fetching user stats for achievements:', error);
      return {
        total_runs: 0,
        total_distance: 0,
        total_tiles_captured: 0,
        current_streak: 0,
        total_posts: 0
      };
    }
  }

  // Get all achievements
  async getAllAchievements() {
    const query = 'SELECT * FROM achievements';
    const result = await pool.query(query);
    return result.rows;
  }

  // Check if achievement is unlocked
  async isAchievementUnlocked(userId, achievementId) {
    const query = `
      SELECT * FROM user_achievements 
      WHERE user_id = $1 AND achievement_id = $2
    `;
    const result = await pool.query(query, [userId, achievementId]);
    return result.rows.length > 0;
  }

  // Unlock achievement
  async unlockAchievement(userId, achievementId) {
    try {
      const query = `
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, achievement_id) DO NOTHING
        RETURNING *
      `;
      
      const result = await pool.query(query, [userId, achievementId]);
      
      if (result.rows.length > 0) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      return false;
    }
  }

  // Add XP to user
  async addXP(userId, xp) {
    const query = `
      UPDATE users 
      SET xp = xp + $2,
          level = FLOOR((xp + $2) / 1000) + 1
      WHERE id = $1
      RETURNING xp, level
    `;
    
    const result = await pool.query(query, [userId, xp]);
    return result.rows[0];
  }

  // Get user achievements
  async getUserAchievements(userId) {
    const query = `
      SELECT a.*, ua.unlocked_at
      FROM achievements a
      JOIN user_achievements ua ON a.id = ua.achievement_id
      WHERE ua.user_id = $1
      ORDER BY ua.unlocked_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Get achievement progress
  async getAchievementProgress(userId) {
    const stats = await this.getUserStats(userId);
    const achievements = await this.getAllAchievements();
    
    const progress = await Promise.all(achievements.map(async (achievement) => {
      const isUnlocked = await this.isAchievementUnlocked(userId, achievement.id);
      
      const req = typeof achievement.requirement === 'string' 
        ? JSON.parse(achievement.requirement) 
        : achievement.requirement;
      
      let currentValue = 0;
      let targetValue = 0;

      if (req.runs) {
        currentValue = stats.total_runs;
        targetValue = req.runs;
      } else if (req.distance) {
        currentValue = stats.total_distance;
        targetValue = req.distance;
      } else if (req.tiles) {
        currentValue = stats.total_tiles_captured;
        targetValue = req.tiles;
      } else if (req.streak) {
        currentValue = stats.current_streak;
        targetValue = req.streak;
      } else if (req.posts) {
        currentValue = stats.total_posts;
        targetValue = req.posts;
      }
      
      const percentage = targetValue > 0 ? Math.min(100, (currentValue / targetValue) * 100) : 0;
      
      return {
        ...achievement,
        isUnlocked,
        currentValue,
        targetValue,
        percentage: Math.round(percentage)
      };
    }));
    
    return progress;
  }

  // Create activity feed entry
  async createActivity(userId, activityType, activityData) {
    const query = `
      INSERT INTO activities (user_id, activity_type, activity_data)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, activityType, JSON.stringify(activityData)]);
    return result.rows[0];
  }
}

module.exports = new AchievementService();

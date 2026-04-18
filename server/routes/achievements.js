const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const achievementService = require('../services/achievementService');
const authenticateToken = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

// Get all achievements
router.get('/', authenticateToken, async (req, res) => {
  try {
    const achievements = await achievementService.getAllAchievements();
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Get user's unlocked achievements
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const achievements = await achievementService.getUserAchievements(req.params.userId);
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ error: 'Failed to fetch user achievements' });
  }
});

// Get achievement progress for user
router.get('/user/:userId/progress', authenticateToken, async (req, res) => {
  try {
    const progress = await achievementService.getAchievementProgress(req.params.userId);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching achievement progress:', error);
    res.status(500).json({ error: 'Failed to fetch achievement progress' });
  }
});

// Check and unlock achievements
router.post('/check/:userId', authenticateToken, async (req, res) => {
  try {
    const unlockedAchievements = await achievementService.checkAchievements(req.params.userId);
    res.json({ unlocked: unlockedAchievements });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

// Get user profile stats (XP, level, streak)
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT id, username, xp, level, streak FROM users WHERE id = $1';
    const result = await pool.query(query, [req.params.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user profile stats:', error);
    res.status(500).json({ error: 'Failed to fetch profile stats' });
  }
});

const DAILY_TASKS = [
  { id: 1, type: 'distance', target: 2.0, xp: 50, title: 'Light Jog', desc: 'Run 2.0 km today', unit: 'km' },
  { id: 2, type: 'distance', target: 3.0, xp: 100, title: 'Steady Runner', desc: 'Run 3.0 km today', unit: 'km' },
  { id: 3, type: 'distance', target: 5.0, xp: 150, title: '5K Challenge', desc: 'Run 5.0 km today', unit: 'km' },
  { id: 4, type: 'duration', target: 15, xp: 50, title: 'Quick Sprint', desc: 'Run for 15 minutes today', unit: 'min' },
  { id: 5, type: 'duration', target: 30, xp: 100, title: 'Half-Hour Hustle', desc: 'Run for 30 minutes today', unit: 'min' },
  { id: 6, type: 'duration', target: 60, xp: 200, title: 'Endurance King', desc: 'Run for 60 minutes today', unit: 'min' }
];

function getDailyTaskForDate(dateStr) {
  let hash = 0;
  for(let i = 0; i < dateStr.length; i++) hash = (hash << 5) - hash + dateStr.charCodeAt(i);
  const index = Math.abs(hash) % DAILY_TASKS.length;
  return DAILY_TASKS[index];
}

// GET /daily-status - Dynamically calculate progress against rotating daily tasks
router.get('/daily-status/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const todayStr = new Date().toISOString().split('T')[0];
    const activeTask = getDailyTaskForDate(todayStr);

    const userResult = await pool.query('SELECT last_daily_claim_date FROM users WHERE id = $1', [userId]);
    const lastClaimDate = userResult.rows[0]?.last_daily_claim_date;
    const hasClaimedToday = lastClaimDate && new Date(lastClaimDate).toISOString().split('T')[0] === todayStr;
    
    // Evaluate based on challenge type
    let metricValue = 0;
    if (activeTask.type === 'distance') {
      const runsQuery = `SELECT COALESCE(SUM(distance), 0) as total FROM runs WHERE user_id = $1 AND completed_at >= CURRENT_DATE`;
      const runResult = await pool.query(runsQuery, [userId]);
      metricValue = parseFloat(runResult.rows[0].total);
    } else if (activeTask.type === 'duration') {
      const runsQuery = `SELECT COALESCE(SUM(duration), 0) as total FROM runs WHERE user_id = $1 AND completed_at >= CURRENT_DATE`;
      const runResult = await pool.query(runsQuery, [userId]);
      metricValue = parseFloat(runResult.rows[0].total) / 60.0; // convert seconds to minutes!
    }
    
    const isCompleted = metricValue >= activeTask.target; 
    
    res.json({
      activeTask,
      metricValue,
      isCompleted,
      hasClaimedToday
    });
  } catch (error) {
    console.error('Error fetching daily status:', error);
    res.status(500).json({ error: 'Failed to fetch daily status' });
  }
});

// POST /claim-daily - Grant dynamic XP amount based on the active task
router.post('/claim-daily/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const todayStr = new Date().toISOString().split('T')[0];
    const activeTask = getDailyTaskForDate(todayStr);
    
    let metricValue = 0;
    if (activeTask.type === 'distance') {
      const runsQuery = `SELECT COALESCE(SUM(distance), 0) as total FROM runs WHERE user_id = $1 AND completed_at >= CURRENT_DATE`;
      const runResult = await pool.query(runsQuery, [userId]);
      metricValue = parseFloat(runResult.rows[0].total);
    } else if (activeTask.type === 'duration') {
      const runsQuery = `SELECT COALESCE(SUM(duration), 0) as total FROM runs WHERE user_id = $1 AND completed_at >= CURRENT_DATE`;
      const runResult = await pool.query(runsQuery, [userId]);
      metricValue = parseFloat(runResult.rows[0].total) / 60.0;
    }
    
    if (metricValue < activeTask.target) {
      return res.status(400).json({ error: 'Daily Quest not completed yet!' });
    }
    
    const userResult = await pool.query('SELECT last_daily_claim_date FROM users WHERE id = $1', [userId]);
    const lastClaim = userResult.rows[0]?.last_daily_claim_date;
    
    if (lastClaim && new Date(lastClaim).toISOString().split('T')[0] === todayStr) {
      return res.status(400).json({ error: 'Already claimed today' });
    }
    
    // Proceed to claim! Update XP and last claim date safely
    await pool.query(
      'UPDATE users SET xp = COALESCE(xp, 0) + $1, last_daily_claim_date = CURRENT_DATE WHERE id = $2',
      [activeTask.xp, userId]
    );
    
    // Optionally create a notification!
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, 'achievement', 'Daily Task Complete', $2, $3)`,
      [userId, `You earned +${activeTask.xp} XP for completing: ${activeTask.title}!`, JSON.stringify({ xpEarned: activeTask.xp })]
    );
    
    res.json({ success: true, xpEarned: activeTask.xp });
  } catch (error) {
    console.error('Error claiming daily task:', error);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

// Reset weekly achievements (admin only - can be called manually or via cron job)
router.post('/reset-weekly', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await achievementService.resetWeeklyAchievements();
    res.json(result);
  } catch (error) {
    console.error('Error resetting weekly achievements:', error);
    res.status(500).json({ error: 'Failed to reset weekly achievements' });
  }
});

module.exports = router;

const pool = require('./config/database');

async function verify() {
  try {
    const achievements = await pool.query('SELECT COUNT(*) as count FROM achievements');
    const unique = await pool.query('SELECT COUNT(DISTINCT name) as count FROM achievements');
    const userAchievements = await pool.query('SELECT COUNT(*) as count FROM user_achievements');
    
    console.log('\n=== VERIFICATION ===');
    console.log(`Total achievements: ${achievements.rows[0].count}`);
    console.log(`Unique achievement names: ${unique.rows[0].count}`);
    console.log(`Total user_achievements: ${userAchievements.rows[0].count}`);
    
    // List all achievements
    const list = await pool.query('SELECT id, name FROM achievements ORDER BY id');
    console.log(`\nAll achievements (${list.rows.length}):`);
    list.rows.forEach(a => console.log(`  ${a.id}: ${a.name}`));
    
    // Check user 4 (govind23)
    const user4 = await pool.query(`
      SELECT DISTINCT a.name FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = 4
      ORDER BY a.name
    `);
    console.log(`\nUser 4 (govind23) achievements: ${user4.rows.length}`);
    user4.rows.forEach(a => console.log(`  - ${a.name}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

verify();

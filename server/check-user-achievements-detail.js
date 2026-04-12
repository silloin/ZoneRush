const pool = require('./config/database');

async function checkUserAchievementsDetail() {
  try {
    const userId = 4; // govind23
    
    // Check all user_achievements for this user
    const all = await pool.query(`
      SELECT achievement_id, COUNT(*) as count
      FROM user_achievements
      WHERE user_id = $1
      GROUP BY achievement_id
      ORDER BY count DESC
      LIMIT 10
    `, [userId]);
    
    console.log('User achievements breakdown (showing duplicates):');
    for (const row of all.rows) {
      const achievement = await pool.query(`
        SELECT id, name FROM achievements WHERE id = $1
      `, [row.achievement_id]);
      
      const name = achievement.rows.length > 0 ? achievement.rows[0].name : 'Unknown';
      console.log(`  Achievement ID ${row.achievement_id} (${name}): ${row.count} times`);
    }

    // Get total unique and total duplicates
    const unique = await pool.query(`
      SELECT COUNT(DISTINCT achievement_id) as unique_count
      FROM user_achievements
      WHERE user_id = $1
    `, [userId]);
    
    const total = await pool.query(`
      SELECT COUNT(*) as total_count
      FROM user_achievements
      WHERE user_id = $1
    `, [userId]);

    console.log(`\nTotal rows: ${total.rows[0].total_count}`);
    console.log(`Unique achievements: ${unique.rows[0].unique_count}`);
    console.log(`Duplicates: ${total.rows[0].total_count - unique.rows[0].unique_count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUserAchievementsDetail();

const pool = require('./config/database');

async function checkUserAchievements() {
  try {
    // List all users
    const users = await pool.query(`
      SELECT id, username, xp, level FROM users LIMIT 10
    `);
    console.log('Users in database:');
    users.rows.forEach(user => {
      console.log(`  ID: ${user.id}, Username: ${user.username}, XP: ${user.xp}, Level: ${user.level}`);
    });

    // For each user, count their achievements
    for (const user of users.rows) {
      const unlocked = await pool.query(`
        SELECT COUNT(*) as count FROM user_achievements WHERE user_id = $1
      `, [user.id]);
      console.log(`\nUser ${user.username} has ${unlocked.rows[0].count} achievements unlocked`);
      
      // Show sample achievements
      if (unlocked.rows[0].count > 0) {
        const sample = await pool.query(`
          SELECT a.name FROM user_achievements ua
          JOIN achievements a ON ua.achievement_id = a.id
          WHERE ua.user_id = $1
          LIMIT 5
        `, [user.id]);
        sample.rows.forEach(row => {
          console.log(`    - ${row.name}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUserAchievements();

const pool = require('./config/database');

async function fixAchievementDuplicatesV2() {
  try {
    console.log('Starting better cleanup of achievement duplicates...\n');

    // Step 1: For each unique achievement name, identify which achievement ID to keep
    const achievementMapping = await pool.query(`
      SELECT name, MIN(id) as keep_id, array_agg(id ORDER BY id) as all_ids
      FROM achievements
      GROUP BY name
    `);

    console.log(`Found ${achievementMapping.rows.length} unique achievement names\n`);

    // Step 2: Delete duplicate user_achievements entries
    console.log('Deleting duplicate user_achievement entries...');
    
    let deletedUserAchievements = 0;
    for (const achievement of achievementMapping.rows) {
      const keepId = achievement.keep_id;
      const allIds = achievement.all_ids;
      
      // Get all duplicate IDs (not the one we're keeping)
      const duplicateIds = allIds.filter(id => id !== keepId);
      
      if (duplicateIds.length > 0) {
        // Delete records pointing to duplicate achievement IDs
        for (const dupId of duplicateIds) {
          const result = await pool.query(`
            DELETE FROM user_achievements WHERE achievement_id = $1
          `, [dupId]);
          deletedUserAchievements += result.rowCount;
        }
      }
    }
    console.log(`✅ Deleted ${deletedUserAchievements} duplicate user_achievement records`);

    // Step 3: Delete duplicate achievements
    console.log('\nDeleting duplicate achievement entries...');
    
    const idsToDelete = [];
    for (const achievement of achievementMapping.rows) {
      const keepId = achievement.keep_id;
      const duplicateIds = achievement.all_ids.filter(id => id !== keepId);
      idsToDelete.push(...duplicateIds);
    }
    
    if (idsToDelete.length > 0) {
      const placeholders = idsToDelete.map((_, i) => `$${i + 1}`).join(',');
      const result = await pool.query(
        `DELETE FROM achievements WHERE id IN (${placeholders})`,
        idsToDelete
      );
      console.log(`✅ Deleted ${result.rowCount} duplicate achievement rows`);
    }

    // Step 4: Verify
    console.log('\n--- Verification ---\n');
    
    const finalAchievements = await pool.query('SELECT COUNT(*) as count FROM achievements');
    const finalUserAchievements = await pool.query('SELECT COUNT(*) as count FROM user_achievements');
    const uniqueNames = await pool.query('SELECT COUNT(DISTINCT name) as count FROM achievements');
    const achievementList = await pool.query('SELECT id, name FROM achievements ORDER BY id');
    
    console.log(`Total achievements in table: ${finalAchievements.rows[0].count}`);
    console.log(`Unique achievement names: ${uniqueNames.rows[0].count}`);
    console.log(`Total user_achievements records: ${finalUserAchievements.rows[0].count}`);
    
    console.log('\nAll achievements:');
    achievementList.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.name}`);
    });

    // Check user achievements now
    console.log('\n--- User Achievements After Cleanup ---\n');
    const users = await pool.query('SELECT id, username FROM users WHERE id IN (2,4)');
    
    for (const user of users.rows) {
      const unlocked = await pool.query(`
        SELECT COUNT(*) as count FROM user_achievements WHERE user_id = $1
      `, [user.id]);
      console.log(`User "${user.username}" (ID ${user.id}): ${unlocked.rows[0].count} achievements`);
      
      if (unlocked.rows[0].count > 0) {
        const achievements = await pool.query(`
          SELECT DISTINCT a.name FROM user_achievements ua
          JOIN achievements a ON ua.achievement_id = a.id
          WHERE ua.user_id = $1
        `, [user.id]);
        achievements.rows.forEach(a => {
          console.log(`    - ${a.name}`);
        });
      }
    }

    console.log('\n✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    process.exit(0);
  }
}

fixAchievementDuplicatesV2();

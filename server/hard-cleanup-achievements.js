const pool = require('./config/database');

async function hardCleanup() {
  try {
    console.log('Running aggressive cleanup...\n');

    // Step 1: Find the canonical achievement IDs (the first 8: 17-24)
    const canonical = await pool.query(`
      SELECT * FROM achievements WHERE id BETWEEN 17 AND 24 ORDER BY id
    `);
    
    console.log(`Found ${canonical.rows.length} canonical achievements:`);
    const canonicalMap = {}; // name -> id
    canonical.rows.forEach(a => {
      canonicalMap[a.name] = a.id;
      console.log(`  ID ${a.id}: ${a.name}`);
    });

    // Step 2: For each non-canonical achievement, redirect user_achievements to canonical one
    console.log('\nMigrating user_achievements to canonical achievements...');
    let migrated = 0;
    
    const nonCanonical = await pool.query(`
      SELECT DISTINCT id FROM achievements WHERE id NOT BETWEEN 17 AND 24
    `);
    
    for (const row of nonCanonical.rows) {
      const nonCanonicalId = row.id;
      
      // Get the achievement name
      const achievement = await pool.query(`
        SELECT name FROM achievements WHERE id = $1
      `, [nonCanonicalId]);
      
      if (achievement.rows.length > 0) {
        const name = achievement.rows[0].name;
        const canonicalId = canonicalMap[name];
        
        if (canonicalId) {
          // Find all user_achievements pointing to this non-canonical ID
          const userAchievements = await pool.query(`
            SELECT DISTINCT user_id FROM user_achievements WHERE achievement_id = $1
          `, [nonCanonicalId]);
          
          // For each user, try to redirect to canonical
          for (const ua of userAchievements.rows) {
            // Delete the non-canonical entry
            await pool.query(`
              DELETE FROM user_achievements 
              WHERE user_id = $1 AND achievement_id = $2
            `, [ua.user_id, nonCanonicalId]);
            
            // Insert canonical entry (with ON CONFLICT DO NOTHING to avoid duplicates)
            const result = await pool.query(`
              INSERT INTO user_achievements (user_id, achievement_id)
              VALUES ($1, $2)
              ON CONFLICT (user_id, achievement_id) DO NOTHING
              RETURNING *
            `, [ua.user_id, canonicalId]);
            
            if (result.rowCount > 0) {
              migrated++;
            }
          }
        }
      }
    }
    console.log(`✅ Migrated ${migrated} user_achievements entries`);

    // Step 3: Delete all non-canonical achievements
    console.log('\nDeleting duplicate achievement entries...');
    const deleted = await pool.query(`
      DELETE FROM achievements WHERE id NOT BETWEEN 17 AND 24
    `);
    console.log(`✅ Deleted ${deleted.rowCount} duplicate achievements`);

    // Step 4: Final verification
    console.log('\n=== FINAL VERIFICATION ===');
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM achievements');
    const finalUnique = await pool.query('SELECT COUNT(DISTINCT name) as count FROM achievements');
    const userCount = await pool.query('SELECT COUNT(*) as count FROM user_achievements');
    
    console.log(`Total achievements: ${finalCount.rows[0].count}`);
    console.log(`Unique names: ${finalUnique.rows[0].count}`);
    console.log(`Total user_achievements: ${userCount.rows[0].count}`);
    
    // Check all achievements
    const all = await pool.query(`SELECT id, name FROM achievements ORDER BY id`);
    console.log(`\nAll achievements:`);
    all.rows.forEach(a => console.log(`  ${a.id}: ${a.name}`));
    
    // Check user 4
    const user4Count = await pool.query(`
      SELECT COUNT(*) as count FROM user_achievements WHERE user_id = 4
    `);
    console.log(`\nUser 4 (govind23): ${user4Count.rows[0].count} achievements`);
    
    const user4Achievements = await pool.query(`
      SELECT a.name FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = 4
      ORDER BY a.name
    `);
    user4Achievements.rows.forEach(a => console.log(`  - ${a.name}`));
    
    console.log('\n✅ Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

hardCleanup();

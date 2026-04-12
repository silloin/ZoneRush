const pool = require('./config/database');

async function fixAchievementDuplicates() {
  try {
    console.log('Starting cleanup of achievement duplicates...\n');

    // Step 1: Find the minimum ID for each achievement name (keep this one, delete others)
    const uniqueAchievements = await pool.query(`
      SELECT name, MIN(id) as keep_id, array_agg(id ORDER BY id) as all_ids
      FROM achievements
      GROUP BY name
    `);

    console.log(`Found ${uniqueAchievements.rows.length} unique achievement names\n`);
    const idMapping = {}; // Map old IDs to keep IDs

    for (const achievement of uniqueAchievements.rows) {
      const keepId = achievement.keep_id;
      const allIds = achievement.all_ids;
      
      console.log(`Achievement: "${achievement.name}"`);
      console.log(`  Keeping ID: ${keepId}`);
      console.log(`  Deleting IDs: ${allIds.filter(id => id !== keepId).join(', ')}`);
      
      // Map all IDs to the one we're keeping
      for (const id of allIds) {
        idMapping[id] = keepId;
      }
    }

    console.log('\n--- Executing cleanup ---\n');

    // Step 2: Update user_achievements to point to the correct IDs
    console.log('Updating user_achievements to point to unique achievements...');
    
    let updatedCount = 0;
    // For each ID mapping, update references
    const updatePromises = [];
    for (const [oldId, newId] of Object.entries(idMapping)) {
      if (oldId !== newId) {
        const result = await pool.query(`
          UPDATE user_achievements
          SET achievement_id = $1
          WHERE achievement_id = $2
        `, [newId, parseInt(oldId)]);
        updatedCount += result.rowCount;
      }
    }
    console.log(`✅ Updated ${updatedCount} user_achievement records`);

    // Step 3: Delete duplicate achievements
    console.log('\nDeleting duplicate achievement entries...');
    
    const idsToDelete = [];
    for (const achievement of uniqueAchievements.rows) {
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
    
    console.log(`Total achievements in table: ${finalAchievements.rows[0].count}`);
    console.log(`Unique achievement names: ${uniqueNames.rows[0].count}`);
    console.log(`Total user_achievements records: ${finalUserAchievements.rows[0].count}`);
    
    console.log('\n✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    process.exit(0);
  }
}

// Confirm before running
console.log('⚠️  This script will:');
console.log('1. Consolidate duplicate achievements');
console.log('2. Update user achievements to point to unique entries');
console.log('3. Delete ~2688 duplicate rows\n');

fixAchievementDuplicates();

const pool = require('./config/database');

async function checkAchievementDuplicates() {
  try {
    // Find achievements with duplicate names
    const duplicates = await pool.query(`
      SELECT name, COUNT(*) as count
      FROM achievements
      GROUP BY name
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `);
    
    console.log('Achievement names with duplicates:');
    console.log(`Found ${duplicates.rows.length} achievement names that appear multiple times\n`);
    
    let totalDuplicateRows = 0;
    for (const row of duplicates.rows) {
      console.log(`  "${row.name}": ${row.count} times`);
      totalDuplicateRows += (row.count - 1); // Extra rows
    }

    console.log(`\nTotal duplicate rows: ${totalDuplicateRows}`);
    console.log(`Total achievements in table: 2696`);
    console.log(`Expected unique achievements: ${2696 - totalDuplicateRows}`);

    // Suggest cleanup
    console.log('\n✅ Recommended fix:');
    console.log('1. Find the main/original achievement IDs for each name');
    console.log('2. Update all user_achievements to point to the original IDs');
    console.log('3. Delete duplicate achievement entries');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAchievementDuplicates();

const pool = require('./config/database');

async function debug() {
  try {
    // Count unique achievements
    const achievementsCount = await pool.query('SELECT COUNT(*) as count FROM achievements');
    console.log('Total rows in achievements table:', achievementsCount.rows[0].count);

    // Count unique achievement IDs
    const uniqueIds = await pool.query('SELECT COUNT(DISTINCT id) as count FROM achievements');
    console.log('Unique achievement IDs:', uniqueIds.rows[0].count);

    // Count duplicate IDs
    const duplicateIds = await pool.query(`
      SELECT id, COUNT(*) as duplicate_count 
      FROM achievements 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `);
    console.log('Duplicate IDs found:', duplicateIds.rows.length);
    if (duplicateIds.rows.length > 0) {
      console.log('Sample duplicates:', duplicateIds.rows.slice(0, 5));
    }

    // Check user achievements count for current user (replace with actual userId)
    const userId = 1; // Default test user
    const userUnlocked = await pool.query(`
      SELECT COUNT(*) as count FROM user_achievements WHERE user_id = $1
    `, [userId]);
    console.log('\nUser achievements unlocked:', userUnlocked.rows[0].count);

    // Show first 5 achievements
    const sample = await pool.query(`
      SELECT id, name FROM achievements ORDER BY id LIMIT 5
    `);
    console.log('\nFirst 5 achievements:');
    sample.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Name: ${row.name}`);
    });

    // Test the DISTINCT query
    const distinct = await pool.query(`
      SELECT DISTINCT ON (id) * FROM achievements ORDER BY id
    `);
    console.log('\nDISTINCT query returns:', distinct.rows.length, 'rows');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

debug();
